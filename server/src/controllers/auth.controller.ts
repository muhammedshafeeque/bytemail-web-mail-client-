import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { User } from '../models/User.model';
import { hashPassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { authenticateUser, WildduckApiError } from '../services/wildduck-api.service';
import {
  clearSession,
  getStoredRefreshToken,
  storeSession,
} from '../services/session.service';

const LoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

const AVATAR_COLORS = [
  '#0D9488', '#4F46E5', '#7C3AED', '#DB2777',
  '#DC2626', '#D97706', '#0284C7', '#0891B2',
];

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
    });
    logger.info('New user created from WildDuck login', { email: normalizedEmail, wdUserId });
  } else {
    user.last_login = new Date();
    if (!user.wildduck_id) user.wildduck_id = wdUserId;
    await user.save();
  }

  return user;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = LoginSchema.parse(req.body);

  try {
    const wd = await authenticateUser(email, password);
    const mailboxEmail = wd.address.includes('@') ? wd.address : email.toLowerCase();
    const user = await findOrCreateUser(mailboxEmail, wd.id, wd.username);
    const payload = { userId: user._id.toString(), email: user.email };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await storeSession(user.email, refreshToken, { wdUserId: wd.id, token: wd.token });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      success: true,
      data: {
        accessToken,
        user: userWithoutPassword,
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

export async function logout(req: Request, res: Response): Promise<void> {
  const email = req.user?.email;
  if (email) {
    await clearSession(email);
  }

  res.clearCookie('refresh_token', { path: '/api/auth' });
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
    const stored = await getStoredRefreshToken(payload.email);

    if (stored !== token) {
      res.status(401).json({ success: false, message: 'Session expired' });
      return;
    }

    const newAccessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId).select('-password').lean();

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
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
