import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { SuppliersController } from './suppliers.controller';
import { PartnersService } from './partners.service';
import { PartnerCurrency, PartnerType, Workspace } from '@prisma/client';

const user = { userId: 'u1', role: 'admin', workspace: Workspace.sandbox };

function mockPartnersService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: ReturnType<typeof mockPartnersService>;

  beforeEach(async () => {
    service = mockPartnersService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: PartnersService, useValue: service }],
    }).compile();
    controller = module.get<CustomersController>(CustomersController);
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create passes workspace from current user', async () => {
    service.create.mockResolvedValue({ id: '1' });
    const dto = { name: 'Test' };
    await controller.create(user as never, dto);
    expect(service.create).toHaveBeenCalledWith(
      dto,
      PartnerType.customer,
      Workspace.sandbox,
    );
  });

  it('findAll passes workspace from current user', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} });
    const query = { page: '1' };
    await controller.findAll(user as never, query);
    expect(service.findAll).toHaveBeenCalledWith(
      query,
      PartnerType.customer,
      Workspace.sandbox,
    );
  });

  it('findOne passes workspace from current user', async () => {
    service.findOne.mockResolvedValue({ id: '1' });
    await controller.findOne(user as never, '1');
    expect(service.findOne).toHaveBeenCalledWith(
      '1',
      PartnerType.customer,
      Workspace.sandbox,
    );
  });

  it('update passes workspace from current user', async () => {
    service.update.mockResolvedValue({ id: '1' });
    await controller.update(user as never, '1', { name: 'X' });
    expect(service.update).toHaveBeenCalledWith(
      '1',
      { name: 'X' },
      PartnerType.customer,
      Workspace.sandbox,
    );
  });

  it('remove passes workspace from current user', async () => {
    service.remove.mockResolvedValue({ id: '1' });
    await controller.remove(user as never, '1');
    expect(service.remove).toHaveBeenCalledWith(
      '1',
      PartnerType.customer,
      Workspace.sandbox,
    );
  });
});

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: ReturnType<typeof mockPartnersService>;

  beforeEach(async () => {
    service = mockPartnersService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: PartnersService, useValue: service }],
    }).compile();
    controller = module.get<SuppliersController>(SuppliersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create passes workspace from current user', async () => {
    service.create.mockResolvedValue({ id: '1' });
    const dto = {
      name: 'DEMAG',
      paymentTerms: '60 يوم',
      currency: PartnerCurrency.FOREIGN,
    };
    await controller.create(user as never, dto);
    expect(service.create).toHaveBeenCalledWith(
      dto,
      PartnerType.supplier,
      Workspace.sandbox,
    );
  });

  it('findAll passes workspace from current user', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} });
    const query = { page: '1', search: 'demag' };
    await controller.findAll(user as never, query);
    expect(service.findAll).toHaveBeenCalledWith(
      query,
      PartnerType.supplier,
      Workspace.sandbox,
    );
  });

  it('findOne passes workspace from current user', async () => {
    service.findOne.mockResolvedValue({ id: '1' });
    await controller.findOne(user as never, '1');
    expect(service.findOne).toHaveBeenCalledWith(
      '1',
      PartnerType.supplier,
      Workspace.sandbox,
    );
  });

  it('update passes workspace from current user', async () => {
    service.update.mockResolvedValue({ id: '1' });
    await controller.update(user as never, '1', { currency: 'DZD' });
    expect(service.update).toHaveBeenCalledWith(
      '1',
      { currency: 'DZD' },
      PartnerType.supplier,
      Workspace.sandbox,
    );
  });

  it('remove passes workspace from current user', async () => {
    service.remove.mockResolvedValue({ id: '1' });
    await controller.remove(user as never, '1');
    expect(service.remove).toHaveBeenCalledWith(
      '1',
      PartnerType.supplier,
      Workspace.sandbox,
    );
  });
});
