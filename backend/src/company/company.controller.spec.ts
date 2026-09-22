import { Test, TestingModule } from '@nestjs/testing';
import { Role, Workspace } from '@prisma/client';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';

function mockCompanyService() {
  return {
    get: jest.fn(),
    update: jest.fn(),
  };
}

const user: AuthUser = {
  userId: 'u1',
  role: Role.admin,
  workspace: Workspace.sandbox,
};

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

  it('get forwards the caller workspace to the service', async () => {
    const row = { id: 'company-1', name: 'EURL BIETMI PLUS' };
    service.get.mockResolvedValue(row);

    await expect(controller.get(user)).resolves.toEqual(row);
    expect(service.get).toHaveBeenCalledWith(Workspace.sandbox);
  });

  it('update forwards the workspace and dto', async () => {
    const dto = { mobile: '0660360549' };
    service.update.mockResolvedValue({ id: 'company-1', mobile: dto.mobile });

    await expect(controller.update(user, dto)).resolves.toEqual({
      id: 'company-1',
      mobile: dto.mobile,
    });
    expect(service.update).toHaveBeenCalledWith(Workspace.sandbox, dto);
  });
});
