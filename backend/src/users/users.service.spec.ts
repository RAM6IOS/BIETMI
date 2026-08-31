/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

const adminUser = {
  id: UUID,
  username: 'admin',
  role: Role.admin,
};

const nonAdminUser = {
  id: UUID,
  username: 'commercial1',
  role: Role.commercial,
};

type PublicUserRow = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
};

const prismaUserRow = (
  overrides: Partial<Record<keyof typeof prismaUserRow | string, unknown>> = {},
) => ({
  id: UUID,
  username: 'commercial1',
  passwordHash: '$2b$12$hash',
  role: Role.commercial,
  fullName: 'Commercial One',
  isActive: true,
  mustChangePassword: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const prismaPublicUserRow = (
  overrides: Partial<PublicUserRow> = {},
): PublicUserRow => ({
  id: UUID,
  username: 'commercial1',
  fullName: 'Commercial One',
  role: Role.commercial,
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws ForbiddenException for non-admin users', async () => {
      await expect(service.create(nonAdminUser, {} as never)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException if username already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(prismaUserRow());
      const dto = {
        fullName: 'New User',
        username: 'commercial1',
        role: Role.commercial,
      };
      await expect(service.create(adminUser, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('generates a readable random temp password and hashes it when none supplied', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const dto = {
        fullName: 'New User',
        username: 'newcom',
        role: Role.commercial,
      };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      // Prisma `select` strips passwordHash/mustChangePassword.
      prisma.user.create.mockResolvedValue(
        prismaPublicUserRow({
          username: 'newcom',
          fullName: 'New User',
          role: Role.commercial,
        }),
      );

      const result = await service.create(adminUser, dto);

      expect(bcrypt.hash).toHaveBeenCalled();
      const tempPassword = (bcrypt.hash as jest.Mock).mock.calls[0][0];
      expect(tempPassword).toEqual(expect.any(String));
      // readable and transportable: alphanumeric-ish, no binary, length 10-14
      expect(tempPassword.length).toBeGreaterThanOrEqual(10);
      expect(tempPassword.length).toBeLessThanOrEqual(14);
      expect(/^[A-Za-z0-9_-]+$/.test(tempPassword)).toBe(true);
      expect(result).toHaveProperty('id', UUID);
      expect(result).toHaveProperty('mustChangePassword', true);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('uses the admin-supplied temp password when given', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const customPassword = 'MonMotDePasse#2026';
      const dto = {
        fullName: 'New User',
        username: 'newcom',
        role: Role.commercial,
        tempPassword: customPassword,
      };
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-custom');
      prisma.user.create.mockResolvedValue(
        prismaPublicUserRow({
          username: 'newcom',
          fullName: 'New User',
          role: Role.commercial,
        }),
      );

      await service.create(adminUser, dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(customPassword, 12);
    });

    it('returns the temp password in plaintext for admin to relay manually', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(
        prismaPublicUserRow({
          username: 'newcom',
          fullName: 'New User',
          role: Role.commercial,
        }),
      );

      const result = await service.create(adminUser, {
        fullName: 'New User',
        username: 'newcom',
        role: Role.commercial,
      });

      const tempPassword = (bcrypt.hash as jest.Mock).mock.calls[0][0];
      expect(result).toHaveProperty('tempPassword', tempPassword);
      // passwordHash must never be exposed
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('always sets mustChangePassword to true on admin-created users', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue(
        prismaPublicUserRow({
          username: 'newcom',
          fullName: 'New User',
          role: Role.purchasing,
        }),
      );

      const result = await service.create(adminUser, {
        fullName: 'New User',
        username: 'newcom',
        role: Role.purchasing,
      });

      expect(result.mustChangePassword).toBe(true);
    });
  });

  describe('findAll', () => {
    it('throws ForbiddenException for non-admin users', async () => {
      await expect(service.findAll(nonAdminUser, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns paginated users, never exposing password hashes', async () => {
      prisma.user.findMany.mockResolvedValue([
        prismaPublicUserRow(),
        prismaPublicUserRow({ id: 'c3d4e5f6-a7b8-9012-cdef-123456789012' }),
      ]);
      prisma.user.count.mockResolvedValue(2);

      const result = await service.findAll(adminUser, {
        page: '1',
        limit: '20',
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      for (const row of result.data) {
        expect(row.passwordHash).toBeUndefined();
        expect(row.mustChangePassword).toBeUndefined();
      }
    });

    it('passes search term to prisma where clause', async () => {
      prisma.user.findMany.mockResolvedValue([prismaUserRow()]);
      prisma.user.count.mockResolvedValue(1);

      await service.findAll(adminUser, { search: 'com' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException for non-admin users', async () => {
      await expect(service.update(nonAdminUser, UUID, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update(adminUser, UUID, { fullName: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates fullName, role or isActive', async () => {
      prisma.user.findUnique.mockResolvedValue(prismaUserRow());
      prisma.user.update.mockResolvedValue(
        prismaPublicUserRow({
          username: 'commercial1',
          role: Role.accountant,
          isActive: false,
        }),
      );

      const result = await service.update(adminUser, UUID, {
        role: Role.accountant,
        isActive: false,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: { role: Role.accountant, isActive: false },
        select: expect.any(Object),
      });
      expect(result).toHaveProperty('role', Role.accountant);
      expect(result).toHaveProperty('isActive', false);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('resetUserPassword', () => {
    it('throws ForbiddenException for non-admin users', async () => {
      await expect(
        service.resetUserPassword(nonAdminUser, UUID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resetUserPassword(adminUser, UUID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('generates a new readable temp password, hashes it and updates the user', async () => {
      prisma.user.findUnique.mockResolvedValue(prismaUserRow());
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-reset');
      prisma.user.update.mockResolvedValue(
        prismaUserRow({ passwordHash: 'hashed-reset' }),
      );

      const result = await service.resetUserPassword(adminUser, UUID);

      const tempPassword = (bcrypt.hash as jest.Mock).mock.calls[0][0];
      expect(tempPassword).toEqual(expect.any(String));
      expect(tempPassword.length).toBeGreaterThanOrEqual(10);
      expect(tempPassword.length).toBeLessThanOrEqual(14);
      expect(/^[A-Za-z0-9_-]+$/.test(tempPassword)).toBe(true);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: { passwordHash: 'hashed-reset', mustChangePassword: true },
      });
      expect(result).toEqual({ tempPassword, mustChangePassword: true });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('remove', () => {
    const userRowWithCount = (
      overrides: {
        role?: Role;
        isActive?: boolean;
        _count?: {
          createdInvoices: number;
          createdQuotes: number;
          createdPurchaseOrders: number;
        };
      } = {},
    ) => ({
      id: UUID,
      username: 'commercial1',
      fullName: 'Commercial One',
      role: overrides.role ?? Role.commercial,
      isActive: overrides.isActive ?? true,
      _count: overrides._count ?? {
        createdInvoices: 0,
        createdQuotes: 0,
        createdPurchaseOrders: 0,
      },
    });

    it('throws ForbiddenException for non-admin users', async () => {
      await expect(service.remove(nonAdminUser, UUID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for invalid UUID', async () => {
      await expect(service.remove(adminUser, 'not-a-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when admin deletes their own account', async () => {
      prisma.user.findUnique.mockResolvedValue(userRowWithCount());
      const selfAdmin = { userId: UUID, username: 'admin', role: Role.admin };
      await expect(service.remove(selfAdmin, UUID)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when deleting the last active admin', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userRowWithCount({ role: Role.admin }),
      );
      prisma.user.count.mockResolvedValue(1);
      await expect(service.remove(adminUser, UUID)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('allows deleting an admin when another active admin exists', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userRowWithCount({ role: Role.admin }),
      );
      prisma.user.count.mockResolvedValue(2);
      prisma.user.delete.mockResolvedValue({ id: UUID });
      const result = await service.remove(adminUser, UUID);
      expect(result).toEqual({ id: UUID, deleted: true });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: UUID } });
    });

    it('throws ConflictException when user has linked documents', async () => {
      prisma.user.findUnique.mockResolvedValue(
        userRowWithCount({
          _count: {
            createdInvoices: 2,
            createdQuotes: 0,
            createdPurchaseOrders: 0,
          },
        }),
      );
      await expect(service.remove(adminUser, UUID)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('deletes a user with no linked documents', async () => {
      prisma.user.findUnique.mockResolvedValue(userRowWithCount());
      prisma.user.delete.mockResolvedValue({ id: UUID });
      const result = await service.remove(adminUser, UUID);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: UUID } });
      expect(result).toEqual({ id: UUID, deleted: true });
    });
  });

  describe('changeOwnPassword', () => {
    const selfUser = {
      userId: UUID,
      username: 'commercial1',
      role: Role.commercial,
    };

    it('throws BadRequestException when current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(prismaUserRow());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.changeOwnPassword(selfUser, {
          currentPassword: 'wrong',
          newPassword: 'NewPass#123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('prevents changing password to the same as current', async () => {
      prisma.user.findUnique.mockResolvedValue(prismaUserRow());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hash');
      await expect(
        service.changeOwnPassword(selfUser, {
          currentPassword: 'same',
          newPassword: '$2b$12$hash',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('hashes new password and clears mustChangePassword on success', async () => {
      prisma.user.findUnique.mockResolvedValue(prismaUserRow());
      // current password matches; new password is different from current
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // currentPassword check
        .mockResolvedValueOnce(false); // newPassword != old check
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash');
      prisma.user.update.mockResolvedValue(null);

      const result = await service.changeOwnPassword(selfUser, {
        currentPassword: 'OldPass',
        newPassword: 'NewPass#123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass#123', 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: UUID },
        data: { passwordHash: '$2b$12$newhash', mustChangePassword: false },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
