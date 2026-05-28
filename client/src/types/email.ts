export interface EmailAddress {
  name: string;
  email: string;
}

export interface Attachment {
  filename: string;
  size: number;
  mimetype: string;
  content_id?: string;
  index?: number;
}

export interface Email {
  _id: string;
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
  attachments: Attachment[];
  is_read: boolean;
  is_starred: boolean;
  is_draft: boolean;
  labels: string[];
  date: string;
  cached_at: string;
}

export interface Draft {
  _id: string;
  user_email: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  body_text: string;
  attachments: DraftAttachment[];
  updated_at: string;
}

export interface DraftAttachment {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

export interface ComposeData {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  body_text: string;
  attachments: File[];
  draft_id?: string;
  reply_to?: string;
  forward_from?: string;
}

export interface SendEmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_html: string;
  body_text: string;
  reply_to?: string;
}
