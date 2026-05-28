import { Router } from 'express';
import { listFolders, getUnread } from '../controllers/folder.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);
router.get('/', asyncHandler(listFolders));
router.get('/unread', asyncHandler(getUnread));

export default router;
