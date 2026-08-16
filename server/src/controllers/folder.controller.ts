import { Request, Response } from 'express';
import { getFolders, getUnreadCount } from '../services/wildduck-db.service';
import { getCredentialsForUser } from '../services/session.service';

export async function listFolders(req: Request, res: Response): Promise<void> {
  const { wdUserId } = await getCredentialsForUser(req.user!.userId);
  const folders = await getFolders(wdUserId);
  res.json({ success: true, data: folders });
}

export async function getUnread(req: Request, res: Response): Promise<void> {
  const { wdUserId } = await getCredentialsForUser(req.user!.userId);
  const count = await getUnreadCount(wdUserId);
  res.json({ success: true, data: { count } });
}
