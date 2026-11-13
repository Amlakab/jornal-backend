import { z } from 'zod';

const hybridNumberSchema = z.object({
  value: z.number(),
  isManual: z.boolean(),
}).optional();

const hybridStringSchema = z.object({
  value: z.string(),
  isManual: z.boolean(),
}).optional();

export const createTradeSchema = z.object({
  date: z.string().or(z.date()).optional(),
  entryTime: z.string().or(z.date()).optional(),
  closedTime: z.string().or(z.date()).nullable().optional(),
  exitTime: z.string().or(z.date()).nullable().optional(),

  // Section A
  pair: z.string().min(1, 'Pair is required'),
  session: z.string().min(1, 'Session is required'),
  direction: z.string().min(1, 'Direction is required'),
  entryTF: z.string().min(1, 'Entry timeframe is required'),
  analysisTF: z.array(z.string()).default([]),
  strategyType: z.string().optional().default('Price Action'),
  setupType: z.string().optional().default('A'),
  accountBalance: z.number().optional().default(10000),
  entry: z.number({ required_error: 'Entry price is required' }),
  sl: z.number({ required_error: 'Stop loss is required' }),
  tp: z.number({ required_error: 'Take profit is required' }),
  lot: z.number().default(1),
  status: z.string().optional().default('Closed'),

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
  marketStructure: z.string().optional().default(''),
  htfDirection: z.string().optional().default(''),
  srZone: z.string().optional().default(''),
  entryLocation: z.string().optional().default(''),
  liquidityTaken: z.string().optional().default(''),
  volumeCondition: z.string().optional().default(''),
  biasNotes: z.string().optional().default(''),

  // Section C
  confirmations: z.array(z.string()).optional().default([]),
  followedStrategy: z.string().optional().default(''),

  // Section D
  result: z.string().optional().default('Win'),
  executionQuality: z.string().optional().default(''),
  exitReason: z.string().optional().default(''),
  exitPrice: z.number().nullable().optional(),

  // Section E
  psychology: z.object({
    patient: z.string().optional().default(''),
    followedPlan: z.string().optional().default(''),
    fomo: z.string().optional().default(''),
    movedSL: z.string().optional().default(''),
    revenge: z.string().optional().default(''),
    emotion: z.string().optional().default(''),
    rating: z.number().min(1).max(5).optional().default(3),
  }).optional().default({}),
  lesson: z.string().optional().default(''),

  // Section F
  screenshots: z.object({
    before: z.string().optional(),
    atEntry: z.string().optional(),
    after: z.string().optional(),
    extras: z.array(z.string()).optional().default([]),
  }).optional().default({}),
  notes: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),

  // Summary
  tradeSummary: z.object({
    text: z.string(),
    isManual: z.boolean(),
  }).optional(),
});

export const updateTradeSchema = createTradeSchema.partial();
