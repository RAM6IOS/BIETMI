import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface LoginResponse {
  access_token: string;
}

interface ErrorResponse {
  message: string;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { username: 'auth_test_user' } });
    await app.close();
  });

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
});
