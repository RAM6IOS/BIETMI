import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { CurrencyInterceptor } from '../invoices/currency.interceptor';

const USER = { userId: 'user-id', role: Role.admin };

function mockQuotesService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    send: jest.fn(),
    updateStatus: jest.fn(),
    convertToInvoice: jest.fn(),
    createRevision: jest.fn(),
  };
}

describe('QuotesController', () => {
  let controller: QuotesController;
  let service: ReturnType<typeof mockQuotesService>;

  beforeEach(async () => {
    service = mockQuotesService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [
        { provide: QuotesService, useValue: service },
        CurrencyInterceptor,
      ],
    }).compile();
    controller = module.get<QuotesController>(QuotesController);
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

  it('findAll forwards the current user and query', async () => {
    service.findAll.mockResolvedValue({ data: [], meta: {} });
    const query = { page: '1' };
    await controller.findAll(USER, query);
    expect(service.findAll).toHaveBeenCalledWith(USER, query);
  });

  it('findOne forwards the current user and id', async () => {
    service.findOne.mockResolvedValue({ id: '1' });
    await controller.findOne(USER, 'quote-1');
    expect(service.findOne).toHaveBeenCalledWith(USER, 'quote-1');
  });

  it('update forwards the current user, id and dto', async () => {
    service.update.mockResolvedValue({ id: '1' });
    const dto = { objet: 'Devis clim' };
    await controller.update(USER, 'quote-1', dto);
    expect(service.update).toHaveBeenCalledWith(USER, 'quote-1', dto);
  });

  it('remove forwards the current user and id', async () => {
    service.remove.mockResolvedValue({ id: '1', deleted: true });
    await controller.remove(USER, 'quote-1');
    expect(service.remove).toHaveBeenCalledWith(USER, 'quote-1');
  });

  it('send forwards the current user and id', async () => {
    service.send.mockResolvedValue({ id: '1' });
    await controller.send(USER, 'quote-1');
    expect(service.send).toHaveBeenCalledWith(USER, 'quote-1');
  });

  it('updateStatus forwards the current user, id and dto', async () => {
    service.updateStatus.mockResolvedValue({ id: '1' });
    const dto = { status: 'accepted' };
    await controller.updateStatus(USER, 'quote-1', dto);
    expect(service.updateStatus).toHaveBeenCalledWith(USER, 'quote-1', dto);
  });

  it('convertToInvoice forwards the current user and id', async () => {
    service.convertToInvoice.mockResolvedValue({ id: '1', status: 'draft' });
    await controller.convertToInvoice(USER, 'quote-1');
    expect(service.convertToInvoice).toHaveBeenCalledWith(USER, 'quote-1');
  });

  it('createRevision forwards the current user and id', async () => {
    service.createRevision.mockResolvedValue({
      id: '2',
      status: 'draft',
      supersedesQuoteId: 'quote-1',
    });
    await controller.createRevision(USER, 'quote-1');
    expect(service.createRevision).toHaveBeenCalledWith(USER, 'quote-1');
  });
});
