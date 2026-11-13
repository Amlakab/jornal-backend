import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Trade } from '../models/Trade.js';
import { DropdownOption } from '../models/DropdownOption.js';
import { FilterPreset } from '../models/FilterPreset.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { createUserSchema, updateUserSchema } from '../validators/userValidator.js';
import { computeKPIsFromTrades, getEquityCurve, getBreakdown } from '../services/analyticsService.js';

const router = Router();

router.use(requireAuth, requireAdmin);

// GET /api/admin/users
router.get('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, role, page = '1', limit = '50' } = req.query;
    const query: Record<string, any> = {};

    if (role && (role === 'admin' || role === 'trader')) {
      query.role = role;
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email'),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
});

// POST /api/admin/users
router.post('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { name, email, password, role } = parseResult.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ success: false, message: 'A user with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'trader',
      createdBy: req.user?._id,
      isActive: true,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const { name, email, password, role, isActive } = parseResult.data;

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    // Prevent deleting oneself
    if (req.user?._id.toString() === id) {
      res.status(400).json({ success: false, message: 'Cannot delete your own admin account' });
      return;
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Cascade delete user data
    await Promise.all([
      Trade.deleteMany({ userId: id }),
      DropdownOption.deleteMany({ userId: id }),
      FilterPreset.deleteMany({ userId: id }),
    ]);

    res.json({ success: true, message: 'User and all associated data deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
});

// GET /api/admin/users/:id/journal (Read-only view of trader's data)
router.get('/users/:id/journal', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid user ID' });
      return;
    }

    const targetUser = await User.findById(id).select('-passwordHash');
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Trader not found' });
      return;
    }

    const trades = await Trade.find({ userId: id }).sort({ date: -1 });
    const kpis = computeKPIsFromTrades(trades);

    res.json({
      success: true,
      data: {
        trader: targetUser,
        trades,
        kpis,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch trader journal', error: error.message });
  }
});

// GET /api/admin/analytics (System-wide KPIs + charts across all traders)
router.get('/analytics', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [allTrades, totalTraders, activeTraders] = await Promise.all([
      Trade.find().sort({ date: 1 }),
      User.countDocuments({ role: 'trader' }),
      User.countDocuments({ role: 'trader', isActive: true }),
    ]);

    const systemKpis = computeKPIsFromTrades(allTrades);
    const equityCurve = getEquityCurve(allTrades);
    const sessionBreakdown = getBreakdown(allTrades, 'session');
    const pairBreakdown = getBreakdown(allTrades, 'pair');

    res.json({
      success: true,
      data: {
        overview: {
          totalTraders,
          activeTraders,
          totalTradesLogged: allTrades.length,
          systemNetPnl: systemKpis.netPnl,
          systemWinRate: systemKpis.winRate,
        },
        kpis: systemKpis,
        equityCurve,
        sessionBreakdown,
        pairBreakdown,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin analytics', error: error.message });
  }
});

export default router;
