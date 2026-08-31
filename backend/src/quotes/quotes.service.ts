import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, QuoteStatus, InvoiceStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { ListQuotesDto } from './dto/list-quotes.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { computeTotals } from '../common/money';
import {
  forbiddenWithCode,
  conflictWithCode,
} from '../common/errors/app-errors';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COUNTER_ID = '00000000-0000-5000-8000-000000000000';

const QUOTE_INCLUDE = {
  partner: {
    select: {
      id: true,
      name: true,
      type: true,
      nif: true,
      address: true,
      contacts: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isPrimary: true,
        },
      },
    },
  },
  createdBy: { select: { id: true, username: true, fullName: true } },
  lines: { orderBy: { id: 'asc' as const } },
} as const;

const INVOICE_INCLUDE = {
  partner: {
    select: {
      id: true,
      name: true,
      type: true,
      nif: true,
      address: true,
      contacts: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isPrimary: true,
        },
      },
    },
  },
  createdBy: { select: { id: true, username: true, fullName: true } },
  lines: { orderBy: { id: 'asc' as const } },
} as const;

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  private assertCanWrite(user: AuthUser) {
    if (user.role !== Role.admin && user.role !== Role.commercial) {
      throw forbiddenWithCode(
        'FORBIDDEN_QUOTE_WRITE',
        'لا تملك صلاحية إنشاء أو تعديل عروض الأسعار',
      );
    }
  }

  private ensureValidId(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException('عرض السعر غير موجود');
    }
  }

  private async validatePartner(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) {
      throw new BadRequestException('الشريك المرتبط غير موجود');
    }
    if (partner.type !== 'customer') {
      throw new BadRequestException('عرض السعر يجب أن يرتبط بـزبون');
    }
  }

  private async findScoped(id: string) {
    this.ensureValidId(id);
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: QUOTE_INCLUDE,
    });
    if (!quote) {
      throw new NotFoundException('عرض السعر غير موجود');
    }
    return quote;
  }

  async create(user: AuthUser, dto: CreateQuoteDto) {
    this.assertCanWrite(user);
    await this.validatePartner(dto.partnerId);

    const { computed, subtotal, tvaAmount, totalAmount } = computeTotals(
      dto.lines,
    );

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ last_number: number }>
      >`INSERT INTO "quote_counters" ("id", "last_number")
        VALUES (${COUNTER_ID}::uuid, 1)
        ON CONFLICT ("id")
        DO UPDATE SET "last_number" = "quote_counters"."last_number" + 1
        RETURNING "last_number"`;

      const last = Number(rows[0].last_number);
      const quoteNumber = String(last).padStart(3, '0');

      return tx.quote.create({
        data: {
          quoteNumber,
          partnerId: dto.partnerId,
          createdByUserId: user.userId,
          objet: dto.objet ?? null,
          status: QuoteStatus.draft,
          subtotal,
          tvaAmount,
          totalAmount,
          lines: {
            create: computed.map((line) => ({
              description: line.description,
              unit: line.unit ?? null,
              quantity: new Prisma.Decimal(String(line.quantity)),
              unitPrice: new Prisma.Decimal(String(line.unitPrice)),
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: QUOTE_INCLUDE,
      });
    });
  }

  async findAll(user: AuthUser, query: ListQuotesDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                quoteNumber: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                partner: {
                  is: {
                    name: {
                      contains: query.search,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: QUOTE_INCLUDE,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(user: AuthUser, id: string) {
    return this.findScoped(id);
  }

  async send(user: AuthUser, id: string) {
    this.ensureValidId(id);
    this.assertCanWrite(user);

    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      throw new NotFoundException('عرض السعر غير موجود');
    }

    if (
      quote.status !== QuoteStatus.draft &&
      quote.status !== QuoteStatus.revision_requested
    ) {
      throw new ConflictException(
        'لا يمكن إرسال عرض السعر إلا من حالة المسودة أو طلب المراجعة',
      );
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: QuoteStatus.sent },
      include: QUOTE_INCLUDE,
    });
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateQuoteStatusDto) {
    this.ensureValidId(id);
    this.assertCanWrite(user);

    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      throw new NotFoundException('عرض السعر غير موجود');
    }

    if (quote.status !== QuoteStatus.sent) {
      throw new ConflictException('لا يمكن تغيير الحالة إلا لعرض سعر مُرسل');
    }

    return this.prisma.quote.update({
      where: { id },
      data: { status: dto.status },
      include: QUOTE_INCLUDE,
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateQuoteDto) {
    const quote = await this.findScoped(id);
    this.assertCanWrite(user);

    const canEdit =
      quote.status === QuoteStatus.draft ||
      quote.status === QuoteStatus.revision_requested;
    if (!canEdit) {
      throw new ConflictException('لا يمكن تعديل عرض السعر في هذه الحالة');
    }

    const data: Prisma.QuoteUpdateInput = {
      objet: dto.objet !== undefined ? dto.objet : undefined,
    };

    if (dto.partnerId !== undefined) {
      await this.validatePartner(dto.partnerId);
      data.partner = { connect: { id: dto.partnerId } };
    }

    if (dto.lines) {
      const { computed, subtotal, tvaAmount, totalAmount } = computeTotals(
        dto.lines,
      );
      data.subtotal = subtotal;
      data.tvaAmount = tvaAmount;
      data.totalAmount = totalAmount;
      data.lines = {
        deleteMany: {},
        create: computed.map((line) => ({
          description: line.description,
          unit: line.unit ?? null,
          quantity: new Prisma.Decimal(String(line.quantity)),
          unitPrice: new Prisma.Decimal(String(line.unitPrice)),
          lineTotal: line.lineTotal,
        })),
      };
    }

    return this.prisma.quote.update({
      where: { id },
      data,
      include: QUOTE_INCLUDE,
    });
  }

  async remove(user: AuthUser, id: string) {
    const quote = await this.findScoped(id);
    this.assertCanWrite(user);

    if (quote.status !== QuoteStatus.draft) {
      throw conflictWithCode(
        'CONFLICT_QUOTE_LOCKED',
        'لا يمكن حذف عرض سعر مُرسل أو مُقفل؛ العرض مقفول',
      );
    }

    await this.prisma.quote.delete({ where: { id } });
    return { id, deleted: true };
  }

  async convertToInvoice(user: AuthUser, id: string) {
    this.ensureValidId(id);
    this.assertCanWrite(user);

    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id },
        include: { lines: true },
      });
      if (!quote) {
        throw new NotFoundException('عرض السعر غير موجود');
      }

      if (quote.status !== QuoteStatus.accepted) {
        throw new ConflictException(
          'لا يمكن تحويل عرض السعر إلى فاتورة إلا إذا كان مقبولاً',
        );
      }

      if (quote.convertedToInvoiceId) {
        return tx.invoice.findUnique({
          where: { id: quote.convertedToInvoiceId },
          include: INVOICE_INCLUDE,
        });
      }

      const invoice = await tx.invoice.create({
        data: {
          partnerId: quote.partnerId,
          createdByUserId: user.userId,
          objet: quote.objet,
          status: InvoiceStatus.draft,
          subtotal: quote.subtotal,
          tvaAmount: quote.tvaAmount,
          totalAmount: quote.totalAmount,
          quoteId: quote.id,
          lines: {
            create: quote.lines.map((line) => ({
              description: line.description,
              unit: line.unit ?? null,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: INVOICE_INCLUDE,
      });

      await tx.quote.update({
        where: { id },
        data: { convertedToInvoiceId: invoice.id },
      });

      return invoice;
    });
  }
}
