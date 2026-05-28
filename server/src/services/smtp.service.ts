import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; path: string }>;
  reply_to?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<string> {
  const t = getTransporter();

  const info = await t.sendMail({
    from: options.from,
    to: options.to.join(', '),
    cc: options.cc?.join(', '),
    bcc: options.bcc?.join(', '),
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments,
    inReplyTo: options.reply_to,
    references: options.reply_to,
  });

  logger.info('Email sent', { messageId: info.messageId, to: options.to });
  return info.messageId as string;
}

export async function verifySmtp(): Promise<void> {
  const t = getTransporter();
  await t.verify();
  logger.info('SMTP connection verified');
}
