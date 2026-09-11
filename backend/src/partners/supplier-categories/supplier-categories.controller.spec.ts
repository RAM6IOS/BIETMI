import { Test, TestingModule } from '@nestjs/testing';
import { SupplierCategoriesController } from './supplier-categories.controller';
import { SupplierCategoriesService } from './supplier-categories.service';

function mockCategoriesService() {
  return {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

describe('SupplierCategoriesController', () => {
  let controller: SupplierCategoriesController;
  let service: ReturnType<typeof mockCategoriesService>;

  beforeEach(async () => {
    service = mockCategoriesService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierCategoriesController],
      providers: [{ provide: SupplierCategoriesService, useValue: service }],
    }).compile();

    controller = module.get<SupplierCategoriesController>(
      SupplierCategoriesController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to service', async () => {
    service.findAll.mockResolvedValue([]);
    const result = await controller.findAll();
    expect(result).toEqual([]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('create delegates to service', async () => {
    const category = { id: '1', name: 'قطع غيار', createdAt: new Date() };
    service.create.mockResolvedValue(category);
    const result = await controller.create({ name: 'قطع غيار' });
    expect(result).toEqual(category);
    expect(service.create).toHaveBeenCalledWith({ name: 'قطع غيار' });
  });

  it('update delegates to service', async () => {
    const updated = { id: '1', name: 'جديد', createdAt: new Date() };
    service.update.mockResolvedValue(updated);
    const result = await controller.update('1', { name: 'جديد' });
    expect(result).toEqual(updated);
    expect(service.update).toHaveBeenCalledWith('1', { name: 'جديد' });
  });

  it('remove delegates to service', async () => {
    const deleted = { id: '1', name: 'x', createdAt: new Date() };
    service.remove.mockResolvedValue(deleted);
    const result = await controller.remove('1');
    expect(result).toEqual(deleted);
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
