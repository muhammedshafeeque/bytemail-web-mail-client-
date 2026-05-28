import { Router } from 'express';
import { downloadAttachment } from '../controllers/attachment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);
router.get('/:uid/:index', asyncHandler(downloadAttachment));

export default router;
