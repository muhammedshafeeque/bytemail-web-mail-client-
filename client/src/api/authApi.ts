import api from './client';
import { AuthResponse, LoginPayload, LoginResult, User } from '@/types/user';

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ success: boolean; data: LoginResult }>('/auth/login', payload),

  loginTwoFactor: (payload: { ticket: string; code: string }) =>
    api.post<{ success: boolean; data: AuthResponse }>('/auth/login/2fa', payload),

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post<{ success: boolean; data: { accessToken: string } }>('/auth/refresh'),

  me: () => api.get<{ success: boolean; data: User }>('/auth/me'),
};
