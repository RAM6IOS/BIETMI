import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from '../common/strategies/jwt.strategy';

const throttlerConfig =
  process.env.NODE_ENV === 'test'
    ? []
    : [
        {
          // Applied globally to every endpoint: generous default (100 requests/minute).
          ttl: 60 * 1000,
          limit: 100,
        },
      ];

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    ThrottlerModule.forRoot(throttlerConfig),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ...(process.env.NODE_ENV === 'test'
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]),
  ],
  exports: [AuthService],
})
export class AuthModule {}
