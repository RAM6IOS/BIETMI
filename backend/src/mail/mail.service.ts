import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * MailService — wraps Nodemailer.
 *
 * In development / test: creates an Ethereal (fake SMTP) account automatically.
 * The preview URL for every sent message is logged so developers can inspect
 * emails without any real SMTP configuration.
 *
 * In production: expects SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS env vars.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      // In unit tests the transporter is replaced by a mock — skip real init.
      return;
    }
    await this.initTransporter();
  }

  async initTransporter(): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.log('Mail transporter: production SMTP');
    } else {
      // Development: create a one-time Ethereal test account with fallback to jsonTransport if offline/timeout.
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
      }
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      // Unit tests inject their own mock — nothing to do here.
      return;
    }

    const info = await this.transporter.sendMail({
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
    });

    // In development, log the Ethereal preview URL so the developer can
    // inspect the email in their browser without any SMTP setup.
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      this.logger.log(`Password reset email sent. Preview: ${previewUrl}`);
    } else {
      this.logger.log(`Password reset email sent (JSON transport).`);
    }
  }
}
