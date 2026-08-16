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
