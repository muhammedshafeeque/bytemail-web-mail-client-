import { Request, Response } from 'express';
import {
  listDeviceSessions,
  revokeAllSessions,
  revokeDeviceSession,
  revokeOtherSessions,
} from '../services/session.service';

export async function listSessionsHandler(req: Request, res: Response): Promise<void> {
  const sessions = await listDeviceSessions(req.user!.email, req.user!.sid);
  res.json({ success: true, data: sessions });
}

export async function revokeSessionHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (id === req.user!.sid) {
    res.status(400).json({ success: false, message: 'Use sign out to end this device session' });
    return;
  }
  const revoked = await revokeDeviceSession(req.user!.email, id);
  if (!revoked) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }
  res.json({ success: true, message: 'Device signed out' });
}

export async function revokeOtherSessionsHandler(req: Request, res: Response): Promise<void> {
  const sid = req.user!.sid;
  if (!sid) {
    res.status(400).json({ success: false, message: 'Current session is missing. Sign in again.' });
    return;
  }
  const removed = await revokeOtherSessions(req.user!.email, sid);
  res.json({ success: true, message: `Signed out ${removed} other device${removed === 1 ? '' : 's'}` });
}

export async function revokeAllSessionsHandler(req: Request, res: Response): Promise<void> {
  await revokeAllSessions(req.user!.email);
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.json({ success: true, message: 'Signed out everywhere' });
}
