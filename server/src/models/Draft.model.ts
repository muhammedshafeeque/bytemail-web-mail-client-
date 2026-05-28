import { Schema, model, Document } from 'mongoose';

interface DraftAttachment {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export interface IDraft extends Document {
  user_email: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  body_text: string;
  attachments: DraftAttachment[];
  updated_at: Date;
}

const DraftSchema = new Schema<IDraft>({
  user_email: { type: String, required: true, index: true },
  to: [String],
  cc: [String],
  bcc: [String],
  subject: { type: String, default: '' },
  body_html: { type: String, default: '' },
  body_text: { type: String, default: '' },
  attachments: [
    {
      filename: String,
      path: String,
      size: Number,
      mimetype: String,
    },
  ],
  updated_at: { type: Date, default: Date.now },
});

export const Draft = model<IDraft>('Draft', DraftSchema);
