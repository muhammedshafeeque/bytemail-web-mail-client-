import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  avatar_color: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    accent: 'indigo' | 'blue' | 'green' | 'rose' | 'orange';
    density: 'comfortable' | 'compact';
    emails_per_page: number;
    signature: string;
    reply_position: 'top' | 'bottom';
    send_shortcut: boolean;
  };
  push_subscriptions: object[];
  last_login: Date;
  created_at: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  avatar_color: { type: String, default: '#4F46E5' },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    accent: { type: String, enum: ['indigo', 'blue', 'green', 'rose', 'orange'], default: 'indigo' },
    density: { type: String, enum: ['comfortable', 'compact'], default: 'comfortable' },
    emails_per_page: { type: Number, default: 25, min: 10, max: 100 },
    signature: { type: String, default: '' },
    reply_position: { type: String, enum: ['top', 'bottom'], default: 'top' },
    send_shortcut: { type: Boolean, default: true },
  },
  push_subscriptions: [{ type: Schema.Types.Mixed }],
  last_login: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
});

export const User = model<IUser>('User', UserSchema);
