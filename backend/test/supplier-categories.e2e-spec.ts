import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

interface CategoryResponse {
  id: string;
  name: string;
  createdAt: string;
}

interface LoginResponse {
  access_token: string;
}

interface SupplierResponse {
  id: string;
  name: string;
  categories: Array<{ id: string; name: string }>;
}

interface PaginatedResponse {
  data: SupplierResponse[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

describe('Supplier Categories (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let purchasingToken: string;
  let uniqueNif: string;
  let categoryNames: string[];
  const allCreatedCategoryNames: string[] = [];

  const cleanUp = async () => {
    await prisma.supplierCategory.deleteMany({
      where: { name: { in: allCreatedCategoryNames } },
    });
    await prisma.partner.deleteMany({
      where: {
        name: {
          in: ['Cat Supplier A', 'Cat Supplier B', 'Cat Updated Supplier'],
        },
      },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const passwordHash = await bcrypt.hash('testpassword', 12);
    await prisma.user.upsert({
      where: { username: 'test_admin' },
      update: {},
      create: {
        username: 'test_admin',
        passwordHash,
        role: 'admin',
        fullName: 'Test Admin',
      },
    });
    await prisma.user.upsert({
      where: { username: 'test_purchasing' },
      update: {},
      create: {
        username: 'test_purchasing',
        passwordHash,
        role: 'purchasing',
        fullName: 'Test Purchasing',
      },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'test_admin', password: 'testpassword' })
      .expect(200);
    adminToken = (adminLogin.body as LoginResponse).access_token;

    const purchasingLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'test_purchasing', password: 'testpassword' })
      .expect(200);
    purchasingToken = (purchasingLogin.body as LoginResponse).access_token;
  });

  beforeEach(() => {
    categoryNames = [
      `قطعة غيار-${randomUUID().slice(0, 8)}`,
      `مواد خام-${randomUUID().slice(0, 8)}`,
      `خدمات-${randomUUID().slice(0, 8)}`,
    ];
    allCreatedCategoryNames.push(...categoryNames);
    uniqueNif = randomUUID().replace(/-/g, '').slice(0, 9);
  });

  afterAll(async () => {
    await cleanUp();
    await prisma.user.deleteMany({
      where: { username: { in: ['test_admin', 'test_purchasing'] } },
    });
    await app.close();
  });

  describe('/supplier-categories (CRUD)', () => {
    it('should create a category (admin)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[0] })
        .expect(201);

      const body = response.body as CategoryResponse;
      expect(body.id).toBeDefined();
      expect(body.name).toBe(categoryNames[0]);
      expect(body.createdAt).toBeDefined();
    });

    it('should reject duplicate category name with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[0] })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[0] })
        .expect(409);
    });

    it('should return 400 for empty category name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('should list all categories for any authenticated user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[1] })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${purchasingToken}`)
        .expect(200);

      const body = response.body as CategoryResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((c) => c.name === categoryNames[1])).toBe(true);
    });

    it('should update a category name (admin)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[1] })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const target = (list.body as CategoryResponse[]).find(
        (c) => c.name === categoryNames[1],
      );
      expect(target).toBeDefined();

      const newName = `${categoryNames[1]}-معدل`;
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/supplier-categories/${target!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: newName })
        .expect(200);

      const body = response.body as CategoryResponse;
      expect(body.name).toBe(newName);
      allCreatedCategoryNames.push(newName);
    });

    it('should deny create for non-admin roles with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${purchasingToken}`)
        .send({ name: categoryNames[2] })
        .expect(403);
    });

    it('should deny update for non-admin roles with 403', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[2] })
        .expect(201);
      const id = (create.body as CategoryResponse).id;

      await request(app.getHttpServer())
        .patch(`/api/v1/supplier-categories/${id}`)
        .set('Authorization', `Bearer ${purchasingToken}`)
        .send({ name: 'forbidden' })
        .expect(403);
    });

    it('should deny delete for non-admin roles with 403', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[2] })
        .expect(201);
      const id = (create.body as CategoryResponse).id;

      await request(app.getHttpServer())
        .delete(`/api/v1/supplier-categories/${id}`)
        .set('Authorization', `Bearer ${purchasingToken}`)
        .expect(403);
    });

    it('should delete a category with no linked suppliers (admin)', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[2] })
        .expect(201);
      const id = (create.body as CategoryResponse).id;

      await request(app.getHttpServer())
        .delete(`/api/v1/supplier-categories/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should return 409 when deleting a category linked to suppliers', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[2] })
        .expect(201);
      const id = (create.body as CategoryResponse).id;

      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cat Supplier A',
          nif: uniqueNif,
          categoryIds: [id],
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/supplier-categories/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    it('should return 404 for updating a non-existent category', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/supplier-categories/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'test' })
        .expect(404);
    });
  });

  describe('/suppliers with categories', () => {
    it('should create a supplier with categoryIds', async () => {
      const cat1 = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[0] })
        .expect(201);
      const cat1Id = (cat1.body as CategoryResponse).id;
      const cat2 = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[1] })
        .expect(201);
      const cat2Id = (cat2.body as CategoryResponse).id;

      const response = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cat Supplier A',
          nif: uniqueNif,
          categoryIds: [cat1Id, cat2Id],
        })
        .expect(201);

      const body = response.body as SupplierResponse;
      expect(body.categories).toHaveLength(2);
      const names = body.categories.map((c) => c.name);
      expect(names).toContain(categoryNames[0]);
      expect(names).toContain(categoryNames[1]);
    });

    it('should update a supplier to change its categories', async () => {
      const cat1 = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[0] })
        .expect(201);
      const cat1Id = (cat1.body as CategoryResponse).id;
      const cat2 = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[1] })
        .expect(201);
      const cat2Id = (cat2.body as CategoryResponse).id;

      const create = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cat Supplier B',
          nif: uniqueNif,
          categoryIds: [cat1Id],
        })
        .expect(201);
      const supplierId = (create.body as SupplierResponse).id;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cat Updated Supplier',
          categoryIds: [cat2Id],
        })
        .expect(200);

      const body = response.body as SupplierResponse;
      expect(body.categories).toHaveLength(1);
      expect(body.categories[0].id).toBe(cat2Id);
      expect(body.categories[0].name).toBe(categoryNames[1]);
    });

    it('should return 400 for invalid categoryIds format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cat Supplier B',
          nif: uniqueNif,
          categoryIds: ['not-a-uuid'],
        })
        .expect(400);
    });

    it('should filter suppliers by single categoryId', async () => {
      const cat = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[0] })
        .expect(201);
      const catId = (cat.body as CategoryResponse).id;

      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cat Supplier A',
          nif: uniqueNif,
          categoryIds: [catId],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/suppliers?categoryId=${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PaginatedResponse;
      expect(body.data.length).toBeGreaterThan(0);
      expect(
        body.data.every((s) => s.categories.some((c) => c.id === catId)),
      ).toBe(true);
    });

    it('should filter suppliers by multiple comma-separated categoryIds (OR logic)', async () => {
      const cat1 = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[0] })
        .expect(201);
      const cat1Id = (cat1.body as CategoryResponse).id;
      const cat2 = await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: categoryNames[1] })
        .expect(201);
      const cat2Id = (cat2.body as CategoryResponse).id;

      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cat Supplier A',
          nif: uniqueNif,
          categoryIds: [cat1Id],
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/suppliers?categoryId=${cat1Id},${cat2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PaginatedResponse;
      expect(body.data.length).toBeGreaterThan(0);
      expect(
        body.data.every(
          (s) =>
            s.categories.some((c) => c.id === cat1Id) ||
            s.categories.some((c) => c.id === cat2Id),
        ),
      ).toBe(true);
    });
  });
});
