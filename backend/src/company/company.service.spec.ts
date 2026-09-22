/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma/prisma.service';
import { Workspace } from '@prisma/client';

const EXISTING = {
  id: '00000000-0000-4000-8000-000000000001',
  workspace: Workspace.production,
  name: 'EURL BIETMI PLUS',
  logoUrl: null,
  siegeSocial: 'Rue Palastine 42 N°03. Blida',
  ville: null,
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
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      company: {
        findUnique: jest.fn(),
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
    it('returns the company row for the caller workspace', async () => {
      prisma.company.findUnique.mockResolvedValue(EXISTING);

      const result = await service.get(Workspace.production);

      expect(result).toEqual(EXISTING);
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { workspace: Workspace.production },
      });
      expect(prisma.company.create).not.toHaveBeenCalled();
    });

    it('creates a default row scoped to the workspace when none exists', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue({
        ...EXISTING,
        workspace: Workspace.sandbox,
      });

      const result = await service.get(Workspace.sandbox);

      expect(prisma.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: expect.any(String),
          workspace: Workspace.sandbox,
          name: 'EURL BIETMI PLUS',
        }),
      });
      expect(result.workspace).toBe(Workspace.sandbox);
    });
  });

  describe('update', () => {
    it('updates the persisted row of the caller workspace', async () => {
      prisma.company.findUnique.mockResolvedValue(EXISTING);
      prisma.company.update.mockResolvedValue({
        ...EXISTING,
        mobile: '0660360549',
      });

      const result = await service.update(Workspace.production, {
        mobile: '0660360549',
      });

      expect(result.mobile).toBe('0660360549');
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { workspace: Workspace.production },
      });
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: EXISTING.id },
        data: { mobile: '0660360549' },
      });
    });

    it('creates the default row first if none exists', async () => {
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue(EXISTING);
      prisma.company.update.mockResolvedValue({
        ...EXISTING,
        rc: '16B 0809269',
      });

      const result = await service.update(Workspace.production, {
        rc: '16B 0809269',
      });

      expect(result.rc).toBe('16B 0809269');
      expect(prisma.company.create).toHaveBeenCalled();
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: EXISTING.id },
        data: { rc: '16B 0809269' },
      });
    });
  });
});
