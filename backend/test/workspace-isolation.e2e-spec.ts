import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { Workspace } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponse {
  access_token: string;
}

interface IssuedInvoiceResponse {
  id: string;
  status: string;
  invoiceNumber: string | null;
}

interface QuoteResponse {
  id: string;
  quoteNumber: string;
  status: string;
}

interface PurchaseOrderResponse {
  id: string;
  orderNumber: string;
  status: string;
}

async function createWorkspaceUser(
  prisma: PrismaService,
  username: string,
  workspace: Workspace,
) {
  const passwordHash = await bcrypt.hash('testpassword', 12);
  await prisma.user.upsert({
    where: { username },
    update: { role: 'admin', workspace },
    create: {
      username,
      passwordHash,
      role: 'admin',
      fullName: username,
      workspace,
    },
  });
}

async function login(app: INestApplication, username: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username, password: 'testpassword' })
    .expect(200);
  return (res.body as LoginResponse).access_token;
}

const SALE_NUMBER_RE = /^SALE-\d{4}-\d{5}$/;
const QUOTE_NUMBER_RE = /^QT-\d{4}-\d{5}$/;
const ORDER_NUMBER_RE = /^\d{3}$/;

describe('Workspace isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sandboxToken: string;
  let productionToken: string;

  let sandboxCustomerId: string;
  let productionCustomerId: string;
  let sandboxSupplierId: string;
  let productionSupplierId: string;
  let sandboxCategoryId: string;
  let productionCategoryId: string;

  // Real company profiles are singletons per workspace; snapshot them so the
  // suite can never permanently clobber real data.
  let sandboxCompanyBefore: { name: string; ville: string | null };
  let productionCompanyBefore: { name: string; ville: string | null };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await createWorkspaceUser(prisma, 'wsiso_sandbox', Workspace.sandbox);
    await createWorkspaceUser(prisma, 'wsiso_production', Workspace.production);

    sandboxToken = await login(app, 'wsiso_sandbox');
    productionToken = await login(app, 'wsiso_production');

    const sandboxCompany = await request(app.getHttpServer())
      .get('/api/v1/company')
      .set('Authorization', `Bearer ${sandboxToken}`)
      .expect(200);
    const productionCompany = await request(app.getHttpServer())
      .get('/api/v1/company')
      .set('Authorization', `Bearer ${productionToken}`)
      .expect(200);
    sandboxCompanyBefore = {
      name: sandboxCompany.body.name,
      ville: sandboxCompany.body.ville ?? null,
    };
    productionCompanyBefore = {
      name: productionCompany.body.name,
      ville: productionCompany.body.ville ?? null,
    };
  }, 30000);

  beforeEach(async () => {
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.invoiceCounter.deleteMany();
    await prisma.quoteLine.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.quoteCounter.deleteMany();
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.purchaseOrderCounter.deleteMany();
    await prisma.partner.deleteMany({
      where: { name: { contains: 'WSISO' } },
    });
    await prisma.supplierCategory.deleteMany({
      where: { name: { contains: 'WSISO' } },
    });

    // Cross-workspace management target (production) for user-isolation tests.
    const prodTargetPasswordHash = await bcrypt.hash('testpassword', 12);
    await prisma.user.upsert({
      where: { username: 'wsiso_prod_target' },
      update: { role: 'commercial' },
      create: {
        username: 'wsiso_prod_target',
        passwordHash: prodTargetPasswordHash,
        role: 'commercial',
        fullName: 'WSISO Production Target',
        workspace: Workspace.production,
      },
    });

    const sandboxCustomer = (
      await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ name: 'WSISO Sandbox Customer', currency: 'DZD' })
        .expect(201)
    ).body;
    const productionCustomer = (
      await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${productionToken}`)
        .send({ name: 'WSISO Production Customer', currency: 'DZD' })
        .expect(201)
    ).body;
    const sandboxCategory = (
      await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ name: 'WSISO Sandbox Category' })
        .expect(201)
    ).body;
    const productionCategory = (
      await request(app.getHttpServer())
        .post('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${productionToken}`)
        .send({ name: 'WSISO Production Category' })
        .expect(201)
    ).body;
    const sandboxSupplier = (
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({
          name: 'WSISO Sandbox Supplier',
          categoryIds: [sandboxCategory.id],
        })
        .expect(201)
    ).body;
    const productionSupplier = (
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${productionToken}`)
        .send({
          name: 'WSISO Production Supplier',
          categoryIds: [productionCategory.id],
        })
        .expect(201)
    ).body;

    sandboxCustomerId = sandboxCustomer.id;
    productionCustomerId = productionCustomer.id;
    sandboxSupplierId = sandboxSupplier.id;
    productionSupplierId = productionSupplier.id;
    sandboxCategoryId = sandboxCategory.id;
    productionCategoryId = productionCategory.id;
  });

  afterAll(async () => {
    // Restore real company profiles (see snapshot in beforeAll).
    if (sandboxCompanyBefore && productionCompanyBefore) {
      await prisma.company.update({
        where: { workspace: Workspace.sandbox },
        data: {
          name: sandboxCompanyBefore.name,
          ville: sandboxCompanyBefore.ville,
        },
      });
      await prisma.company.update({
        where: { workspace: Workspace.production },
        data: {
          name: productionCompanyBefore.name,
          ville: productionCompanyBefore.ville,
        },
      });
    }

    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.invoiceCounter.deleteMany();
    await prisma.quoteLine.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.quoteCounter.deleteMany();
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.purchaseOrderCounter.deleteMany();
    await prisma.partner.deleteMany({
      where: { name: { contains: 'WSISO' } },
    });
    await prisma.supplierCategory.deleteMany({
      where: { name: { contains: 'WSISO' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [
            'wsiso_sandbox',
            'wsiso_production',
            'wsiso_created_sandbox',
            'wsiso_created_production',
            'wsiso_update_target',
            'wsiso_prod_target',
          ],
        },
      },
    });
    await app.close();
  });

  describe('POST auto-fills workspace from JWT', () => {
    it('persists the caller workspace (never the request body)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({
          name: 'WSISO Body Leak',
          currency: 'DZD',
          workspace: 'production',
        })
        .expect(201);

      const stored = await prisma.partner.findUnique({
        where: { id: res.body.id },
      });
      expect(stored?.workspace).toBe(Workspace.sandbox);
    });
  });

  describe('lists are workspace-scoped', () => {
    it('sandbox user only sees sandbox customers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(200);

      const ids = (res.body.data as Array<{ id: string }>).map((x) => x.id);
      expect(ids).toContain(sandboxCustomerId);
      expect(ids).not.toContain(productionCustomerId);
    });

    it('production user only sees production customers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(200);

      const ids = (res.body.data as Array<{ id: string }>).map((x) => x.id);
      expect(ids).toContain(productionCustomerId);
      expect(ids).not.toContain(sandboxCustomerId);
    });

    it('sandbox user only sees sandbox suppliers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/suppliers')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(200);

      const ids = (res.body.data as Array<{ id: string }>).map((x) => x.id);
      expect(ids).toContain(sandboxSupplierId);
      expect(ids).not.toContain(productionSupplierId);
    });

    it('sandbox user only sees sandbox supplier categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/supplier-categories')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(200);

      const ids = (res.body as Array<{ id: string }>).map((x) => x.id);
      expect(ids).toContain(sandboxCategoryId);
      expect(ids).not.toContain(productionCategoryId);
    });
  });

  describe('direct ID access across workspaces returns 404', () => {
    it('sandbox cannot GET a production customer / supplier / category', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/customers/${productionCustomerId}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${productionSupplierId}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/supplier-categories/${productionCategoryId}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
    });

    it('production cannot GET a sandbox customer / supplier / category', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/customers/${sandboxCustomerId}`)
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/suppliers/${sandboxSupplierId}`)
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/supplier-categories/${sandboxCategoryId}`)
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(404);
    });

    it('sandbox cannot GET / PATCH / DELETE a production invoice or quote or PO', async () => {
      const prodInvoice = (
        await request(app.getHttpServer())
          .post('/api/v1/invoices')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            partnerId: productionCustomerId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body;
      const prodQuote = (
        await request(app.getHttpServer())
          .post('/api/v1/quotes')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            partnerId: productionCustomerId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body;
      const prodPo = (
        await request(app.getHttpServer())
          .post('/api/v1/purchase-orders')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            supplierId: productionSupplierId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body;

      await request(app.getHttpServer())
        .get(`/api/v1/invoices/${prodInvoice.id}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/api/v1/invoices/${prodInvoice.id}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ internalReference: 'x' })
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/api/v1/invoices/${prodInvoice.id}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/quotes/${prodQuote.id}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/api/v1/quotes/${prodQuote.id}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/v1/purchase-orders/${prodPo.id}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
    });
  });

  describe('cross-workspace record references are rejected', () => {
    it('sandbox cannot create an invoice/quote referencing a production customer', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({
          partnerId: productionCustomerId,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        })
        .expect(404);
      await request(app.getHttpServer())
        .post('/api/v1/quotes')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({
          partnerId: productionCustomerId,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        })
        .expect(404);
    });

    it('sandbox cannot create a PO referencing a production supplier', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/purchase-orders')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({
          supplierId: productionSupplierId,
          lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
        })
        .expect(404);
    });

    it('sandbox cannot create a supplier linked to a production category', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/suppliers')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({
          name: 'WSISO Cross Category',
          categoryIds: [productionCategoryId],
        })
        .expect(404);
    });

    it('sandbox cannot attach a production category to an existing sandbox supplier', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/suppliers/${sandboxSupplierId}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ categoryIds: [productionCategoryId] })
        .expect(404);
    });
  });

  describe('cross-workspace lifecycle actions are rejected', () => {
    it('sandbox cannot issue a production invoice', async () => {
      const prodInvoice = (
        await request(app.getHttpServer())
          .post('/api/v1/invoices')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            partnerId: productionCustomerId,
            issueDate: '2026-01-15',
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body;

      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${prodInvoice.id}/issue`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
    });

    it('sandbox cannot send / change status / revise / convert a production quote', async () => {
      const prodQuote = (
        await request(app.getHttpServer())
          .post('/api/v1/quotes')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            partnerId: productionCustomerId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body;

      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${prodQuote.id}/send`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .patch(`/api/v1/quotes/${prodQuote.id}/status`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ status: 'revision_requested' })
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/quotes/${prodQuote.id}/create-revision`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
    });

    it('sandbox cannot send a production purchase order', async () => {
      const prodPo = (
        await request(app.getHttpServer())
          .post('/api/v1/purchase-orders')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            supplierId: productionSupplierId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body;

      await request(app.getHttpServer())
        .post(`/api/v1/purchase-orders/${prodPo.id}/send`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
    });
  });

  describe('counters are independent per workspace', () => {
    it('invoice numbering starts from the same point in both workspaces', async () => {
      const sandboxInvoice = (
        await request(app.getHttpServer())
          .post('/api/v1/invoices')
          .set('Authorization', `Bearer ${sandboxToken}`)
          .send({
            partnerId: sandboxCustomerId,
            issueDate: '2026-01-15',
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body;
      const sandboxIssued = (
        await request(app.getHttpServer())
          .post(`/api/v1/invoices/${sandboxInvoice.id}/issue`)
          .set('Authorization', `Bearer ${sandboxToken}`)
          .expect(200)
      ).body as IssuedInvoiceResponse;

      const productionInvoice = (
        await request(app.getHttpServer())
          .post('/api/v1/invoices')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            partnerId: productionCustomerId,
            issueDate: '2026-01-15',
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body;
      const productionIssued = (
        await request(app.getHttpServer())
          .post(`/api/v1/invoices/${productionInvoice.id}/issue`)
          .set('Authorization', `Bearer ${productionToken}`)
          .expect(200)
      ).body as IssuedInvoiceResponse;

      expect(sandboxIssued.invoiceNumber).toMatch(SALE_NUMBER_RE);
      expect(productionIssued.invoiceNumber).toMatch(SALE_NUMBER_RE);
      expect(sandboxIssued.invoiceNumber).toBe(productionIssued.invoiceNumber);
    });

    it('quote numbering is independent per workspace', async () => {
      const sandboxQuote = (
        await request(app.getHttpServer())
          .post('/api/v1/quotes')
          .set('Authorization', `Bearer ${sandboxToken}`)
          .send({
            partnerId: sandboxCustomerId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body as QuoteResponse;
      const productionQuote = (
        await request(app.getHttpServer())
          .post('/api/v1/quotes')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            partnerId: productionCustomerId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body as QuoteResponse;

      expect(sandboxQuote.quoteNumber).toMatch(QUOTE_NUMBER_RE);
      expect(productionQuote.quoteNumber).toMatch(QUOTE_NUMBER_RE);
      expect(sandboxQuote.quoteNumber).toBe(productionQuote.quoteNumber);
    });

    it('purchase order numbering is independent per workspace', async () => {
      const sandboxPo = (
        await request(app.getHttpServer())
          .post('/api/v1/purchase-orders')
          .set('Authorization', `Bearer ${sandboxToken}`)
          .send({
            supplierId: sandboxSupplierId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body as PurchaseOrderResponse;
      const productionPo = (
        await request(app.getHttpServer())
          .post('/api/v1/purchase-orders')
          .set('Authorization', `Bearer ${productionToken}`)
          .send({
            supplierId: productionSupplierId,
            lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
          })
          .expect(201)
      ).body as PurchaseOrderResponse;

      expect(sandboxPo.orderNumber).toMatch(ORDER_NUMBER_RE);
      expect(productionPo.orderNumber).toMatch(ORDER_NUMBER_RE);
      expect(sandboxPo.orderNumber).toBe(productionPo.orderNumber);
    });
  });

  describe('users are workspace-isolated (no admin exception)', () => {
    it('sandbox admin only sees sandbox users, never the production admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(200);

      const usernames = (res.body.data as Array<{ username: string }>).map(
        (x) => x.username,
      );
      expect(usernames).toContain('wsiso_sandbox');
      expect(usernames).not.toContain('wsiso_production');
      expect(usernames).not.toContain('wsiso_prod_target');
    });

    it('production admin only sees production users, never the sandbox admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(200);

      const usernames = (res.body.data as Array<{ username: string }>).map(
        (x) => x.username,
      );
      expect(usernames).toContain('wsiso_production');
      expect(usernames).toContain('wsiso_prod_target');
      expect(usernames).not.toContain('wsiso_sandbox');
    });

    it('sandbox admin cannot PATCH / reset / DELETE a production user', async () => {
      const target = await prisma.user.findUnique({
        where: { username: 'wsiso_prod_target' },
      });
      expect(target).not.toBeNull();
      const targetId = target!.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ fullName: 'WSISO Hijacked' })
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetId}/reset-password`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(404);
    });

    it('production admin cannot PATCH / reset / DELETE a sandbox user', async () => {
      const target = await prisma.user.findUnique({
        where: { username: 'wsiso_sandbox' },
      });
      expect(target).not.toBeNull();
      const targetId = target!.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${productionToken}`)
        .send({ fullName: 'WSISO Hijacked' })
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/api/v1/users/${targetId}/reset-password`)
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/api/v1/users/${targetId}`)
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(404);
    });
  });

  describe('company profile is workspace-isolated', () => {
    it('each workspace reads its own company profile', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/company')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ name: 'WSISO Sandbox Co', ville: 'Alger' })
        .expect(200);

      const sandboxGet = await request(app.getHttpServer())
        .get('/api/v1/company')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .expect(200);
      const productionGet = await request(app.getHttpServer())
        .get('/api/v1/company')
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(200);

      expect(sandboxGet.body.name).toBe('WSISO Sandbox Co');
      expect(sandboxGet.body.ville).toBe('Alger');
      expect(productionGet.body.name).toBe(productionCompanyBefore.name);
      expect(productionGet.body.ville).toBe(productionCompanyBefore.ville);
    });

    it('admin of one workspace cannot affect the other workspace company profile', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/company')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ name: 'WSISO Sandbox Renamed', ville: 'Alger' })
        .expect(200);

      const productionGet = await request(app.getHttpServer())
        .get('/api/v1/company')
        .set('Authorization', `Bearer ${productionToken}`)
        .expect(200);
      expect(productionGet.body.name).toBe(productionCompanyBefore.name);
      expect(productionGet.body.ville).toBe(productionCompanyBefore.ville);
    });
  });

  describe('user creation inherits the caller workspace', () => {
    it("sandbox admin's new users land in sandbox (body workspace ignored)", async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({
          fullName: 'WSISO Sandbox Created',
          username: 'wsiso_created_sandbox',
          role: 'commercial',
          workspace: 'production',
        })
        .expect(201);

      expect(res.body.workspace).toBe(Workspace.sandbox);
      const stored = await prisma.user.findUnique({
        where: { username: 'wsiso_created_sandbox' },
      });
      expect(stored?.workspace).toBe(Workspace.sandbox);
    });

    it("production admin's new users land in production", async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${productionToken}`)
        .send({
          fullName: 'WSISO Production Created',
          username: 'wsiso_created_production',
          role: 'accountant',
        })
        .expect(201);

      expect(res.body.workspace).toBe(Workspace.production);
      const stored = await prisma.user.findUnique({
        where: { username: 'wsiso_created_production' },
      });
      expect(stored?.workspace).toBe(Workspace.production);
    });

    it('an existing user keeps its workspace across admin updates', async () => {
      const created = (
        await request(app.getHttpServer())
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${sandboxToken}`)
          .send({
            fullName: 'WSISO Update Target',
            username: 'wsiso_update_target',
            role: 'commercial',
          })
          .expect(201)
      ).body;

      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/users/${created.id}`)
        .set('Authorization', `Bearer ${sandboxToken}`)
        .send({ workspace: 'production' })
        .expect(200);

      expect(updated.body.workspace).toBe(Workspace.sandbox);
      const stored = await prisma.user.findUnique({
        where: { username: 'wsiso_update_target' },
      });
      expect(stored?.workspace).toBe(Workspace.sandbox);
    });
  });
});
