import { Router } from 'express';
import {
  listEmails,
  getEmail,
  sendEmailHandler,
  markRead,
  starEmail,
  moveEmailHandler,
  deleteEmailHandler,
  searchEmailsHandler,
  syncFolderHandler,
} from '../controllers/email.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { sendRateLimit } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(listEmails));
router.get('/search', asyncHandler(searchEmailsHandler));
router.post('/sync', asyncHandler(syncFolderHandler));
router.get('/:uid', asyncHandler(getEmail));
router.post('/send', sendRateLimit, asyncHandler(sendEmailHandler));
router.put('/:uid/read', asyncHandler(markRead));
router.put('/:uid/star', asyncHandler(starEmail));
router.put('/:uid/move', asyncHandler(moveEmailHandler));
router.delete('/:uid', asyncHandler(deleteEmailHandler));

export default router;
