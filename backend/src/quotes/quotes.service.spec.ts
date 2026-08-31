import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuoteStatus, InvoiceStatus, Role } from '@prisma/client';
import { QuotesService } from './quotes.service';
import { PrismaService } from '../prisma/prisma.service';

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const PARTNER_ID = '11111111-2222-3333-4444-555555555555';
const USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const ADMIN = { userId: USER_ID, role: Role.admin };
const COMMERCIAL = { userId: USER_ID, role: Role.commercial };
const PURCHASING = { userId: USER_ID, role: Role.purchasing };
const ACCOUNTANT = { userId: USER_ID, role: Role.accountant };

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

function stdLine(overrides: { quantity?: number; unitPrice?: number } = {}) {
  return {
    description: 'Widget',
    quantity: overrides.quantity ?? 2,
    unitPrice: overrides.unitPrice ?? 100,
  };
}

describe('QuotesService', () => {
  let service: QuotesService;
  let prisma: {
    quote: {
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
      quote: {
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
      providers: [QuotesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    function mockTransaction() {
      const tx = {
        $queryRaw: jest.fn(),
        quote: { create: jest.fn() },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: typeof tx) => Promise<unknown>) => cb(tx),
      );
      return tx;
    }

    it('should create a draft quote with sequential number and computed amounts', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: PARTNER_ID,
        type: 'customer',
      });
      const tx = mockTransaction();
      tx.$queryRaw.mockResolvedValue([{ last_number: 1 }]);
      tx.quote.create.mockResolvedValue({
        id: UUID,
        quoteNumber: '001',
        status: 'draft',
      });

      const result = await service.create(COMMERCIAL, {
        partnerId: PARTNER_ID,
        lines: [stdLine()],
      });

      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.quote.create).toHaveBeenCalledWith({
        data: {
          quoteNumber: '001',
          partnerId: PARTNER_ID,
          createdByUserId: USER_ID,
          objet: null,
          status: QuoteStatus.draft,
          subtotal: new Prisma.Decimal('200'),
          tvaAmount: new Prisma.Decimal('38'),
          totalAmount: new Prisma.Decimal('238'),
          lines: {
            create: [
              {
                description: 'Widget',
                unit: null,
                quantity: new Prisma.Decimal('2'),
                unitPrice: new Prisma.Decimal('100'),
                lineTotal: new Prisma.Decimal('200'),
              },
            ],
          },
        },
        include: QUOTE_INCLUDE,
      });
      expect(result.quoteNumber).toBe('001');
    });

    it('should apply per-line rounding and pad numbers to 3 digits', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: PARTNER_ID,
        type: 'customer',
      });
      const tx = mockTransaction();
      tx.$queryRaw.mockResolvedValue([{ last_number: 21 }]);
      tx.quote.create.mockResolvedValue({ id: UUID, quoteNumber: '021' });

      await service.create(ADMIN, {
        partnerId: PARTNER_ID,
        lines: [
          { description: 'Line A', quantity: 7, unitPrice: 3.335 },
          { description: 'Line B', quantity: 3, unitPrice: 2.225 },
          { description: 'Line C', quantity: 5, unitPrice: 1.115 },
        ],
      });

      expect(tx.quote.create).toHaveBeenCalledWith({
        data: {
          quoteNumber: '021',
          partnerId: PARTNER_ID,
          createdByUserId: USER_ID,
          objet: null,
          status: QuoteStatus.draft,
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
        include: QUOTE_INCLUDE,
      });
    });

    it('should reject a quote linked to a supplier', async () => {
      prisma.partner.findUnique.mockResolvedValue({
        id: PARTNER_ID,
        type: 'supplier',
      });
      await expect(
        service.create(COMMERCIAL, {
          partnerId: PARTNER_ID,
          lines: [stdLine()],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a quote linked to a missing partner', async () => {
      prisma.partner.findUnique.mockResolvedValue(null);
      await expect(
        service.create(COMMERCIAL, {
          partnerId: PARTNER_ID,
          lines: [stdLine()],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should forbid purchasing from creating any quote', async () => {
      await expect(
        service.create(PURCHASING, {
          partnerId: PARTNER_ID,
          lines: [stdLine()],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid accountant from creating any quote', async () => {
      await expect(
        service.create(ACCOUNTANT, {
          partnerId: PARTNER_ID,
          lines: [stdLine()],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should list quotes with pagination metadata', async () => {
      prisma.quote.findMany.mockResolvedValue([]);
      prisma.quote.count.mockResolvedValue(3);

      const result = await service.findAll(COMMERCIAL, {
        page: '2',
        limit: '5',
      });

      expect(prisma.quote.findMany).toHaveBeenCalledWith({
        where: {},
        include: QUOTE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: 5,
        take: 5,
      });
      expect(result.meta).toEqual({
        total: 3,
        page: 2,
        limit: 5,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      prisma.quote.findMany.mockResolvedValue([]);
      prisma.quote.count.mockResolvedValue(0);

      await service.findAll(ADMIN, { status: QuoteStatus.sent });

      expect(prisma.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'sent' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a quote', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        quoteNumber: '001',
        status: 'draft',
        lines: [],
      });

      const result = await service.findOne(COMMERCIAL, UUID);
      expect(result.id).toBe(UUID);
      expect(prisma.quote.findUnique).toHaveBeenCalledWith({
        where: { id: UUID },
        include: QUOTE_INCLUDE,
      });
    });

    it('should throw NotFound for a missing quote', async () => {
      prisma.quote.findUnique.mockResolvedValue(null);
      await expect(service.findOne(COMMERCIAL, UUID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('send', () => {
    function mockQuote(status: QuoteStatus) {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status,
        convertedToInvoiceId: null,
      });
      prisma.quote.update.mockResolvedValue({ id: UUID, status: 'sent' });
    }

    it('should send a draft quote (draft → sent)', async () => {
      mockQuote(QuoteStatus.draft);
      const result = await service.send(COMMERCIAL, UUID);
      expect(result.status).toBe('sent');
      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: { status: QuoteStatus.sent },
        include: QUOTE_INCLUDE,
      });
    });

    it('should resend a revision_requested quote', async () => {
      mockQuote(QuoteStatus.revision_requested);
      const result = await service.send(COMMERCIAL, UUID);
      expect(result.status).toBe('sent');
    });

    it('should reject sending an accepted quote', async () => {
      mockQuote(QuoteStatus.accepted);
      await expect(service.send(COMMERCIAL, UUID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFound for a missing quote', async () => {
      prisma.quote.findUnique.mockResolvedValue(null);
      await expect(service.send(COMMERCIAL, UUID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should accept a sent quote', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: QuoteStatus.sent,
      });
      prisma.quote.update.mockResolvedValue({ id: UUID, status: 'accepted' });

      const result = await service.updateStatus(COMMERCIAL, UUID, {
        status: QuoteStatus.accepted,
      });
      expect(result.status).toBe('accepted');
    });

    it('should reject a sent quote', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: QuoteStatus.sent,
      });
      prisma.quote.update.mockResolvedValue({ id: UUID, status: 'rejected' });

      const result = await service.updateStatus(COMMERCIAL, UUID, {
        status: QuoteStatus.rejected,
      });
      expect(result.status).toBe('rejected');
    });

    it('should request revision on a sent quote', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: QuoteStatus.sent,
      });
      prisma.quote.update.mockResolvedValue({
        id: UUID,
        status: 'revision_requested',
      });

      const result = await service.updateStatus(COMMERCIAL, UUID, {
        status: QuoteStatus.revision_requested,
      });
      expect(result.status).toBe('revision_requested');
    });

    it('should reject a status change from draft directly', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: QuoteStatus.draft,
      });

      await expect(
        service.updateStatus(COMMERCIAL, UUID, {
          status: QuoteStatus.accepted,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject a status change from terminal accepted', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: QuoteStatus.accepted,
      });

      await expect(
        service.updateStatus(COMMERCIAL, UUID, {
          status: QuoteStatus.revision_requested,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    function mockQuote(status: QuoteStatus) {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status,
        partner: {},
        lines: [],
      });
      prisma.quote.update.mockResolvedValue({ id: UUID });
    }

    it('should edit a draft quote and recompute amounts', async () => {
      mockQuote(QuoteStatus.draft);

      await service.update(COMMERCIAL, UUID, {
        objet: 'Devis clim',
        lines: [{ description: 'X', quantity: 3, unitPrice: 100 }],
      });

      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: {
          objet: 'Devis clim',
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
        include: QUOTE_INCLUDE,
      });
    });

    it('should edit a revision_requested quote', async () => {
      mockQuote(QuoteStatus.revision_requested);
      await service.update(COMMERCIAL, UUID, { objet: 'revised' });
      expect(prisma.quote.update).toHaveBeenCalled();
    });

    it('should reject editing an accepted quote', async () => {
      mockQuote(QuoteStatus.accepted);
      await expect(
        service.update(COMMERCIAL, UUID, { objet: 'x' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate the new partner is a customer', async () => {
      mockQuote(QuoteStatus.draft);
      prisma.partner.findUnique.mockResolvedValue({
        id: PARTNER_ID,
        type: 'supplier',
      });

      await expect(
        service.update(COMMERCIAL, UUID, { partnerId: PARTNER_ID }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a draft quote', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: 'draft',
        lines: [],
      });
      prisma.quote.delete.mockResolvedValue({ id: UUID });

      const result = await service.remove(COMMERCIAL, UUID);
      expect(prisma.quote.delete).toHaveBeenCalledWith({ where: { id: UUID } });
      expect(result.deleted).toBe(true);
    });

    it('should reject deleting an accepted quote', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: 'accepted',
        lines: [],
      });

      await expect(service.remove(COMMERCIAL, UUID)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('convertToInvoice', () => {
    function mockTransaction() {
      const tx = {
        quote: { findUnique: jest.fn(), update: jest.fn() },
        invoice: { create: jest.fn(), findUnique: jest.fn() },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (tx: typeof tx) => Promise<unknown>) => cb(tx),
      );
      return tx;
    }

    it('should create a draft invoice from an accepted quote and link both sides', async () => {
      const tx = mockTransaction();
      tx.quote.findUnique.mockResolvedValue({
        id: UUID,
        partnerId: PARTNER_ID,
        objet: 'Devis clim',
        status: QuoteStatus.accepted,
        convertedToInvoiceId: null,
        subtotal: new Prisma.Decimal('200'),
        tvaAmount: new Prisma.Decimal('38'),
        totalAmount: new Prisma.Decimal('238'),
        lines: [
          {
            id: 'l1',
            quoteId: UUID,
            description: 'Widget',
            unit: null,
            quantity: new Prisma.Decimal('2'),
            unitPrice: new Prisma.Decimal('100'),
            lineTotal: new Prisma.Decimal('200'),
          },
        ],
      });
      tx.invoice.create.mockResolvedValue({
        id: 'invoice-1',
        status: 'draft',
        quoteId: UUID,
        lines: [],
      });
      tx.quote.update.mockResolvedValue({ id: UUID });

      const result = await service.convertToInvoice(ADMIN, UUID);

      expect(tx.invoice.create).toHaveBeenCalledWith({
        data: {
          partnerId: PARTNER_ID,
          createdByUserId: USER_ID,
          objet: 'Devis clim',
          status: InvoiceStatus.draft,
          subtotal: new Prisma.Decimal('200'),
          tvaAmount: new Prisma.Decimal('38'),
          totalAmount: new Prisma.Decimal('238'),
          quoteId: UUID,
          lines: {
            create: [
              {
                description: 'Widget',
                unit: null,
                quantity: new Prisma.Decimal('2'),
                unitPrice: new Prisma.Decimal('100'),
                lineTotal: new Prisma.Decimal('200'),
              },
            ],
          },
        },
        include: INVOICE_INCLUDE,
      });
      expect(tx.quote.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: { convertedToInvoiceId: 'invoice-1' },
      });
      expect(result.id).toBe('invoice-1');
    });

    it('should return the existing invoice on a second call (idempotent)', async () => {
      const tx = mockTransaction();
      tx.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: QuoteStatus.accepted,
        convertedToInvoiceId: 'invoice-1',
        lines: [],
      });
      tx.invoice.findUnique.mockResolvedValue({
        id: 'invoice-1',
        status: 'draft',
      });

      const result = await service.convertToInvoice(ADMIN, UUID);

      expect(tx.invoice.create).not.toHaveBeenCalled();
      expect(result.id).toBe('invoice-1');
    });

    it('should reject converting a non-accepted quote', async () => {
      const tx = mockTransaction();
      tx.quote.findUnique.mockResolvedValue({
        id: UUID,
        status: QuoteStatus.sent,
        convertedToInvoiceId: null,
        lines: [],
      });

      await expect(service.convertToInvoice(ADMIN, UUID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFound for a missing quote', async () => {
      const tx = mockTransaction();
      tx.quote.findUnique.mockResolvedValue(null);

      await expect(service.convertToInvoice(ADMIN, UUID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
