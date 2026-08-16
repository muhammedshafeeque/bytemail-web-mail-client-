import api from './client';

export interface AdminDashboard {
  users: number;
  disabled: number;
  suspended: number;
  messages: number;
  domains: number;
  dkim: number;
  aliases: number;
  quota: { allowed: number; used: number };
  recent: Array<{ id: string; name: string; address: string; disabled: boolean }>;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  address: string;
  quota?: { allowed: number; used: number };
  disabled?: boolean;
  suspended?: boolean;
  role: 'admin' | 'user';
  env_admin: boolean;
}

export interface AdminDomain {
  domain: string;
  mailboxes: number;
  dkim: { id: string; selector: string; fingerprint?: string } | null;
}

export interface AdminDkim {
  id: string;
  domain: string;
  selector: string;
  description?: string;
  fingerprint?: string;
  publicKey?: string;
  dnsTxt?: { name: string; value: string };
  created?: string;
}

export interface AdminAlias {
  id: string;
  alias: string;
  domain: string;
}

export const adminApi = {
  dashboard: () => api.get<{ success: boolean; data: AdminDashboard }>('/admin/dashboard'),

  listUsers: (query = '', page = 1) =>
    api.get<{ success: boolean; total: number; page: number; data: AdminUser[] }>('/admin/users', {
      params: { query, page, limit: 25 },
    }),

  createUser: (body: { address: string; password: string; name?: string; username?: string; quota_mb?: number }) =>
    api.post('/admin/users', body),

  updateUser: (id: string, body: { name?: string; disabled?: boolean; suspended?: boolean; quota_mb?: number }) =>
    api.put(`/admin/users/${id}`, body),

  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  setPassword: (id: string, password: string) =>
    api.put(`/admin/users/${id}/password`, { password }),

  resetPassword: (id: string) =>
    api.post<{ success: boolean; password: string }>(`/admin/users/${id}/password/reset`),

  setRole: (email: string, role: 'admin' | 'user') =>
    api.put('/admin/users/role', { email, role }),

  listDomains: () => api.get<{ success: boolean; data: AdminDomain[] }>('/admin/domains'),

  addDomain: (domain: string, selector?: string) =>
    api.post<{ success: boolean; data: AdminDkim }>('/admin/domains', { domain, selector }),

  listDkim: () => api.get<{ success: boolean; data: AdminDkim[] }>('/admin/dkim'),

  getDkim: (id: string) => api.get<{ success: boolean; data: AdminDkim }>(`/admin/dkim/${id}`),

  createDkim: (body: { domain: string; selector: string; description?: string }) =>
    api.post<{ success: boolean; data: AdminDkim }>('/admin/dkim', body),

  deleteDkim: (id: string) => api.delete(`/admin/dkim/${id}`),

  listAliases: () => api.get<{ success: boolean; data: AdminAlias[] }>('/admin/aliases'),

  createAlias: (alias: string, domain: string) =>
    api.post('/admin/aliases', { alias, domain }),

  deleteAlias: (id: string) => api.delete(`/admin/aliases/${id}`),
};
