import { env } from '../config/env';

export function envAdminEmails(): string[] {
  return env.ADMIN_EMAILS
    .split(',')
    .map((value) => value.replace(/\r/g, '').trim().toLowerCase())
    .filter(Boolean);
}

export function isEnvAdmin(email: string): boolean {
  return envAdminEmails().includes(email.trim().toLowerCase());
}

export function isAdminUser(user: { email: string; role?: string | null }): boolean {
  return isEnvAdmin(user.email) || user.role === 'admin';
}
