import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth.middleware';
import { Notification } from '../models/Notification.model';
import { User } from '../models/User.model';
import { Request, Response } from 'express';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const notifications = await Notification.find({ user_email: req.user!.email })
    .sort({ created_at: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: notifications });
}));

router.put('/read-all', asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ user_email: req.user!.email, read: false }, { read: true });
  res.json({ success: true });
}));

router.post('/subscribe', asyncHandler(async (req: Request, res: Response) => {
  const { subscription } = req.body as { subscription: object };
  if (!subscription) { res.status(400).json({ success: false, message: 'No subscription' }); return; }

  await User.updateOne(
    { email: req.user!.email },
    { $addToSet: { push_subscriptions: subscription } }
  );
  res.json({ success: true });
}));

export default router;
