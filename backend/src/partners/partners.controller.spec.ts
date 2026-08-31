import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { SuppliersController } from './suppliers.controller';
import { PartnersService } from './partners.service';
import { PartnerType } from '@prisma/client';

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

  it('create passes PartnerType.customer', async () => {
    service.create.mockResolvedValue({ id: '1' });
    const dto = { name: 'Test' };
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto, PartnerType.customer);
  });

  it('findAll passes PartnerType.customer', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} });
    const query = { page: '1' };
    await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query, PartnerType.customer);
  });

  it('findOne passes PartnerType.customer', async () => {
    service.findOne.mockResolvedValue({ id: '1' });
    await controller.findOne('1');
    expect(service.findOne).toHaveBeenCalledWith('1', PartnerType.customer);
  });

  it('update passes PartnerType.customer', async () => {
    service.update.mockResolvedValue({ id: '1' });
    await controller.update('1', { name: 'X' });
    expect(service.update).toHaveBeenCalledWith(
      '1',
      { name: 'X' },
      PartnerType.customer,
    );
  });

  it('remove passes PartnerType.customer', async () => {
    service.remove.mockResolvedValue({ id: '1' });
    await controller.remove('1');
    expect(service.remove).toHaveBeenCalledWith('1', PartnerType.customer);
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

  it('create passes PartnerType.supplier', async () => {
    service.create.mockResolvedValue({ id: '1' });
    const dto = { name: 'DEMAG', paymentTerms: '60 يوم', currency: 'FOREIGN' };
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto, PartnerType.supplier);
  });

  it('findAll passes PartnerType.supplier', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} });
    const query = { page: '1', search: 'demag' };
    await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query, PartnerType.supplier);
  });

  it('findOne passes PartnerType.supplier', async () => {
    service.findOne.mockResolvedValue({ id: '1' });
    await controller.findOne('1');
    expect(service.findOne).toHaveBeenCalledWith('1', PartnerType.supplier);
  });

  it('update passes PartnerType.supplier', async () => {
    service.update.mockResolvedValue({ id: '1' });
    await controller.update('1', { currency: 'DZD' });
    expect(service.update).toHaveBeenCalledWith(
      '1',
      { currency: 'DZD' },
      PartnerType.supplier,
    );
  });

  it('remove passes PartnerType.supplier', async () => {
    service.remove.mockResolvedValue({ id: '1' });
    await controller.remove('1');
    expect(service.remove).toHaveBeenCalledWith('1', PartnerType.supplier);
  });
});
