import { Request, Response, NextFunction } from 'express';
import { authenticateApiKey } from '../services/api-key.service';
import { logger } from '../utils/logger';

function extractApiKey(req: Request): string | null {
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) return headerKey.trim();
  return null;
}

export async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const raw = extractApiKey(req);
  if (!raw) {
    res.status(401).json({ success: false, message: 'Missing API key. Send it in the X-API-Key header.' });
    return;
  }

  try {
    const identity = await authenticateApiKey(raw);
    if (!identity) {
      res.status(401).json({ success: false, message: 'Invalid or revoked API key' });
      return;
    }

    req.user = identity;
    next();
  } catch (err) {
    logger.warn('API key authentication failed', { error: (err as Error).message });
    res.status(401).json({ success: false, message: 'Invalid or revoked API key' });
  }
}
