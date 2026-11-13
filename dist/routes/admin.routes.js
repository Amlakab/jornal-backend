"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = require("mongoose");
const User_js_1 = require("../models/User.js");
const Trade_js_1 = require("../models/Trade.js");
const DropdownOption_js_1 = require("../models/DropdownOption.js");
const FilterPreset_js_1 = require("../models/FilterPreset.js");
const auth_js_1 = require("../middleware/auth.js");
const userValidator_js_1 = require("../validators/userValidator.js");
const analyticsService_js_1 = require("../services/analyticsService.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth, auth_js_1.requireAdmin);
// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const { search, role, page = '1', limit = '50' } = req.query;
        const query = {};
        if (role && (role === 'admin' || role === 'trader')) {
            query.role = role;
        }
        if (search && typeof search === 'string') {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.max(1, parseInt(limit, 10));
        const skip = (pageNum - 1) * limitNum;
        const [users, total] = await Promise.all([
            User_js_1.User.find(query)
                .select('-passwordHash')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('createdBy', 'name email'),
            User_js_1.User.countDocuments(query),
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
});
// POST /api/admin/users
router.post('/users', async (req, res) => {
    try {
        const parseResult = userValidator_js_1.createUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
            return;
        }
        const { name, email, password, role } = parseResult.data;
        const existing = await User_js_1.User.findOne({ email: email.toLowerCase() });
        if (existing) {
            res.status(400).json({ success: false, message: 'A user with this email already exists' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const user = new User_js_1.User({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
    }
});
// PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid user ID' });
            return;
        }
        const parseResult = userValidator_js_1.updateUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
            return;
        }
        const user = await User_js_1.User.findById(id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const { name, email, password, role, isActive } = parseResult.data;
        if (name)
            user.name = name;
        if (email)
            user.email = email.toLowerCase();
        if (role)
            user.role = role;
        if (isActive !== undefined)
            user.isActive = isActive;
        if (password) {
            const salt = await bcryptjs_1.default.genSalt(10);
            user.passwordHash = await bcryptjs_1.default.hash(password, salt);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
    }
});
// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid user ID' });
            return;
        }
        // Prevent deleting oneself
        if (req.user?._id.toString() === id) {
            res.status(400).json({ success: false, message: 'Cannot delete your own admin account' });
            return;
        }
        const user = await User_js_1.User.findByIdAndDelete(id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        // Cascade delete user data
        await Promise.all([
            Trade_js_1.Trade.deleteMany({ userId: id }),
            DropdownOption_js_1.DropdownOption.deleteMany({ userId: id }),
            FilterPreset_js_1.FilterPreset.deleteMany({ userId: id }),
        ]);
        res.json({ success: true, message: 'User and all associated data deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
    }
});
// GET /api/admin/users/:id/journal (Read-only view of trader's data)
router.get('/users/:id/journal', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid user ID' });
            return;
        }
        const targetUser = await User_js_1.User.findById(id).select('-passwordHash');
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'Trader not found' });
            return;
        }
        const trades = await Trade_js_1.Trade.find({ userId: id }).sort({ date: -1 });
        const kpis = (0, analyticsService_js_1.computeKPIsFromTrades)(trades);
        res.json({
            success: true,
            data: {
                trader: targetUser,
                trades,
                kpis,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch trader journal', error: error.message });
    }
});
// GET /api/admin/analytics (System-wide KPIs + charts across all traders)
router.get('/analytics', async (_req, res) => {
    try {
        const [allTrades, totalTraders, activeTraders] = await Promise.all([
            Trade_js_1.Trade.find().sort({ date: 1 }),
            User_js_1.User.countDocuments({ role: 'trader' }),
            User_js_1.User.countDocuments({ role: 'trader', isActive: true }),
        ]);
        const systemKpis = (0, analyticsService_js_1.computeKPIsFromTrades)(allTrades);
        const equityCurve = (0, analyticsService_js_1.getEquityCurve)(allTrades);
        const sessionBreakdown = (0, analyticsService_js_1.getBreakdown)(allTrades, 'session');
        const pairBreakdown = (0, analyticsService_js_1.getBreakdown)(allTrades, 'pair');
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch admin analytics', error: error.message });
    }
});
exports.default = router;
