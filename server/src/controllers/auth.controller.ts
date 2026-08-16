import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { User } from '../models/User.model';
import { hashPassword } from '../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  signTwoFactorTicket,
  verifyRefreshToken,
  verifyTwoFactorTicket,
} from '../utils/jwt';
import { logger } from '../utils/logger';
import { authenticateUser, WildduckApiError } from '../services/wildduck-api.service';
import {
  clearLegacyRefreshToken,
  clearSession,
  createDeviceSession,
  getLegacyRefreshToken,
  sessionMatchesRefresh,
  storePendingTwoFactor,
  storeSession,
  takePendingTwoFactor,
  touchDeviceSession,
  WildduckSession,
} from '../services/session.service';
import { consumeBackupCode, decryptSecret, verifyTotp } from '../services/totp.service';
import { isAdminUser, isEnvAdmin } from '../utils/admin';

const LoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

const AVATAR_COLORS = [
  '#0D9488', '#4F46E5', '#7C3AED', '#DB2777',
  '#DC2626', '#D97706', '#0284C7', '#0891B2',
];

const REFRESH_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

function requestMeta(req: Request): { userAgent: string; ip: string } {
  return {
    userAgent: req.get('user-agent') || 'Unknown',
    ip: req.ip || req.socket.remoteAddress || 'Unknown',
  };
}

function publicUser(user: InstanceType<typeof User>) {
  const raw = user.toObject();
  const { password: _password, two_factor: twoFactor, ...rest } = raw;
  return {
    ...rest,
    role: raw.role || 'user',
    is_admin: isAdminUser({ email: raw.email, role: raw.role }),
    two_factor_enabled: Boolean(twoFactor?.enabled),
    two_factor_enabled_at: twoFactor?.enabled_at ?? null,
  };
}

async function findOrCreateUser(
  email: string,
  wdUserId: string,
  displayName?: string,
): Promise<InstanceType<typeof User>> {
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const placeholder = await hashPassword(crypto.randomBytes(32).toString('hex'));
    user = await User.create({
      email: normalizedEmail,
      password: placeholder,
      name: displayName || email.split('@')[0],
      avatar_color: avatarColor,
      wildduck_id: wdUserId,
      role: isEnvAdmin(normalizedEmail) ? 'admin' : 'user',
    });
    logger.info('New user created from WildDuck login', { email: normalizedEmail, wdUserId });
  } else {
    user.last_login = new Date();
    if (!user.wildduck_id) user.wildduck_id = wdUserId;
    if (isEnvAdmin(normalizedEmail) && user.role !== 'admin') user.role = 'admin';
    await user.save();
  }

  return user;
}

async function issueAuthSession(
  res: Response,
  user: InstanceType<typeof User>,
  wdSession: WildduckSession,
  meta: { userAgent: string; ip: string },
): Promise<string> {
  const sid = uuid();
  const payload = { userId: user._id.toString(), email: user.email, sid };
  const refreshToken = signRefreshToken(payload);
  const accessToken = signAccessToken(payload);
  await storeSession(user.email, refreshToken, wdSession, meta, sid);
  res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
  return accessToken;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = LoginSchema.parse(req.body);

  try {
    const wd = await authenticateUser(email, password);
    const mailboxEmail = wd.address.includes('@') ? wd.address : email.toLowerCase();
    const user = await findOrCreateUser(mailboxEmail, wd.id, wd.username);
    const wdSession = { wdUserId: wd.id, token: wd.token };
    const meta = requestMeta(req);

    if (user.two_factor?.enabled) {
      const tid = uuid();
      const ticket = signTwoFactorTicket({
        userId: user._id.toString(),
        email: user.email,
        tid,
      });
      await storePendingTwoFactor(tid, {
        email: user.email,
        userId: user._id.toString(),
        wdSession,
        userAgent: meta.userAgent,
        ip: meta.ip,
      });
      res.json({
        success: true,
        data: {
          requires_2fa: true,
          ticket,
        },
      });
      return;
    }

    const accessToken = await issueAuthSession(res, user, wdSession, meta);
    res.json({
      success: true,
      data: {
        accessToken,
        user: publicUser(user),
      },
    });
  } catch (err) {
    logger.error('WildDuck login error', { error: (err as Error).message, email });
    const isAuthFail = err instanceof WildduckApiError && (err.status === 401 || err.status === 403);
    res.status(isAuthFail ? 401 : 502).json({
      success: false,
      message: isAuthFail
        ? 'Invalid email or password'
        : 'Could not reach the mail server. Try again in a moment.',
    });
  }
}

export async function loginTwoFactor(req: Request, res: Response): Promise<void> {
  const { ticket, code } = z.object({
    ticket: z.string().min(1),
    code: z.string().min(6).max(32),
  }).parse(req.body);

  let payload;
  try {
    payload = verifyTwoFactorTicket(ticket);
  } catch {
    res.status(401).json({ success: false, message: 'Verification expired. Sign in again.' });
    return;
  }

  const pending = await takePendingTwoFactor(payload.tid);
  if (!pending || pending.userId !== payload.userId) {
    res.status(401).json({ success: false, message: 'Verification expired. Sign in again.' });
    return;
  }

  const user = await User.findById(payload.userId);
  if (!user || !user.two_factor?.enabled || !user.two_factor.secret) {
    res.status(401).json({ success: false, message: 'Two-factor authentication is not enabled' });
    return;
  }

  const secret = decryptSecret(user.two_factor.secret);
  const totpOk = verifyTotp(user.email, secret, code);
  if (!totpOk) {
    const consumed = await consumeBackupCode(user.two_factor.backup_hashes ?? [], code);
    if (!consumed.ok) {
      await storePendingTwoFactor(payload.tid, pending);
      res.status(401).json({ success: false, message: 'Invalid authenticator code' });
      return;
    }
    user.two_factor.backup_hashes = consumed.remaining;
    await user.save();
  }

  user.last_login = new Date();
  await user.save();

  const accessToken = await issueAuthSession(res, user, pending.wdSession, {
    userAgent: pending.userAgent,
    ip: pending.ip,
  });

  res.json({
    success: true,
    data: {
      accessToken,
      user: publicUser(user),
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const email = req.user?.email;
  if (email) {
    await clearSession(email, req.user?.sid);
  }

  res.clearCookie('refresh_token', REFRESH_COOKIE);
  res.json({ success: true, message: 'Logged out' });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refresh_token as string | undefined;

  if (!token) {
    res.status(401).json({ success: false, message: 'No refresh token' });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);

    if (payload.sid) {
      const matches = await sessionMatchesRefresh(payload.email, payload.sid, token);
      if (!matches) {
        res.status(401).json({ success: false, message: 'Session expired' });
        return;
      }
      await touchDeviceSession(payload.email, payload.sid);
      const newAccessToken = signAccessToken({
        userId: payload.userId,
        email: payload.email,
        sid: payload.sid,
      });
      res.json({ success: true, data: { accessToken: newAccessToken } });
      return;
    }

    const legacy = await getLegacyRefreshToken(payload.email);
    if (legacy !== token) {
      res.status(401).json({ success: false, message: 'Session expired' });
      return;
    }

    const sid = uuid();
    const nextPayload = { userId: payload.userId, email: payload.email, sid };
    const refreshToken = signRefreshToken(nextPayload);
    await createDeviceSession(payload.email, refreshToken, requestMeta(req), sid);
    await clearLegacyRefreshToken(payload.email);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    res.json({
      success: true,
      data: { accessToken: signAccessToken(nextPayload) },
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  if (isEnvAdmin(user.email) && user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }

  res.json({ success: true, data: publicUser(user) });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(100),
  }).parse(req.body);

  try {
    await authenticateUser(email, password);
  } catch {
    res.status(400).json({
      success: false,
      message: 'Could not verify mailbox credentials with the mail server',
    });
    return;
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  const hashed = await hashPassword(crypto.randomBytes(32).toString('hex'));
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const user = await User.create({
    email: email.toLowerCase(),
    password: hashed,
    name,
    avatar_color: avatarColor,
  });

  logger.info('New user registered', { email: user.email });
  res.status(201).json({ success: true, message: 'Account created' });
}
