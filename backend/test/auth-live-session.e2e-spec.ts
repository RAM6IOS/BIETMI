import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponse {
  access_token: string;
}

interface MeResponse {
  id: string;
  username: string;
  fullName: string;
  role: string;
  workspace: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

const TEST_PASSWORD = 'TestPassword123!';

async function createUser(prisma: PrismaService, username: string, role: Role) {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  await prisma.user.upsert({
    where: { username },
    update: { role, passwordHash, isActive: true },
    create: {
      username,
      passwordHash,
      role,
      fullName: username,
    },
  });
}

async function login(app: INestApplication, username: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password: TEST_PASSWORD })
    .expect(200);
  return (res.body as LoginResponse).access_token;
}

/**
 * Proves that role changes and deactivation take effect on the *next*
 * request, without re-login and without waiting for JWT expiry.
 */
describe('Live-session authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const usernames = [
    'livesession_deactivate',
    'livesession_rolerise',
    'livesession_deleted',
    'livesession_me',
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await createUser(prisma, 'livesession_deactivate', Role.commercial);
    await createUser(prisma, 'livesession_rolerise', Role.commercial);
    await createUser(prisma, 'livesession_deleted', Role.commercial);
    await createUser(prisma, 'livesession_me', Role.accountant);
  }, 30000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: { in: usernames } } });
    await app.close();
  });

  it('deactivated user is rejected on the NEXT request (no re-login needed)', async () => {
    const token = await login(app, 'livesession_deactivate');

    // Token is valid: the protected endpoint responds 200.
    await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Admin disables the user in the DB.
    await prisma.user.update({
      where: { username: 'livesession_deactivate' },
      data: { isActive: false },
    });

    // The same, still-unexpired token is rejected immediately.
    await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('role change takes effect on the NEXT request (no re-login needed)', async () => {
    const token = await login(app, 'livesession_rolerise');

    // commercial token on an admin-only endpoint → 403.
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    // Admin promotes the user in the DB.
    await prisma.user.update({
      where: { username: 'livesession_rolerise' },
      data: { role: Role.admin },
    });

    // The same token now passes with 200.
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('deleted user is rejected on the NEXT request', async () => {
    const token = await login(app, 'livesession_deleted');

    await prisma.user.delete({ where: { username: 'livesession_deleted' } });

    await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  describe('GET /api/v1/auth/me', () => {
    it('requires a bearer token', () => {
      return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('returns the live profile without exposing passwordHash', async () => {
      const token = await login(app, 'livesession_me');

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = res.body as MeResponse;
      expect(body.username).toBe('livesession_me');
      expect(body.role).toBe('accountant');
      expect(body.isActive).toBe(true);
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('reflects a role change on the same token', async () => {
      const token = await login(app, 'livesession_me');

      await prisma.user.update({
        where: { username: 'livesession_me' },
        data: { role: Role.commercial },
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect((res.body as MeResponse).role).toBe('commercial');
    });
  });
});
