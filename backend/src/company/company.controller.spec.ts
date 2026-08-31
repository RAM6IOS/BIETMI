import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

function mockCompanyService() {
  return {
    get: jest.fn(),
    update: jest.fn(),
  };
}

describe('CompanyController', () => {
  let controller: CompanyController;
  let service: ReturnType<typeof mockCompanyService>;

  beforeEach(async () => {
    service = mockCompanyService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [{ provide: CompanyService, useValue: service }],
    }).compile();
    controller = module.get<CompanyController>(CompanyController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('get forwards to the service', async () => {
    const row = { id: 'company-1', name: 'EURL BIETMI PLUS' };
    service.get.mockResolvedValue(row);
    await expect(controller.get()).resolves.toEqual(row);
    expect(service.get).toHaveBeenCalledTimes(1);
  });

  it('update forwards the dto', async () => {
    const dto = { mobile: '0660360549' };
    service.update.mockResolvedValue({ id: 'company-1', mobile: dto.mobile });
    await expect(controller.update(dto)).resolves.toEqual({
      id: 'company-1',
      mobile: dto.mobile,
    });
    expect(service.update).toHaveBeenCalledWith(dto);
  });
});
