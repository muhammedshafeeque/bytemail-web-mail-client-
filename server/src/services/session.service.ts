import { getRedis } from '../config/redis';
import { User } from '../models/User.model';

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

export interface WildduckSession {
  wdUserId: string;
  token: string;
}

export async function storeSession(
  email: string,
  refreshToken: string,
  wdSession: WildduckSession,
): Promise<void> {
  const redis = getRedis();
  await redis.setex(`session:${email}`, SESSION_TTL_SEC, refreshToken);
  await redis.setex(`wd:${email}`, SESSION_TTL_SEC, JSON.stringify(wdSession));
}

export async function clearSession(email: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`session:${email}`, `wd:${email}`, `imap:${email}`);
}

export async function getStoredRefreshToken(email: string): Promise<string | null> {
  return getRedis().get(`session:${email}`);
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
  const token = session?.token;

  if (!wdUserId || !token) {
    throw Object.assign(new Error('Session expired. Please sign in again.'), { status: 401 });
  }

  return { email: user.email, wdUserId, token };
}
