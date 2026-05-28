import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.model';
import { EmailCache } from '../models/EmailCache.model';
import { Contact } from '../models/Contact.model';
import {
  fetchEmails,
  fetchEmailByUid,
  markEmailRead,
  toggleStar,
  moveEmail,
  deleteEmail,
  syncFolder,
} from '../services/imap.service';
import { sendEmail } from '../services/smtp.service';
import { cacheDelPattern } from '../services/cache.service';
import { env } from '../config/env';
import { getCredentialsForUser } from '../services/session.service';

export async function listEmails(req: Request, res: Response): Promise<void> {
  const { folder = 'INBOX', page = '1', limit = '25' } = req.query as Record<string, string>;
  const { email, password } = await getCredentialsForUser(req.user!.userId);

  const result = await fetchEmails(email, password, folder, parseInt(page), parseInt(limit));

  res.json({
    success: true,
    data: result.emails,
    total: result.total,
    page: parseInt(page),
    limit: parseInt(limit),
    has_more: result.total > parseInt(page) * parseInt(limit),
  });
}

export async function getEmail(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const { email, password } = await getCredentialsForUser(req.user!.userId);

  const emailData = await fetchEmailByUid(email, password, uid, folder);

  if (!emailData) {
    res.status(404).json({ success: false, message: 'Email not found' });
    return;
  }

  if (!emailData.is_read) {
    await markEmailRead(email, password, uid, folder, true).catch(() => {});
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

export async function sendEmailHandler(req: Request, res: Response): Promise<void> {
  const data = SendSchema.parse(req.body);
  const user = await User.findById(req.user!.userId).select('email name password preferences').lean();
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

  const signature = user.preferences?.signature ?? '';
  const html = data.body_html + (signature ? `<br><br><div class="signature">${signature}</div>` : '');

  await sendEmail({
    from: `${user.name} <${user.email}>`,
    to: data.to,
    cc: data.cc,
    bcc: data.bcc,
    subject: data.subject,
    html,
    text: data.body_text,
    reply_to: data.reply_to,
    userEmail: user.email,
  });

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

  await cacheDelPattern(`emails:${user.email}:Sent:*`);
  res.json({ success: true, message: 'Email sent' });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX', read = 'true' } = req.query as Record<string, string>;
  const { email, password } = await getCredentialsForUser(req.user!.userId);

  await markEmailRead(email, password, uid, folder, read === 'true');
  res.json({ success: true });
}

export async function starEmail(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const { star } = z.object({ star: z.boolean() }).parse(req.body);
  const { email, password } = await getCredentialsForUser(req.user!.userId);

  await toggleStar(email, password, uid, folder, star);
  res.json({ success: true });
}

export async function moveEmailHandler(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX', to } = z.object({ folder: z.string().optional().default('INBOX'), to: z.string() }).parse(req.body);
  const { email, password } = await getCredentialsForUser(req.user!.userId);

  await moveEmail(email, password, uid, folder, to);
  res.json({ success: true });
}

export async function deleteEmailHandler(req: Request, res: Response): Promise<void> {
  const { uid } = req.params;
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const { email, password } = await getCredentialsForUser(req.user!.userId);

  await deleteEmail(email, password, uid, folder);
  res.json({ success: true });
}

export async function searchEmailsHandler(req: Request, res: Response): Promise<void> {
  const { q, folder, page = '1', limit = '25' } = req.query as Record<string, string>;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ success: false, message: 'Search query too short' });
    return;
  }

  const { searchEmails } = await import('../services/search.service');
  const result = await searchEmails(
    req.user!.email,
    q.trim(),
    folder,
    parseInt(page),
    parseInt(limit)
  );

  res.json({
    success: true,
    data: result.emails,
    total: result.total,
    page: parseInt(page),
    limit: parseInt(limit),
    has_more: result.total > parseInt(page) * parseInt(limit),
  });
}

export async function syncFolderHandler(req: Request, res: Response): Promise<void> {
  const { folder = 'INBOX' } = req.query as Record<string, string>;
  const { email, password } = await getCredentialsForUser(req.user!.userId);

  await cacheDelPattern(`emails:${email}:${folder}:*`);
  const result = await syncFolder(email, password, folder);
  res.json({ success: true, data: result.emails, total: result.total });
}
