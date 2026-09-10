import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponse {
  access_token: string;
}

interface PurchaseOrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  tvaAmount: string;
  totalAmount: string;
  paymentMethods: Array<{ label: string; percentage: number }> | null;
  supplier: { id: string; name: string; type: string; nif: string | null };
  createdBy: { id: string; username: string; fullName: string };
  lines: Array<{
    description: string;
    unit: string | null;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }>;
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

const ORDER_NUMBER_RE = /^\d{3}$/;

async function createSupplier(prisma: PrismaService, name: string) {
  const partner = await prisma.partner.create({
    data: { name, type: 'supplier', currency: 'DZD' },
  });
  return partner.id;
}

describe('PurchaseOrders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let purchasingToken: string;
  let commercialToken: string;
  let accountantToken: string;
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

    await createUser(prisma, 'po_admin', 'admin');
    await createUser(prisma, 'po_purchasing', 'purchasing');
    await createUser(prisma, 'po_commercial', 'commercial');
    await createUser(prisma, 'po_accountant', 'accountant');

    adminToken = await login(app, 'po_admin');
    purchasingToken = await login(app, 'po_purchasing');
    commercialToken = await login(app, 'po_commercial');
    accountantToken = await login(app, 'po_accountant');
  }, 30000);

  beforeEach(async () => {
    const prevIds: string[] = [];
    if (supplierId) prevIds.push(supplierId);
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.purchaseOrderCounter.deleteMany();
    await prisma.partner.deleteMany({ where: { id: { in: prevIds } } });

    supplierId = await createSupplier(prisma, 'PO Test Supplier');
  });

  afterAll(async () => {
    await prisma.purchaseOrderLine.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.purchaseOrderCounter.deleteMany();
    await prisma.partner.deleteMany({
      where: { name: { contains: 'PO Test' } },
    });
    await prisma.user.deleteMany({
      where: {
        username: {
          in: ['po_admin', 'po_purchasing', 'po_commercial', 'po_accountant'],
        },
      },
    });
    await app.close();
  });

  it('creates a draft purchase order with sequential number and serialized money', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        orderDate: '2026-05-10',
        lines: [
          {
            description: 'Ciment',
            unit: 'sac',
            quantity: 2,
            unitPrice: 100,
          },
        ],
      })
      .expect(201);

    const body = res.body as PurchaseOrderResponse;
    expect(body.orderNumber).toMatch(ORDER_NUMBER_RE);
    expect(body.status).toBe('draft');
    expect(body.supplier.id).toBe(supplierId);
    expect(body.supplier.type).toBe('supplier');
    expect(body.createdBy.username).toBe('po_admin');
    expect(body.subtotal).toBe('200.00');
    expect(body.discountPercent).toBe('0.00');
    expect(body.discountAmount).toBe('0.00');
    expect(body.tvaAmount).toBe('38.00');
    expect(body.totalAmount).toBe('238.00');
    expect(body.paymentMethods).toBeNull();
    expect(body.lines).toHaveLength(1);
    expect(body.lines[0]).toEqual(
      expect.objectContaining({
        description: 'Ciment',
        unit: 'sac',
        quantity: '2.000',
        unitPrice: '100.000',
        lineTotal: '200.00',
      }),
    );
  });

  it('creates a purchase order with a purchasing user and per-line rounding', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({
        supplierId,
        lines: [
          { description: 'Line A', quantity: 7, unitPrice: 3.335 },
          { description: 'Line B', quantity: 3, unitPrice: 2.225 },
          { description: 'Line C', quantity: 5, unitPrice: 1.115 },
        ],
      })
      .expect(201);

    const body = res.body as PurchaseOrderResponse;
    expect(body.createdBy.username).toBe('po_purchasing');
    expect(body.subtotal).toBe('35.61');
    expect(body.tvaAmount).toBe('6.77');
    expect(body.totalAmount).toBe('42.38');
    expect(body.lines).toHaveLength(3);
    expect(body.lines[1].unit).toBeNull();
  });

  it('applies a discount and computes TVA on the amount after discount', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        orderDate: '2026-05-10',
        discountPercent: 5,
        paymentMethods: [
          { label: 'Paiement comptant', percentage: 60 },
          { label: 'Solde à la livraison', percentage: 40 },
        ],
        lines: [
          { description: 'Item A', unit: 'U', quantity: 3, unitPrice: 11.87 },
        ],
      })
      .expect(201);

    const body = res.body as PurchaseOrderResponse;
    expect(body.subtotal).toBe('35.61');
    expect(body.discountPercent).toBe('5.00');
    expect(body.discountAmount).toBe('1.78');
    expect(body.tvaAmount).toBe('6.43');
    expect(body.totalAmount).toBe('40.26');
    expect(body.paymentMethods).toEqual([
      { label: 'Paiement comptant', percentage: 60 },
      { label: 'Solde à la livraison', percentage: 40 },
    ]);
  });

  it('rejects an order linked to a non-supplier partner', async () => {
    const customer = await prisma.partner.create({
      data: { name: 'PO Test Customer', type: 'customer', currency: 'DZD' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: customer.id,
        lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
      })
      .expect(400);
  });

  it('rejects an order linked to a missing partner', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: '00000000-0000-4000-8000-000000000000',
        lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
      })
      .expect(400);
  });

  it('lists purchase orders with pagination metadata', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${purchasingToken}`)
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

  it('filters and searches the list', async () => {
    const otherSupplierId = await createSupplier(prisma, 'Second PO Supplier');

    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: otherSupplierId,
        lines: [{ description: 'B', quantity: 1, unitPrice: 20 }],
      })
      .expect(201);

    const searchRes = await request(app.getHttpServer())
      .get('/api/v1/purchase-orders?search=Second')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(searchRes.body.data).toHaveLength(1);
    expect(searchRes.body.data[0].supplier.name).toBe('Second PO Supplier');

    await prisma.purchaseOrder.deleteMany({
      where: { supplierId: otherSupplierId },
    });
    await prisma.partner.delete({ where: { id: otherSupplierId } });
  });

  it('returns a single purchase order with its lines', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        lines: [
          { description: 'Ciment', unit: 'sac', quantity: 2, unitPrice: 100 },
        ],
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(
        `/api/v1/purchase-orders/${(created.body as PurchaseOrderResponse).id}`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = res.body as PurchaseOrderResponse;
    expect(body.orderNumber).toMatch(ORDER_NUMBER_RE);
    expect(body.lines[0].description).toBe('Ciment');
  });

  it('returns 404 for a missing purchase order and a malformed id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/purchase-orders/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get('/api/v1/purchase-orders/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('sends a draft order (draft → sent) and rejects re-sending', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({
        supplierId,
        lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
      })
      .expect(201);
    const orderId = (created.body as PurchaseOrderResponse).id;

    const sent = await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${orderId}/send`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .expect(200);
    expect((sent.body as PurchaseOrderResponse).status).toBe('sent');

    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${orderId}/send`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .expect(409);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((fetched.body as PurchaseOrderResponse).status).toBe('sent');
  });

  it('forbids commercial and accountant users from all endpoints', async () => {
    const payload = {
      supplierId,
      lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
    };

    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${commercialToken}`)
      .send(payload)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send(payload)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${accountantToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${commercialToken}`)
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/v1/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);
    const orderId = (created.body as PurchaseOrderResponse).id;

    await request(app.getHttpServer())
      .get(`/api/v1/purchase-orders/${orderId}`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/purchase-orders/${orderId}/send`)
      .set('Authorization', `Bearer ${commercialToken}`)
      .expect(403);
  });
});
