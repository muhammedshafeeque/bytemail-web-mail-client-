import { Router } from 'express';
import { listContacts, searchContacts } from '../controllers/contact.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(authMiddleware);
router.get('/', asyncHandler(listContacts));
router.get('/search', asyncHandler(searchContacts));

export default router;
