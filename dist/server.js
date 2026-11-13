"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_js_1 = require("./app.js");
const db_js_1 = require("./config/db.js");
const seed_js_1 = require("./seed.js");
const User_js_1 = require("./models/User.js");
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        await (0, db_js_1.connectDB)();
        // Check if system has admin, if not auto-seed
        const adminCount = await User_js_1.User.countDocuments({ role: 'admin' });
        if (adminCount === 0) {
            console.log('No administrator detected. Running initial system seeder...');
            await (0, seed_js_1.seedDatabase)();
        }
        const app = (0, app_js_1.createApp)();
        const server = app.listen(PORT, () => {
            console.log(`====================================================`);
            console.log(`🚀 Trading Journal Backend running on port ${PORT}`);
            console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`====================================================`);
        });
        // Graceful Shutdown
        const shutdown = () => {
            console.log('Received kill signal, shutting down gracefully...');
            server.close(() => {
                console.log('Closed out remaining connections');
                process.exit(0);
            });
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
