export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = 'teal' | 'indigo' | 'blue' | 'green' | 'rose' | 'orange';
export type Density = 'comfortable' | 'compact';
export type ReplyPosition = 'top' | 'bottom';

export interface UserPreferences {
  theme: Theme;
  accent: AccentColor;
  density: Density;
  emails_per_page: number;
  signature: string;
  reply_position: ReplyPosition;
  send_shortcut: boolean;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  avatar_color: string;
  preferences: UserPreferences;
  last_login: string;
  created_at: string;
  two_factor_enabled?: boolean;
  two_factor_enabled_at?: string | null;
  role?: 'admin' | 'user';
  is_admin?: boolean;
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  frequency: number;
  last_emailed: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface TwoFactorChallenge {
  requires_2fa: true;
  ticket: string;
}

export type LoginResult = AuthResponse | TwoFactorChallenge;
