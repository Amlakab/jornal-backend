"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trade = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const HybridNumberSchema = new mongoose_1.Schema({
    value: { type: Number, default: 0 },
    isManual: { type: Boolean, default: false },
}, { _id: false });
const HybridStringSchema = new mongoose_1.Schema({
    value: { type: String, default: '' },
    isManual: { type: Boolean, default: false },
}, { _id: false });
const TradeSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    tradeNumber: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    entryTime: {
        type: Date,
        required: true,
        default: Date.now,
    },
    closedTime: {
        type: Date,
    },
    exitTime: {
        type: Date,
    },
    // Section A - Basic & Strategy
    pair: { type: String, required: true, trim: true },
    session: { type: String, required: true, trim: true },
    direction: { type: String, required: true, trim: true }, // Buy / Sell
    entryTF: { type: String, required: true, trim: true },
    analysisTF: { type: [String], default: [] },
    strategyType: { type: String, default: 'Price Action', trim: true },
    setupType: { type: String, default: 'A', trim: true },
    accountBalance: { type: Number, default: 10000 },
    entry: { type: Number, required: true },
    sl: { type: Number, required: true },
    tp: { type: Number, required: true },
    lot: { type: Number, required: true, default: 1 },
    status: { type: String, default: 'Closed' },
    // Hybrid auto fields
    risk: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    riskPercent: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    reward: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    rewardPercent: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    rr: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    pnl: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    pnlPercent: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    pnlPips: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    duration: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    sessionAuto: { type: HybridStringSchema, default: () => ({ value: '', isManual: false }) },
    confirmationScore: { type: HybridNumberSchema, default: () => ({ value: 0, isManual: false }) },
    statusAuto: { type: HybridStringSchema, default: () => ({ value: 'Closed', isManual: false }) },
    // Section B - Market analysis
    marketStructure: { type: String, default: '' },
    htfDirection: { type: String, default: '' },
    srZone: { type: String, default: '' },
    entryLocation: { type: String, default: '' },
    liquidityTaken: { type: String, default: '' },
    volumeCondition: { type: String, default: '' },
    biasNotes: { type: String, default: '' },
    // Section C - Entry confirmation
    confirmations: { type: [String], default: [] },
    followedStrategy: { type: String, default: '' },
    // Section D - Results
    result: { type: String, default: 'Win' },
    executionQuality: { type: String, default: '' },
    exitReason: { type: String, default: '' },
    exitPrice: { type: Number },
    // Section E - Psychology
    psychology: {
        patient: { type: String, default: '' },
        followedPlan: { type: String, default: '' },
        fomo: { type: String, default: '' },
        movedSL: { type: String, default: '' },
        revenge: { type: String, default: '' },
        emotion: { type: String, default: '' },
        rating: { type: Number, default: 3, min: 1, max: 5 },
    },
    lesson: { type: String, default: '' },
    // Section F - Media & notes
    screenshots: {
        before: { type: String },
        atEntry: { type: String },
        after: { type: String },
        extras: { type: [String], default: [] },
    },
    notes: { type: String, default: '' },
    tags: { type: [String], default: [] },
    // Auto summary
    tradeSummary: {
        text: { type: String, default: '' },
        isManual: { type: Boolean, default: false },
    },
}, {
    timestamps: true,
});
// Indexes
TradeSchema.index({ userId: 1, tradeNumber: 1 }, { unique: true });
TradeSchema.index({ userId: 1, date: -1 });
TradeSchema.index({ userId: 1, pair: 1 });
TradeSchema.index({ userId: 1, result: 1 });
TradeSchema.index({ userId: 1, strategyType: 1 });
TradeSchema.index({ userId: 1, setupType: 1 });
exports.Trade = mongoose_1.default.model('Trade', TradeSchema);
