import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    getMe: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      getMe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return access_token on successful login', async () => {
      const loginDto = { username: 'test', password: 'password' };
      const expectedResult = { access_token: 'mock-jwt-token' };

      authService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const loginDto = { username: 'test', password: 'wrongpassword' };

      authService.login.mockRejectedValue(
        new UnauthorizedException('اسم المستخدم أو كلمة المرور غير صحيحة'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('me', () => {
    it('forwards the authenticated user to getMe and returns the profile', async () => {
      const authUser = {
        userId: 'u1',
        role: 'commercial' as const,
        workspace: 'production' as const,
      };
      const profile = {
        id: 'u1',
        username: 'ali',
        role: 'commercial',
        isActive: true,
      };
      authService.getMe.mockResolvedValue(profile);

      const result = await controller.me(authUser);

      expect(result).toEqual(profile);
      expect(authService.getMe).toHaveBeenCalledWith(authUser);
    });
  });
});
