import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    passwordResetToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: {
    sign: jest.Mock;
  };
  let mailService: {
    sendPasswordResetEmail: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn(),
    };

    mailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mailService.sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────── validateUser ────────────────────────────

  describe('validateUser', () => {
    it('should return null if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password');
      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const user = {
        id: '1',
        username: 'test',
        passwordHash: '$2b$12$invalidhash',
        role: 'admin',
        fullName: 'Test User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test', 'wrongpassword');
      expect(result).toBeNull();
    });

    it('should return user if credentials are valid', async () => {
      const user = {
        id: '1',
        username: 'test',
        passwordHash: '$2b$12$validhash',
        role: 'admin',
        fullName: 'Test User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test', 'validpassword');
      expect(result).toEqual(user);
    });
  });

  // ─────────────────────────── login ───────────────────────────────────

  describe('login', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'nonexistent', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const user = {
        id: '1',
        username: 'test',
        passwordHash: '$2b$12$invalidhash',
        role: 'admin',
        fullName: 'Test User',
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'test', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return access_token on successful login', async () => {
      const user = {
        id: '1',
        username: 'test',
        passwordHash: '$2b$12$validhash',
        role: 'admin',
        fullName: 'Test User',
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login({
        username: 'test',
        password: 'validpassword',
      });

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        userId: user.id,
        role: user.role,
      });
    });
  });

  // ─────────────────────────── forgotPassword ──────────────────────────

  describe('forgotPassword', () => {
    it('returns the same generic message whether the email is registered or not (anti-enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('unknown@example.com');

      // Must not throw; must return a generic message.
      expect(result).toEqual({
        message:
          'إن كان البريد الإلكتروني مسجَّلاً في النظام، ستصلك رسالة خلال دقائق.',
      });
      // Must NOT attempt to send any email.
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      // Must NOT create any DB record.
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('sends reset email and creates a hashed token when email is registered', async () => {
      const user = {
        id: 'user-uuid',
        username: 'admin_bietmi',
        email: 'admin@bietmi.dz',
        passwordHash: '$2b$12$somehash',
        role: 'admin',
        fullName: 'Admin',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetToken.create.mockResolvedValue({});

      const result = await service.forgotPassword('admin@bietmi.dz');

      expect(result).toEqual({
        message:
          'إن كان البريد الإلكتروني مسجَّلاً في النظام، ستصلك رسالة خلال دقائق.',
      });

      // A DB record must be created.
      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      const createCall = prisma.passwordResetToken.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe(user.id);
      // tokenHash must be a hex string (SHA-256 = 64 hex chars).
      expect(createCall.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      // expiresAt must be ~1 hour in the future.
      const expiresAt: Date = createCall.data.expiresAt;
      const diffMs = expiresAt.getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(55 * 60 * 1000); // > 55 min
      expect(diffMs).toBeLessThan(65 * 60 * 1000); // < 65 min

      // An email must be sent.
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        user.email,
        expect.stringContaining('/reset-password?token='),
      );
    });

    it('stores only the SHA-256 hash, not the raw token, in the database', async () => {
      const user = {
        id: 'user-uuid',
        email: 'admin@bietmi.dz',
        username: 'admin_bietmi',
        passwordHash: '$2b$12$hash',
        role: 'admin',
        fullName: 'Admin',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetToken.create.mockResolvedValue({});

      // Capture the raw token sent in the email link.
      let capturedResetLink = '';
      mailService.sendPasswordResetEmail.mockImplementation(
        (_to: string, link: string) => {
          capturedResetLink = link;
          return Promise.resolve();
        },
      );

      await service.forgotPassword(user.email);

      const createCall = prisma.passwordResetToken.create.mock.calls[0][0];
      const storedHash: string = createCall.data.tokenHash;

      // Extract the raw token from the reset link query string.
      const url = new URL(capturedResetLink);
      const rawToken = url.searchParams.get('token') ?? '';
      expect(rawToken).toBeTruthy();

      // Verify that the stored hash = SHA-256(rawToken).
      const expectedHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      expect(storedHash).toBe(expectedHash);

      // Raw token must NOT equal the stored hash.
      expect(rawToken).not.toBe(storedHash);
    });
  });

  // ─────────────────────────── resetPassword ───────────────────────────

  describe('resetPassword', () => {
    const RAW_TOKEN = 'a'.repeat(64); // 64-char hex-like string
    const TOKEN_HASH = crypto
      .createHash('sha256')
      .update(RAW_TOKEN)
      .digest('hex');

    function makeDbToken(overrides: Partial<{
      used: boolean;
      expiresAt: Date;
      userId: string;
    }> = {}) {
      return {
        id: 'token-uuid',
        userId: 'user-uuid',
        tokenHash: TOKEN_HASH,
        used: false,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min ahead
        createdAt: new Date(),
        ...overrides,
      };
    }

    it('updates passwordHash and marks token as used on valid token', async () => {
      const dbToken = makeDbToken();
      prisma.passwordResetToken.findUnique.mockResolvedValue(dbToken);
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash');

      await service.resetPassword(RAW_TOKEN, 'NewSecureP@ss1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: dbToken.userId },
        data: { passwordHash: '$2b$12$newhash', mustChangePassword: false },
      });
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: dbToken.id },
        data: { used: true },
      });
    });

    it('throws UnauthorizedException for an expired token', async () => {
      const expiredToken = makeDbToken({
        expiresAt: new Date(Date.now() - 1), // 1 ms in the past
      });
      prisma.passwordResetToken.findUnique.mockResolvedValue(expiredToken);

      await expect(
        service.resetPassword(RAW_TOKEN, 'NewSecureP@ss1'),
      ).rejects.toThrow(UnauthorizedException);

      // Must NOT update the password.
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the token has already been used', async () => {
      const usedToken = makeDbToken({ used: true });
      prisma.passwordResetToken.findUnique.mockResolvedValue(usedToken);

      await expect(
        service.resetPassword(RAW_TOKEN, 'NewSecureP@ss1'),
      ).rejects.toThrow(UnauthorizedException);

      // Must NOT update the password.
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('cannot reuse the same token twice — marks it used after first call', async () => {
      const dbToken = makeDbToken();
      // First call: token is valid.
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(dbToken);
      prisma.user.update.mockResolvedValue({});
      prisma.passwordResetToken.update.mockResolvedValue({});
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$newhash');

      await service.resetPassword(RAW_TOKEN, 'FirstNewPassword1');

      // Simulate DB marking used=true after first call.
      const usedToken = { ...dbToken, used: true };
      prisma.passwordResetToken.findUnique.mockResolvedValueOnce(usedToken);

      // Second call with the same token must be rejected.
      await expect(
        service.resetPassword(RAW_TOKEN, 'SecondNewPassword1'),
      ).rejects.toThrow(UnauthorizedException);

      // passwordHash must have been updated exactly once.
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthorizedException for a non-existent token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('nonexistenttoken', 'NewSecureP@ss1'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
