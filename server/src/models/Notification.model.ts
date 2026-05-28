import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  user_email: string;
  type: 'new_email' | 'send_success' | 'send_failed';
  title: string;
  body: string;
  email_uid?: string;
  read: boolean;
  created_at: Date;
}

const NotificationSchema = new Schema<INotification>({
  user_email: { type: String, required: true, index: true },
  type: { type: String, enum: ['new_email', 'send_success', 'send_failed'], required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  email_uid: { type: String },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

NotificationSchema.index({ user_email: 1, created_at: -1 });

export const Notification = model<INotification>('Notification', NotificationSchema);
