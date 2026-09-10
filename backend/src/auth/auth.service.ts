import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { unauthorizedWithCode } from '../common/errors/app-errors';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/** Compute SHA-256 hex digest of a raw token string. */
function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/** Generic response returned by forgotPassword (anti-enumeration). */
const FORGOT_PASSWORD_RESPONSE = {
  message:
    'إن كان البريد الإلكتروني مسجَّلاً في النظام، ستصلك رسالة خلال دقائق.',
} as const;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw unauthorizedWithCode(
        'AUTH_INVALID_CREDENTIALS',
        'اسم المستخدم أو كلمة المرور غير صحيحة',
      );
    }

    const payload = { userId: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Initiates the password reset flow.
   *
   * Security: Always returns the same generic message regardless of whether
   * the email exists in the system, to prevent user enumeration.
   */
  async forgotPassword(
    email: string,
  ): Promise<typeof FORGOT_PASSWORD_RESPONSE> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Anti-enumeration: return the same response as when the user exists.
      return FORGOT_PASSWORD_RESPONSE;
    }

    // Generate a cryptographically secure random token.
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex chars
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.mailService.sendPasswordResetEmail(user.email!, resetLink);

    return FORGOT_PASSWORD_RESPONSE;
  }

  /**
   * Validates a reset token and updates the user's password.
   *
   * Security:
   * - Only the SHA-256 hash of the token is stored; the raw token is never persisted.
   * - Rejects expired tokens.
   * - Rejects already-used tokens (one-time use enforced).
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);

    const storedToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw unauthorizedWithCode(
        'AUTH_INVALID_RESET_TOKEN',
        'رابط الاستعادة غير صالح أو منتهي الصلاحية',
      );
    }

    if (storedToken.used) {
      throw unauthorizedWithCode(
        'AUTH_RESET_TOKEN_USED',
        'رابط الاستعادة غير صالح أو منتهي الصلاحية',
      );
    }

    if (storedToken.expiresAt <= new Date()) {
      throw unauthorizedWithCode(
        'AUTH_RESET_TOKEN_EXPIRED',
        'رابط الاستعادة غير صالح أو منتهي الصلاحية',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: storedToken.userId },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: storedToken.id },
      data: { used: true },
    });
  }
}
