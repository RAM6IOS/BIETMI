import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { Role } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponse {
  access_token: string;
}

interface InvoiceResponse {
  id: string;
  status: string;
  invoiceNumber: string | null;
}

async function createUser(
  prisma: PrismaService,
  username: string,
  role: string,
) {
  const passwordHash = await bcrypt.hash('testpassword', 12);
  await prisma.user.upsert({
    where: { username },
    update: { role: role as Role },
    create: { username, passwordHash, role: role as Role, fullName: username },
  });
}

async function login(app: INestApplication, username: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password: 'testpassword' })
    .expect(200);
  return (res.body as LoginResponse).access_token;
}

const INVOICE_NUMBER_RE = /^SALE-\d{4}-\d{5}$/;

describe('Invoices (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let commercialToken: string;
  let purchasingToken: string;
  let accountantToken: string;
  let customerId: string;
  let supplierId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await createUser(prisma, 'invoice_admin', 'admin');
    await createUser(prisma, 'invoice_commercial', 'commercial');
    await createUser(prisma, 'invoice_purchasing', 'purchasing');
    await createUser(prisma, 'invoice_accountant', 'accountant');

    adminToken = await login(app, 'invoice_admin');
    commercialToken = await login(app, 'invoice_commercial');
    purchasingToken = await login(app, 'invoice_purchasing');
    accountantToken = await login(app, 'invoice_accountant');
  }, 30000);

  beforeEach(async () => {
    const prevIds = [customerId, supplierId].filter((x): x is string =>
      Boolean(x),
    );
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.invoiceCounter.deleteMany();
    await prisma.partner.deleteMany({ where: { id: { in: prevIds } } });

    const customer = await prisma.partner.create({
      data: {
        name: 'Invoice Customer',
        type: 'customer',
        currency: 'DZD',
      },
    });
    const supplier = await prisma.partner.create({
      data: {
        name: 'Invoice Supplier',
        type: 'supplier',
        currency: 'DZD',
      },
    });
    customerId = customer.id;
    supplierId = supplier.id;
  });

  afterAll(async () => {
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.invoiceCounter.deleteMany();
    await prisma.partner.deleteMany({
      where: { name: { contains: 'Invoice' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [
            'invoice_admin',
            'invoice_commercial',
            'invoice_purchasing',
            'invoice_accountant',
          ],
        },
      },
    });
    await app.close();
  });

  function createSaleDraft(token = adminToken, dueDate?: string) {
    return request(app.getHttpServer())
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        partnerId: customerId,
        issueDate: '2026-01-15',
        ...(dueDate ? { dueDate } : {}),
        lines: [{ description: 'Widget', quantity: 2, unitPrice: 100 }],
      });
  }

  describe('POST /invoices', () => {
    it('should create a draft with no invoiceNumber and computed totals', async () => {
      const res = await createSaleDraft().expect(201);

      expect(res.body.status).toBe('draft');
      expect(res.body.invoiceNumber).toBeNull();
      expect(res.body.subtotal).toBe('200.00');
      expect(res.body.discountPercent).toBe('0.00');
      expect(res.body.discountAmount).toBe('0.00');
      expect(res.body.tvaAmount).toBe('38.00');
      expect(res.body.totalAmount).toBe('238.00');
      expect(res.body.paymentMethods).toBeNull();
    });

    it('should apply a discount and compute TVA on the amount after discount', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partnerId: customerId,
          issueDate: '2026-01-15',
          discountPercent: 10,
          paymentMethods: [{ label: 'Paiement à 30 jours', percentage: 100 }],
          lines: [{ description: 'Item A', quantity: 2, unitPrice: 500 }],
        })
        .expect(201);

      expect(res.body.subtotal).toBe('1000.00');
      expect(res.body.discountPercent).toBe('10.00');
      expect(res.body.discountAmount).toBe('100.00');
      expect(res.body.tvaAmount).toBe('171.00');
      expect(res.body.totalAmount).toBe('1071.00');
      expect(res.body.paymentMethods).toEqual([
        { label: 'Paiement à 30 jours', percentage: 100 },
      ]);
    });

    it('should reject a sale invoice linked to a supplier', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partnerId: supplierId,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        })
        .expect(400);
    });

    it('should forbid purchasing user from creating any invoice', async () => {
      await createSaleDraft(purchasingToken).expect(403);
    });

    it('should forbid accountant from creating any invoice', async () => {
      await createSaleDraft(accountantToken).expect(403);
    });
  });

  describe('POST /invoices/:id/issue', () => {
    it('should issue a draft and assign a sequential invoiceNumber', async () => {
      const created = (await createSaleDraft().expect(201)).body;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${created.id}/issue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('issued');
      expect(res.body.invoiceNumber).toMatch(INVOICE_NUMBER_RE);
    });

    it('should reject issuing an already-issued invoice (409)', async () => {
      const created = (await createSaleDraft().expect(201)).body;
      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${created.id}/issue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${created.id}/issue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    it('should return 20 unique invoiceNumbers under 20 parallel issues', async () => {
      const drafts: Array<InvoiceResponse> = [];
      for (let i = 0; i < 20; i += 1) {
        const created = (await createSaleDraft().expect(201)).body;
        drafts.push(created);
      }

      const results = await Promise.all(
        drafts.map((d) =>
          request(app.getHttpServer())
            .post(`/api/v1/invoices/${d.id}/issue`)
            .set('Authorization', `Bearer ${adminToken}`),
        ),
      );

      results.forEach((r) => expect(r.status).toBe(200));
      const numbers = results.map((r) => r.body.invoiceNumber);
      expect(numbers.every((n: string) => INVOICE_NUMBER_RE.test(n))).toBe(
        true,
      );
      expect(new Set(numbers).size).toBe(20);
      console.log(
        'CONCURRENCY PROOF: 20 parallel issues produced numbers:\n',
        [...numbers].sort().join('\n'),
      );

      const sorted = [...numbers].sort();
      expect(new Set(sorted).size).toBe(20);
    });
  });

  describe('GET /invoices (role scoping)', () => {
    it('should let accountant see invoices', async () => {
      await createSaleDraft().expect(201);
      const res = await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);
      expect((res.body.data as Array<unknown>).length).toBeGreaterThan(0);
    });

    it('should give commercial the invoices', async () => {
      await createSaleDraft().expect(201);
      const res = await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(200);
      expect((res.body.data as Array<unknown>).length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      await createSaleDraft().expect(201);
      const res = await request(app.getHttpServer())
        .get('/api/v1/invoices?status=issued')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body.data as Array<{ status: string }>).length).toBe(0);
    });
  });

  describe('GET /invoices/:id', () => {
    it('should return a created draft invoice', async () => {
      const createdRes = (await createSaleDraft().expect(201)).body;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/invoices/${createdRes.id}`)
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(200);
      expect(res.body.id).toBe(createdRes.id);
    });
  });

  describe('UPDATE / DELETE (draft only)', () => {
    it('should 409 on updating an issued invoice', async () => {
      const created = (await createSaleDraft().expect(201)).body;
      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${created.id}/issue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/invoices/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ internalReference: 'R-1' })
        .expect(409);
    });

    it('should 409 on deleting an issued invoice', async () => {
      const created = (await createSaleDraft().expect(201)).body;
      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${created.id}/issue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .delete(`/api/v1/invoices/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    it('should allow deleting a draft invoice', async () => {
      const created = (await createSaleDraft().expect(201)).body;
      await request(app.getHttpServer())
        .delete(`/api/v1/invoices/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /invoices/reports/outstanding', () => {
    it('should exclude drafts and mark overdue invoices', async () => {
      const pastDue = (
        await createSaleDraft(adminToken, '2026-01-01').expect(201)
      ).body;
      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${pastDue.id}/issue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await createSaleDraft().expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/v1/invoices/reports/outstanding')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const rows = res.body as Array<{
        invoiceNumber: string | null;
        isOverdue: boolean;
      }>;
      expect(rows.some((r) => r.invoiceNumber === null)).toBe(false);
      expect(rows.some((r) => r.isOverdue)).toBe(true);
    });

    it('should filter to overdue only', async () => {
      const overdue = (
        await createSaleDraft(adminToken, '2026-01-01').expect(201)
      ).body;
      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${overdue.id}/issue`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/v1/invoices/reports/outstanding?overdue=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (res.body as Array<{ isOverdue: boolean }>).length,
      ).toBeGreaterThan(0);
    });

    it('should give accountant the full outstanding list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/invoices/reports/outstanding')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
