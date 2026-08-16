import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.model';
import { Contact } from '../models/Contact.model';
import {
  fetchEmails,
  fetchEmailByUid,
  syncFolder,
  searchEmails,
  resolveMailbox,
  resolveMessageLocation,
  invalidateMailCache,
} from '../services/wildduck-db.service';
import {
  submitMessage,
  updateMessage,
  deleteMessage,
} from '../services/wildduck-api.service';
import { getCredentialsForUser } from '../services/session.service';

export async function listEmails(req: Request, res: Response): Promise<void> {
  const { folder = 'INBOX', page = '1', limit = '25' } = req.query as Record<string, string>;
  const { wdUserId } = await getCredentialsForUser(req.user!.userId);

  const result = await fetchEmails(wdUserId, folder, parseInt(page, 10), parseInt(limit, 10));

  res.json({
    success: true,
    data: result.emails,
    total: result.total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    has_more: result.total > parseInt(page, 10) * parseInt(limit, 10),
  });
}

export async function getEmail(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const { wdUserId, token } = await getCredentialsForUser(req.user!.userId);

  const emailData = await fetchEmailByUid(wdUserId, uid, folder, token);

  if (!emailData) {
    res.status(404).json({ success: false, message: 'Email not found' });
    return;
  }

  if (!emailData.is_read) {
    const loc = await resolveMessageLocation(wdUserId, uid, folder);
    if (loc) {
      await updateMessage(wdUserId, loc.mailboxId, loc.messageId, { seen: true }, token).catch(() => {});
      await invalidateMailCache(wdUserId, [uid]);
    }
  }

  res.json({ success: true, data: emailData });
}

const SendSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional().default([]),
  bcc: z.array(z.string().email()).optional().default([]),
  subject: z.string(),
  body_html: z.string(),
  body_text: z.string().optional().default(''),
  reply_to: z.string().optional(),
});

function toAddr(address: string): { name: string; address: string } {
  return { name: address.split('@')[0], address };
}

export async function sendEmailHandler(req: Request, res: Response): Promise<void> {
  const data = SendSchema.parse(req.body);
  const user = await User.findById(req.user!.userId).select('email name preferences wildduck_id').lean();
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

  const { wdUserId, token } = await getCredentialsForUser(req.user!.userId);

  const signature = user.preferences?.signature ?? '';
  const html = data.body_html + (signature ? `<br><br><div class="signature">${signature}</div>` : '');

  const sentMailbox = await resolveMailbox(wdUserId, 'Sent');

  await submitMessage(wdUserId, {
    from: { name: user.name, address: user.email },
    to: data.to.map(toAddr),
    cc: data.cc.map(toAddr),
    bcc: data.bcc.map(toAddr),
    subject: data.subject,
    html,
    text: data.body_text,
    mailbox: sentMailbox?._id.toString(),
  }, token);

  const allRecipients = [...data.to, ...(data.cc ?? [])];
  for (const recipEmail of allRecipients) {
    await Contact.findOneAndUpdate(
      { user_email: user.email, email: recipEmail.toLowerCase() },
      {
        $inc: { frequency: 1 },
        $set: { last_emailed: new Date(), name: recipEmail.split('@')[0] },
      },
      { upsert: true }
    );
  }

  await invalidateMailCache(wdUserId);
  res.json({ success: true, message: 'Email sent' });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX', read = 'true' } = req.query as Record<string, string>;
  const { wdUserId, token } = await getCredentialsForUser(req.user!.userId);

  const loc = await resolveMessageLocation(wdUserId, uid, folder);
  if (!loc) {
    res.status(404).json({ success: false, message: 'Email not found' });
    return;
  }

  await updateMessage(wdUserId, loc.mailboxId, loc.messageId, { seen: read === 'true' }, token);
  await invalidateMailCache(wdUserId, [uid]);
  res.json({ success: true });
}

export async function starEmail(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const { star } = z.object({ star: z.boolean() }).parse(req.body);
  const { wdUserId, token } = await getCredentialsForUser(req.user!.userId);

  const loc = await resolveMessageLocation(wdUserId, uid, folder);
  if (!loc) {
    res.status(404).json({ success: false, message: 'Email not found' });
    return;
  }

  await updateMessage(wdUserId, loc.mailboxId, loc.messageId, { flagged: star }, token);
  await invalidateMailCache(wdUserId, [uid]);
  res.json({ success: true });
}

export async function moveEmailHandler(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX', to } = z.object({ folder: z.string().optional().default('INBOX'), to: z.string() }).parse(req.body);
  const { wdUserId, token } = await getCredentialsForUser(req.user!.userId);

  const loc = await resolveMessageLocation(wdUserId, uid, folder);
  const dest = await resolveMailbox(wdUserId, to);
  if (!loc || !dest) {
    res.status(404).json({ success: false, message: 'Email or destination folder not found' });
    return;
  }

  await updateMessage(wdUserId, loc.mailboxId, loc.messageId, { moveTo: dest._id.toString() }, token);
  await invalidateMailCache(wdUserId, [uid]);
  res.json({ success: true });
}

export async function deleteEmailHandler(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const { wdUserId, token } = await getCredentialsForUser(req.user!.userId);

  const loc = await resolveMessageLocation(wdUserId, uid, folder);
  if (!loc) {
    res.status(404).json({ success: false, message: 'Email not found' });
    return;
  }

  if (folder.toLowerCase() === 'trash' || loc.folderKey.toLowerCase() === 'trash') {
    await deleteMessage(wdUserId, loc.mailboxId, loc.messageId, token);
  } else {
    const trash = await resolveMailbox(wdUserId, 'Trash');
    if (trash) {
      await updateMessage(wdUserId, loc.mailboxId, loc.messageId, { moveTo: trash._id.toString() }, token);
    } else {
      await deleteMessage(wdUserId, loc.mailboxId, loc.messageId, token);
    }
  }

  await invalidateMailCache(wdUserId, [uid]);
  res.json({ success: true });
}

export async function searchEmailsHandler(req: Request, res: Response): Promise<void> {
  const { q, folder, page = '1', limit = '25' } = req.query as Record<string, string>;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ success: false, message: 'Search query too short' });
    return;
  }

  const { wdUserId } = await getCredentialsForUser(req.user!.userId);
  const result = await searchEmails(
    wdUserId,
    q.trim(),
    folder,
    parseInt(page, 10),
    parseInt(limit, 10)
  );

  res.json({
    success: true,
    data: result.emails,
    total: result.total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    has_more: result.total > parseInt(page, 10) * parseInt(limit, 10),
  });
}

export async function syncFolderHandler(req: Request, res: Response): Promise<void> {
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const { wdUserId } = await getCredentialsForUser(req.user!.userId);

  const result = await syncFolder(wdUserId, folder);
  res.json({ success: true, data: result.emails, total: result.total });
}
