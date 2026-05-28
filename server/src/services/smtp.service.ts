import nodemailer, { Transporter } from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import { ImapFlow } from 'imapflow';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getRedis } from '../config/redis';

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
  userEmail?: string;
}

function pickSentFolder(
  folders: Array<{ path: string; name: string; specialUse?: string | string[] }>
): string {
  const bySpecialUse = folders.find((f) => {
    if (!f.specialUse) return false;
    return Array.isArray(f.specialUse) ? f.specialUse.includes('\\Sent') : f.specialUse === '\\Sent';
  });
  if (bySpecialUse) return bySpecialUse.path;

  const byName = folders.find((f) => /(^|[./\s_-])sent([./\s_-]|$)|sent\s*items?/i.test(f.path) || /(^|[./\s_-])sent([./\s_-]|$)|sent\s*items?/i.test(f.name));
  return byName?.path ?? 'Sent';
}

async function appendToSent(options: SendEmailOptions, smtpUser: string, smtpPass: string): Promise<void> {
  const composer = new MailComposer({
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
    date: new Date(),
  });

  const rawMessage = await new Promise<Buffer>((resolve, reject) => {
    composer.compile().build((err, message) => {
      if (err) return reject(err);
      resolve(message);
    });
  });

  const imap = new ImapFlow({
    host: env.IMAP_HOST,
    port: env.IMAP_PORT,
    secure: env.IMAP_TLS,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  try {
    await imap.connect();
    const folders = await imap.list();
    const sentFolder = pickSentFolder(folders as Array<{ path: string; name: string; specialUse?: string | string[] }>);
    await imap.append(sentFolder, rawMessage, ['\\Seen'], new Date());
  } finally {
    try { await imap.logout(); } catch {}
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<string> {
  let smtpUser = env.SMTP_USER;
  let smtpPass = env.SMTP_PASS;

  // Prefer logged-in user's mailbox creds stored at login.
  if (options.userEmail) {
    const userPass = await getRedis().get(`imap:${options.userEmail}`);
    if (userPass) {
      smtpUser = options.userEmail;
      smtpPass = userPass;
    }
  }

  const t = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: { rejectUnauthorized: false },
  });

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

  try {
    await appendToSent(options, smtpUser, smtpPass);
  } catch (err) {
    logger.warn('Sent copy append failed', {
      error: (err as Error).message,
      mailbox: smtpUser,
    });
  }

  logger.info('Email sent', { messageId: info.messageId, to: options.to });
  return info.messageId as string;
}

export async function verifySmtp(): Promise<void> {
  const t = getTransporter();
  await t.verify();
  logger.info('SMTP connection verified');
}
