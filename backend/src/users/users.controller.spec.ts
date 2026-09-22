import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role, Workspace } from '@prisma/client';

const currentUser = {
  userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  role: Role.admin,
  workspace: Workspace.production,
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    update: jest.Mock;
    changeOwnPassword: jest.Mock;
    resetUserPassword: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      changeOwnPassword: jest.fn(),
      resetUserPassword: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to service with current user and dto', async () => {
    const dto = {
      fullName: 'X',
      username: 'u',
      role: Role.commercial,
    };
    service.create.mockResolvedValue({ id: '1' });

    await controller.create(currentUser, dto);

    expect(service.create).toHaveBeenCalledWith(currentUser, dto);
  });

  it('findAll delegates to service with current user and query', async () => {
    const query = { search: 'a', page: '1' };
    service.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(currentUser, query);

    expect(service.findAll).toHaveBeenCalledWith(currentUser, query);
  });

  it('update delegates to service with current user, id and dto', async () => {
    const dto = { isActive: false };
    service.update.mockResolvedValue({ id: '1' });

    await controller.update(currentUser, 'abc', dto);

    expect(service.update).toHaveBeenCalledWith(currentUser, 'abc', dto);
  });

  it('changeMyPassword delegates to service with current user and dto', async () => {
    const dto = { currentPassword: 'old', newPassword: 'new' };
    service.changeOwnPassword.mockResolvedValue({ success: true });

    await controller.changeMyPassword(currentUser, dto);

    expect(service.changeOwnPassword).toHaveBeenCalledWith(currentUser, dto);
  });

  it('resetPassword delegates to service with current user and id', async () => {
    service.resetUserPassword.mockResolvedValue({
      tempPassword: 'abc',
      mustChangePassword: true,
    });

    await controller.resetPassword(currentUser, 'abc');

    expect(service.resetUserPassword).toHaveBeenCalledWith(currentUser, 'abc');
  });

  it('remove delegates to service with current user and id', async () => {
    service.remove.mockResolvedValue({ id: 'abc', deleted: true });

    const result = await controller.remove(currentUser, 'abc');

    expect(service.remove).toHaveBeenCalledWith(currentUser, 'abc');
    expect(result).toEqual({ id: 'abc', deleted: true });
  });
});
