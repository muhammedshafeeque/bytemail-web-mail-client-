import { wildduckRequest } from './wildduck-api.service';

export interface WdUserListItem {
  id: string;
  username: string;
  name: string;
  address: string;
  quota?: { allowed: number; used: number };
  disabled?: boolean;
  suspended?: boolean;
  activated?: boolean;
  hasPasswordSet?: boolean;
}

export interface WdAddress {
  id: string;
  name?: string;
  address: string;
  user?: string;
  forwarded?: boolean;
}

export interface WdDkim {
  id: string;
  domain: string;
  selector: string;
  description?: string;
  fingerprint?: string;
  publicKey?: string;
  dnsTxt?: { name: string; value: string };
  created?: string;
}

export interface WdAlias {
  id: string;
  alias: string;
  domain: string;
}

export async function wdListUsers(query: string, page = 1, limit = 25) {
  return wildduckRequest<{
    success: boolean;
    total: number;
    page: number;
    results: WdUserListItem[];
  }>('/users', { query: { query, page, limit } });
}

export async function wdCreateUser(body: {
  username: string;
  password: string;
  address: string;
  name?: string;
  quota?: number;
}) {
  return wildduckRequest<{ success: boolean; id: string }>('/users', {
    method: 'POST',
    body: {
      username: body.username,
      password: body.password,
      address: body.address,
      name: body.name || body.username,
      quota: body.quota,
      allowUnsafe: true,
    },
  });
}

export async function wdUpdateUser(id: string, body: Record<string, unknown>) {
  return wildduckRequest<{ success: boolean }>(`/users/${id}`, {
    method: 'PUT',
    body,
  });
}

export async function wdDeleteUser(id: string) {
  return wildduckRequest<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' });
}

export async function wdResetPassword(id: string) {
  return wildduckRequest<{ success: boolean; password: string; validAfter?: string }>(
    `/users/${id}/password/reset`,
    { method: 'PUT', body: {} },
  );
}

export async function wdListAddresses(limit = 250, page = 1, query = '') {
  return wildduckRequest<{
    success: boolean;
    total: number;
    page: number;
    results: WdAddress[];
  }>('/addresses', { query: { limit, page, query } });
}

export async function wdListDkim(query = '', limit = 100) {
  return wildduckRequest<{
    success: boolean;
    total: number;
    results: WdDkim[];
  }>('/dkim', { query: { query, limit } });
}

export async function wdGetDkim(id: string) {
  return wildduckRequest<WdDkim>(`/dkim/${id}`);
}

export async function wdCreateDkim(domain: string, selector: string, description?: string) {
  return wildduckRequest<WdDkim>('/dkim', {
    method: 'POST',
    body: { domain, selector, description },
  });
}

export async function wdDeleteDkim(id: string) {
  return wildduckRequest<{ success: boolean }>(`/dkim/${id}`, { method: 'DELETE' });
}

export async function wdListAliases(query = '', limit = 100) {
  return wildduckRequest<{
    success: boolean;
    total: number;
    results: WdAlias[];
  }>('/domainaliases', { query: { query, limit } });
}

export async function wdCreateAlias(alias: string, domain: string) {
  return wildduckRequest<{ success: boolean; id: string }>('/domainaliases', {
    method: 'POST',
    body: { alias, domain },
  });
}

export async function wdDeleteAlias(id: string) {
  return wildduckRequest<{ success: boolean }>(`/domainaliases/${id}`, { method: 'DELETE' });
}
