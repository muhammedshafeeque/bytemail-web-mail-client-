import { Request, Response } from 'express';
import { z } from 'zod';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '../services/api-key.service';

const CreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
});

export async function listApiKeysHandler(req: Request, res: Response): Promise<void> {
  const keys = await listApiKeys(req.user!.userId);
  res.json({ success: true, data: keys });
}

export async function createApiKeyHandler(req: Request, res: Response): Promise<void> {
  const { name } = CreateSchema.parse(req.body);
  const created = await createApiKey(req.user!.userId, name);
  res.status(201).json({ success: true, data: created });
}

export async function revokeApiKeyHandler(req: Request, res: Response): Promise<void> {
  const revoked = await revokeApiKey(req.user!.userId, req.params.id);
  if (!revoked) {
    res.status(404).json({ success: false, message: 'API key not found' });
    return;
  }
  res.json({ success: true, message: 'API key revoked' });
}
