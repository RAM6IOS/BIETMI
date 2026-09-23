import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * MailService — wraps Nodemailer.
 *
 * When SMTP_HOST is configured, real SMTP is used in every environment
 * (production and development), so password-reset emails are deliverable
 * even on a local machine.
 *
 * In production, a missing SMTP_HOST is treated as a fatal configuration
 * error: the app refuses to boot rather than silently switching to a fake
 * (Ethereal/JSON) transporter that would never deliver the reset email.
 *
 * Outside production, missing SMTP_HOST falls back to an Ethereal (fake
 * SMTP) account, whose preview URL is logged so developers can inspect
 * sent emails.
 */
type TransportType = 'smtp' | 'ethereal' | 'json' | 'uninitialized';

interface SentMailResult {
  messageId?: string;
  accepted?: string[];
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;
  private transportType: TransportType = 'uninitialized';

  getTransportType(): TransportType {
    return this.transportType;
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      // In unit tests the transporter is replaced by a mock — skip real init.
      return;
    }
    await this.initTransporter();
  }

  async initTransporter(): Promise<void> {
    const smtpHost = process.env.SMTP_HOST;

    if (smtpHost) {
      // Real SMTP is used as soon as SMTP_HOST is provided — in development too,
      // so password-reset emails are actually deliverable during local testing.
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.transportType = 'smtp';
      this.logger.log(`Mail transporter: SMTP (${smtpHost})`);

      if (process.env.NODE_ENV === 'production') {
        // Surface a misconfigured SMTP (bad credentials/TLS) at boot instead
        // of letting every password reset silently fail at send time.
        try {
          await this.transporter.verify();
          this.logger.log('SMTP connection verified successfully.');
        } catch (err) {
          this.logger.error(
            `SMTP connection verify failed — password reset emails will not be delivered: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SMTP_HOST is not configured in production — password reset emails will NOT be delivered. ' +
          'Refusing to start with a fake mail transporter. Set SMTP_HOST (and SMTP_PORT/SMTP_SECURE/' +
          'SMTP_USER/SMTP_PASS/MAIL_FROM/FRONTEND_URL) in the server environment.',
      );
    }

    // No SMTP configured outside production: create a one-time Ethereal test
    // account with a jsonTransport fallback if the Ethereal API is unreachable.
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.transportType = 'ethereal';
      this.logger.log(
        `Mail transporter: Ethereal (${testAccount.user}) — emails are fake and captured at https://ethereal.email`,
      );
    } catch (err) {
      this.logger.warn(
        `Could not create Ethereal test account. Falling back to JSON transport: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.transportType = 'json';
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      // Unit tests inject their own mock — nothing to do here.
      return;
    }

    try {
      const sent = (await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? '"BIETMI ERP" <noreply@bietmi.local>',
        to,
        subject: 'استعادة كلمة المرور / Réinitialisation du mot de passe',
        html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>استعادة كلمة المرور</h2>
          <p>لقد طلبت إعادة تعيين كلمة المرور لحسابك في نظام BIETMI ERP.</p>
          <p>اضغط على الرابط التالي لتعيين كلمة مرور جديدة (صالح لمدة ساعة واحدة):</p>
          <p><a href="${resetLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">تعيين كلمة مرور جديدة</a></p>
          <hr/>
          <p style="color:#6b7280;font-size:12px;">
            إن لم تطلب هذا، تجاهل هذه الرسالة.<br/>
            لن يُعدَّل حسابك ما لم تنقر على الرابط أعلاه.
          </p>
        </div>
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          <h2>Réinitialisation du mot de passe</h2>
          <p>Vous avez demandé la réinitialisation du mot de passe de votre compte BIETMI ERP.</p>
          <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe (valable 1 heure) :</p>
          <p><a href="${resetLink}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Définir un nouveau mot de passe</a></p>
          <p style="color:#6b7280;font-size:12px;">
            Si vous n'avez pas fait cette demande, ignorez cet email.
          </p>
        </div>
      `,
      })) as SentMailResult;

      // In non-production environments, log the Ethereal preview URL so the
      // developer can inspect the email in their browser without any SMTP setup.
      if (process.env.NODE_ENV !== 'production') {
        const previewUrl = nodemailer.getTestMessageUrl(
          sent as unknown as Parameters<typeof nodemailer.getTestMessageUrl>[0],
        );
        if (previewUrl) {
          this.logger.log(`Password reset email sent. Preview: ${previewUrl}`);
        }
      }

      const messageId = sent.messageId ?? 'n/a';
      const recipients =
        sent.accepted && sent.accepted.length > 0
          ? `, delivered to: ${sent.accepted.join(', ')}`
          : '';
      this.logger.log(
        `Password reset email sent (${this.transportType}) to ${to}, messageId: ${messageId}${recipients}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${to}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }
}
