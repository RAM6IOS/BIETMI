import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MailService } from '../src/mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

interface LoginResponse {
  access_token: string;
}

interface ErrorResponse {
  message: string;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const testPassword = 'TestPassword123!';
  const resetTestEmail = 'reset-e2e@example.com';
  const mailMock = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue(mailMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();

    const prisma = moduleFixture.get<PrismaService>(PrismaService);
    const passwordHash = await bcrypt.hash(testPassword, 12);
    await prisma.user.upsert({
      where: { username: 'auth_test_user' },
      update: { passwordHash },
      create: {
        username: 'auth_test_user',
        passwordHash,
        role: 'admin',
        fullName: 'Auth Test User',
      },
    });
    await prisma.user.upsert({
      where: { username: 'reset_test_user' },
      update: { passwordHash, email: resetTestEmail },
      create: {
        username: 'reset_test_user',
        passwordHash,
        role: 'commercial',
        fullName: 'Reset Test User',
        email: resetTestEmail,
      },
    });
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.passwordResetToken.deleteMany({
      where: {
        user: { username: { in: ['auth_test_user', 'reset_test_user'] } },
      },
    });
    await prisma.user.deleteMany({
      where: { username: { in: ['auth_test_user', 'reset_test_user'] } },
    });
    await app.close();
  });

  /**
   * Creates a fresh reset flow for reset_test_user, captures the email
   * that the MailService would send, and returns the raw token from the
   * reset link. Requires the previous generated token to be consumed,
   * since resetPassword enforces one-time use.
   */
  async function createRawResetToken(): Promise<string> {
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: resetTestEmail })
      .expect(200);

    const calls = mailMock.sendPasswordResetEmail.mock.calls;
    const lastCall = calls[calls.length - 1];
    const resetLink = lastCall[1] as string;
    const token = new URL(resetLink).searchParams.get('token');
    if (!token) {
      throw new Error(`No token found in captured reset link: ${resetLink}`);
    }
    return token;
  }

  /** Inserts a reset-token row directly, bypassing the email flow. */
  async function seedTokenRow(opts: {
    userId: string;
    used?: boolean;
    expiresAt?: Date;
  }): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const prisma = app.get(PrismaService);
    await prisma.passwordResetToken.create({
      data: {
        userId: opts.userId,
        tokenHash,
        used: opts.used ?? false,
        expiresAt: opts.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return rawToken;
  }

  describe('/api/v1/auth/login (POST)', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'nonexistent', password: 'wrongpassword' })
        .expect(401)
        .expect((res: { body: ErrorResponse }) => {
          expect(res.body.message).toBe(
            'اسم المستخدم أو كلمة المرور غير صحيحة',
          );
        });
    });

    it('should return 401 for wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'auth_test_user', password: 'wrongpassword' })
        .expect(401)
        .expect((res: { body: ErrorResponse }) => {
          expect(res.body.message).toBe(
            'اسم المستخدم أو كلمة المرور غير صحيحة',
          );
        });
    });

    it('should return access_token for valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'auth_test_user', password: testPassword })
        .expect(200);

      const body = response.body as LoginResponse;
      expect(body.access_token).toBeDefined();
      expect(typeof body.access_token).toBe('string');
    });

    it('should return 400 for missing username', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'password' })
        .expect(400);
    });

    it('should return 400 for missing password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'test' })
        .expect(400);
    });

    it('should return 400 for empty body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('/api/v1/auth/forgot-password (POST)', () => {
    it('should return 200 with generic message for a registered email', async () => {
      mailMock.sendPasswordResetEmail.mockClear();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: resetTestEmail })
        .expect(200);

      expect(response.body.message).toBe(
        'إن كان البريد الإلكتروني مسجَّلاً في النظام، ستصلك رسالة خلال دقائق.',
      );
      expect(mailMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const [to] = mailMock.sendPasswordResetEmail.mock.calls[0];
      expect(to).toBe(resetTestEmail);
    });

    it('should return the same generic message for an unknown email (anti-enumeration)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown@example.com' })
        .expect(200);

      expect(response.body.message).toBe(
        'إن كان البريد الإلكتروني مسجَّلاً في النظام، ستصلك رسالة خلال دقائق.',
      );
    });

    it('should return 400 for an invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('should return 400 for a missing email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({})
        .expect(400);
    });
  });

  describe('/api/v1/auth/reset-password (POST)', () => {
    it('should complete the full flow: request → reset → login with new password', async () => {
      const token = await createRawResetToken();

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword: 'NewPassword456!' })
        .expect(200)
        .expect((res: { body: ErrorResponse }) => {
          expect(res.body.message).toBe('تم تعيين كلمة المرور الجديدة بنجاح');
        });

      // Old password no longer works.
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'reset_test_user', password: testPassword })
        .expect(401);

      // New password works.
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'reset_test_user', password: 'NewPassword456!' })
        .expect(200);
      expect((response.body as LoginResponse).access_token).toBeDefined();

      // Restore the original password for the remaining tests.
      const prisma = app.get(PrismaService);
      const restoredHash = await bcrypt.hash(testPassword, 12);
      await prisma.user.update({
        where: { username: 'reset_test_user' },
        data: { passwordHash: restoredHash },
      });
    });

    it('should reject a token that was already used (one-time use)', async () => {
      const prisma = app.get(PrismaService);
      const user = await prisma.user.findUnique({
        where: { email: resetTestEmail },
      });
      const token = await seedTokenRow({ userId: user!.id, used: true });

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword: 'NewPassword456!' })
        .expect(401);
    });

    it('should reject an expired token', async () => {
      const prisma = app.get(PrismaService);
      const user = await prisma.user.findUnique({
        where: { email: resetTestEmail },
      });
      const token = await seedTokenRow({
        userId: user!.id,
        expiresAt: new Date(Date.now() - 60 * 1000),
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword: 'NewPassword456!' })
        .expect(401);
    });

    it('should reject a non-existent token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: crypto.randomBytes(32).toString('hex'),
          newPassword: 'NewPassword456!',
        })
        .expect(401);
    });

    it('should return 400 for a password shorter than 8 characters', async () => {
      const token = await createRawResetToken();

      return request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, newPassword: 'short' })
        .expect(400);
    });

    it('should return 400 for a missing token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ newPassword: 'NewPassword456!' })
        .expect(400);
    });
  });
});
