import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  adminAddDomain,
  adminCreateAlias,
  adminCreateDkim,
  adminCreateUser,
  adminDashboard,
  adminDeleteAlias,
  adminDeleteDkim,
  adminDeleteUser,
  adminGetDkim,
  adminListAliases,
  adminListDkim,
  adminListDomains,
  adminListUsers,
  adminResetPassword,
  adminSetPassword,
  adminSetRole,
  adminUpdateUser,
} from '../controllers/admin.controller';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', asyncHandler(adminDashboard));

router.get('/users', asyncHandler(adminListUsers));
router.post('/users', asyncHandler(adminCreateUser));
router.put('/users/role', asyncHandler(adminSetRole));
router.put('/users/:id', asyncHandler(adminUpdateUser));
router.delete('/users/:id', asyncHandler(adminDeleteUser));
router.put('/users/:id/password', asyncHandler(adminSetPassword));
router.post('/users/:id/password/reset', asyncHandler(adminResetPassword));

router.get('/domains', asyncHandler(adminListDomains));
router.post('/domains', asyncHandler(adminAddDomain));
router.delete('/domains/:id', asyncHandler(adminDeleteDkim));

router.get('/dkim', asyncHandler(adminListDkim));
router.post('/dkim', asyncHandler(adminCreateDkim));
router.get('/dkim/:id', asyncHandler(adminGetDkim));
router.delete('/dkim/:id', asyncHandler(adminDeleteDkim));

router.get('/aliases', asyncHandler(adminListAliases));
router.post('/aliases', asyncHandler(adminCreateAlias));
router.delete('/aliases/:id', asyncHandler(adminDeleteAlias));

export default router;
