import api from './client';
import { Email, SendEmailPayload } from '@/types/email';
import { PaginatedResponse, ApiResponse } from '@/types/api';

export const emailApi = {
  list: (folder: string, page: number, limit: number) =>
    api.get<PaginatedResponse<Email>>('/emails', { params: { folder, page, limit } }),

  get: (uid: string, folder: string) =>
    api.get<ApiResponse<Email>>(`/emails/${uid}`, { params: { folder } }),

  send: (payload: SendEmailPayload) =>
    api.post<ApiResponse<void>>('/emails/send', payload),

  markRead: (uid: string, folder: string, read: boolean) =>
    api.put<ApiResponse<void>>(`/emails/${uid}/read`, null, { params: { folder, read } }),

  star: (uid: string, folder: string, star: boolean) =>
    api.put<ApiResponse<void>>(`/emails/${uid}/star`, { star }, { params: { folder } }),

  move: (uid: string, folder: string, to: string) =>
    api.put<ApiResponse<void>>(`/emails/${uid}/move`, { folder, to }),

  delete: (uid: string, folder: string) =>
    api.delete<ApiResponse<void>>(`/emails/${uid}`, { params: { folder } }),

  search: (q: string, folder?: string, page?: number) =>
    api.get<PaginatedResponse<Email>>('/emails/search', { params: { q, folder, page } }),

  sync: (folder: string) =>
    api.post<PaginatedResponse<Email>>('/emails/sync', null, { params: { folder } }),
};
