import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken } from '../utils/token.js';
import { User, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  scopedUserId?: Types.ObjectId;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account is deactivated' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired token', error: error.message });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    return;
  }
  next();
};

export const requireTrader = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'trader') {
    res.status(403).json({ success: false, message: 'Forbidden: Trader access required' });
    return;
  }
  next();
};

/**
 * Middleware: scopeUser
 * Ensures that traders can ONLY query and mutate their own documents.
 * Never trusts client-supplied userId for traders.
 * Admins can scope to a target trader when requested, or see system-wide when unscoped.
 */
export const scopeUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required for user scoping' });
    return;
  }

  if (req.user.role === 'trader') {
    // Force scopedUserId to the authenticated user's ID
    req.scopedUserId = req.user._id;
    // Strip client-supplied userIds to prevent tampering
    if (req.body && req.body.userId) {
      req.body.userId = req.user._id;
    }
    if (req.query && req.query.userId) {
      req.query.userId = req.user._id.toString();
    }
  } else if (req.user.role === 'admin') {
    // Admin can specify a target userId via param, query, or body
    const targetId = req.params.userId || req.params.id || req.query.userId || req.body.userId;
    if (targetId && Types.ObjectId.isValid(targetId as string)) {
      req.scopedUserId = new Types.ObjectId(targetId as string);
    } else {
      req.scopedUserId = undefined; // System-wide
    }
  }

  next();
};
