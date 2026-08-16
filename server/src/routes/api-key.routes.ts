import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createApiKeyHandler,
  listApiKeysHandler,
  revokeApiKeyHandler,
} from '../controllers/api-key.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(listApiKeysHandler));
router.post('/', asyncHandler(createApiKeyHandler));
router.delete('/:id', asyncHandler(revokeApiKeyHandler));

export default router;
