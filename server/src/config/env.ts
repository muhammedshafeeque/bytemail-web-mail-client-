import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  PORT: parseInt(optional('PORT', '3500'), 10),
  NODE_ENV: optional('NODE_ENV', 'development'),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:5173'),

  JWT_SECRET: required('JWT_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  MONGODB_URI: required('MONGODB_URI'),

  REDIS_HOST: optional('REDIS_HOST', '127.0.0.1'),
  REDIS_PORT: parseInt(optional('REDIS_PORT', '6379'), 10),
  REDIS_PASSWORD: optional('REDIS_PASSWORD', ''),

  IMAP_HOST: required('IMAP_HOST'),
  IMAP_PORT: parseInt(optional('IMAP_PORT', '993'), 10),
  IMAP_TLS: optional('IMAP_TLS', 'true') === 'true',

  SMTP_HOST: required('SMTP_HOST'),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
  SMTP_SECURE: optional('SMTP_SECURE', 'false') === 'true',
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
  MAIL_FROM: optional('MAIL_FROM', 'ByteMail <noreply@byzand.online>'),

  VAPID_PUBLIC_KEY: optional('VAPID_PUBLIC_KEY', ''),
  VAPID_PRIVATE_KEY: optional('VAPID_PRIVATE_KEY', ''),
  VAPID_EMAIL: optional('VAPID_EMAIL', 'admin@byzand.online'),
} as const;
