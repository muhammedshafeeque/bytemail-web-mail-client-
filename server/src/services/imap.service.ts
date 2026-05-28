import { ImapFlow, ImapFlowOptions, FetchMessageObject, MailboxLockObject } from 'imapflow';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { EmailCache } from '../models/EmailCache.model';
import { getRedis } from '../config/redis';
import { simpleParser } from 'mailparser';

const pool = new Map<string, ImapFlow>();
const MAX_POOL = 50;

export function buildImapConfig(email: string, password: string): ImapFlowOptions {
  return {
    host: env.IMAP_HOST,
    port: env.IMAP_PORT,
    secure: env.IMAP_TLS,
    auth: { user: email, pass: password },
    logger: false,
    tls: { rejectUnauthorized: false },
  };
}

export async function verifyImapCredentials(email: string, password: string): Promise<void> {
  const client = new ImapFlow(buildImapConfig(email, password));
  try {
    await client.connect();
    await client.logout();
  } catch (err) {
    try {
      await client.logout();
    } catch {
      client.close();
    }
    throw err;
  }
}

export async function getImapClient(email: string, password: string): Promise<ImapFlow> {
  if (pool.has(email)) {
    const existing = pool.get(email)!;
    if (existing.usable) return existing;
    pool.delete(email);
  }

  if (pool.size >= MAX_POOL) {
    const firstKey = pool.keys().next().value as string | undefined;
    if (firstKey) {
      try { await pool.get(firstKey)!.logout(); } catch {}
      pool.delete(firstKey);
    }
  }

  const client = new ImapFlow(buildImapConfig(email, password));
  await client.connect();
  pool.set(email, client);

  client.on('error', (err: Error) => {
    logger.warn('IMAP client error', { email, error: err.message });
    pool.delete(email);
  });

  return client;
}

export async function releaseImapClient(email: string): Promise<void> {
  const client = pool.get(email);
  if (client) {
    try { await client.logout(); } catch {}
    pool.delete(email);
  }
}

export interface FetchedEmail {
  uid: string;
  folder: string;
  message_id: string;
  thread_id: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  cc: { name: string; email: string }[];
  subject: string;
  preview: string;
  body_html: string;
  body_text: string;
  attachments: { filename: string; size: number; mimetype: string; content_id: string }[];
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  labels: string[];
  date: Date;
}

interface AddressValue {
  name?: string;
  address?: string;
}

function parseAddressArray(addrs: unknown): { name: string; email: string }[] {
  if (!addrs) return [];
  const arr = Array.isArray(addrs) ? addrs : (addrs as { value?: AddressValue[] })?.value ?? [];
  return (arr as AddressValue[]).map((a) => ({
    name: a.name ?? '',
    email: (a.address ?? '').toLowerCase(),
  }));
}

async function fetchSingleEmailBody(
  client: ImapFlow,
  uid: string,
  folder: string
): Promise<FetchedEmail | null> {
  try {
    const download = await client.download(uid, undefined, { uid: true });
    if (!download) return null;

    const chunks: Buffer[] = [];
    for await (const chunk of download.content) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const parsed = await simpleParser(raw);

    const flagsResult = await client.fetchOne(uid, { flags: true }, { uid: true });
    const flags: Set<string> = (flagsResult && flagsResult.flags) ? flagsResult.flags : new Set<string>();

    const attachments = (parsed.attachments ?? []).map((att) => ({
      filename: att.filename ?? 'attachment',
      size: att.size ?? 0,
      mimetype: att.contentType ?? 'application/octet-stream',
      content_id: att.contentId ?? '',
    }));

    const bodyText = parsed.text ?? '';
    const preview = bodyText.replace(/\s+/g, ' ').trim().substring(0, 150);
    const refs = parsed.references;
    const refStr = Array.isArray(refs) ? refs[0] : typeof refs === 'string' ? refs : undefined;

    return {
      uid,
      folder,
      message_id: parsed.messageId ?? '',
      thread_id: refStr ?? parsed.messageId ?? uid,
      from: parseAddressArray(parsed.from)[0] ?? { name: '', email: '' },
      to: parseAddressArray(parsed.to),
      cc: parseAddressArray(parsed.cc),
      subject: parsed.subject ?? '(no subject)',
      preview,
      body_html: (parsed.html as string | false) || '',
      body_text: bodyText,
      attachments,
      is_read: flags.has('\\Seen'),
      is_starred: flags.has('\\Flagged'),
      is_draft: flags.has('\\Draft'),
      labels: [],
      date: parsed.date ?? new Date(),
    };
  } catch (err) {
    logger.warn('fetchSingleEmailBody failed', { uid, error: (err as Error).message });
    return null;
  }
}

export async function fetchEmails(
  userEmail: string,
  password: string,
  folder = 'INBOX',
  page = 1,
  limit = 25
): Promise<{ emails: FetchedEmail[]; total: number }> {
  const redis = getRedis();
  const cacheKey = `emails:${userEmail}:${folder}:page:${page}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as { emails: FetchedEmail[]; total: number }; } catch {}
  }

  const dbEmails = await EmailCache.find({ user_email: userEmail, folder })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await EmailCache.countDocuments({ user_email: userEmail, folder });

  if (dbEmails.length > 0) {
    const result = { emails: dbEmails as unknown as FetchedEmail[], total };
    await redis.setex(cacheKey, 180, JSON.stringify(result));
    return result;
  }

  return await syncFolder(userEmail, password, folder, page, limit);
}

export async function syncFolder(
  userEmail: string,
  password: string,
  folder = 'INBOX',
  page = 1,
  limit = 25
): Promise<{ emails: FetchedEmail[]; total: number }> {
  let lock: MailboxLockObject | null = null;

  try {
    const client = await getImapClient(userEmail, password);
    lock = await client.getMailboxLock(folder);

    const mailbox = client.mailbox;
    const total = (mailbox as { exists?: number })?.exists ?? 0;

    if (total === 0) {
      lock.release();
      return { emails: [], total: 0 };
    }

    const fetchResults: FetchMessageObject[] = [];
    for await (const msg of client.fetch('1:*', {
      uid: true,
      flags: true,
      envelope: true,
      bodyStructure: true,
      internalDate: true,
    })) {
      fetchResults.push(msg);
    }

    fetchResults.sort((a, b) => {
      const dateA = (a.internalDate instanceof Date ? a.internalDate.getTime() : 0);
      const dateB = (b.internalDate instanceof Date ? b.internalDate.getTime() : 0);
      return dateB - dateA;
    });

    const pageSlice = fetchResults.slice((page - 1) * limit, page * limit);
    const emails: FetchedEmail[] = [];

    for (const msg of pageSlice) {
      try {
        const parsed = await fetchSingleEmailBody(client, msg.uid.toString(), folder);
        if (parsed) {
          emails.push(parsed);
          await EmailCache.findOneAndUpdate(
            { user_email: userEmail, uid: msg.uid.toString(), folder },
            { ...parsed, user_email: userEmail, cached_at: new Date() },
            { upsert: true, new: true }
          );
        }
      } catch (err) {
        logger.warn('Failed to parse email', { uid: msg.uid, error: (err as Error).message });
      }
    }

    lock.release();

    const redis = getRedis();
    const cacheKey = `emails:${userEmail}:${folder}:page:${page}`;
    await redis.setex(cacheKey, 180, JSON.stringify({ emails, total }));

    return { emails, total };
  } catch (err) {
    if (lock) try { lock.release(); } catch {}
    logger.error('IMAP sync failed', { userEmail, folder, error: (err as Error).message });
    throw err;
  }
}

export async function fetchEmailByUid(
  userEmail: string,
  password: string,
  uid: string,
  folder = 'INBOX'
): Promise<FetchedEmail | null> {
  const redis = getRedis();
  const cacheKey = `email:${userEmail}:uid:${uid}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as FetchedEmail; } catch {}
  }

  const dbEmail = await EmailCache.findOne({ user_email: userEmail, uid, folder }).lean();
  if (dbEmail) {
    await redis.setex(cacheKey, 600, JSON.stringify(dbEmail));
    return dbEmail as unknown as FetchedEmail;
  }

  const client = await getImapClient(userEmail, password);
  const lock = await client.getMailboxLock(folder);
  try {
    const result = await fetchSingleEmailBody(client, uid, folder);
    if (result) {
      await redis.setex(cacheKey, 600, JSON.stringify(result));
      await EmailCache.findOneAndUpdate(
        { user_email: userEmail, uid, folder },
        { ...result, user_email: userEmail, cached_at: new Date() },
        { upsert: true }
      );
    }
    return result;
  } finally {
    lock.release();
  }
}

export async function markEmailRead(
  userEmail: string,
  password: string,
  uid: string,
  folder: string,
  isRead: boolean
): Promise<void> {
  const client = await getImapClient(userEmail, password);
  const lock = await client.getMailboxLock(folder);
  try {
    if (isRead) {
      await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
    } else {
      await client.messageFlagsRemove(uid, ['\\Seen'], { uid: true });
    }
    await EmailCache.findOneAndUpdate({ user_email: userEmail, uid, folder }, { is_read: isRead });
    const redis = getRedis();
    await redis.del(`email:${userEmail}:uid:${uid}`);
    await redis.del(`unread:${userEmail}`);
  } finally {
    lock.release();
  }
}

export async function toggleStar(
  userEmail: string,
  password: string,
  uid: string,
  folder: string,
  star: boolean
): Promise<void> {
  const client = await getImapClient(userEmail, password);
  const lock = await client.getMailboxLock(folder);
  try {
    if (star) {
      await client.messageFlagsAdd(uid, ['\\Flagged'], { uid: true });
    } else {
      await client.messageFlagsRemove(uid, ['\\Flagged'], { uid: true });
    }
    await EmailCache.findOneAndUpdate({ user_email: userEmail, uid, folder }, { is_starred: star });
    const redis = getRedis();
    await redis.del(`email:${userEmail}:uid:${uid}`);
  } finally {
    lock.release();
  }
}

export async function moveEmail(
  userEmail: string,
  password: string,
  uid: string,
  fromFolder: string,
  toFolder: string
): Promise<void> {
  const client = await getImapClient(userEmail, password);
  const lock = await client.getMailboxLock(fromFolder);
  try {
    await client.messageMove(uid, toFolder, { uid: true });
    await EmailCache.deleteOne({ user_email: userEmail, uid, folder: fromFolder });
    const redis = getRedis();
    await redis.del(`email:${userEmail}:uid:${uid}`);
    const keys = await redis.keys(`emails:${userEmail}:*`);
    if (keys.length) await redis.del(...keys);
  } finally {
    lock.release();
  }
}

export async function deleteEmail(
  userEmail: string,
  password: string,
  uid: string,
  folder: string
): Promise<void> {
  if (folder.toLowerCase() === 'trash') {
    const client = await getImapClient(userEmail, password);
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageFlagsAdd(uid, ['\\Deleted'], { uid: true });
      await client.messageDelete(uid, { uid: true });
    } finally {
      lock.release();
    }
  } else {
    await moveEmail(userEmail, password, uid, folder, 'Trash');
  }
  await EmailCache.deleteOne({ user_email: userEmail, uid, folder });
}

export async function getFolders(
  userEmail: string,
  password: string
): Promise<{ name: string; path: string; total: number; unseen: number }[]> {
  const client = await getImapClient(userEmail, password);
  const folders: { name: string; path: string; total: number; unseen: number }[] = [];

  const folderList = await client.list();
  for (const folder of folderList) {
    try {
      const status = await client.status(folder.path, { messages: true, unseen: true });
      folders.push({
        name: folder.name,
        path: folder.path,
        total: status.messages ?? 0,
        unseen: status.unseen ?? 0,
      });
    } catch {
      folders.push({ name: folder.name, path: folder.path, total: 0, unseen: 0 });
    }
  }

  return folders;
}

export async function getUnreadCount(userEmail: string, password: string): Promise<number> {
  const redis = getRedis();
  const cacheKey = `unread:${userEmail}`;
  const cached = await redis.get(cacheKey);
  if (cached) return parseInt(cached, 10);

  try {
    const client = await getImapClient(userEmail, password);
    const status = await client.status('INBOX', { unseen: true });
    const count = status.unseen ?? 0;
    await redis.setex(cacheKey, 60, count.toString());
    return count;
  } catch {
    return 0;
  }
}
