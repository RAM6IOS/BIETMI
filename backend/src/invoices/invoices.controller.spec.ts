import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { CurrencyInterceptor } from './currency.interceptor';

const USER = { userId: 'user-id', role: Role.admin };

function mockInvoicesService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    issue: jest.fn(),
    outstanding: jest.fn(),
  };
}

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: ReturnType<typeof mockInvoicesService>;

  beforeEach(async () => {
    service = mockInvoicesService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        { provide: InvoicesService, useValue: service },
        CurrencyInterceptor,
      ],
    }).compile();
    controller = module.get<InvoicesController>(InvoicesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create forwards the current user and dto', async () => {
    service.create.mockResolvedValue({ id: '1' });
    const dto = {
      partnerId: 'p1',
      lines: [{ description: 'A', quantity: 1, unitPrice: 10 }],
    };
    await controller.create(USER, dto);
    expect(service.create).toHaveBeenCalledWith(USER, dto);
  });

  it('issue forwards the current user and id', async () => {
    service.issue.mockResolvedValue({ id: '1' });
    await controller.issue(USER, 'invoice-1');
    expect(service.issue).toHaveBeenCalledWith(USER, 'invoice-1');
  });

  it('findAll forwards the current user and query', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} });
    const query = { page: '1' };
    await controller.findAll(USER, query);
    expect(service.findAll).toHaveBeenCalledWith(USER, query);
  });

  it('findOne forwards the current user and id', async () => {
    service.findOne.mockResolvedValue({ id: '1' });
    await controller.findOne(USER, 'invoice-1');
    expect(service.findOne).toHaveBeenCalledWith(USER, 'invoice-1');
  });

  it('update forwards the current user, id and dto', async () => {
    service.update.mockResolvedValue({ id: '1' });
    const dto = { internalReference: 'R-1' };
    await controller.update(USER, 'invoice-1', dto);
    expect(service.update).toHaveBeenCalledWith(USER, 'invoice-1', dto);
  });

  it('remove forwards the current user and id', async () => {
    service.remove.mockResolvedValue({ id: '1', deleted: true });
    await controller.remove(USER, 'invoice-1');
    expect(service.remove).toHaveBeenCalledWith(USER, 'invoice-1');
  });

  it('outstanding forwards the current user and overdue flag', async () => {
    service.outstanding.mockResolvedValue([]);
    await controller.outstanding(USER, 'true');
    expect(service.outstanding).toHaveBeenCalledWith(USER, true);
  });

  it('outstanding defaults overdue to false', async () => {
    service.outstanding.mockResolvedValue([]);
    await controller.outstanding(USER, undefined);
    expect(service.outstanding).toHaveBeenCalledWith(USER, false);
  });
});
