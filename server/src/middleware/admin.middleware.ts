import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.model';
import { isAdminUser } from '../utils/admin';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const user = await User.findById(req.user.userId).select('email role').lean();
    if (!user || !isAdminUser(user)) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
}
