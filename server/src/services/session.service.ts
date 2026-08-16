import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { getRedis } from '../config/redis';
import { env } from '../config/env';
import { User } from '../models/User.model';

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

export interface WildduckSession {
  wdUserId: string;
  token: string;
}

export interface StoredDeviceSession {
  refreshHash: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeen: string;
}

export interface DeviceSessionView {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeen: string;
  current: boolean;
  label: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sessKey(email: string, sid: string): string {
  return `sess:${email}:${sid}`;
}

function indexKey(email: string): string {
  return `sessindex:${email}`;
}

export function parseDeviceLabel(userAgent: string): string {
  const ua = userAgent || 'Unknown';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Mac OS X/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  const mobile = /Mobile|Android|iPhone/.test(ua) ? 'mobile' : 'desktop';
  return `${browser} on ${os} (${mobile})`;
}

export async function createDeviceSession(
  email: string,
  refreshToken: string,
  meta: { userAgent?: string; ip?: string },
  sid = uuid(),
): Promise<string> {
  const redis = getRedis();
  const now = new Date().toISOString();
  const record: StoredDeviceSession = {
    refreshHash: hashToken(refreshToken),
    userAgent: meta.userAgent || 'Unknown',
    ip: meta.ip || 'Unknown',
    createdAt: now,
    lastSeen: now,
  };

  const pipeline = redis.pipeline();
  pipeline.setex(sessKey(email, sid), SESSION_TTL_SEC, JSON.stringify(record));
  pipeline.sadd(indexKey(email), sid);
  pipeline.expire(indexKey(email), SESSION_TTL_SEC);
  await pipeline.exec();
  return sid;
}

export async function getDeviceSession(
  email: string,
  sid: string,
): Promise<StoredDeviceSession | null> {
  const raw = await getRedis().get(sessKey(email, sid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredDeviceSession;
  } catch {
    return null;
  }
}

export async function sessionMatchesRefresh(
  email: string,
  sid: string,
  refreshToken: string,
): Promise<boolean> {
  const session = await getDeviceSession(email, sid);
  if (!session) return false;
  return session.refreshHash === hashToken(refreshToken);
}

export async function touchDeviceSession(email: string, sid: string): Promise<void> {
  const redis = getRedis();
  const session = await getDeviceSession(email, sid);
  if (!session) return;
  session.lastSeen = new Date().toISOString();
  await redis.setex(sessKey(email, sid), SESSION_TTL_SEC, JSON.stringify(session));
  await redis.expire(indexKey(email), SESSION_TTL_SEC);
}

export async function listDeviceSessions(
  email: string,
  currentSid?: string,
): Promise<DeviceSessionView[]> {
  const redis = getRedis();
  const sids = await redis.smembers(indexKey(email));
  const sessions: DeviceSessionView[] = [];

  for (const sid of sids) {
    const record = await getDeviceSession(email, sid);
    if (!record) {
      await redis.srem(indexKey(email), sid);
      continue;
    }
    sessions.push({
      id: sid,
      userAgent: record.userAgent,
      ip: record.ip,
      createdAt: record.createdAt,
      lastSeen: record.lastSeen,
      current: Boolean(currentSid && currentSid === sid),
      label: parseDeviceLabel(record.userAgent),
    });
  }

  return sessions.sort((a, b) => +new Date(b.lastSeen) - +new Date(a.lastSeen));
}

export async function revokeDeviceSession(email: string, sid: string): Promise<boolean> {
  const redis = getRedis();
  const existed = await redis.del(sessKey(email, sid));
  await redis.srem(indexKey(email), sid);
  return existed > 0;
}

export async function revokeOtherSessions(email: string, keepSid: string): Promise<number> {
  const redis = getRedis();
  const sids = await redis.smembers(indexKey(email));
  let removed = 0;
  for (const sid of sids) {
    if (sid === keepSid) continue;
    await redis.del(sessKey(email, sid));
    await redis.srem(indexKey(email), sid);
    removed += 1;
  }
  return removed;
}

export async function revokeAllSessions(email: string): Promise<void> {
  const redis = getRedis();
  const sids = await redis.smembers(indexKey(email));
  if (sids.length) {
    await redis.del(...sids.map((sid) => sessKey(email, sid)));
  }
  await redis.del(indexKey(email), `session:${email}`);
}

export async function storeWildduckSession(email: string, wdSession: WildduckSession): Promise<void> {
  await getRedis().setex(`wd:${email}`, SESSION_TTL_SEC, JSON.stringify(wdSession));
}

export async function storePendingTwoFactor(
  tid: string,
  payload: { email: string; userId: string; wdSession: WildduckSession; userAgent: string; ip: string },
): Promise<void> {
  await getRedis().setex(`2fa:pending:${tid}`, 5 * 60, JSON.stringify(payload));
}

export async function takePendingTwoFactor(tid: string): Promise<{
  email: string;
  userId: string;
  wdSession: WildduckSession;
  userAgent: string;
  ip: string;
} | null> {
  const redis = getRedis();
  const raw = await redis.get(`2fa:pending:${tid}`);
  if (!raw) return null;
  await redis.del(`2fa:pending:${tid}`);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function storePendingTotpSecret(userId: string, encryptedSecret: string): Promise<void> {
  await getRedis().setex(`2fa:setup:${userId}`, 10 * 60, encryptedSecret);
}

export async function takePendingTotpSecret(userId: string): Promise<string | null> {
  const redis = getRedis();
  const value = await redis.get(`2fa:setup:${userId}`);
  if (value) await redis.del(`2fa:setup:${userId}`);
  return value;
}

/** Legacy single-token session used before multi-device keys. */
export async function getLegacyRefreshToken(email: string): Promise<string | null> {
  return getRedis().get(`session:${email}`);
}

export async function clearLegacyRefreshToken(email: string): Promise<void> {
  await getRedis().del(`session:${email}`);
}

export async function storeSession(
  email: string,
  refreshToken: string,
  wdSession: WildduckSession,
  meta: { userAgent?: string; ip?: string } = {},
  sid?: string,
): Promise<string> {
  await storeWildduckSession(email, wdSession);
  return createDeviceSession(email, refreshToken, meta, sid);
}

export async function clearSession(email: string, sid?: string): Promise<void> {
  if (sid) {
    await revokeDeviceSession(email, sid);
    return;
  }
  await revokeAllSessions(email);
}

export async function getStoredRefreshToken(email: string): Promise<string | null> {
  return getLegacyRefreshToken(email);
}

export async function getWildduckSession(email: string): Promise<WildduckSession | null> {
  const raw = await getRedis().get(`wd:${email}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WildduckSession;
  } catch {
    return null;
  }
}

export async function getCredentialsForUser(
  userId: string,
): Promise<{ email: string; wdUserId: string; token: string }> {
  const user = await User.findById(userId).select('email wildduck_id').lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const session = await getWildduckSession(user.email);
  const wdUserId = session?.wdUserId || user.wildduck_id;
  const token = session?.token || env.WILDDUCK_ACCESS_TOKEN;

  if (!wdUserId) {
    throw Object.assign(new Error('Session expired. Please sign in again.'), { status: 401 });
  }
  if (!token) {
    throw Object.assign(new Error('Mail service is not configured.'), { status: 503 });
  }

  return { email: user.email, wdUserId, token };
}
