import crypto from 'crypto';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { ApiKey, IApiKey } from '../models/ApiKey.model';
import { User } from '../models/User.model';

export type ApiKeyExpiry = '7d' | '30d' | '90d' | '1y' | 'never';

const MAX_ACTIVE_KEYS = 10;
const PREFIX_LENGTH = 10;
const LAST_USED_THROTTLE_MS = 60_000;

const EXPIRY_MS: Record<Exclude<ApiKeyExpiry, 'never'>, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000,
};

export interface PublicApiKey {
  id: string;
  name: string;
  prefix: string;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface CreatedApiKey extends PublicApiKey {
  key: string;
}

function hashApiKey(raw: string): string {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(raw).digest('hex');
}

function generateRawKey(): string {
  return `bm_${crypto.randomBytes(32).toString('hex')}`;
}

function toPublic(doc: IApiKey): PublicApiKey {
  return {
    id: doc._id.toString(),
    name: doc.name,
    prefix: doc.prefix,
    last_used_at: doc.last_used_at,
    expires_at: doc.expires_at,
    created_at: doc.created_at,
  };
}

export async function listApiKeys(userId: string): Promise<PublicApiKey[]> {
  const keys = await ApiKey.find({
    user_id: new Types.ObjectId(userId),
    revoked_at: null,
  }).sort({ created_at: -1 });

  return keys.map(toPublic);
}

export async function createApiKey(
  userId: string,
  name: string,
  expiresIn: ApiKeyExpiry = 'never',
): Promise<CreatedApiKey> {
  const active = await ApiKey.countDocuments({
    user_id: new Types.ObjectId(userId),
    revoked_at: null,
  });

  if (active >= MAX_ACTIVE_KEYS) {
    throw Object.assign(new Error(`Maximum of ${MAX_ACTIVE_KEYS} API keys reached`), { status: 400 });
  }

  const raw = generateRawKey();
  const expires_at = expiresIn === 'never' ? null : new Date(Date.now() + EXPIRY_MS[expiresIn]);
  const doc = await ApiKey.create({
    user_id: new Types.ObjectId(userId),
    name: name.trim(),
    prefix: raw.slice(0, PREFIX_LENGTH),
    key_hash: hashApiKey(raw),
    expires_at,
  });

  return { ...toPublic(doc), key: raw };
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(keyId)) return false;

  const result = await ApiKey.updateOne(
    {
      _id: new Types.ObjectId(keyId),
      user_id: new Types.ObjectId(userId),
      revoked_at: null,
    },
    { $set: { revoked_at: new Date() } },
  );

  return result.modifiedCount > 0;
}

export async function authenticateApiKey(
  rawKey: string,
): Promise<{ userId: string; email: string } | null> {
  if (!rawKey.startsWith('bm_') || rawKey.length < 20) return null;

  const doc = await ApiKey.findOne({
    key_hash: hashApiKey(rawKey),
    revoked_at: null,
  });
  if (!doc) return null;
  if (doc.expires_at && doc.expires_at.getTime() <= Date.now()) return null;

  const user = await User.findById(doc.user_id).select('email').lean();
  if (!user) return null;

  const stale = !doc.last_used_at || Date.now() - doc.last_used_at.getTime() > LAST_USED_THROTTLE_MS;
  if (stale) {
    doc.last_used_at = new Date();
    await doc.save();
  }

  return { userId: user._id.toString(), email: user.email };
}
