import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

const USER_AUTH_SELECT = {
  id: true,
  role: true,
  workspace: true,
  isActive: true,
} as const;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret',
    });
  }

  /**
   * The token proves *who* the caller is; the role/workspace are read live
   * from the DB on every request. This guarantees that a role change or a
   * deactivation (isActive=false) takes effect immediately without forcing
   * the user to re-login or wait for token expiry.
   */
  async validate(payload: { userId: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: USER_AUTH_SELECT,
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('الجلسة غير صالحة أو انتهت صلاحيتها');
    }

    return {
      userId: user.id,
      role: user.role,
      workspace: user.workspace,
    };
  }
}
