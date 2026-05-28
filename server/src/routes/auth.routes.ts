import { Router } from 'express';
import { login, logout, refresh, getMe, register } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { loginRateLimit } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', loginRateLimit, asyncHandler(login));
router.post('/register', loginRateLimit, asyncHandler(register));
router.post('/logout', authMiddleware, asyncHandler(logout));
router.post('/refresh', asyncHandler(refresh));
router.get('/me', authMiddleware, asyncHandler(getMe));

export default router;
