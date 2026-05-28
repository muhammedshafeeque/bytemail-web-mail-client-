import { Request, Response } from 'express';
import { getFolders, getUnreadCount } from '../services/imap.service';
import { getCredentialsForUser } from '../services/session.service';

export async function listFolders(req: Request, res: Response): Promise<void> {
  const { email, password } = await getCredentialsForUser(req.user!.userId);
  const folders = await getFolders(email, password);
  res.json({ success: true, data: folders });
}

export async function getUnread(req: Request, res: Response): Promise<void> {
  const { email, password } = await getCredentialsForUser(req.user!.userId);
  const count = await getUnreadCount(email, password);
  res.json({ success: true, data: { count } });
}
