"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTradeSchema = exports.createTradeSchema = void 0;
const zod_1 = require("zod");
const hybridNumberSchema = zod_1.z.object({
    value: zod_1.z.number(),
    isManual: zod_1.z.boolean(),
}).optional();
const hybridStringSchema = zod_1.z.object({
    value: zod_1.z.string(),
    isManual: zod_1.z.boolean(),
}).optional();
exports.createTradeSchema = zod_1.z.object({
    date: zod_1.z.string().or(zod_1.z.date()).optional(),
    entryTime: zod_1.z.string().or(zod_1.z.date()).optional(),
    closedTime: zod_1.z.string().or(zod_1.z.date()).nullable().optional(),
    exitTime: zod_1.z.string().or(zod_1.z.date()).nullable().optional(),
    // Section A
    pair: zod_1.z.string().min(1, 'Pair is required'),
    session: zod_1.z.string().min(1, 'Session is required'),
    direction: zod_1.z.string().min(1, 'Direction is required'),
    entryTF: zod_1.z.string().min(1, 'Entry timeframe is required'),
    analysisTF: zod_1.z.array(zod_1.z.string()).default([]),
    strategyType: zod_1.z.string().optional().default('Price Action'),
    setupType: zod_1.z.string().optional().default('A'),
    accountBalance: zod_1.z.number().optional().default(10000),
    entry: zod_1.z.number({ required_error: 'Entry price is required' }),
    sl: zod_1.z.number({ required_error: 'Stop loss is required' }),
    tp: zod_1.z.number({ required_error: 'Take profit is required' }),
    lot: zod_1.z.number().default(1),
    status: zod_1.z.string().optional().default('Closed'),
    // Hybrid fields
    risk: hybridNumberSchema,
    riskPercent: hybridNumberSchema,
    reward: hybridNumberSchema,
    rewardPercent: hybridNumberSchema,
    rr: hybridNumberSchema,
    pnl: hybridNumberSchema,
    pnlPercent: hybridNumberSchema,
    pnlPips: hybridNumberSchema,
    duration: hybridNumberSchema,
    sessionAuto: hybridStringSchema,
    confirmationScore: hybridNumberSchema,
    statusAuto: hybridStringSchema,
    // Section B
    marketStructure: zod_1.z.string().optional().default(''),
    htfDirection: zod_1.z.string().optional().default(''),
    srZone: zod_1.z.string().optional().default(''),
    entryLocation: zod_1.z.string().optional().default(''),
    liquidityTaken: zod_1.z.string().optional().default(''),
    volumeCondition: zod_1.z.string().optional().default(''),
    biasNotes: zod_1.z.string().optional().default(''),
    // Section C
    confirmations: zod_1.z.array(zod_1.z.string()).optional().default([]),
    followedStrategy: zod_1.z.string().optional().default(''),
    // Section D
    result: zod_1.z.string().optional().default('Win'),
    executionQuality: zod_1.z.string().optional().default(''),
    exitReason: zod_1.z.string().optional().default(''),
    exitPrice: zod_1.z.number().nullable().optional(),
    // Section E
    psychology: zod_1.z.object({
        patient: zod_1.z.string().optional().default(''),
        followedPlan: zod_1.z.string().optional().default(''),
        fomo: zod_1.z.string().optional().default(''),
        movedSL: zod_1.z.string().optional().default(''),
        revenge: zod_1.z.string().optional().default(''),
        emotion: zod_1.z.string().optional().default(''),
        rating: zod_1.z.number().min(1).max(5).optional().default(3),
    }).optional().default({}),
    lesson: zod_1.z.string().optional().default(''),
    // Section F
    screenshots: zod_1.z.object({
        before: zod_1.z.string().optional(),
        atEntry: zod_1.z.string().optional(),
        after: zod_1.z.string().optional(),
        extras: zod_1.z.array(zod_1.z.string()).optional().default([]),
    }).optional().default({}),
    notes: zod_1.z.string().optional().default(''),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
    // Summary
    tradeSummary: zod_1.z.object({
        text: zod_1.z.string(),
        isManual: zod_1.z.boolean(),
    }).optional(),
});
exports.updateTradeSchema = exports.createTradeSchema.partial();
