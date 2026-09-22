import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Workspace } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

interface UserAuthRow {
  id: string;
  role: string;
  workspace: Workspace;
  isActive: boolean;
}

interface FindUniqueArgs {
  where: { id: string };
  select: Record<string, boolean>;
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: {
    user: {
      findUnique: jest.Mock<Promise<UserAuthRow | null>, [FindUniqueArgs]>;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn() as jest.Mock<
          Promise<UserAuthRow | null>,
          [FindUniqueArgs]
        >,
      },
    };

    const module = await Test.createTestingModule({
      providers: [JwtStrategy, { provide: PrismaService, useValue: prisma }],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  // ─────────────────── live role/workspace from the DB ───────────────────

  it('uses the live role and workspace from the DB, ignoring token claims', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'accountant',
      workspace: Workspace.sandbox,
      isActive: true,
    });

    const result = await strategy.validate({
      userId: 'user-1',
      role: 'admin',
      workspace: Workspace.production,
    });

    // Stale admin/production claims in the token must be overridden by the DB.
    expect(result).toEqual({
      userId: 'user-1',
      role: 'accountant',
      workspace: Workspace.sandbox,
    });
  });

  // ─────────────────────── unknown / deleted user ────────────────────────

  it('rejects a user no longer in the database', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ userId: 'ghost', role: 'admin' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ───────────────────────── deactivated user ───────────────────────────

  it('rejects a deactivated user (isActive=false) immediately', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'commercial',
      workspace: Workspace.production,
      isActive: false,
    });

    await expect(
      strategy.validate({ userId: 'user-1', role: 'commercial' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  // ─────────────────── narrowly-scoped read (no secrets) ──────────────────

  it('queries only id/role/workspace/isActive — never passwordHash or other secrets', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      workspace: Workspace.production,
      isActive: true,
    });

    await strategy.validate({ userId: 'user-1', role: 'admin' });

    const select = prisma.user.findUnique.mock.calls[0][0].select;
    expect(select).toEqual({
      id: true,
      role: true,
      workspace: true,
      isActive: true,
    });
    expect(select).not.toHaveProperty('passwordHash');
  });

  // ─────────────────────── legacy tokens w/o workspace ───────────────────

  it('resolves workspace from the DB for legacy tokens without a workspace claim', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'commercial',
      workspace: Workspace.sandbox,
      isActive: true,
    });

    const result = await strategy.validate({
      userId: 'user-1',
      role: 'commercial',
    });

    expect(result.workspace).toBe(Workspace.sandbox);
  });
});
