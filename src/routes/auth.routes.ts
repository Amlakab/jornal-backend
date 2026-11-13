import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { loginSchema, refreshSchema } from '../validators/authValidator.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parseResult.data;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact an administrator.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    user.lastLogin = new Date();
    await user.save();

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, message: 'Refresh token is required' });
      return;
    }

    const { refreshToken } = parseResult.data;
    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User inactive or not found' });
      return;
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: 'Invalid refresh token', error: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, data: req.user });
});

export default router;
