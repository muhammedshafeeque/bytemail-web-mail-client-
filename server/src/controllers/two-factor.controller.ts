import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.model';
import { storePendingTotpSecret, takePendingTotpSecret } from '../services/session.service';
import {
  consumeBackupCode,
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCodes,
  totpQrDataUrl,
  totpUri,
  verifyTotp,
} from '../services/totp.service';

export async function setupTwoFactor(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId).select('email two_factor');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  if (user.two_factor?.enabled) {
    res.status(400).json({ success: false, message: 'Two-factor authentication is already enabled' });
    return;
  }

  const secret = generateTotpSecret();
  await storePendingTotpSecret(req.user!.userId, encryptSecret(secret));
  const uri = totpUri(user.email, secret);
  const qr = await totpQrDataUrl(uri);

  res.json({
    success: true,
    data: {
      secret,
      uri,
      qr,
    },
  });
}

export async function enableTwoFactor(req: Request, res: Response): Promise<void> {
  const { code } = z.object({ code: z.string().min(6).max(16) }).parse(req.body);
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  if (user.two_factor?.enabled) {
    res.status(400).json({ success: false, message: 'Two-factor authentication is already enabled' });
    return;
  }

  const encrypted = await takePendingTotpSecret(req.user!.userId);
  if (!encrypted) {
    res.status(400).json({ success: false, message: 'Setup expired. Start two-factor setup again.' });
    return;
  }

  const secret = decryptSecret(encrypted);
  if (!verifyTotp(user.email, secret, code)) {
    await storePendingTotpSecret(req.user!.userId, encrypted);
    res.status(401).json({ success: false, message: 'Invalid authenticator code' });
    return;
  }

  const backupCodes = generateBackupCodes();
  user.two_factor = {
    enabled: true,
    secret: encryptSecret(secret),
    backup_hashes: await hashBackupCodes(backupCodes),
    enabled_at: new Date(),
  };
  await user.save();

  res.json({
    success: true,
    data: { backup_codes: backupCodes },
  });
}

export async function disableTwoFactor(req: Request, res: Response): Promise<void> {
  const { code } = z.object({ code: z.string().min(6).max(32) }).parse(req.body);
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  if (!user.two_factor?.enabled || !user.two_factor.secret) {
    res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled' });
    return;
  }

  const secret = decryptSecret(user.two_factor.secret);
  const totpOk = verifyTotp(user.email, secret, code);
  let backupOk = false;
  let remaining = user.two_factor.backup_hashes ?? [];

  if (!totpOk) {
    const consumed = await consumeBackupCode(remaining, code);
    backupOk = consumed.ok;
    remaining = consumed.remaining;
  }

  if (!totpOk && !backupOk) {
    res.status(401).json({ success: false, message: 'Invalid code' });
    return;
  }

  user.two_factor = {
    enabled: false,
    secret: '',
    backup_hashes: [],
    enabled_at: null,
  };
  await user.save();

  res.json({ success: true, message: 'Two-factor authentication disabled' });
}
