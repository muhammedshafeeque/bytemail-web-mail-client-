import { Router } from 'express';
import { apiKeyMiddleware } from '../middleware/apiKey.middleware';
import { sendRateLimit } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { sendIntegrationEmail } from '../controllers/integration.controller';

const router = Router();

router.use(asyncHandler(apiKeyMiddleware));

router.post('/mail/send', sendRateLimit, asyncHandler(sendIntegrationEmail));

export default router;
