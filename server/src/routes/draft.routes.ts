import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/auth.middleware';
import { Draft } from '../models/Draft.model';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const DraftSchema = z.object({
  to: z.array(z.string()).optional().default([]),
  cc: z.array(z.string()).optional().default([]),
  bcc: z.array(z.string()).optional().default([]),
  subject: z.string().optional().default(''),
  body_html: z.string().optional().default(''),
  body_text: z.string().optional().default(''),
});

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const drafts = await Draft.find({ user_email: req.user!.email }).sort({ updated_at: -1 }).lean();
  res.json({ success: true, data: drafts });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const data = DraftSchema.parse(req.body);
  const draft = await Draft.create({ ...data, user_email: req.user!.email });
  res.status(201).json({ success: true, data: draft });
}));

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const data = DraftSchema.partial().parse(req.body);
  const draft = await Draft.findOneAndUpdate(
    { _id: req.params.id, user_email: req.user!.email },
    { ...data, updated_at: new Date() },
    { new: true }
  );
  if (!draft) { res.status(404).json({ success: false, message: 'Draft not found' }); return; }
  res.json({ success: true, data: draft });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await Draft.findOneAndDelete({ _id: req.params.id, user_email: req.user!.email });
  res.json({ success: true });
}));

export default router;
