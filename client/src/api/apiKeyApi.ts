import api from './client';

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface CreatedApiKey extends ApiKeyRecord {
  key: string;
}

export const apiKeyApi = {
  list: () =>
    api.get<{ success: boolean; data: ApiKeyRecord[] }>('/settings/api-keys'),

  create: (name: string) =>
    api.post<{ success: boolean; data: CreatedApiKey }>('/settings/api-keys', { name }),

  revoke: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/settings/api-keys/${id}`),
};
