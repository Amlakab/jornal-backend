"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const trade_routes_js_1 = __importDefault(require("./routes/trade.routes.js"));
const admin_routes_js_1 = __importDefault(require("./routes/admin.routes.js"));
const analytics_routes_js_1 = __importDefault(require("./routes/analytics.routes.js"));
const option_routes_js_1 = __importDefault(require("./routes/option.routes.js"));
const preset_routes_js_1 = __importDefault(require("./routes/preset.routes.js"));
const createApp = () => {
    const app = (0, express_1.default)();
    // Security Headers
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    // CORS
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, server-to-server) or matching origins
            if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === clientUrl) {
                callback(null, true);
            }
            else {
                callback(null, true); // Permissive for local development convenience
            }
        },
        credentials: true,
    }));
    // Body Parsing
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Static files for uploaded screenshots
    const uploadDir = path_1.default.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    app.use('/uploads', express_1.default.static(uploadDir));
    // Rate Limiter for Auth Routes
    const authLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: 'Too many auth requests from this IP, please try again after 15 minutes' },
    });
    // Health check endpoint
    app.get('/api/health', (_req, res) => {
        res.json({
            status: 'ok',
            service: 'Trading Journal API',
            timestamp: new Date().toISOString(),
        });
    });
    // Mount API Routes
    app.use('/api/auth', authLimiter, auth_routes_js_1.default);
    app.use('/api/trades', trade_routes_js_1.default);
    app.use('/api/admin', admin_routes_js_1.default);
    app.use('/api/analytics', analytics_routes_js_1.default);
    app.use('/api/options', option_routes_js_1.default);
    app.use('/api/presets', preset_routes_js_1.default);
    // 404 Handler
    app.use((_req, res) => {
        res.status(404).json({ success: false, message: 'Resource not found' });
    });
    // Global Error Handler
    app.use((err, _req, res, _next) => {
        console.error('Unhandled Server Error:', err);
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error',
            error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        });
    });
    return app;
};
exports.createApp = createApp;
