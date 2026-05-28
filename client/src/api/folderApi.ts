import api from './client';
import { Folder } from '@/types/folder';
import { ApiResponse } from '@/types/api';

export const folderApi = {
  list: () => api.get<ApiResponse<Folder[]>>('/folders'),
  unread: () => api.get<ApiResponse<{ count: number }>>('/folders/unread'),
};
