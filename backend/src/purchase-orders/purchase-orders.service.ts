import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartnerType, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TVA_RATE = new Prisma.Decimal('0.19');

const COUNTER_ID = '00000000-0000-4000-8000-000000000000';

const PURCHASE_ORDER_INCLUDE = {
  supplier: { select: { id: true, name: true, type: true, nif: true } },
  createdBy: { select: { id: true, username: true, fullName: true } },
  lines: { orderBy: { id: 'asc' as const } },
} as const;

function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function computeTotals(
  lines: {
    description: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
  }[],
) {
  const computed = lines.map((line) => {
    const qty = new Prisma.Decimal(String(line.quantity));
    const price = new Prisma.Decimal(String(line.unitPrice));
    const lineTotal = round2(qty.mul(price));
    return { ...line, lineTotal };
  });

  let subtotal = new Prisma.Decimal(0);
  for (const line of computed) {
    subtotal = subtotal.plus(line.lineTotal);
  }
  subtotal = round2(subtotal);

  const tvaAmount = round2(subtotal.mul(TVA_RATE));
  const totalAmount = round2(subtotal.plus(tvaAmount));

  return { computed, subtotal, tvaAmount, totalAmount };
}

function parseDate(value?: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('التاريخ المُدخل غير صالح');
  }
  return date;
}

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureValidId(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException('طلب الشراء غير موجود');
    }
  }

  private async validateSupplier(supplierId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: supplierId },
    });
    if (!partner) {
      throw new BadRequestException('المورد المرتبط غير موجود');
    }
    if (partner.type !== PartnerType.supplier) {
      throw new BadRequestException('طلب الشراء يجب أن يرتبط بمورد');
    }
  }

  async create(user: AuthUser, dto: CreatePurchaseOrderDto) {
    await this.validateSupplier(dto.supplierId);

    const { computed, subtotal, tvaAmount, totalAmount } = computeTotals(
      dto.lines,
    );

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ last_number: number }>
      >`INSERT INTO "purchase_order_counters" ("id", "last_number")
        VALUES (${COUNTER_ID}::uuid, 1)
        ON CONFLICT ("id")
        DO UPDATE SET "last_number" = "purchase_order_counters"."last_number" + 1
        RETURNING "last_number"`;

      const last = Number(rows[0].last_number);
      const orderNumber = String(last).padStart(3, '0');

      return tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: dto.supplierId,
          createdByUserId: user.userId,
          orderDate: parseDate(dto.orderDate) ?? new Date(),
          status: PurchaseOrderStatus.draft,
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
        include: PURCHASE_ORDER_INCLUDE,
      });
    });
  }

  async findAll(user: AuthUser, query: ListPurchaseOrdersDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                supplier: {
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
      this.prisma.purchaseOrder.findMany({
        where,
        include: PURCHASE_ORDER_INCLUDE,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(user: AuthUser, id: string) {
    this.ensureValidId(id);
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: PURCHASE_ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('طلب الشراء غير موجود');
    }
    return order;
  }

  async send(user: AuthUser, id: string) {
    this.ensureValidId(id);
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException('طلب الشراء غير موجود');
    }
    if (order.status !== PurchaseOrderStatus.draft) {
      throw new ConflictException('هذا الطلب قد أُرسل من قبل');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.sent },
      include: PURCHASE_ORDER_INCLUDE,
    });
  }
}
