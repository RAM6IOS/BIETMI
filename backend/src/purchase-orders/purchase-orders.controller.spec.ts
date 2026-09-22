import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseOrderStatus, Role, Workspace } from '@prisma/client';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CurrencyInterceptor } from '../invoices/currency.interceptor';

const USER = {
  userId: 'user-id',
  role: Role.admin,
  workspace: Workspace.production,
};

function mockPurchaseOrdersService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    send: jest.fn(),
  };
}

describe('PurchaseOrdersController', () => {
  let controller: PurchaseOrdersController;
  let service: ReturnType<typeof mockPurchaseOrdersService>;

  beforeEach(async () => {
    service = mockPurchaseOrdersService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseOrdersController],
      providers: [
        { provide: PurchaseOrdersService, useValue: service },
        CurrencyInterceptor,
      ],
    }).compile();
    controller = module.get<PurchaseOrdersController>(PurchaseOrdersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create forwards the current user and dto', async () => {
    service.create.mockResolvedValue({ id: '1' });
    const dto = {
      supplierId: 'p1',
      lines: [{ description: 'A', unit: 'sac', quantity: 1, unitPrice: 10 }],
    };
    await controller.create(USER, dto);
    expect(service.create).toHaveBeenCalledWith(USER, dto);
  });

  it('send forwards the current user and id', async () => {
    service.send.mockResolvedValue({ id: '1' });
    await controller.send(USER, 'po-1');
    expect(service.send).toHaveBeenCalledWith(USER, 'po-1');
  });

  it('findAll forwards the current user and query', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} });
    const query = { page: '1', status: PurchaseOrderStatus.draft };
    await controller.findAll(USER, query);
    expect(service.findAll).toHaveBeenCalledWith(USER, query);
  });

  it('findOne forwards the current user and id', async () => {
    service.findOne.mockResolvedValue({ id: '1' });
    await controller.findOne(USER, 'po-1');
    expect(service.findOne).toHaveBeenCalledWith(USER, 'po-1');
  });
});
