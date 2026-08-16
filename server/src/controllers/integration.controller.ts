import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.model';
import { Contact } from '../models/Contact.model';
import { submitMessage } from '../services/wildduck-api.service';
import { getCredentialsForUser } from '../services/session.service';
import { resolveMailbox, invalidateMailCache } from '../services/wildduck-db.service';

const emailList = z
  .union([z.string().email(), z.array(z.string().email())])
  .transform((value) => (Array.isArray(value) ? value : [value]));

const IntegrationSendSchema = z.object({
  to: emailList,
  cc: emailList.optional().default([]),
  bcc: emailList.optional().default([]),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  body_html: z.string().optional(),
  body_text: z.string().optional(),
  body: z.string().optional(),
}).refine((data) => {
  const html = data.html || data.body_html || '';
  const text = data.text || data.body_text || data.body || '';
  return Boolean(html.trim() || text.trim());
}, { message: 'Provide html or text' });

function toAddr(address: string): { name: string; address: string } {
  return { name: address.split('@')[0], address };
}

export async function sendIntegrationEmail(req: Request, res: Response): Promise<void> {
  const data = IntegrationSendSchema.parse(req.body);
  const user = await User.findById(req.user!.userId).select('email name wildduck_id').lean();
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  const { wdUserId, token } = await getCredentialsForUser(req.user!.userId);
  const html = data.html || data.body_html || '';
  const text = data.text || data.body_text || data.body || '';
  const sentMailbox = await resolveMailbox(wdUserId, 'Sent');

  const result = await submitMessage(wdUserId, {
    from: { name: user.name, address: user.email },
    to: data.to.map(toAddr),
    cc: data.cc.map(toAddr),
    bcc: data.bcc.map(toAddr),
    subject: data.subject,
    html: html || undefined,
    text: text || undefined,
    mailbox: sentMailbox?._id.toString(),
  }, token);

  const recipients = [...data.to, ...data.cc];
  for (const recipEmail of recipients) {
    await Contact.findOneAndUpdate(
      { user_email: user.email, email: recipEmail.toLowerCase() },
      {
        $inc: { frequency: 1 },
        $set: { last_emailed: new Date(), name: recipEmail.split('@')[0] },
      },
      { upsert: true },
    );
  }

  await invalidateMailCache(wdUserId);

  res.json({
    success: true,
    id: result.id,
    mailbox: result.mailbox,
    from: user.email,
  });
}
