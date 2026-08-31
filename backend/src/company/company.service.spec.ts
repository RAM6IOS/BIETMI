import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma/prisma.service';

const COMPANY_ID = '00000000-0000-4000-8000-000000000001';

const EXISTING = {
  id: COMPANY_ID,
  name: 'EURL BIETMI PLUS',
  logoUrl: null,
  siegeSocial: 'Rue Palastine 42 N°03. Blida',
  mobile: null,
  telFax: null,
  rc: null,
  nif: null,
  ain: null,
  banqueBaraka: null,
  updatedAt: new Date('2026-08-29T00:00:00.000Z'),
};

describe('CompanyService', () => {
  let service: CompanyService;
  let prisma: {
    company: {
      findUnique: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      company: {
        findUnique: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('returns the existing company row for the fixed id', async () => {
      prisma.company.findUnique.mockResolvedValue(EXISTING);

      const result = await service.get();

      expect(result).toEqual(EXISTING);
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
      });
      expect(prisma.company.count).not.toHaveBeenCalled();
    });

    it('creates the default row when no company exists', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.count.mockResolvedValue(0);
      prisma.company.create.mockResolvedValue({
        ...EXISTING,
        name: 'EURL BIETMI PLUS',
      });

      const result = await service.get();

      expect(result.name).toBe('EURL BIETMI PLUS');
      expect(prisma.company.create).toHaveBeenCalledWith({
        data: {
          id: COMPANY_ID,
          name: 'EURL BIETMI PLUS',
          logoUrl: null,
          siegeSocial: null,
          mobile: null,
          telFax: null,
          rc: null,
          nif: null,
          ain: null,
          banqueBaraka: null,
        },
      });
    });

    it('falls back to an existing row with a different id', async () => {
      const other = { ...EXISTING, id: '11111111-2222-3333-4444-555555555555' };
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.count.mockResolvedValue(1);
      prisma.company.findFirst.mockResolvedValue(other);

      const result = await service.get();

      expect(result).toEqual(other);
    });
  });

  describe('update', () => {
    it('updates the persisted row with the dto data', async () => {
      prisma.company.findUnique.mockResolvedValue(EXISTING);
      prisma.company.update.mockResolvedValue({
        ...EXISTING,
        mobile: '0660360549',
      });

      const result = await service.update({ mobile: '0660360549' });

      expect(result.mobile).toBe('0660360549');
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
        data: { mobile: '0660360549' },
      });
    });

    it('creates the default row first if none exists', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.count.mockResolvedValue(0);
      prisma.company.create.mockResolvedValue(EXISTING);
      prisma.company.update.mockResolvedValue({
        ...EXISTING,
        rc: '16B 0809269',
      });

      const result = await service.update({ rc: '16B 0809269' });

      expect(result.rc).toBe('16B 0809269');
      expect(prisma.company.create).toHaveBeenCalled();
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
        data: { rc: '16B 0809269' },
      });
    });
  });
});
