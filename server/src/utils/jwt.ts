import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  email: string;
  sid?: string;
}

export interface TwoFactorTicket {
  userId: string;
  email: string;
  tid: string;
  purpose: '2fa';
}

export function signAccessToken(payload: JwtPayload): string {
  return (jwt.sign as (payload: object, secret: string, options: object) => string)(
    payload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export function signRefreshToken(payload: JwtPayload): string {
  return (jwt.sign as (payload: object, secret: string, options: object) => string)(
    payload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}

export function signTwoFactorTicket(payload: Omit<TwoFactorTicket, 'purpose'>): string {
  return (jwt.sign as (payload: object, secret: string, options: object) => string)(
    { ...payload, purpose: '2fa' },
    env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

export function verifyTwoFactorTicket(token: string): TwoFactorTicket {
  const payload = jwt.verify(token, env.JWT_SECRET) as TwoFactorTicket;
  if (payload.purpose !== '2fa' || !payload.tid) {
    throw new Error('Invalid two-factor ticket');
  }
  return payload;
}
