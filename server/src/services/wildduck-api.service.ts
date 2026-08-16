import { env } from '../config/env';
import { logger } from '../utils/logger';

export class WildduckApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status = 500, body?: unknown) {
    super(message);
    this.name = 'WildduckApiError';
    this.status = status;
    this.body = body;
  }
}

export interface AuthenticateResult {
  id: string;
  username: string;
  token: string;
}

export interface SubmitEmailOptions {
  from: { name: string; address: string };
  to: { name?: string; address: string }[];
  cc?: { name?: string; address: string }[];
  bcc?: { name?: string; address: string }[];
  subject: string;
  html?: string;
  text?: string;
  mailbox?: string;
  reference?: { mailbox: string; id: number; action: 'reply' | 'replyAll' | 'forward' };
}

interface RequestOptions {
  method?: string;
  token?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  raw?: boolean;
  skipToken?: boolean;
}

function apiBase(): string {
  return env.WILDDUCK_API_URL.replace(/\/$/, '');
}

function authToken(token?: string): string {
  return token || env.WILDDUCK_ACCESS_TOKEN;
}

async function wildduckRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.skipToken ? '' : authToken(options.token);
  const url = new URL(path.startsWith('http') ? path : `${apiBase()}${path}`);

  if (token) url.searchParams.set('accessToken', token);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (token) headers['X-Access-Token'] = token;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url.toString(), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (options.raw) {
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new WildduckApiError(text || `WildDuck request failed (${res.status})`, res.status);
    }
    return res as unknown as T;
  }

  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; message?: string };

  if (!res.ok || data.success === false) {
    const message = data.error || data.message || `WildDuck request failed (${res.status})`;
    logger.warn('WildDuck API error', { path, status: res.status, message });
    throw new WildduckApiError(message, res.status || 500, data);
  }

  return data as T;
}

export async function authenticateUser(username: string, password: string): Promise<AuthenticateResult> {
  const payload = {
    username,
    password,
    token: true,
    scope: 'master',
    protocol: 'bytemail',
  };

  const tryAuth = (skipToken: boolean) =>
    wildduckRequest<{
      success: boolean;
      id: string;
      username: string;
      token?: string;
    }>('/authenticate', { method: 'POST', skipToken, body: payload });

  let data: { success: boolean; id: string; username: string; token?: string };
  try {
    data = await tryAuth(true);
  } catch {
    data = await tryAuth(false);
  }

  if (!data.id) {
    throw new WildduckApiError('WildDuck authentication did not return a user id', 401);
  }

  return {
    id: data.id,
    username: data.username,
    token: data.token || env.WILDDUCK_ACCESS_TOKEN,
  };
}

export async function submitMessage(
  wdUserId: string,
  payload: SubmitEmailOptions,
  token?: string,
): Promise<{ id: number; mailbox: string; queueId?: string }> {
  const data = await wildduckRequest<{
    success: boolean;
    message?: { id: number; mailbox: string; queueId?: string };
  }>(`/users/${wdUserId}/submit`, {
    method: 'POST',
    token,
    body: payload,
  });

  if (!data.message) {
    throw new WildduckApiError('WildDuck submit did not return a message', 500);
  }

  logger.info('Email submitted via WildDuck', {
    wdUserId,
    messageId: data.message.id,
    mailbox: data.message.mailbox,
  });

  return data.message;
}

export async function updateMessage(
  wdUserId: string,
  mailboxId: string,
  messageId: number,
  patch: {
    seen?: boolean;
    flagged?: boolean;
    deleted?: boolean;
    moveTo?: string;
  },
  token?: string,
): Promise<void> {
  await wildduckRequest(`/users/${wdUserId}/mailboxes/${mailboxId}/messages/${messageId}`, {
    method: 'PUT',
    token,
    body: patch,
  });
}

export async function deleteMessage(
  wdUserId: string,
  mailboxId: string,
  messageId: number,
  token?: string,
): Promise<void> {
  await wildduckRequest(`/users/${wdUserId}/mailboxes/${mailboxId}/messages/${messageId}`, {
    method: 'DELETE',
    token,
  });
}

export async function downloadAttachmentFromApi(
  wdUserId: string,
  mailboxId: string,
  messageId: number,
  attachmentId: string,
  token?: string,
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const res = await wildduckRequest<Response>(
    `/users/${wdUserId}/mailboxes/${mailboxId}/messages/${messageId}/attachments/${attachmentId}`,
    { token, raw: true },
  );

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const disposition = res.headers.get('content-disposition') || '';
  const filenameMatch = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1].replace(/"/g, '')) : 'attachment';
  const buffer = Buffer.from(await res.arrayBuffer());

  return { buffer, contentType, filename };
}

export async function fetchMessageBodyFromApi(
  wdUserId: string,
  mailboxId: string,
  messageId: number,
  token?: string,
): Promise<{ html: string; text: string; attachments: Array<{
  id: string;
  filename: string;
  contentType: string;
  size: number;
  cid?: string;
}> }> {
  const data = await wildduckRequest<{
    html?: string[] | string | false;
    text?: string;
    attachments?: Array<{
      id: string;
      filename?: string;
      contentType?: string;
      size?: number;
      cid?: string;
    }>;
  }>(`/users/${wdUserId}/mailboxes/${mailboxId}/messages/${messageId}`, {
    token,
    query: { markAsSeen: false },
  });

  const html = Array.isArray(data.html)
    ? data.html.join('')
    : typeof data.html === 'string'
      ? data.html
      : '';

  return {
    html,
    text: data.text ?? '',
    attachments: (data.attachments ?? []).map((att) => ({
      id: att.id,
      filename: att.filename ?? 'attachment',
      contentType: att.contentType ?? 'application/octet-stream',
      size: att.size ?? 0,
      cid: att.cid,
    })),
  };
}
