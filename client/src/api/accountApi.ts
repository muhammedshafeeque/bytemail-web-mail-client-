import api from './client';

export interface DeviceSession {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeen: string;
  current: boolean;
  label: string;
}

export const accountApi = {
  listSessions: () =>
    api.get<{ success: boolean; data: DeviceSession[] }>('/settings/sessions'),

  revokeSession: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/settings/sessions/${id}`),

  revokeOtherSessions: () =>
    api.delete<{ success: boolean; message: string }>('/settings/sessions'),

  revokeAllSessions: () =>
    api.delete<{ success: boolean; message: string }>('/settings/sessions/all'),

  setupTwoFactor: () =>
    api.post<{ success: boolean; data: { secret: string; uri: string; qr: string } }>('/settings/2fa/setup'),

  enableTwoFactor: (code: string) =>
    api.post<{ success: boolean; data: { backup_codes: string[] } }>('/settings/2fa/enable', { code }),

  disableTwoFactor: (code: string) =>
    api.post<{ success: boolean; message: string }>('/settings/2fa/disable', { code }),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/settings/password', data),
};
