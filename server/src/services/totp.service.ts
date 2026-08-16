import crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { env } from '../config/env';
import { hashPassword, comparePassword } from '../utils/password';

const ISSUER = 'ByteMail';

function encryptionKey(): Buffer {
  return crypto.createHash('sha256').update(env.JWT_SECRET).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Invalid secret payload');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totpFor(email: string, secretBase32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function totpUri(email: string, secretBase32: string): string {
  return totpFor(email, secretBase32).toString();
}

export function verifyTotp(email: string, secretBase32: string, code: string): boolean {
  const cleaned = code.replace(/\s+/g, '');
  const delta = totpFor(email, secretBase32).validate({ token: cleaned, window: 1 });
  return delta !== null;
}

export async function totpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(4).toString('hex');
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}

function normalizeBackup(code: string): string {
  return code.trim().toLowerCase().replace(/[-\s]/g, '');
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => hashPassword(normalizeBackup(code))));
}

export async function consumeBackupCode(
  hashes: string[],
  code: string,
): Promise<{ ok: boolean; remaining: string[] }> {
  const normalized = normalizeBackup(code);
  const remaining: string[] = [];
  let matched = false;

  for (const hash of hashes) {
    if (!matched && await comparePassword(normalized, hash)) {
      matched = true;
      continue;
    }
    remaining.push(hash);
  }

  return { ok: matched, remaining };
}
