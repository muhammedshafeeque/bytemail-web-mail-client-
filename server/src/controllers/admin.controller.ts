import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { User } from '../models/User.model';
import { getWildduckDb } from '../config/wildduck';
import { hashPassword } from '../utils/password';
import { envAdminEmails, isEnvAdmin } from '../utils/admin';
import {
  wdCreateAlias,
  wdCreateDkim,
  wdCreateUser,
  wdDeleteAlias,
  wdDeleteDkim,
  wdDeleteUser,
  wdGetDkim,
  wdListAddresses,
  wdListAliases,
  wdListDkim,
  wdListUsers,
  wdResetPassword,
  wdUpdateUser,
} from '../services/wildduck-admin.service';

function domainFromAddress(address: string): string {
  const at = address.lastIndexOf('@');
  return at >= 0 ? address.slice(at + 1).toLowerCase() : '';
}

export async function adminDashboard(_req: Request, res: Response): Promise<void> {
  const db = getWildduckDb();
  const users = db.collection('users');
  const [totalUsers, disabledUsers, suspendedUsers, messageCount, dkimCount, aliasCount, quotaAgg, addressDocs] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ disabled: true }),
    users.countDocuments({ suspended: true }),
    db.collection('messages').countDocuments({ exp: { $ne: true } }).catch(() => 0),
    db.collection('dkim').countDocuments({}).catch(() => 0),
    db.collection('domainaliases').countDocuments({}).catch(() => 0),
    users.aggregate([
      {
        $group: {
          _id: null,
          allowed: { $sum: { $ifNull: ['$quota.allowed', { $ifNull: ['$quota', 0] }] } },
          used: { $sum: { $ifNull: ['$quota.used', { $ifNull: ['$storageUsed', 0] }] } },
        },
      },
    ]).toArray().catch(() => []),
    db.collection('addresses').find({}, { projection: { address: 1 } }).limit(8000).toArray().catch(() => []),
  ]);

  const domains = new Set<string>();
  for (const row of addressDocs as Array<{ address?: string }>) {
    const domain = domainFromAddress(row.address || '');
    if (domain) domains.add(domain);
  }

  const quota = (quotaAgg[0] as { allowed?: number; used?: number } | undefined) ?? {};

  const recent = await users.find({})
    .project({ address: 1, name: 1, username: 1, disabled: 1, created: 1 })
    .sort({ _id: -1 })
    .limit(8)
    .toArray()
    .catch(() => []);

  res.json({
    success: true,
    data: {
      users: totalUsers,
      disabled: disabledUsers,
      suspended: suspendedUsers,
      messages: messageCount,
      domains: domains.size,
      dkim: dkimCount,
      aliases: aliasCount,
      quota: { allowed: quota.allowed ?? 0, used: quota.used ?? 0 },
      recent: recent.map((u) => ({
        id: u._id.toString(),
        name: u.name || u.username || '',
        address: u.address || '',
        disabled: Boolean(u.disabled),
      })),
    },
  });
}

export async function adminListUsers(req: Request, res: Response): Promise<void> {
  const query = typeof req.query.query === 'string' ? req.query.query : '';
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const data = await wdListUsers(query, page, limit);
  const emails = data.results.map((u) => u.address.toLowerCase());
  const local = await User.find({ email: { $in: emails } }).select('email role').lean();
  const roleByEmail = new Map(local.map((u) => [u.email, u.role || 'user']));

  res.json({
    success: true,
    total: data.total,
    page: data.page,
    data: data.results.map((user) => ({
      ...user,
      role: roleByEmail.get(user.address.toLowerCase()) || 'user',
      env_admin: isEnvAdmin(user.address),
    })),
  });
}

const CreateUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  address: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(256).optional(),
  quota_mb: z.number().min(0).optional(),
});

export async function adminCreateUser(req: Request, res: Response): Promise<void> {
  const data = CreateUserSchema.parse(req.body);
  const localPart = data.address.split('@')[0];
  const username = (data.username || localPart).slice(0, 30);
  const created = await wdCreateUser({
    username,
    password: data.password,
    address: data.address.toLowerCase(),
    name: data.name,
    quota: data.quota_mb ? Math.round(data.quota_mb * 1024 * 1024) : undefined,
  });
  res.status(201).json({ success: true, id: created.id });
}

export async function adminUpdateUser(req: Request, res: Response): Promise<void> {
  const patch = z.object({
    name: z.string().max(256).optional(),
    disabled: z.boolean().optional(),
    suspended: z.boolean().optional(),
    quota_mb: z.number().min(0).optional(),
  }).parse(req.body);

  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.disabled !== undefined) body.disabled = patch.disabled;
  if (patch.suspended !== undefined) body.suspended = patch.suspended;
  if (patch.quota_mb !== undefined) body.quota = Math.round(patch.quota_mb * 1024 * 1024);

  await wdUpdateUser(req.params.id, body);
  res.json({ success: true });
}

export async function adminDeleteUser(req: Request, res: Response): Promise<void> {
  await wdDeleteUser(req.params.id);
  res.json({ success: true });
}

export async function adminSetPassword(req: Request, res: Response): Promise<void> {
  const { password } = z.object({ password: z.string().min(8) }).parse(req.body);
  await wdUpdateUser(req.params.id, { password, allowUnsafe: true });
  res.json({ success: true, message: 'Password updated' });
}

export async function adminResetPassword(req: Request, res: Response): Promise<void> {
  const result = await wdResetPassword(req.params.id);
  res.json({ success: true, password: result.password, validAfter: result.validAfter });
}

export async function adminSetRole(req: Request, res: Response): Promise<void> {
  const { email, role } = z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'user']),
  }).parse(req.body);
  const normalized = email.toLowerCase();

  if (isEnvAdmin(normalized) && role !== 'admin') {
    res.status(400).json({ success: false, message: 'Cannot demote an env-listed admin' });
    return;
  }

  if (role === 'user') {
    const remaining = await User.countDocuments({ role: 'admin', email: { $ne: normalized } });
    const envStill = envAdminEmails().some((item) => item !== normalized);
    if (remaining === 0 && !envStill && !isEnvAdmin(normalized)) {
      res.status(400).json({ success: false, message: 'At least one admin is required' });
      return;
    }
  }

  let user = await User.findOne({ email: normalized });
  if (!user) {
    user = await User.create({
      email: normalized,
      password: await hashPassword(crypto.randomBytes(32).toString('hex')),
      name: normalized.split('@')[0],
      role,
    });
  } else {
    user.role = role;
    await user.save();
  }

  res.json({ success: true, role: user.role });
}

export async function adminListDomains(_req: Request, res: Response): Promise<void> {
  const [addresses, dkim] = await Promise.all([
    wdListAddresses(250, 1),
    wdListDkim('', 250),
  ]);
  const dkimByDomain = new Map(dkim.results.map((key) => [key.domain.toLowerCase(), key]));
  const counts = new Map<string, number>();
  for (const addr of addresses.results) {
    const domain = domainFromAddress(addr.address);
    if (!domain) continue;
    counts.set(domain, (counts.get(domain) || 0) + 1);
  }
  for (const key of dkim.results) {
    const domain = key.domain.toLowerCase();
    if (!counts.has(domain)) counts.set(domain, 0);
  }

  const data = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, mailboxes]) => {
      const key = dkimByDomain.get(domain);
      return {
        domain,
        mailboxes,
        dkim: key
          ? { id: key.id, selector: key.selector, fingerprint: key.fingerprint }
          : null,
      };
    });

  res.json({ success: true, data });
}

export async function adminAddDomain(req: Request, res: Response): Promise<void> {
  const { domain, selector } = z.object({
    domain: z.string().min(3).max(255),
    selector: z.string().min(1).max(255).optional(),
  }).parse(req.body);
  const created = await wdCreateDkim(
    domain.toLowerCase().trim(),
    selector?.trim() || 'wildduck',
    `ByteMail ${domain}`,
  );
  res.status(201).json({ success: true, data: created });
}

export async function adminListDkim(_req: Request, res: Response): Promise<void> {
  const data = await wdListDkim('', 250);
  res.json({ success: true, total: data.total, data: data.results });
}

export async function adminGetDkim(req: Request, res: Response): Promise<void> {
  const data = await wdGetDkim(req.params.id);
  res.json({ success: true, data });
}

export async function adminCreateDkim(req: Request, res: Response): Promise<void> {
  const { domain, selector, description } = z.object({
    domain: z.string().min(3).max(255),
    selector: z.string().min(1).max(255),
    description: z.string().max(255).optional(),
  }).parse(req.body);
  const created = await wdCreateDkim(domain.toLowerCase().trim(), selector.trim(), description);
  res.status(201).json({ success: true, data: created });
}

export async function adminDeleteDkim(req: Request, res: Response): Promise<void> {
  await wdDeleteDkim(req.params.id);
  res.json({ success: true });
}

export async function adminListAliases(_req: Request, res: Response): Promise<void> {
  const data = await wdListAliases('', 250);
  res.json({ success: true, total: data.total, data: data.results });
}

export async function adminCreateAlias(req: Request, res: Response): Promise<void> {
  const { alias, domain } = z.object({
    alias: z.string().min(3).max(255),
    domain: z.string().min(3).max(255),
  }).parse(req.body);
  const created = await wdCreateAlias(alias.toLowerCase().trim(), domain.toLowerCase().trim());
  res.status(201).json({ success: true, id: created.id });
}

export async function adminDeleteAlias(req: Request, res: Response): Promise<void> {
  await wdDeleteAlias(req.params.id);
  res.json({ success: true });
}
