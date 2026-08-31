import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, InvoiceStatus, Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const PARTNER_ID = '11111111-2222-3333-4444-555555555555';
const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const ADMIN = { userId: USER_ID, role: Role.admin };
const COMMERCIAL = { userId: USER_ID, role: Role.commercial };
const PURCHASING = { userId: USER_ID, role: Role.purchasing };
const ACCOUNTANT = { userId: USER_ID, role: Role.accountant };

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
  lines: { orderBy: { id: 'asc' } },
};

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: {
    invoice: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    partner: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      invoice: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      partner: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a draft sale invoice and compute amounts server-side', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: PARTNER_ID,
        type: 'customer',
      });
      prisma.invoice.create.mockResolvedValue({ id: UUID, status: 'draft' });

      await service.create(COMMERCIAL, {
        partnerId: PARTNER_ID,
        issueDate: '2026-01-15',
        dueDate: '2026-02-15',
        lines: [
          { description: 'Item A', quantity: 2, unitPrice: 100 },
          { description: 'Item B', quantity: 1, unitPrice: 50 },
        ],
      });

      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: {
          partnerId: PARTNER_ID,
          createdByUserId: USER_ID,
          issueDate: new Date('2026-01-15'),
          dueDate: new Date('2026-02-15'),
          internalReference: null,
          objet: null,
          status: 'draft',
          subtotal: new Prisma.Decimal('250'),
          tvaAmount: new Prisma.Decimal('47.5'),
          totalAmount: new Prisma.Decimal('297.5'),
          lines: {
            create: [
              {
                description: 'Item A',
                unit: null,
                quantity: new Prisma.Decimal('2'),
                unitPrice: new Prisma.Decimal('100'),
                lineTotal: new Prisma.Decimal('200'),
              },
              {
                description: 'Item B',
                unit: null,
                quantity: new Prisma.Decimal('1'),
                unitPrice: new Prisma.Decimal('50'),
                lineTotal: new Prisma.Decimal('50'),
              },
            ],
          },
        },
        include: INVOICE_INCLUDE,
      });
    });

    it('should reject an invoice linked to a supplier', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: PARTNER_ID,
        type: 'supplier',
      });
      await expect(
        service.create(COMMERCIAL, {
          partnerId: PARTNER_ID,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should forbid purchasing from creating any invoice', async () => {
      await expect(
        service.create(PURCHASING, {
          partnerId: PARTNER_ID,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid accountant from creating any invoice', async () => {
      await expect(
        service.create(ACCOUNTANT, {
          partnerId: PARTNER_ID,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should round each lineTotal before summing (line-item rounding) — not sum-then-round', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: PARTNER_ID,
        type: 'customer',
      });
      prisma.invoice.create.mockResolvedValue({ id: UUID, status: 'draft' });

      // Raw products: 23.345, 6.675, 5.575 → sum = 35.595
      // If we summed first then rounded: round2(35.595) = 35.60
      // Line-item rounding: 23.35 + 6.68 + 5.58 = 35.61  ← correct
      // TVA: round2(35.61 × 0.19) = 6.77 | total: 35.61 + 6.77 = 42.38
      await service.create(ADMIN, {
        partnerId: PARTNER_ID,
        issueDate: '2026-01-15',
        dueDate: '2026-02-15',
        lines: [
          { description: 'Line A', quantity: 7, unitPrice: 3.335 },
          { description: 'Line B', quantity: 3, unitPrice: 2.225 },
          { description: 'Line C', quantity: 5, unitPrice: 1.115 },
        ],
      });

      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: {
          partnerId: PARTNER_ID,
          createdByUserId: USER_ID,
          issueDate: new Date('2026-01-15'),
          dueDate: new Date('2026-02-15'),
          internalReference: null,
          objet: null,
          status: 'draft',
          subtotal: new Prisma.Decimal('35.61'),
          tvaAmount: new Prisma.Decimal('6.77'),
          totalAmount: new Prisma.Decimal('42.38'),
          lines: {
            create: [
              {
                description: 'Line A',
                unit: null,
                quantity: new Prisma.Decimal('7'),
                unitPrice: new Prisma.Decimal('3.335'),
                lineTotal: new Prisma.Decimal('23.35'),
              },
              {
                description: 'Line B',
                unit: null,
                quantity: new Prisma.Decimal('3'),
                unitPrice: new Prisma.Decimal('2.225'),
                lineTotal: new Prisma.Decimal('6.68'),
              },
              {
                description: 'Line C',
                unit: null,
                quantity: new Prisma.Decimal('5'),
                unitPrice: new Prisma.Decimal('1.115'),
                lineTotal: new Prisma.Decimal('5.58'),
              },
            ],
          },
        },
        include: INVOICE_INCLUDE,
      });
    });
  });

  describe('issue', () => {
    function mockTransaction() {
      const tx = {
        invoice: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        $queryRaw: jest.fn(),
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: typeof tx) => Promise<unknown>) => cb(tx),
      );
      return tx;
    }

    it('should assign a sequential invoiceNumber and set issued', async () => {
      const tx = mockTransaction();
      tx.invoice.findUnique.mockResolvedValue({
        id: UUID,
        status: 'draft',
        lines: [],
      });
      tx.$queryRaw.mockResolvedValue([{ last_number: 1 }]);
      tx.invoice.update.mockResolvedValue({
        id: UUID,
        invoiceNumber: 'SALE-2026-00001',
        status: 'issued',
      });

      const result = await service.issue(ADMIN, UUID);

      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.invoice.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: { invoiceNumber: 'SALE-2026-00001', status: 'issued' },
        include: INVOICE_INCLUDE,
      });
      expect(result.invoiceNumber).toBe('SALE-2026-00001');
      expect(result.status).toBe('issued');
    });

    it('should reject issuing a non-draft invoice', async () => {
      const tx = mockTransaction();
      tx.invoice.findUnique.mockResolvedValue({
        id: UUID,
        status: 'issued',
        lines: [],
      });

      await expect(service.issue(ADMIN, UUID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should forbid issuing by a non-write role (accountant)', async () => {
      const tx = mockTransaction();
      tx.invoice.findUnique.mockResolvedValue({
        id: UUID,
        status: 'draft',
        lines: [],
      });

      await expect(service.issue(ACCOUNTANT, UUID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should list invoices without type scoping', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAll(COMMERCIAL, {});

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: {},
        include: INVOICE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should filter by status', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(0);

      await service.findAll(ADMIN, { status: InvoiceStatus.issued });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { status: 'issued' },
        include: INVOICE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should return paginated metadata', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.invoice.count.mockResolvedValue(3);

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
    it('should allow accountant to read an invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: UUID,
        partner: {},
        lines: [],
      });

      const result = await service.findOne(ACCOUNTANT, UUID);
      expect(result.id).toBe(UUID);
    });
  });

  describe('update', () => {
    it('should recompute amounts when lines change on a draft', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: UUID,
        status: 'draft',
        partner: {},
        lines: [],
      });
      prisma.invoice.update.mockResolvedValue({ id: UUID });

      await service.update(COMMERCIAL, UUID, {
        lines: [{ description: 'X', quantity: 3, unitPrice: 100 }],
      });

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: {
          issueDate: undefined,
          dueDate: undefined,
          internalReference: undefined,
          subtotal: new Prisma.Decimal('300'),
          tvaAmount: new Prisma.Decimal('57'),
          totalAmount: new Prisma.Decimal('357'),
          lines: {
            deleteMany: {},
            create: [
              {
                description: 'X',
                unit: null,
                quantity: new Prisma.Decimal('3'),
                unitPrice: new Prisma.Decimal('100'),
                lineTotal: new Prisma.Decimal('300'),
              },
            ],
          },
        },
        include: INVOICE_INCLUDE,
      });
    });

    it('should reject updates on issued invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: UUID,
        status: 'issued',
        partner: {},
        lines: [],
      });

      await expect(
        service.update(COMMERCIAL, UUID, { internalReference: 'x' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a draft invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: UUID,
        status: 'draft',
        partner: {},
        lines: [],
      });
      prisma.invoice.delete.mockResolvedValue({ id: UUID });

      const result = await service.remove(COMMERCIAL, UUID);

      expect(prisma.invoice.delete).toHaveBeenCalledWith({
        where: { id: UUID },
      });
      expect(result.deleted).toBe(true);
    });

    it('should reject deleting an issued invoice', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: UUID,
        status: 'issued',
        partner: {},
        lines: [],
      });

      await expect(service.remove(COMMERCIAL, UUID)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('outstanding', () => {
    it('should exclude drafts and mark overdue when dueDate passed', async () => {
      const now = new Date();
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: UUID,
          status: 'issued',
          dueDate: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
        },
        {
          id: UUID,
          status: 'paid',
        },
      ]);

      const result = await service.outstanding(ADMIN);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { status: { in: ['issued', 'partially_paid', 'overdue'] } },
        include: INVOICE_INCLUDE,
        orderBy: { dueDate: 'asc' },
      });
      expect(result[0].isOverdue).toBe(true);
      expect(result[1].isOverdue).toBe(false);
    });

    it('should filter to overdue-only when requested', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: UUID,
          status: 'issued',
          dueDate: new Date(Date.now() - 1000),
        },
      ]);

      const result = await service.outstanding(ADMIN, true);

      expect(result).toHaveLength(1);
    });
  });
});
