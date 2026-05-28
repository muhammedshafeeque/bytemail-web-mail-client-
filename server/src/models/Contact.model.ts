import { Schema, model, Document } from 'mongoose';

export interface IContact extends Document {
  user_email: string;
  name: string;
  email: string;
  frequency: number;
  last_emailed: Date;
}

const ContactSchema = new Schema<IContact>({
  user_email: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  frequency: { type: Number, default: 1 },
  last_emailed: { type: Date, default: Date.now },
});

ContactSchema.index({ user_email: 1, email: 1 }, { unique: true });
ContactSchema.index({ user_email: 1, frequency: -1 });

export const Contact = model<IContact>('Contact', ContactSchema);
