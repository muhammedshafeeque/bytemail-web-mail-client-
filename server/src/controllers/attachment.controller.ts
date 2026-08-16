import { Request, Response } from 'express';
import { getAttachment } from '../services/wildduck-db.service';
import { getCredentialsForUser } from '../services/session.service';

export async function downloadAttachment(req: Request, res: Response): Promise<void> {
  const { uid, index } = req.params;
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const attachmentIndex = parseInt(index, 10);

  let wdUserId: string;
  let token: string;
  try {
    ({ wdUserId, token } = await getCredentialsForUser(req.user!.userId));
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ success: false, message: (err as Error).message });
    return;
  }

  const file = await getAttachment(wdUserId, uid, attachmentIndex, folder, token);
  if (!file) {
    res.status(404).json({ success: false, message: 'Attachment not found' });
    return;
  }

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
  res.setHeader('Content-Length', file.buffer.length);
  res.send(file.buffer);
}
