import mongoose, { Types } from 'mongoose';
import { getWildduckDb } from '../config/wildduck';
import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';
import {
  downloadAttachmentFromApi,
  fetchMessageBodyFromApi,
} from './wildduck-api.service';

const GridFSBucket = mongoose.mongo.GridFSBucket;

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
  attachments: { filename: string; size: number; mimetype: string; content_id: string; id?: string; index?: number }[];
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  labels: string[];
  date: Date;
}

export interface FolderInfo {
  name: string;
  path: string;
  delimiter: string;
  flags: string[];
  total: number;
  unseen: number;
  uidNext: number;
  specialUse?: string | null;
  mailboxId: string;
}

export interface ParsedUid {
  mailboxId?: string;
  id: number;
}

interface WdMailbox {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  path: string;
  specialUse?: string | false | null;
  uidNext?: number;
  subscribed?: boolean;
  hidden?: boolean;
}

interface WdAddress {
  name?: string;
  address?: string;
}

interface WdAttachment {
  id?: string;
  filename?: string;
  contentType?: string;
  mimeType?: string;
  size?: number;
  sizeKb?: number;
  cid?: string;
  contentId?: string;
  related?: boolean;
}

interface WdMessage {
  _id: Types.ObjectId;
  mailbox: Types.ObjectId;
  user: Types.ObjectId;
  uid: number;
  unseen?: boolean;
  flagged?: boolean;
  draft?: boolean;
  deleted?: boolean;
  exp?: boolean;
  subject?: string;
  from?: WdAddress;
  to?: WdAddress | WdAddress[];
  cc?: WdAddress | WdAddress[];
  date?: Date;
  idate?: Date;
  intro?: string;
  messageId?: string;
  thread?: Types.ObjectId;
  ha?: boolean;
  html?: string[] | string | false;
  text?: string;
  attachments?: WdAttachment[] | boolean;
}

const CLIENT_FOLDER_MAP: Array<{
  key: string;
  specialUse?: string;
  names: RegExp;
}> = [
  { key: 'INBOX', names: /^inbox$/i },
  { key: 'Sent', specialUse: '\\Sent', names: /sent/i },
  { key: 'Drafts', specialUse: '\\Drafts', names: /drafts?/i },
  { key: 'Spam', specialUse: '\\Junk', names: /^(spam|junk)$/i },
  { key: 'Trash', specialUse: '\\Trash', names: /^(trash|deleted|bin)$/i },
  { key: 'Archive', specialUse: '\\Archive', names: /archive/i },
];

function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

function asAddressList(value: WdAddress | WdAddress[] | undefined): { name: string; email: string }[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .filter((a) => a && (a.address || a.name))
    .map((a) => ({
      name: a.name ?? '',
      email: (a.address ?? '').toLowerCase(),
    }));
}

function htmlFromMessage(msg: WdMessage): string {
  if (Array.isArray(msg.html)) return msg.html.join('');
  if (typeof msg.html === 'string') return msg.html;
  return '';
}

function clientFolderKey(mailbox: WdMailbox): string {
  const special = mailbox.specialUse || '';
  const bySpecial = CLIENT_FOLDER_MAP.find((f) => f.specialUse && f.specialUse === special);
  if (bySpecial) return bySpecial.key;

  const path = (mailbox.path || '').trim();
  const byName = CLIENT_FOLDER_MAP.find((f) => f.names.test(path));
  if (byName) return byName.key;

  return path || 'INBOX';
}

export function parseUid(uid: string): ParsedUid {
  if (uid.includes(':')) {
    const [mailboxId, id] = uid.split(':');
    return { mailboxId, id: Number(id) };
  }
  return { id: Number(uid) };
}

export function encodeUid(mailboxId: string, uid: number): string {
  return `${mailboxId}:${uid}`;
}

async function listMailboxes(wdUserId: string): Promise<WdMailbox[]> {
  const db = getWildduckDb();
  return db.collection<WdMailbox>('mailboxes')
    .find({ user: toObjectId(wdUserId), hidden: { $ne: true } })
    .toArray();
}

export async function resolveMailbox(
  wdUserId: string,
  requestedFolder: string,
): Promise<WdMailbox | null> {
  const wanted = requestedFolder.trim();
  if (!wanted || wanted.toLowerCase() === 'starred') return null;

  const mailboxes = await listMailboxes(wdUserId);
  const wantedLower = wanted.toLowerCase();

  const exact = mailboxes.find((m) =>
    m.path.toLowerCase() === wantedLower || clientFolderKey(m).toLowerCase() === wantedLower
  );
  if (exact) return exact;

  const alias = CLIENT_FOLDER_MAP.find(
    (f) => f.key.toLowerCase() === wantedLower || f.names.test(wanted),
  );
  if (alias?.specialUse) {
    const bySpecial = mailboxes.find((m) => m.specialUse === alias.specialUse);
    if (bySpecial) return bySpecial;
  }

  return mailboxes.find((m) => m.path.toLowerCase() === 'inbox') ?? null;
}

function mapListEmail(msg: WdMessage, folderKey: string, mailboxId: string): FetchedEmail {
  const attachments = Array.isArray(msg.attachments)
    ? msg.attachments
      .filter((a) => a && !a.related)
      .map((a, index) => ({
        filename: a.filename ?? 'attachment',
        size: a.size ?? (a.sizeKb ? a.sizeKb * 1024 : 0),
        mimetype: a.contentType ?? a.mimeType ?? 'application/octet-stream',
        content_id: a.cid ?? a.contentId ?? '',
        id: a.id,
        index,
      }))
    : [];

  return {
    uid: encodeUid(mailboxId, msg.uid),
    folder: folderKey,
    message_id: msg.messageId ?? '',
    thread_id: msg.thread?.toString() ?? String(msg.uid),
    from: asAddressList(msg.from)[0] ?? { name: '', email: '' },
    to: asAddressList(msg.to),
    cc: asAddressList(msg.cc),
    subject: msg.subject ?? '(no subject)',
    preview: (msg.intro ?? '').replace(/\s+/g, ' ').trim().substring(0, 150),
    body_html: '',
    body_text: '',
    attachments,
    is_read: !msg.unseen,
    is_starred: Boolean(msg.flagged),
    is_draft: Boolean(msg.draft),
    labels: [],
    date: msg.idate ?? msg.date ?? new Date(),
  };
}

const LIST_PROJECTION = {
  uid: 1,
  mailbox: 1,
  unseen: 1,
  flagged: 1,
  draft: 1,
  subject: 1,
  from: 1,
  to: 1,
  cc: 1,
  date: 1,
  idate: 1,
  intro: 1,
  messageId: 1,
  thread: 1,
  ha: 1,
  attachments: 1,
};

export async function fetchEmails(
  wdUserId: string,
  folder = 'INBOX',
  page = 1,
  limit = 25,
): Promise<{ emails: FetchedEmail[]; total: number }> {
  const redis = getRedis();
  const cacheKey = `emails:${wdUserId}:${folder}:page:${page}:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as { emails: FetchedEmail[]; total: number }; } catch { /* ignore */ }
  }

  const db = getWildduckDb();
  const skip = Math.max(0, (page - 1) * limit);

  if (folder.toLowerCase() === 'starred') {
    const mailboxes = await listMailboxes(wdUserId);
    const mailboxMap = new Map(mailboxes.map((m) => [m._id.toString(), m]));
    const filter = { user: toObjectId(wdUserId), flagged: true, exp: { $ne: true } };
    const [total, messages] = await Promise.all([
      db.collection('messages').countDocuments(filter),
      db.collection<WdMessage>('messages')
        .find(filter, { projection: LIST_PROJECTION })
        .sort({ idate: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const emails = messages.map((msg) => {
      const mailbox = mailboxMap.get(msg.mailbox.toString());
      const folderKey = mailbox ? clientFolderKey(mailbox) : 'Starred';
      return mapListEmail(msg, folderKey, msg.mailbox.toString());
    });

    const result = { emails, total };
    await redis.setex(cacheKey, 60, JSON.stringify(result));
    return result;
  }

  const mailbox = await resolveMailbox(wdUserId, folder);
  if (!mailbox) return { emails: [], total: 0 };

  const folderKey = clientFolderKey(mailbox);
  const filter = { mailbox: mailbox._id, user: toObjectId(wdUserId), exp: { $ne: true } };
  const [total, messages] = await Promise.all([
    db.collection('messages').countDocuments(filter),
    db.collection<WdMessage>('messages')
      .find(filter, { projection: LIST_PROJECTION })
      .sort({ idate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  const emails = messages.map((msg) => mapListEmail(msg, folderKey, mailbox._id.toString()));
  const result = { emails, total };
  await redis.setex(cacheKey, 60, JSON.stringify(result));
  return result;
}

export async function syncFolder(
  wdUserId: string,
  folder = 'INBOX',
  page = 1,
  limit = 25,
): Promise<{ emails: FetchedEmail[]; total: number }> {
  const redis = getRedis();
  await redis.del(`emails:${wdUserId}:${folder}:page:${page}:${limit}`);
  const keys = await redis.keys(`emails:${wdUserId}:${folder}:*`);
  if (keys.length) await redis.del(...keys);
  return fetchEmails(wdUserId, folder, page, limit);
}

async function findMessage(
  wdUserId: string,
  uid: string,
  folder?: string,
): Promise<{ msg: WdMessage; mailbox: WdMailbox; folderKey: string } | null> {
  const db = getWildduckDb();
  const parsed = parseUid(uid);
  const userId = toObjectId(wdUserId);

  let mailbox: WdMailbox | null = null;
  if (parsed.mailboxId && Types.ObjectId.isValid(parsed.mailboxId)) {
    mailbox = await db.collection<WdMailbox>('mailboxes').findOne({
      _id: toObjectId(parsed.mailboxId),
      user: userId,
    });
  } else if (folder && folder.toLowerCase() !== 'starred') {
    mailbox = await resolveMailbox(wdUserId, folder);
  }

  const query: Record<string, unknown> = {
    user: userId,
    uid: parsed.id,
    exp: { $ne: true },
  };
  if (mailbox) query.mailbox = mailbox._id;
  else if (folder?.toLowerCase() === 'starred') query.flagged = true;

  const msg = await db.collection<WdMessage>('messages').findOne(query);
  if (!msg) return null;

  if (!mailbox) {
    mailbox = await db.collection<WdMailbox>('mailboxes').findOne({ _id: msg.mailbox, user: userId });
  }
  if (!mailbox) return null;

  return { msg, mailbox, folderKey: clientFolderKey(mailbox) };
}

export async function fetchEmailByUid(
  wdUserId: string,
  uid: string,
  folder = 'INBOX',
  token?: string,
): Promise<FetchedEmail | null> {
  const redis = getRedis();
  const cacheKey = `email:${wdUserId}:uid:${uid}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as FetchedEmail; } catch { /* ignore */ }
  }

  const found = await findMessage(wdUserId, uid, folder);
  if (!found) return null;

  const { msg, mailbox, folderKey } = found;
  const mapped = mapListEmail(msg, folderKey, mailbox._id.toString());
  mapped.body_html = htmlFromMessage(msg);
  mapped.body_text = msg.text ?? '';

  if (!mapped.body_html && !mapped.body_text) {
    try {
      const body = await fetchMessageBodyFromApi(wdUserId, mailbox._id.toString(), msg.uid, token);
      mapped.body_html = body.html;
      mapped.body_text = body.text;
      if (body.attachments.length) {
        mapped.attachments = body.attachments.map((a, index) => ({
          filename: a.filename,
          size: a.size,
          mimetype: a.contentType,
          content_id: a.cid ?? '',
          id: a.id,
          index,
        }));
      }
    } catch (err) {
      logger.warn('Failed to load message body from WildDuck API', {
        uid,
        error: (err as Error).message,
      });
    }
  }

  if (!mapped.preview) {
    mapped.preview = (mapped.body_text || mapped.body_html.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 150);
  }

  await redis.setex(cacheKey, 300, JSON.stringify(mapped));
  return mapped;
}

export async function getFolders(wdUserId: string): Promise<FolderInfo[]> {
  const db = getWildduckDb();
  const mailboxes = await listMailboxes(wdUserId);
  const userId = toObjectId(wdUserId);

  const folders = await Promise.all(mailboxes.map(async (mailbox) => {
    const filter = { mailbox: mailbox._id, user: userId, exp: { $ne: true } };
    const [total, unseen] = await Promise.all([
      db.collection('messages').countDocuments(filter),
      db.collection('messages').countDocuments({ ...filter, unseen: true }),
    ]);

    const path = clientFolderKey(mailbox);
    return {
      name: mailbox.path,
      path,
      delimiter: '/',
      flags: mailbox.specialUse ? [mailbox.specialUse] : [],
      total,
      unseen,
      uidNext: mailbox.uidNext ?? 1,
      specialUse: mailbox.specialUse || null,
      mailboxId: mailbox._id.toString(),
    };
  }));

  const starredTotal = await db.collection('messages').countDocuments({
    user: userId,
    flagged: true,
    exp: { $ne: true },
  });

  folders.push({
    name: 'Starred',
    path: 'Starred',
    delimiter: '/',
    flags: [],
    total: starredTotal,
    unseen: 0,
    uidNext: 1,
    specialUse: null,
    mailboxId: '',
  });

  return folders;
}

export async function getUnreadCount(wdUserId: string): Promise<number> {
  const redis = getRedis();
  const cacheKey = `unread:${wdUserId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return parseInt(cached, 10);

  const inbox = await resolveMailbox(wdUserId, 'INBOX');
  if (!inbox) return 0;

  const count = await getWildduckDb().collection('messages').countDocuments({
    mailbox: inbox._id,
    user: toObjectId(wdUserId),
    unseen: true,
    exp: { $ne: true },
  });

  await redis.setex(cacheKey, 30, count.toString());
  return count;
}

export async function searchEmails(
  wdUserId: string,
  query: string,
  folder?: string,
  page = 1,
  limit = 25,
): Promise<{ emails: FetchedEmail[]; total: number }> {
  const db = getWildduckDb();
  const userId = toObjectId(wdUserId);
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const skip = Math.max(0, (page - 1) * limit);

  const filter: Record<string, unknown> = {
    user: userId,
    exp: { $ne: true },
    $or: [
      { subject: regex },
      { intro: regex },
      { text: regex },
      { 'from.address': regex },
      { 'from.name': regex },
    ],
  };

  if (folder && folder.toLowerCase() !== 'starred') {
    const mailbox = await resolveMailbox(wdUserId, folder);
    if (mailbox) filter.mailbox = mailbox._id;
  } else if (folder?.toLowerCase() === 'starred') {
    filter.flagged = true;
  }

  const mailboxes = await listMailboxes(wdUserId);
  const mailboxMap = new Map(mailboxes.map((m) => [m._id.toString(), m]));

  const [total, messages] = await Promise.all([
    db.collection('messages').countDocuments(filter),
    db.collection<WdMessage>('messages')
      .find(filter, { projection: LIST_PROJECTION })
      .sort({ idate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  const emails = messages.map((msg) => {
    const mailbox = mailboxMap.get(msg.mailbox.toString());
    const folderKey = mailbox ? clientFolderKey(mailbox) : folder || 'INBOX';
    return mapListEmail(msg, folderKey, msg.mailbox.toString());
  });

  return { emails, total };
}

export async function resolveMessageLocation(
  wdUserId: string,
  uid: string,
  folder?: string,
): Promise<{ mailboxId: string; messageId: number; folderKey: string } | null> {
  const found = await findMessage(wdUserId, uid, folder);
  if (!found) return null;
  return {
    mailboxId: found.mailbox._id.toString(),
    messageId: found.msg.uid,
    folderKey: found.folderKey,
  };
}

export async function getAttachment(
  wdUserId: string,
  uid: string,
  index: number,
  folder: string,
  token?: string,
): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  const found = await findMessage(wdUserId, uid, folder);
  if (!found) return null;

  const { msg, mailbox } = found;
  const attachments = Array.isArray(msg.attachments)
    ? msg.attachments.filter((a) => a && !a.related)
    : [];
  const att = attachments[index];
  const attachmentId = att?.id;

  if (attachmentId) {
    const fromGrid = await readGridFsAttachment(attachmentId);
    if (fromGrid) return fromGrid;

    try {
      return await downloadAttachmentFromApi(
        wdUserId,
        mailbox._id.toString(),
        msg.uid,
        attachmentId,
        token,
      );
    } catch (err) {
      logger.warn('Attachment REST download failed', { attachmentId, error: (err as Error).message });
    }
  }

  try {
    const body = await fetchMessageBodyFromApi(wdUserId, mailbox._id.toString(), msg.uid, token);
    const apiAtt = body.attachments[index];
    if (!apiAtt?.id) return null;
    return await downloadAttachmentFromApi(
      wdUserId,
      mailbox._id.toString(),
      msg.uid,
      apiAtt.id,
      token,
    );
  } catch (err) {
    logger.warn('Attachment fallback failed', { uid, index, error: (err as Error).message });
    return null;
  }
}

async function readGridFsAttachment(
  attachmentId: string,
): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
  try {
    const db = getWildduckDb();
    const files = db.collection('attachments.files');
    const file = await files.findOne({
      $or: [
        { filename: attachmentId },
        { 'metadata.id': attachmentId },
        { 'metadata.filename': attachmentId },
      ],
    });
    if (!file) return null;

    const bucket = new GridFSBucket(db, { bucketName: 'attachments' });
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      bucket.openDownloadStream(file._id)
        .on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        .on('error', reject)
        .on('end', () => resolve());
    });

    return {
      buffer: Buffer.concat(chunks),
      contentType: (file.contentType as string) || 'application/octet-stream',
      filename: (file.filename as string) || attachmentId,
    };
  } catch (err) {
    logger.debug('GridFS attachment lookup missed', { attachmentId, error: (err as Error).message });
    return null;
  }
}

export async function invalidateMailCache(wdUserId: string, extraUids: string[] = []): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys(`emails:${wdUserId}:*`);
  const extra = extraUids.map((uid) => `email:${wdUserId}:uid:${uid}`);
  const unread = `unread:${wdUserId}`;
  const all = [...keys, ...extra, unread];
  if (all.length) await redis.del(...all);
}
