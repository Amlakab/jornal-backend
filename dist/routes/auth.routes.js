"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_js_1 = require("../models/User.js");
const token_js_1 = require("../utils/token.js");
const auth_js_1 = require("../middleware/auth.js");
const authValidator_js_1 = require("../validators/authValidator.js");
const router = (0, express_1.Router)();
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const parseResult = authValidator_js_1.loginSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
            return;
        }
        const { email, password } = parseResult.data;
        const user = await User_js_1.User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact an administrator.' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
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
        const accessToken = (0, token_js_1.generateAccessToken)(payload);
        const refreshToken = (0, token_js_1.generateRefreshToken)(payload);
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
});
// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const parseResult = authValidator_js_1.refreshSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ success: false, message: 'Refresh token is required' });
            return;
        }
        const { refreshToken } = parseResult.data;
        const decoded = (0, token_js_1.verifyRefreshToken)(refreshToken);
        const user = await User_js_1.User.findById(decoded.userId);
        if (!user || !user.isActive) {
            res.status(401).json({ success: false, message: 'User inactive or not found' });
            return;
        }
        const payload = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        };
        const newAccessToken = (0, token_js_1.generateAccessToken)(payload);
        const newRefreshToken = (0, token_js_1.generateRefreshToken)(payload);
        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Invalid refresh token', error: error.message });
    }
});
// POST /api/auth/logout
router.post('/logout', (_req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});
// GET /api/auth/me
router.get('/me', auth_js_1.requireAuth, (req, res) => {
    res.json({ success: true, data: req.user });
});
exports.default = router;
