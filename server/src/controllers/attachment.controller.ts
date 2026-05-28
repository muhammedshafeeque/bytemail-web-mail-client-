import { Request, Response } from 'express';
import { getImapClient } from '../services/imap.service';
import { getCredentialsForUser } from '../services/session.service';
import { simpleParser } from 'mailparser';

export async function downloadAttachment(req: Request, res: Response): Promise<void> {
  const { uid, index } = req.params;
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const attachmentIndex = parseInt(index, 10);

  let email: string;
  let password: string;
  try {
    ({ email, password } = await getCredentialsForUser(req.user!.userId));
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ success: false, message: (err as Error).message });
    return;
  }

  const client = await getImapClient(email, password);
  const lock = await client.getMailboxLock(folder);

  try {
    const download = await client.download(uid, undefined, { uid: true });
    if (!download) { res.status(404).json({ success: false, message: 'Email not found' }); return; }

    const chunks: Buffer[] = [];
    for await (const chunk of download.content) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const parsed = await simpleParser(raw);

    const attachment = parsed.attachments?.[attachmentIndex];
    if (!attachment) { res.status(404).json({ success: false, message: 'Attachment not found' }); return; }

    res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename || 'file')}"`);
    res.setHeader('Content-Length', attachment.size || 0);
    res.send(attachment.content);
  } finally {
    lock.release();
  }
}
