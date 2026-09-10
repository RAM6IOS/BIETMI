import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PrismaService } from '../prisma/prisma.service';

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const SUPPLIER_ID = '11111111-2222-3333-4444-555555555555';
const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const ADMIN = { userId: USER_ID, role: Role.admin };
const PURCHASING = { userId: USER_ID, role: Role.purchasing };

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, type: true, nif: true } },
  createdBy: { select: { id: true, username: true, fullName: true } },
  lines: { orderBy: { id: 'asc' as const } },
} as const;

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let prisma: {
    purchaseOrder: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    partner: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      purchaseOrder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      partner: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    function mockTransaction() {
      const tx = {
        $queryRaw: jest.fn(),
        purchaseOrder: {
          create: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: typeof tx) => Promise<unknown>) => cb(tx),
      );
      return tx;
    }

    it('should assign the next sequential orderNumber and compute totals', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: SUPPLIER_ID,
        type: 'supplier',
      });
      const tx = mockTransaction();
      tx.$queryRaw.mockResolvedValue([{ last_number: 87 }]);
      tx.purchaseOrder.create.mockResolvedValue({ id: UUID });

      const result = await service.create(PURCHASING, {
        supplierId: SUPPLIER_ID,
        orderDate: '2026-05-10',
        lines: [
          { description: 'Ciment', unit: 'sac', quantity: 2, unitPrice: 100 },
        ],
      });

      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);

      expect(tx.purchaseOrder.create).toHaveBeenCalledWith({
        data: {
          supplierId: SUPPLIER_ID,
          createdByUserId: USER_ID,
          orderNumber: '087',
          orderDate: new Date('2026-05-10'),
          status: 'draft',
          subtotal: new Prisma.Decimal('200'),
          discountPercent: new Prisma.Decimal('0.00'),
          discountAmount: new Prisma.Decimal('0.00'),
          tvaAmount: new Prisma.Decimal('38'),
          totalAmount: new Prisma.Decimal('238'),
          paymentMethods: Prisma.DbNull,
          lines: {
            create: [
              {
                description: 'Ciment',
                unit: 'sac',
                quantity: new Prisma.Decimal('2'),
                unitPrice: new Prisma.Decimal('100'),
                lineTotal: new Prisma.Decimal('200'),
              },
            ],
          },
        },
        include: PO_INCLUDE,
      });
      expect(result.id).toBe(UUID);
    });

    it('should pad orderNumber with zeros for small numbers', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: SUPPLIER_ID,
        type: 'supplier',
      });
      const tx = mockTransaction();
      tx.$queryRaw.mockResolvedValue([{ last_number: 9 }]);
      tx.purchaseOrder.create.mockResolvedValue({
        id: UUID,
        orderNumber: '009',
      });

      await service.create(PURCHASING, {
        supplierId: SUPPLIER_ID,
        orderDate: '2026-05-10',
        lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.purchaseOrder.create).toHaveBeenCalledWith({
        data: {
          supplierId: SUPPLIER_ID,
          createdByUserId: USER_ID,
          orderNumber: '009',
          orderDate: new Date('2026-05-10'),
          status: 'draft',
          subtotal: new Prisma.Decimal('10'),
          discountPercent: new Prisma.Decimal('0.00'),
          discountAmount: new Prisma.Decimal('0.00'),
          tvaAmount: new Prisma.Decimal('1.9'),
          totalAmount: new Prisma.Decimal('11.9'),
          paymentMethods: Prisma.DbNull,
          lines: {
            create: [
              {
                description: 'A',
                unit: null,
                quantity: new Prisma.Decimal('1'),
                unitPrice: new Prisma.Decimal('10'),
                lineTotal: new Prisma.Decimal('10'),
              },
            ],
          },
        },
        include: PO_INCLUDE,
      });
    });

    it('should apply a discount and compute TVA on the amount after discount', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: SUPPLIER_ID,
        type: 'supplier',
      });
      const tx = mockTransaction();
      tx.$queryRaw.mockResolvedValue([{ last_number: 10 }]);
      tx.purchaseOrder.create.mockResolvedValue({ id: UUID });

      await service.create(PURCHASING, {
        supplierId: SUPPLIER_ID,
        orderDate: '2026-05-10',
        discountPercent: 5,
        paymentMethods: [{ label: 'Paiement comptant', percentage: 100 }],
        lines: [
          {
            description: 'Item A',
            unit: 'U',
            quantity: 3,
            unitPrice: 11.87,
          },
        ],
      });

      expect(tx.purchaseOrder.create).toHaveBeenCalledWith({
        data: {
          supplierId: SUPPLIER_ID,
          createdByUserId: USER_ID,
          orderNumber: '010',
          orderDate: new Date('2026-05-10'),
          status: 'draft',
          subtotal: new Prisma.Decimal('35.61'),
          discountPercent: new Prisma.Decimal('5.00'),
          discountAmount: new Prisma.Decimal('1.78'),
          tvaAmount: new Prisma.Decimal('6.43'),
          totalAmount: new Prisma.Decimal('40.26'),
          paymentMethods: [{ label: 'Paiement comptant', percentage: 100 }],
          lines: {
            create: [
              {
                description: 'Item A',
                unit: 'U',
                quantity: new Prisma.Decimal('3'),
                unitPrice: new Prisma.Decimal('11.87'),
                lineTotal: new Prisma.Decimal('35.61'),
              },
            ],
          },
        },
        include: PO_INCLUDE,
      });
    });

    it('should reject an order linked to a customer partner', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: SUPPLIER_ID,
        type: 'customer',
      });

      await expect(
        service.create(PURCHASING, {
          supplierId: SUPPLIER_ID,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject an order linked to a missing partner', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);

      await expect(
        service.create(PURCHASING, {
          supplierId: SUPPLIER_ID,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not start a transaction when supplier validation fails', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);

      await expect(
        service.create(PURCHASING, {
          supplierId: SUPPLIER_ID,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should transition a draft order to sent', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue({
        id: UUID,
        status: 'draft',
      });
      prisma.purchaseOrder.update.mockResolvedValue({
        id: UUID,
        status: 'sent',
      });

      const result = await service.send(ADMIN, UUID);

      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: { status: 'sent' },
        include: PO_INCLUDE,
      });
      expect(result.status).toBe('sent');
    });

    it('should reject sending an already-sent order (409)', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue({
        id: UUID,
        status: 'sent',
      });

      await expect(service.send(ADMIN, UUID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw 404 for a missing order', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(null);

      await expect(service.send(ADMIN, UUID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw 404 for a malformed id', async () => {
      await expect(service.send(ADMIN, 'not-a-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should apply search across orderNumber and supplier name', async () => {
      prisma.purchaseOrder.findMany.mockResolvedValue([]);
      prisma.purchaseOrder.count.mockResolvedValue(0);

      await service.findAll(ADMIN, { search: 'ciment' });

      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              orderNumber: {
                contains: 'ciment',
                mode: 'insensitive',
              },
            },
            {
              supplier: {
                is: {
                  name: {
                    contains: 'ciment',
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        },
        include: PO_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by status', async () => {
      prisma.purchaseOrder.findMany.mockResolvedValue([]);
      prisma.purchaseOrder.count.mockResolvedValue(0);

      await service.findAll(ADMIN, { status: 'sent' });

      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith({
        where: { status: 'sent' },
        include: PO_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should return paginated metadata', async () => {
      prisma.purchaseOrder.findMany.mockResolvedValue([]);
      prisma.purchaseOrder.count.mockResolvedValue(3);

      const result = await service.findAll(ADMIN, { page: '2', limit: '5' });

      expect(result.meta).toEqual({
        total: 3,
        page: 2,
        limit: 5,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a purchase order with supplier and lines', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue({
        id: UUID,
        orderNumber: '087',
        supplier: {},
        lines: [],
      });

      const result = await service.findOne(ADMIN, UUID);

      expect(prisma.purchaseOrder.findUnique).toHaveBeenCalledWith({
        where: { id: UUID },
        include: PO_INCLUDE,
      });
      expect(result.id).toBe(UUID);
    });

    it('should throw 404 for a missing order', async () => {
      prisma.purchaseOrder.findUnique.mockResolvedValue(null);

      await expect(service.findOne(ADMIN, UUID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw 404 for a malformed id', async () => {
      await expect(service.findOne(ADMIN, 'not-a-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
