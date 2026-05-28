export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface Notification {
  _id: string;
  type: 'new_email' | 'send_success' | 'send_failed';
  title: string;
  body: string;
  email_uid?: string;
  read: boolean;
  created_at: string;
}
