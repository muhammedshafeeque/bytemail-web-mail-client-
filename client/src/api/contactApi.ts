import api from './client';
import { Contact } from '@/types/user';
import { ApiResponse } from '@/types/api';

export const contactApi = {
  list: () => api.get<ApiResponse<Contact[]>>('/contacts'),
  search: (q: string) => api.get<ApiResponse<Contact[]>>('/contacts/search', { params: { q } }),
};
