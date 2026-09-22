import { Test, TestingModule } from '@nestjs/testing';
import { SupplierCategoriesController } from './supplier-categories.controller';
import { SupplierCategoriesService } from './supplier-categories.service';
import { Workspace } from '@prisma/client';

const user = { userId: 'u1', role: 'admin', workspace: Workspace.sandbox };

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

  it('findAll passes workspace from current user', async () => {
    service.findAll.mockResolvedValue([]);
    const result = await controller.findAll(user as never);
    expect(result).toEqual([]);
    expect(service.findAll).toHaveBeenCalledWith(Workspace.sandbox);
  });

  it('create passes workspace from current user', async () => {
    const category = { id: '1', name: 'قطع غيار', createdAt: new Date() };
    service.create.mockResolvedValue(category);
    const result = await controller.create(user as never, { name: 'قطع غيار' });
    expect(result).toEqual(category);
    expect(service.create).toHaveBeenCalledWith(
      { name: 'قطع غيار' },
      Workspace.sandbox,
    );
  });

  it('update passes workspace from current user', async () => {
    const updated = { id: '1', name: 'جديد', createdAt: new Date() };
    service.update.mockResolvedValue(updated);
    const result = await controller.update(user as never, '1', {
      name: 'جديد',
    });
    expect(result).toEqual(updated);
    expect(service.update).toHaveBeenCalledWith(
      '1',
      { name: 'جديد' },
      Workspace.sandbox,
    );
  });

  it('remove passes workspace from current user', async () => {
    const deleted = { id: '1', name: 'x', createdAt: new Date() };
    service.remove.mockResolvedValue(deleted);
    const result = await controller.remove(user as never, '1');
    expect(result).toEqual(deleted);
    expect(service.remove).toHaveBeenCalledWith('1', Workspace.sandbox);
  });
});
