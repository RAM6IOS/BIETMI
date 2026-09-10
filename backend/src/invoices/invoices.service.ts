import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, InvoiceStatus, Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { computeTotals, round2 } from '../common/money';
import { normalizePaymentMethods } from '../common/payment-methods';
import {
  forbiddenWithCode,
  conflictWithCode,
} from '../common/errors/app-errors';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function parseDate(value?: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('التاريخ المُدخل غير صالح');
  }
  return date;
}

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private assertCanWrite(user: AuthUser) {
    if (user.role !== Role.admin && user.role !== Role.commercial) {
      throw forbiddenWithCode(
        'FORBIDDEN_INVOICE_WRITE',
        'لا تملك صلاحية إنشاء أو تعديل الفواتير',
      );
    }
  }

  private ensureValidId(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException('الفاتورة غير موجودة');
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
      throw new BadRequestException(`الفاتورة يجب أن ترتبط بـزبون`);
    }
  }

  async create(user: AuthUser, dto: CreateInvoiceDto) {
    this.assertCanWrite(user);
    await this.validatePartner(dto.partnerId);

    const { computed, subtotal, discountAmount, tvaAmount, totalAmount } =
      computeTotals(dto.lines, dto.discountPercent ?? 0);

    return this.prisma.invoice.create({
      data: {
        partnerId: dto.partnerId,
        createdByUserId: user.userId,
        issueDate: parseDate(dto.issueDate) ?? new Date(),
        dueDate: parseDate(dto.dueDate) ?? null,
        internalReference: dto.internalReference ?? null,
        objet: dto.objet ?? null,
        status: InvoiceStatus.draft,
        subtotal,
        discountPercent: round2(
          new Prisma.Decimal(String(dto.discountPercent ?? 0)),
        ),
        discountAmount,
        tvaAmount,
        totalAmount,
        paymentMethods:
        normalizePaymentMethods(dto.paymentMethods) ?? Prisma.DbNull,
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
      include: INVOICE_INCLUDE,
    });
  }

  async issue(user: AuthUser, id: string) {
    this.ensureValidId(id);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!invoice) {
        throw new NotFoundException('الفاتورة غير موجودة');
      }

      this.assertCanWrite(user);

      if (invoice.status !== InvoiceStatus.draft) {
        throw new ConflictException(
          'لا يمكن إصدار الفاتورة إلا من حالة المسودة',
        );
      }

      const year = new Date().getFullYear();
      const prefix = 'SALE';

      const rows = await tx.$queryRaw<
        Array<{ last_number: number }>
      >`INSERT INTO "invoice_counters" ("id", "year", "last_number")
        VALUES (${randomUUID()}::uuid, ${year}::int, 1)
        ON CONFLICT ("year")
        DO UPDATE SET "last_number" = "invoice_counters"."last_number" + 1
        RETURNING "last_number"`;

      const last = Number(rows[0].last_number);
      const invoiceNumber = `${prefix}-${year}-${String(last).padStart(5, '0')}`;

      return tx.invoice.update({
        where: { id },
        data: { invoiceNumber, status: InvoiceStatus.issued },
        include: INVOICE_INCLUDE,
      });
    });
  }

  async findAll(user: AuthUser, query: ListInvoicesDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                invoiceNumber: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                internalReference: {
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
      this.prisma.invoice.findMany({
        where,
        include: INVOICE_INCLUDE,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async findScoped(id: string) {
    this.ensureValidId(id);
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) {
      throw new NotFoundException('الفاتورة غير موجودة');
    }
    return invoice;
  }

  async findOne(user: AuthUser, id: string) {
    return this.findScoped(id);
  }

  async update(user: AuthUser, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.findScoped(id);
    this.assertCanWrite(user);

    const canEdit = invoice.status === InvoiceStatus.draft;
    if (!canEdit) {
      throw new ConflictException(
        'لا يمكن تعديل الفاتورة بعد إصدارها؛ الفاتورة مقفلة',
      );
    }

    const data: Prisma.InvoiceUpdateInput = {
      issueDate:
        dto.issueDate !== undefined ? parseDate(dto.issueDate) : undefined,
      dueDate:
        dto.dueDate !== undefined
          ? (parseDate(dto.dueDate) ?? null)
          : undefined,
      internalReference:
        dto.internalReference !== undefined ? dto.internalReference : undefined,
      objet: dto.objet !== undefined ? dto.objet : undefined,
      paymentMethods:
        dto.paymentMethods !== undefined
          ? (normalizePaymentMethods(dto.paymentMethods) ?? Prisma.DbNull)
          : undefined,
    };

    if (dto.partnerId !== undefined) {
      await this.validatePartner(dto.partnerId);
      data.partner = { connect: { id: dto.partnerId } };
    }

    if (dto.lines !== undefined || dto.discountPercent !== undefined) {
      const effectiveDiscountPercent =
        dto.discountPercent ?? Number(invoice.discountPercent ?? 0);
      const effectiveLines = dto.lines ?? [
        ...invoice.lines.map((line) => ({
          description: line.description,
          unit: line.unit ?? undefined,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
        })),
      ];

      const { computed, subtotal, discountAmount, tvaAmount, totalAmount } =
        computeTotals(effectiveLines, effectiveDiscountPercent);
      data.subtotal = subtotal;
      data.discountPercent = round2(
        new Prisma.Decimal(String(effectiveDiscountPercent)),
      );
      data.discountAmount = discountAmount;
      data.tvaAmount = tvaAmount;
      data.totalAmount = totalAmount;
      if (dto.lines !== undefined) {
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
    }

    return this.prisma.invoice.update({
      where: { id },
      data,
      include: INVOICE_INCLUDE,
    });
  }

  async remove(user: AuthUser, id: string) {
    const invoice = await this.findScoped(id);
    this.assertCanWrite(user);

    if (invoice.status !== InvoiceStatus.draft) {
      throw conflictWithCode(
        'CONFLICT_INVOICE_LOCKED',
        'لا يمكن حذف فاتورة صادرة أو مدفوعة؛ الفاتورة مقفلة',
      );
    }

    await this.prisma.invoice.delete({ where: { id } });
    return { id, deleted: true };
  }

  async outstanding(user: AuthUser, overdueOnly = false) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: [
            InvoiceStatus.issued,
            InvoiceStatus.partially_paid,
            InvoiceStatus.overdue,
          ],
        },
      },
      include: INVOICE_INCLUDE,
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const enriched = invoices.map((invoice) => {
      const notSettled =
        invoice.status === InvoiceStatus.issued ||
        invoice.status === InvoiceStatus.partially_paid;
      const isOverdue =
        notSettled && invoice.dueDate !== null && invoice.dueDate < now;
      return { ...invoice, isOverdue };
    });

    return overdueOnly ? enriched.filter((i) => i.isOverdue) : enriched;
  }
}
