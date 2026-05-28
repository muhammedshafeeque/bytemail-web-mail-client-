import { getRedis } from '../config/redis';
import { User } from '../models/User.model';

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

export async function storeSession(
  email: string,
  refreshToken: string,
  imapPassword: string,
): Promise<void> {
  const redis = getRedis();
  await redis.setex(`session:${email}`, SESSION_TTL_SEC, refreshToken);
  await redis.setex(`imap:${email}`, SESSION_TTL_SEC, imapPassword);
}

export async function clearSession(email: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`session:${email}`, `imap:${email}`);
}

export async function getStoredRefreshToken(email: string): Promise<string | null> {
  return getRedis().get(`session:${email}`);
}

export async function getImapPassword(email: string): Promise<string | null> {
  return getRedis().get(`imap:${email}`);
}

export async function getCredentialsForUser(
  userId: string,
): Promise<{ email: string; password: string }> {
  const user = await User.findById(userId).select('email').lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const password = await getImapPassword(user.email);
  if (!password) {
    throw Object.assign(new Error('Session expired. Please sign in again.'), { status: 401 });
  }

  return { email: user.email, password };
}
