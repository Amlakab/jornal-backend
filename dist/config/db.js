"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let memServer = null;
const connectDB = async () => {
    if (mongoose_1.default.connection.readyState >= 1) {
        return mongoose_1.default;
    }
    const uri = process.env.MONGODB_URI || 'mongodb+srv://amlakieab23_db_user:Amlakie1221@cluster0.zrulha2.mongodb.net/traders_jornal?retryWrites=true&w=majority&appName=Cluster0';
    try {
        // Try connecting to provided URI with a 2-second timeout
        await mongoose_1.default.connect(uri, {
            serverSelectionTimeoutMS: 2000,
        });
        console.log(`Connected to MongoDB at ${uri}`);
        return mongoose_1.default;
    }
    catch (err) {
        console.warn(`Standard MongoDB connection to ${uri} failed: ${err.message}. Initializing MongoMemoryServer fallback...`);
        try {
            const { MongoMemoryServer } = await import('mongodb-memory-server');
            memServer = await MongoMemoryServer.create();
            const memUri = memServer.getUri();
            await mongoose_1.default.connect(memUri);
            console.log(`Connected to In-Memory MongoDB at ${memUri}`);
            return mongoose_1.default;
        }
        catch (fallbackErr) {
            console.error('Fatal: Could not connect to MongoDB or in-memory server:', fallbackErr.message);
            throw fallbackErr;
        }
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    await mongoose_1.default.disconnect();
    if (memServer) {
        await memServer.stop();
    }
};
exports.disconnectDB = disconnectDB;
