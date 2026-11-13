"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scopeUser = exports.requireTrader = exports.requireAdmin = exports.requireAuth = void 0;
const mongoose_1 = require("mongoose");
const token_js_1 = require("../utils/token.js");
const User_js_1 = require("../models/User.js");
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, message: 'Authentication token required' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, token_js_1.verifyAccessToken)(token);
        const user = await User_js_1.User.findById(decoded.userId).select('-passwordHash');
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
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token', error: error.message });
    }
};
exports.requireAuth = requireAuth;
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireTrader = (req, res, next) => {
    if (!req.user || req.user.role !== 'trader') {
        res.status(403).json({ success: false, message: 'Forbidden: Trader access required' });
        return;
    }
    next();
};
exports.requireTrader = requireTrader;
/**
 * Middleware: scopeUser
 * Ensures that traders can ONLY query and mutate their own documents.
 * Never trusts client-supplied userId for traders.
 * Admins can scope to a target trader when requested, or see system-wide when unscoped.
 */
const scopeUser = (req, res, next) => {
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
    }
    else if (req.user.role === 'admin') {
        // Admin can specify a target userId via param, query, or body
        const targetId = req.params.userId || req.params.id || req.query.userId || req.body.userId;
        if (targetId && mongoose_1.Types.ObjectId.isValid(targetId)) {
            req.scopedUserId = new mongoose_1.Types.ObjectId(targetId);
        }
        else {
            req.scopedUserId = undefined; // System-wide
        }
    }
    next();
};
exports.scopeUser = scopeUser;
