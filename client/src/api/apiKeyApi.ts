import api from './client';

export type ApiKeyExpiry = '7d' | '30d' | '90d' | '1y' | 'never';

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CreatedApiKey extends ApiKeyRecord {
  key: string;
}

export const apiKeyApi = {
  list: () =>
    api.get<{ success: boolean; data: ApiKeyRecord[] }>('/settings/api-keys'),

  create: (name: string, expires_in: ApiKeyExpiry) =>
    api.post<{ success: boolean; data: CreatedApiKey }>('/settings/api-keys', { name, expires_in }),

  revoke: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/settings/api-keys/${id}`),
};
