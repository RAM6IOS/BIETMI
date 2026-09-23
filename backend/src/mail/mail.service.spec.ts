import { MailService } from './mail.service';
import { Logger } from '@nestjs/common';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
  createTestAccount: jest.fn(),
  getTestMessageUrl: jest.fn(() => false),
}));

import * as nodemailer from 'nodemailer';

const mockCreateTransport = nodemailer.createTransport as unknown as jest.Mock;
const mockCreateTestAccount =
  nodemailer.createTestAccount as unknown as jest.Mock;

describe('MailService', () => {
  const ENV_KEYS = [
    'NODE_ENV',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'MAIL_FROM',
  ] as const;

  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {};
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    jest.clearAllMocks();
  });

  it('throws at boot in production when SMTP_HOST is missing instead of silently using a fake transporter', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;

    const service = new MailService();

    await expect(service.initTransporter()).rejects.toThrow(/SMTP_HOST/);
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('uses a real SMTP transport as soon as SMTP_HOST is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SECURE = 'true';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'secret';
    // SMTP verify hits the network on boot in production — skip it in unit tests.
    mockCreateTransport.mockReturnValue({
      verify: jest.fn().mockResolvedValue(true),
    });

    const service = new MailService();
    await service.initTransporter();

    expect(mockCreateTransport).toHaveBeenCalled();
    expect(service.getTransportType()).toBe('smtp');
  });

  it('falls back to an Ethereal account in development when SMTP_HOST is missing', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_HOST;
    mockCreateTestAccount.mockResolvedValue({ user: 'user', pass: 'pass' });
    mockCreateTransport.mockReturnValue({});

    const service = new MailService();
    await service.initTransporter();

    expect(mockCreateTransport).toHaveBeenCalled();
    expect(service.getTransportType()).toBe('ethereal');
  });

  it('falls back to JSON transport (no network) when the fake Ethereal account cannot be created in development', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_HOST;
    mockCreateTestAccount.mockRejectedValue(new Error('offline'));

    const service = new MailService();
    await service.initTransporter();

    expect(service.getTransportType()).toBe('json');
  });

  it('logs an accurate success line with transport type and messageId', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_HOST;
    mockCreateTestAccount.mockRejectedValue(new Error('offline'));
    mockCreateTransport.mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: '<abc@localhost>' }),
    });

    const service = new MailService();
    await service.initTransporter();
    const logger = (service as unknown as { logger: Logger }).logger;
    const logSpy = jest.spyOn(logger, 'log');

    await service.sendPasswordResetEmail(
      'user@example.com',
      'http://example.com/reset?token=token',
    );

    const logged = logSpy.mock.calls.map(String).join(' ');
    expect(logged).toContain('json');
    expect(logged).toContain('<abc@localhost>');
  });
});
