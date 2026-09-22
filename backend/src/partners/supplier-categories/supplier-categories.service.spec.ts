import { Test, TestingModule } from '@nestjs/testing';
import { SupplierCategoriesService } from './supplier-categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Workspace } from '@prisma/client';

const UUID1 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const UUID2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

describe('SupplierCategoriesService', () => {
  let service: SupplierCategoriesService;
  let prisma: {
    supplierCategory: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      supplierCategory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierCategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SupplierCategoriesService>(SupplierCategoriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns all categories ordered by name asc', async () => {
      const categories = [
        { id: UUID1, name: 'قطع غيار', createdAt: new Date() },
        { id: UUID2, name: 'مواد خام', createdAt: new Date() },
      ];
      prisma.supplierCategory.findMany.mockResolvedValue(categories);

      const result = await service.findAll(Workspace.sandbox);

      expect(result).toEqual(categories);
      expect(prisma.supplierCategory.findMany).toHaveBeenCalledWith({
        where: { workspace: Workspace.sandbox },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns a category by id', async () => {
      const category = { id: UUID1, name: 'قطع غيار', createdAt: new Date() };
      prisma.supplierCategory.findUnique.mockResolvedValue(category);

      const result = await service.findOne(UUID1, Workspace.sandbox);

      expect(result).toEqual(category);
      expect(prisma.supplierCategory.findUnique).toHaveBeenCalledWith({
        where: { id: UUID1, workspace: Workspace.sandbox },
      });
    });

    it('throws NotFoundException for non-existent id', async () => {
      prisma.supplierCategory.findUnique.mockResolvedValue(null);

      await expect(service.findOne(UUID1, Workspace.sandbox)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a category with the given name', async () => {
      const category = { id: UUID1, name: 'قطع غيار', createdAt: new Date() };
      prisma.supplierCategory.create.mockResolvedValue(category);

      const result = await service.create(
        { name: 'قطع غيار' },
        Workspace.sandbox,
      );

      expect(result).toEqual(category);
      expect(prisma.supplierCategory.create).toHaveBeenCalledWith({
        data: { name: 'قطع غيار', workspace: Workspace.sandbox },
      });
    });

    it('throws ConflictException for duplicate name', async () => {
      prisma.supplierCategory.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create({ name: 'قطع غيار' }, Workspace.sandbox),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates a category name', async () => {
      const existing = { id: UUID1, name: 'قطع غيار', createdAt: new Date() };
      const updated = {
        id: UUID1,
        name: 'قطع غيار (جديد)',
        createdAt: new Date(),
      };
      prisma.supplierCategory.findUnique.mockResolvedValue(existing);
      prisma.supplierCategory.update.mockResolvedValue(updated);

      const result = await service.update(
        UUID1,
        { name: 'قطع غيار (جديد)' },
        Workspace.sandbox,
      );

      expect(result).toEqual(updated);
      expect(prisma.supplierCategory.update).toHaveBeenCalledWith({
        where: { id: UUID1 },
        data: { name: 'قطع غيار (جديد)' },
      });
    });

    it('throws NotFoundException for non-existent id', async () => {
      prisma.supplierCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.update(UUID1, { name: 'test' }, Workspace.sandbox),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException for duplicate name on update', async () => {
      const existing = { id: UUID1, name: 'قطع غيار', createdAt: new Date() };
      prisma.supplierCategory.findUnique.mockResolvedValue(existing);
      prisma.supplierCategory.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.update(UUID1, { name: 'مواد خام' }, Workspace.sandbox),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes a category when no suppliers are linked', async () => {
      const existing = {
        id: UUID1,
        name: 'قطع غيار',
        createdAt: new Date(),
        _count: { partners: 0 },
      };
      prisma.supplierCategory.findUnique.mockResolvedValue(existing);
      prisma.supplierCategory.delete.mockResolvedValue(existing);

      const result = await service.remove(UUID1, Workspace.sandbox);

      expect(result).toEqual(existing);
      expect(prisma.supplierCategory.delete).toHaveBeenCalledWith({
        where: { id: UUID1 },
      });
    });

    it('throws ConflictException when category has linked suppliers', async () => {
      const existing = {
        id: UUID1,
        name: 'قطع غيار',
        createdAt: new Date(),
        _count: { partners: 3 },
      };
      prisma.supplierCategory.findUnique.mockResolvedValue(existing);

      await expect(service.remove(UUID1, Workspace.sandbox)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.supplierCategory.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for non-existent id', async () => {
      prisma.supplierCategory.findUnique.mockResolvedValue(null);

      await expect(service.remove(UUID1, Workspace.sandbox)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
