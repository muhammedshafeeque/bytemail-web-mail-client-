import api from './client';
import { AuthResponse, LoginPayload, User } from '@/types/user';

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<{ success: boolean; data: AuthResponse }>('/auth/login', payload),

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post<{ success: boolean; data: { accessToken: string } }>('/auth/refresh'),

  me: () => api.get<{ success: boolean; data: User }>('/auth/me'),
};
