import { Schema, model, Document } from 'mongoose';

interface EmailAddress {
  name: string;
  email: string;
}

interface AttachmentInfo {
  filename: string;
  size: number;
  mimetype: string;
  content_id: string;
}

export interface IEmailCache extends Document {
  user_email: string;
  uid: string;
  folder: string;
  message_id: string;
  thread_id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string;
  preview: string;
  body_html: string;
  body_text: string;
  attachments: AttachmentInfo[];
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  labels: string[];
  date: Date;
  cached_at: Date;
}

const EmailAddressSchema = new Schema<EmailAddress>({ name: String, email: String }, { _id: false });

const AttachmentSchema = new Schema<AttachmentInfo>(
  { filename: String, size: Number, mimetype: String, content_id: String },
  { _id: false }
);

const EmailCacheSchema = new Schema<IEmailCache>({
  user_email: { type: String, required: true, index: true },
  uid: { type: String, required: true },
  folder: { type: String, required: true },
  message_id: { type: String },
  thread_id: { type: String },
  from: { type: EmailAddressSchema, required: true },
  to: [EmailAddressSchema],
  cc: [EmailAddressSchema],
  subject: { type: String, default: '(no subject)' },
  preview: { type: String, default: '' },
  body_html: { type: String, default: '' },
  body_text: { type: String, default: '' },
  attachments: [AttachmentSchema],
  is_read: { type: Boolean, default: false },
  is_starred: { type: Boolean, default: false },
  is_draft: { type: Boolean, default: false },
  labels: [{ type: String }],
  date: { type: Date, required: true },
  cached_at: { type: Date, default: Date.now },
});

EmailCacheSchema.index({ user_email: 1, folder: 1, date: -1 });
EmailCacheSchema.index({ user_email: 1, uid: 1, folder: 1 }, { unique: true });
EmailCacheSchema.index({ user_email: 1, is_starred: 1 });
EmailCacheSchema.index({ user_email: 1, is_read: 1 });
EmailCacheSchema.index(
  { user_email: 1, subject: 'text', body_text: 'text', 'from.name': 'text', 'from.email': 'text' },
  { name: 'email_search' }
);

export const EmailCache = model<IEmailCache>('EmailCache', EmailCacheSchema);
