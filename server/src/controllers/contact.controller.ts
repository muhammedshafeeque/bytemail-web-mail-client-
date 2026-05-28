import { Request, Response } from 'express';
import { Contact } from '../models/Contact.model';
import { cacheGet, cacheSet } from '../services/cache.service';

export async function listContacts(req: Request, res: Response): Promise<void> {
  const userEmail = req.user!.email;
  const cacheKey = `contacts:${userEmail}`;

  const cached = await cacheGet<unknown[]>(cacheKey);
  if (cached) {
    res.json({ success: true, data: cached });
    return;
  }

  const contacts = await Contact.find({ user_email: userEmail })
    .sort({ frequency: -1 })
    .limit(200)
    .lean();

  await cacheSet(cacheKey, contacts, 3600);
  res.json({ success: true, data: contacts });
}

export async function searchContacts(req: Request, res: Response): Promise<void> {
  const { q } = req.query as Record<string, string>;

  if (!q || q.trim().length < 1) {
    res.json({ success: true, data: [] });
    return;
  }

  const regex = new RegExp(q.trim(), 'i');
  const contacts = await Contact.find({
    user_email: req.user!.email,
    $or: [{ name: regex }, { email: regex }],
  })
    .sort({ frequency: -1 })
    .limit(10)
    .lean();

  res.json({ success: true, data: contacts });
}
