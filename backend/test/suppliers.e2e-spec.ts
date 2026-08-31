import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

interface SupplierResponse {
  id: string;
  type: string;
  name: string;
  nif: string | null;
  commercialRegister: string | null;
  paymentTerms: string | null;
  currency: 'DZD' | 'FOREIGN';
  isActive: boolean;
  contacts: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    position: string | null;
    isPrimary: boolean;
  }>;
}

interface PaginatedResponse {
  data: SupplierResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface LoginResponse {
  access_token: string;
}

describe('Suppliers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let supplierId: string;
  let uniqueNif: string;

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

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'test_admin', password: 'testpassword' })
      .expect(200);

    adminToken = (loginResponse.body as LoginResponse).access_token;
  });

  beforeEach(async () => {
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.purchaseOrderCounter.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.partner.deleteMany({
      where: { name: { in: ['Test Supplier', 'Updated Supplier'] } },
    });
    uniqueNif = randomUUID().replace(/-/g, '').slice(0, 9);
  });

  afterAll(async () => {
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.purchaseOrderCounter.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.partner.deleteMany({
      where: { name: { in: ['Test Supplier', 'Updated Supplier'] } },
    });
    await prisma.user.deleteMany({
      where: { username: 'test_admin' },
    });
    await app.close();
  });

  describe('/suppliers (POST)', () => {
    it('should create a supplier with paymentTerms and currency', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Supplier',
          nif: uniqueNif,
          commercialRegister: 'CR123',
          address: '123 Test Street',
          paymentTerms: '60 يوم',
          currency: 'FOREIGN',
          contacts: [
            {
              name: 'Contact 1',
              phone: '123456',
              email: 'contact@test.com',
              position: 'Manager',
              isPrimary: true,
            },
          ],
        })
        .expect(201);

      const body = response.body as SupplierResponse;
      expect(body.type).toBe('supplier');
      expect(body.name).toBe('Test Supplier');
      expect(body.paymentTerms).toBe('60 يوم');
      expect(body.currency).toBe('FOREIGN');
      expect(body.contacts).toHaveLength(1);
      expect(body.contacts[0].name).toBe('Contact 1');

      supplierId = body.id;
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should return 400 for missing name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nif: '123' })
        .expect(400);
    });
  });

  describe('/suppliers (GET)', () => {
    it('should return paginated suppliers', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Supplier', nif: uniqueNif })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PaginatedResponse;
      expect(body.data).toBeDefined();
      expect(body.meta).toBeDefined();
      expect(body.meta.total).toBeGreaterThan(0);
      expect(body.data.every((s) => s.type === 'supplier')).toBe(true);
    });

    it('should search suppliers by name', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Supplier', nif: uniqueNif })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/suppliers?search=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as PaginatedResponse;
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('/suppliers/:id (GET)', () => {
    it('should return a supplier by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Supplier', nif: uniqueNif })
        .expect(201);

      supplierId = (createResponse.body as SupplierResponse).id;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as SupplierResponse;
      expect(body.id).toBe(supplierId);
      expect(body.name).toBe('Test Supplier');
    });

    it('should include purchase orders for the supplier, newest first with narrowed fields', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Supplier', nif: uniqueNif })
        .expect(201);
      supplierId = (createResponse.body as SupplierResponse).id;

      const first = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        })
        .expect(201);
      const firstId = (first.body as { id: string }).id;
      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${firstId}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const second = await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId,
          lines: [{ description: 'B', quantity: 2, unitPrice: 5 }],
        })
        .expect(201);
      const secondId = (second.body as { id: string }).id;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as SupplierResponse & {
        purchaseOrders: Array<{
          id: string;
          orderNumber: string;
          status: string;
          orderDate: string;
          subtotal: string;
          tvaAmount: string;
          totalAmount: string;
          createdAt: string;
        }>;
      };

      expect(body.purchaseOrders).toHaveLength(2);
      expect(body.purchaseOrders[0].id).toBe(secondId);
      expect(body.purchaseOrders[0].status).toBe('draft');
      expect(body.purchaseOrders[1].id).toBe(firstId);
      expect(body.purchaseOrders[1].status).toBe('sent');
      expect(body.purchaseOrders[0].orderNumber).toMatch(/^\d{3}$/);
      expect(body.purchaseOrders[0].subtotal).toBe('10');
      expect(body.purchaseOrders[0].tvaAmount).toBe('1.9');
      expect(body.purchaseOrders[0].totalAmount).toBe('11.9');
      expect(body.purchaseOrders[0]).not.toHaveProperty('lines');
    });

    it('should include invoices for the supplier with narrowed fields, newest issueDate first', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Supplier', nif: uniqueNif })
        .expect(201);
      supplierId = (createResponse.body as SupplierResponse).id;

      const admin = await prisma.user.findUniqueOrThrow({
        where: { username: 'test_admin' },
      });
      await prisma.invoice.create({
        data: {
          partnerId: supplierId,
          createdByUserId: admin.id,
          dueDate: new Date(),
          subtotal: new Prisma.Decimal(100),
          tvaAmount: 19,
          totalAmount: 119,
          status: 'issued',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as SupplierResponse & {
        invoices: Array<{
          id: string;
          invoiceNumber: string | null;
          issueDate: string;
          dueDate: string;
          status: string;
          subtotal: string;
          tvaAmount: string;
          totalAmount: string;
        }>;
      };

      expect(body.invoices).toHaveLength(1);
      expect(body.invoices[0].status).toBe('issued');
      expect(body.invoices[0].totalAmount).toBe('119');
      expect(body.invoices[0]).not.toHaveProperty('lines');
    });

    it('should return 404 for non-existent supplier', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/suppliers/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('/suppliers/:id (PATCH)', () => {
    it('should update a supplier paymentTerms and currency', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Supplier', nif: uniqueNif })
        .expect(201);

      supplierId = (createResponse.body as SupplierResponse).id;

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Supplier',
          paymentTerms: '30 يوم',
          currency: 'DZD',
        })
        .expect(200);

      const body = response.body as SupplierResponse;
      expect(body.name).toBe('Updated Supplier');
      expect(body.paymentTerms).toBe('30 يوم');
      expect(body.currency).toBe('DZD');
    });
  });

  describe('/suppliers/:id (DELETE)', () => {
    it('should soft-delete a supplier', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Supplier', nif: uniqueNif })
        .expect(201);

      supplierId = (createResponse.body as SupplierResponse).id;

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = response.body as SupplierResponse;
      expect(body.isActive).toBe(false);
    });

    it('should return 409 when supplier has invoices', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Supplier', nif: uniqueNif })
        .expect(201);

      supplierId = (createResponse.body as SupplierResponse).id;

      const admin = await prisma.user.findUniqueOrThrow({
        where: { username: 'test_admin' },
      });
      await prisma.invoice.create({
        data: {
          partnerId: supplierId,
          createdByUserId: admin.id,
          dueDate: new Date(),
          subtotal: new Prisma.Decimal(100),
          tvaAmount: 19,
          totalAmount: 119,
          status: 'issued',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });
});
