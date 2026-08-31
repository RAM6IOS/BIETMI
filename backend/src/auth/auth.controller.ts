import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle(LOGIN_THROTTLE)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
