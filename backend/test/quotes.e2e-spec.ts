import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponse {
  access_token: string;
}

interface QuoteResponse {
  id: string;
  quoteNumber: string;
  status: string;
  objet: string | null;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  tvaAmount: string;
  totalAmount: string;
  paymentMethods: Array<{ label: string; percentage: number }> | null;
  convertedToInvoiceId: string | null;
  partner: { id: string; name: string; type: string };
  createdBy: { id: string; username: string; fullName: string };
  lines: Array<{
    description: string;
    unit: string | null;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }>;
}

interface InvoiceFromQuote {
  id: string;
  status: string;
  quoteId: string;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  tvaAmount: string;
  totalAmount: string;
  paymentMethods: Array<{ label: string; percentage: number }> | null;
  lines: unknown[];
}

async function createUser(
  prisma: PrismaService,
  username: string,
  role: string,
) {
  const passwordHash = await bcrypt.hash('testpassword', 12);
  await prisma.user.upsert({
    where: { username },
    update: { role },
    create: { username, passwordHash, role, fullName: username },
  });
}

async function login(app: INestApplication, username: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password: 'testpassword' })
    .expect(200);
  return (res.body as LoginResponse).access_token;
}

const QUOTE_NUMBER_RE = /^\d{3}$/;

describe('Quotes (e2e)', () => {
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

    await createUser(prisma, 'quote_admin', 'admin');
    await createUser(prisma, 'quote_commercial', 'commercial');
    await createUser(prisma, 'quote_purchasing', 'purchasing');
    await createUser(prisma, 'quote_accountant', 'accountant');

    adminToken = await login(app, 'quote_admin');
    commercialToken = await login(app, 'quote_commercial');
    purchasingToken = await login(app, 'quote_purchasing');
    accountantToken = await login(app, 'quote_accountant');
  }, 30000);

  beforeEach(async () => {
    const prevIds = [customerId, supplierId].filter((x): x is string =>
      Boolean(x),
    );
    await prisma.quoteLine.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.quoteCounter.deleteMany();
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.invoiceCounter.deleteMany();
    await prisma.partner.deleteMany({ where: { id: { in: prevIds } } });

    const customer = await prisma.partner.create({
      data: {
        name: 'Quote Customer',
        type: 'customer',
        currency: 'DZD',
      },
    });
    const supplier = await prisma.partner.create({
      data: {
        name: 'Quote Supplier',
        type: 'supplier',
        currency: 'DZD',
      },
    });
    customerId = customer.id;
    supplierId = supplier.id;
  });

  afterAll(async () => {
    await prisma.quoteLine.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.quoteCounter.deleteMany();
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.invoiceCounter.deleteMany();
    await prisma.partner.deleteMany({
      where: { name: { contains: 'Quote' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [
            'quote_admin',
            'quote_commercial',
            'quote_purchasing',
            'quote_accountant',
          ],
        },
      },
    });
    await app.close();
  });

  function createQuote(
    token = adminToken,
    overrides: Partial<{ partnerId: string; lines: unknown[] }> = {},
  ) {
    return request(app.getHttpServer())
      .post('/api/v1/quotes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        partnerId: overrides.partnerId ?? customerId,
        lines: overrides.lines ?? [
          { description: 'Widget', quantity: 2, unitPrice: 100 },
        ],
      });
  }

  describe('POST /quotes', () => {
    it('should create a draft quote with sequential number and serialized money', async () => {
      const res = await createQuote().expect(201);

      const body = res.body as QuoteResponse;
      expect(body.quoteNumber).toMatch(QUOTE_NUMBER_RE);
      expect(body.status).toBe('draft');
      expect(body.convertedToInvoiceId).toBeNull();
      expect(body.partner.id).toBe(customerId);
      expect(body.partner.type).toBe('customer');
      expect(body.createdBy.username).toBe('quote_admin');
      expect(body.subtotal).toBe('200.00');
      expect(body.discountPercent).toBe('0.00');
      expect(body.discountAmount).toBe('0.00');
      expect(body.tvaAmount).toBe('38.00');
      expect(body.totalAmount).toBe('238.00');
      expect(body.paymentMethods).toBeNull();
      expect(body.lines).toHaveLength(1);
      expect(body.lines[0].quantity).toBe('2.000');
      expect(body.lines[0].unitPrice).toBe('100.000');
      expect(body.lines[0].lineTotal).toBe('200.00');
    });

    it('should use per-line rounding and a global 3-digit sequence', async () => {
      const first = (await createQuote().expect(201)).body as QuoteResponse;
      const second = (await createQuote().expect(201)).body as QuoteResponse;

      expect(first.quoteNumber).toMatch(QUOTE_NUMBER_RE);
      expect(second.quoteNumber).toMatch(QUOTE_NUMBER_RE);
      expect(first.quoteNumber).not.toBe(second.quoteNumber);

      const rounded = await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partnerId: customerId,
          lines: [
            { description: 'Line A', quantity: 7, unitPrice: 3.335 },
            { description: 'Line B', quantity: 3, unitPrice: 2.225 },
            { description: 'Line C', quantity: 5, unitPrice: 1.115 },
          ],
        })
        .expect(201);

      const body = rounded.body as QuoteResponse;
      expect(body.subtotal).toBe('35.61');
      expect(body.tvaAmount).toBe('6.77');
      expect(body.totalAmount).toBe('42.38');
    });

    it('should apply a discount and compute TVA on the amount after discount', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partnerId: customerId,
          discountPercent: 10,
          paymentMethods: [
            { label: 'à la commande', percentage: 50 },
            { label: 'solde à la livraison', percentage: 50 },
          ],
          lines: [{ description: 'Item A', quantity: 2, unitPrice: 500 }],
        })
        .expect(201);

      const body = res.body as QuoteResponse;
      expect(body.subtotal).toBe('1000.00');
      expect(body.discountPercent).toBe('10.00');
      expect(body.discountAmount).toBe('100.00');
      expect(body.tvaAmount).toBe('171.00');
      expect(body.totalAmount).toBe('1071.00');
      expect(body.paymentMethods).toEqual([
        { label: 'à la commande', percentage: 50 },
        { label: 'solde à la livraison', percentage: 50 },
      ]);
    });

    it('should reject a quote linked to a supplier', async () => {
      await createQuote(adminToken, { partnerId: supplierId }).expect(400);
    });

    it('should reject a quote linked to a missing partner', async () => {
      await createQuote(adminToken, {
        partnerId: '00000000-0000-4000-8000-000000000000',
      }).expect(400);
    });

    it('should forbid purchasing and accountant users', async () => {
      await createQuote(purchasingToken).expect(403);
      await createQuote(accountantToken).expect(403);
    });
  });

  describe('GET /quotes', () => {
    it('should list quotes with pagination metadata', async () => {
      await createQuote().expect(201);
      const res = await request(app.getHttpServer())
        .get('/api/v1/quotes')
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          total: expect.any(Number),
          page: 1,
          limit: 20,
          totalPages: expect.any(Number),
        }),
      );
    });

    it('should filter by status and search by partner name', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;

      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const empty = await request(app.getHttpServer())
        .get('/api/v1/quotes?status=accepted')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(empty.body.data).toHaveLength(0);

      const search = await request(app.getHttpServer())
        .get('/api/v1/quotes?search=Quote%20Customer')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(search.body.data.length).toBeGreaterThanOrEqual(1);

      const filter = await request(app.getHttpServer())
        .get('/api/v1/quotes?status=sent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(filter.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should forbid accountant from reading quotes', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/quotes')
        .set('Authorization', `Bearer ${accountantToken}`)
        .expect(403);
    });
  });

  describe('GET /quotes/:id', () => {
    it('should return a created draft quote with its lines', async () => {
      const created = (await createQuote(commercialToken).expect(201))
        .body as QuoteResponse;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/quotes/${created.id}`)
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(200);

      expect(res.body.id).toBe(created.id);
      expect(res.body.lines[0].description).toBe('Widget');
    });

    it('should return 404 for a missing quote and a malformed id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/quotes/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get('/api/v1/quotes/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /quotes/:id/send', () => {
    it('should send a draft quote (draft → sent) and reject re-sending', async () => {
      const created = (await createQuote(commercialToken).expect(201))
        .body as QuoteResponse;

      const sent = await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(200);
      expect((sent.body as QuoteResponse).status).toBe('sent');

      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(409);
    });

    it('should resend a revision_requested quote (revision_requested → sent)', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'revision_requested' })
        .expect(200);

      const resent = await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((resent.body as QuoteResponse).status).toBe('sent');
    });
  });

  describe('PATCH /quotes/:id/status', () => {
    it('should walk the state machine sent → accepted → convert', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const rejected = await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected' })
        .expect(200);
      expect((rejected.body as QuoteResponse).status).toBe('rejected');

      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' })
        .expect(409);
    });

    it('should reject a status change from draft (409)', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' })
        .expect(409);
    });

    it('should reject when the terminal state accepted gets a status again', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'revision_requested' })
        .expect(409);
    });
  });

  describe('UPDATE / DELETE (guards)', () => {
    it('should allow editing a draft and reject editing an accepted quote', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ objet: 'Devis climatisation' })
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ objet: 'changed' })
        .expect(409);
    });

    it('should allow editing a revision_requested quote', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'revision_requested' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ objet: 'revised' })
        .expect(200);
    });

    it('should allow deleting a draft and reject deleting an accepted quote', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .delete(`/api/v1/quotes/${created.id}`)
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(200);

      const accepted = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${accepted.id}/send`)
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${accepted.id}/status`)
        .set('Authorization', `Bearer ${commercialToken}`)
        .send({ status: 'accepted' })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/v1/quotes/${accepted.id}`)
        .set('Authorization', `Bearer ${commercialToken}`)
        .expect(409);
    });
  });

  describe('POST /quotes/:id/convert-to-invoice', () => {
    async function acceptQuote() {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' })
        .expect(200);
      return created.id;
    }

    it('should create a draft invoice from an accepted quote and link both sides', async () => {
      const quoteId = await acceptQuote();

      const res = await request(app.getHttpServer())
        .post(`/api/v1/quotes/${quoteId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const invoice = res.body as InvoiceFromQuote;
      expect(invoice.status).toBe('draft');
      expect(invoice.quoteId).toBe(quoteId);
      expect(invoice.subtotal).toBe('200.00');
      expect(invoice.discountPercent).toBe('0.00');
      expect(invoice.discountAmount).toBe('0.00');
      expect(invoice.tvaAmount).toBe('38.00');
      expect(invoice.totalAmount).toBe('238.00');
      expect(invoice.paymentMethods).toBeNull();
      expect(invoice.lines).toHaveLength(1);

      const quote = await request(app.getHttpServer())
        .get(`/api/v1/quotes/${quoteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((quote.body as QuoteResponse).convertedToInvoiceId).toBe(
        invoice.id,
      );
    });

    it('should propagate discount and payment modalities to the invoice', async () => {
      const created = (
        await request(app.getHttpServer())
          .post('/api/v1/quotes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            partnerId: customerId,
            discountPercent: 10,
            paymentMethods: [
              { label: 'à la commande', percentage: 50 },
              { label: 'solde à la livraison', percentage: 50 },
            ],
            lines: [{ description: 'Item A', quantity: 2, unitPrice: 500 }],
          })
          .expect(201)
      ).body as QuoteResponse;

      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${created.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/convert-to-invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const invoice = res.body as InvoiceFromQuote;
      expect(invoice.subtotal).toBe('1000.00');
      expect(invoice.discountPercent).toBe('10.00');
      expect(invoice.discountAmount).toBe('100.00');
      expect(invoice.tvaAmount).toBe('171.00');
      expect(invoice.totalAmount).toBe('1071.00');
      expect(invoice.paymentMethods).toEqual([
        { label: 'à la commande', percentage: 50 },
        { label: 'solde à la livraison', percentage: 50 },
      ]);
    });

    it('should be idempotent and return the existing invoice', async () => {
      const quoteId = await acceptQuote();

      const first = await request(app.getHttpServer())
        .post(`/api/v1/quotes/${quoteId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const second = await request(app.getHttpServer())
        .post(`/api/v1/quotes/${quoteId}/convert-to-invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect((second.body as InvoiceFromQuote).id).toBe(
        (first.body as InvoiceFromQuote).id,
      );

      const list = await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (list.body.data as Array<InvoiceFromQuote>).filter(
          (i) => i.quoteId === quoteId,
        ),
      ).toHaveLength(1);
    });

    it('should reject converting a non-accepted quote (409)', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/convert-to-invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });

    it('should reject converting a draft quote (409)', async () => {
      const created = (await createQuote().expect(201)).body as QuoteResponse;
      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${created.id}/convert-to-invoice`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });
});
