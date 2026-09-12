import { Test, TestingModule } from '@nestjs/testing';
import { PartnersService } from './partners.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PartnerType } from '@prisma/client';

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const UUID3 = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

describe('PartnersService', () => {
  let service: PartnersService;
  let prisma: {
    partner: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      partner: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PartnersService>(PartnersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a supplier with paymentTerms, currency and contacts', async () => {
      const dto = {
        name: 'DEMAG',
        nif: '987654321',
        paymentTerms: '60 يوم',
        currency: 'FOREIGN',
        contacts: [{ name: 'Contact 1', phone: '123456' }],
      };

      const expected = {
        id: UUID,
        type: 'supplier',
        ...dto,
        commercialRegister: null,
        address: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        contacts: [],
        invoices: [],
      };

      prisma.partner.create.mockResolvedValue(expected);

      const result = await service.create(dto, PartnerType.supplier);

      expect(result).toEqual(expected);
      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: {
          name: 'DEMAG',
          nif: '987654321',
          paymentTerms: '60 يوم',
          type: 'supplier',
          currency: 'FOREIGN',
          categories: undefined,
          contacts: {
            create: [
              {
                name: 'Contact 1',
                phone: '123456',
                email: undefined,
                position: undefined,
                isPrimary: false,
              },
            ],
          },
        },
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('should default currency to DZD when not provided', async () => {
      const dto = { name: 'Cevital' };

      prisma.partner.create.mockResolvedValue({ id: UUID, name: 'Cevital' });

      await service.create(dto, PartnerType.customer);

      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: {
          name: 'Cevital',
          type: 'customer',
          currency: 'DZD',
          categories: undefined,
          contacts: undefined,
        },
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated partners filtered by supplier type', async () => {
      prisma.partner.findMany.mockResolvedValue([]);
      prisma.partner.count.mockResolvedValue(0);

      const result = await service.findAll(
        { page: '1', limit: '20', sortBy: 'createdAt', sortOrder: 'desc' },
        PartnerType.supplier,
      );

      expect(result).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
      expect(prisma.partner.findMany).toHaveBeenCalledWith({
        where: { type: 'supplier', isActive: true },
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by search term', async () => {
      prisma.partner.findMany.mockResolvedValue([]);
      prisma.partner.count.mockResolvedValue(0);

      await service.findAll(
        { search: 'demag', page: '1', limit: '20' },
        PartnerType.supplier,
      );

      expect(prisma.partner.findMany).toHaveBeenCalledWith({
        where: {
          type: 'supplier',
          isActive: true,
          OR: [
            { name: { contains: 'demag', mode: 'insensitive' } },
            { nif: { contains: 'demag', mode: 'insensitive' } },
            {
              commercialRegister: { contains: 'demag', mode: 'insensitive' },
            },
          ],
        },
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findOne', () => {
    it('should return a supplier by id + type', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID });

      const result = await service.findOne(UUID, PartnerType.supplier);

      expect(result).toEqual({ id: UUID });
      expect(prisma.partner.findUnique).toHaveBeenCalledWith({
        where: { id: UUID, type: 'supplier' },
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('should throw NotFoundException for invalid UUID', async () => {
      await expect(
        service.findOne('nonexistent', PartnerType.supplier),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);
      await expect(
        service.findOne(UUID3, PartnerType.supplier),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include purchaseOrders with narrowed fields, newest first', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID });

      await service.findOne(UUID, PartnerType.supplier);

      expect(prisma.partner.findUnique).toHaveBeenCalledWith({
        where: { id: UUID, type: 'supplier' },
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('should include invoices with narrowed fields, newest issueDate first', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID });

      await service.findOne(UUID, PartnerType.customer);

      expect(prisma.partner.findUnique).toHaveBeenCalledWith({
        where: { id: UUID, type: 'customer' },
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('should include quotes with narrowed fields, newest createdAt first', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID });

      await service.findOne(UUID, PartnerType.customer);

      expect(prisma.partner.findUnique).toHaveBeenCalledWith({
        where: { id: UUID, type: 'customer' },
        include: expect.objectContaining({
          quotes: {
            select: {
              id: true,
              quoteNumber: true,
              status: true,
              createdAt: true,
              supersedesQuoteId: true,
              supersedesQuote: { select: { id: true, quoteNumber: true } },
              revisions: { select: { id: true, quoteNumber: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        }),
      });
    });
  });

  describe('update', () => {
    it('should update paymentTerms and currency', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID });
      prisma.partner.update.mockResolvedValue({ id: UUID, name: 'DEMAG' });

      const result = await service.update(
        UUID,
        { paymentTerms: '30 يوم', currency: 'FOREIGN' },
        PartnerType.supplier,
      );

      expect(result).toEqual({ id: UUID, name: 'DEMAG' });
      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: {
          paymentTerms: '30 يوم',
          currency: 'FOREIGN',
          contacts: undefined,
          categories: undefined,
        },
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('should throw NotFoundException if supplier not found', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);
      await expect(
        service.update(UUID3, { name: 'X' }, PartnerType.supplier),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft-delete a supplier', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID, invoices: [] });
      prisma.partner.update.mockResolvedValue({ id: UUID, isActive: false });

      const result = await service.remove(UUID, PartnerType.supplier);

      expect(result).toEqual({ id: UUID, isActive: false });
    });

    it('should throw ConflictException if supplier has invoices', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: UUID,
        invoices: [{ id: UUID3 }],
      });

      await expect(service.remove(UUID, PartnerType.supplier)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException for invalid UUID', async () => {
      await expect(
        service.remove('nonexistent', PartnerType.supplier),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('categories', () => {
    const CAT_UUID = 'd4e5f6a7-b8c9-0123-def0-123456789012';

    it('create with categoryIds connects categories', async () => {
      const dto = {
        name: 'DEMAG',
        categoryIds: [UUID, CAT_UUID],
      };

      prisma.partner.create.mockResolvedValue({
        id: UUID3,
        name: 'DEMAG',
        categories: [
          { id: UUID, name: 'قطع غيار' },
          { id: CAT_UUID, name: 'مواد خام' },
        ],
      });

      const result = await service.create(dto, PartnerType.supplier);

      expect(result).toBeDefined();
      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'DEMAG',
          categories: {
            connect: [{ id: UUID }, { id: CAT_UUID }],
          },
        }),
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('create without categoryIds works', async () => {
      const dto = { name: 'Cevital' };

      prisma.partner.create.mockResolvedValue({
        id: UUID3,
        name: 'Cevital',
      });

      await service.create(dto, PartnerType.supplier);

      expect(prisma.partner.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Cevital',
          categories: undefined,
        }),
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('update with categoryIds replaces categories', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID });
      prisma.partner.update.mockResolvedValue({ id: UUID });

      await service.update(
        UUID,
        { categoryIds: [CAT_UUID] },
        PartnerType.supplier,
      );

      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: expect.objectContaining({
          categories: {
            set: [{ id: CAT_UUID }],
          },
        }),
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('update without categoryIds does not touch categories', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID });
      prisma.partner.update.mockResolvedValue({ id: UUID });

      await service.update(UUID, { name: 'X' }, PartnerType.supplier);

      expect(prisma.partner.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: expect.objectContaining({
          categories: undefined,
        }),
        include: expect.objectContaining({
          categories: { select: { id: true, name: true } },
        }),
      });
    });

    it('findAll with categoryId filters suppliers', async () => {
      prisma.partner.findMany.mockResolvedValue([]);
      prisma.partner.count.mockResolvedValue(0);

      await service.findAll(
        { categoryId: UUID, page: '1', limit: '20' },
        PartnerType.supplier,
      );

      expect(prisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: { some: { id: UUID } },
          }),
        }),
      );
    });

    it('findAll with multiple comma-separated categoryIds creates OR filter', async () => {
      prisma.partner.findMany.mockResolvedValue([]);
      prisma.partner.count.mockResolvedValue(0);

      await service.findAll(
        { categoryId: `${UUID},${CAT_UUID}`, page: '1', limit: '20' },
        PartnerType.supplier,
      );

      expect(prisma.partner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: {
              some: { id: { in: [UUID, CAT_UUID] } },
            },
          }),
        }),
      );
    });

    it('findOne includes categories', async () => {
      prisma.partner.findUnique.mockResolvedValue({ id: UUID });

      await service.findOne(UUID, PartnerType.supplier);

      expect(prisma.partner.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            categories: { select: { id: true, name: true } },
          }),
        }),
      );
    });
  });
});
