import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PartnerType, PartnerCurrency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { conflictWithCode } from '../common/errors/app-errors';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { ListPartnersDto } from './dto/list-partners.dto';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PURCHASE_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  orderDate: true,
  status: true,
  subtotal: true,
  tvaAmount: true,
  totalAmount: true,
  createdAt: true,
} as const;

const INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  issueDate: true,
  dueDate: true,
  status: true,
  subtotal: true,
  tvaAmount: true,
  totalAmount: true,
  createdAt: true,
} as const;

const PARTNER_INCLUDE = {
  contacts: true,
  categories: { select: { id: true, name: true } },
  invoices: {
    select: INVOICE_SELECT,
    orderBy: { issueDate: 'desc' as const },
  },
  purchaseOrders: {
    select: PURCHASE_ORDER_SELECT,
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

const PARTNER_NAMES: Record<PartnerType, string> = {
  [PartnerType.customer]: 'الزبون',
  [PartnerType.supplier]: 'المورد',
};

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  private partnerName(type: PartnerType): string {
    return PARTNER_NAMES[type];
  }

  private async ensureExists(id: string, type: PartnerType) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException(`${this.partnerName(type)} ${id} غير موجود`);
    }
    const existing = await this.prisma.partner.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`${this.partnerName(type)} ${id} غير موجود`);
    }
  }

  async create(createPartnerDto: CreatePartnerDto, type: PartnerType) {
    const { contacts, currency, categoryIds, ...partnerData } =
      createPartnerDto;

    try {
      return await this.prisma.partner.create({
        data: {
          ...partnerData,
          type,
          currency: currency ?? PartnerCurrency.DZD,
          contacts: contacts
            ? {
                create: contacts.map((contact) => ({
                  name: contact.name,
                  phone: contact.phone,
                  email: contact.email,
                  position: contact.position,
                  isPrimary: contact.isPrimary ?? false,
                })),
              }
            : undefined,
          categories: categoryIds
            ? { connect: categoryIds.map((id) => ({ id })) }
            : undefined,
        },
        include: PARTNER_INCLUDE,
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  private rethrowUniqueConflict(
    error: unknown,
    message = 'القيم المدخلة مكررة',
  ) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }

  async findAll(query: ListPartnersDto, type: PartnerType) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const categoryFilter = query.categoryId
      ? query.categoryId.includes(',')
        ? {
            categories: {
              some: {
                id: { in: query.categoryId.split(',') },
              },
            },
          }
        : { categories: { some: { id: query.categoryId } } }
      : {};

    const where = {
      type,
      isActive: true,
      ...categoryFilter,
      ...(query.search
        ? {
            OR: [
              {
                name: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                nif: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                commercialRegister: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        include: PARTNER_INCLUDE,
        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, type: PartnerType) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException(`${this.partnerName(type)} ${id} غير موجود`);
    }

    const partner = await this.prisma.partner.findUnique({
      where: { id, type },
      include: PARTNER_INCLUDE,
    });

    if (!partner) {
      throw new NotFoundException(`${this.partnerName(type)} ${id} غير موجود`);
    }

    return partner;
  }

  async update(
    id: string,
    updatePartnerDto: UpdatePartnerDto,
    type: PartnerType,
  ) {
    await this.ensureExists(id, type);

    const { contacts, categoryIds, ...partnerData } = updatePartnerDto;

    try {
      return await this.prisma.partner.update({
        where: { id },
        data: {
          ...partnerData,
          contacts:
            contacts !== undefined
              ? {
                  deleteMany: {},
                  create: contacts.map((contact) => ({
                    name: contact.name,
                    phone: contact.phone,
                    email: contact.email,
                    position: contact.position,
                    isPrimary: contact.isPrimary ?? false,
                  })),
                }
              : undefined,
          categories:
            categoryIds !== undefined
              ? { set: categoryIds.map((id) => ({ id })) }
              : undefined,
        },
        include: PARTNER_INCLUDE,
      });
    } catch (error) {
      this.rethrowUniqueConflict(error, 'رقم NIF مستخدم من قبل شريك آخر');
      throw error;
    }
  }

  async remove(id: string, type: PartnerType) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException(`${this.partnerName(type)} ${id} غير موجود`);
    }

    const partner = await this.prisma.partner.findUnique({
      where: { id, type },
      include: { invoices: true },
    });

    if (!partner) {
      throw new NotFoundException(`${this.partnerName(type)} ${id} غير موجود`);
    }

    if (partner.invoices.length > 0) {
      throw conflictWithCode(
        'CONFLICT_PARTNER_HAS_INVOICES',
        `لا يمكن حذف ${this.partnerName(type)} لأنه مرتبط بفواتير`,
      );
    }

    return this.prisma.partner.update({
      where: { id },
      data: { isActive: false },
      include: PARTNER_INCLUDE,
    });
  }
}
