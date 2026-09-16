import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const LOGIN_THROTTLE = {
  default: {
    ttl: 60 * 1000,
    limit: 100,
  },
  login: {
    ttl: 15 * 60 * 1000, // 15 minutes
    limit: 5, // 5 attempts
  },
};

/**
 * Stricter throttle for forgot-password: 5 requests per 15 minutes per IP.
 * Rationale: this endpoint triggers an actual email to a third party.
 * Abuse would annoy real users (spam), not just the attacker.
 */
const FORGOT_PASSWORD_THROTTLE = {
  default: {
    ttl: 60 * 1000,
    limit: 100,
  },
  forgotPassword: {
    ttl: 15 * 60 * 1000, // 15 minutes
    limit: 5, // 5 attempts
  },
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle(LOGIN_THROTTLE)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle(FORGOT_PASSWORD_THROTTLE)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'تم تعيين كلمة المرور الجديدة بنجاح' };
  }
}
