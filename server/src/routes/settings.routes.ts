import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { isAdminUser } from '../utils/admin';
import { z } from 'zod';
import { comparePassword, hashPassword } from '../utils/password';
import {
  listSessionsHandler,
  revokeAllSessionsHandler,
  revokeOtherSessionsHandler,
  revokeSessionHandler,
} from '../controllers/session.controller';
import {
  disableTwoFactor,
  enableTwoFactor,
  setupTwoFactor,
} from '../controllers/two-factor.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId).select('preferences name email avatar_color').lean();
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({ success: true, data: user });
}));

const PrefsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_color: z.string().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    accent: z.enum(['teal', 'indigo', 'blue', 'green', 'rose', 'orange']).optional(),
    density: z.enum(['comfortable', 'compact']).optional(),
    emails_per_page: z.number().min(10).max(100).optional(),
    signature: z.string().optional(),
    reply_position: z.enum(['top', 'bottom']).optional(),
    send_shortcut: z.boolean().optional(),
  }).optional(),
});

router.put('/', asyncHandler(async (req: Request, res: Response) => {
  const data = PrefsSchema.parse(req.body);
  const update: Record<string, unknown> = {};

  if (data.name) update.name = data.name;
  if (data.avatar_color) update.avatar_color = data.avatar_color;
  if (data.preferences) {
    for (const [key, value] of Object.entries(data.preferences)) {
      if (value !== undefined) update[`preferences.${key}`] = value;
    }
  }

  const user = await User.findByIdAndUpdate(req.user!.userId, update, { new: true }).select('-password').lean();
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({
    success: true,
    data: {
      ...user,
      role: user.role || 'user',
      is_admin: isAdminUser(user),
    },
  });
}));

router.put('/password', asyncHandler(async (req: Request, res: Response) => {
  const { current_password, new_password } = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
  }).parse(req.body);

  const user = await User.findById(req.user!.userId);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

  const valid = await comparePassword(current_password, user.password);
  if (!valid) { res.status(401).json({ success: false, message: 'Current password incorrect' }); return; }

  user.password = await hashPassword(new_password);
  await user.save();
  res.json({ success: true, message: 'Password updated' });
}));

router.get('/sessions', asyncHandler(listSessionsHandler));
router.delete('/sessions', asyncHandler(revokeOtherSessionsHandler));
router.delete('/sessions/all', asyncHandler(revokeAllSessionsHandler));
router.delete('/sessions/:id', asyncHandler(revokeSessionHandler));

router.post('/2fa/setup', asyncHandler(setupTwoFactor));
router.post('/2fa/enable', asyncHandler(enableTwoFactor));
router.post('/2fa/disable', asyncHandler(disableTwoFactor));

export default router;
