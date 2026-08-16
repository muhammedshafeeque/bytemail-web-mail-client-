import { Schema, model, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  user_id: Types.ObjectId;
  name: string;
  prefix: string;
  key_hash: string;
  last_used_at: Date | null;
  revoked_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  prefix: { type: String, required: true },
  key_hash: { type: String, required: true, unique: true },
  last_used_at: { type: Date, default: null },
  revoked_at: { type: Date, default: null },
  expires_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
});

ApiKeySchema.index({ user_id: 1, revoked_at: 1 });

export const ApiKey = model<IApiKey>('ApiKey', ApiKeySchema);
