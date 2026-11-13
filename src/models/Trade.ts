import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IHybridNumber {
  value: number;
  isManual: boolean;
}

export interface IHybridString {
  value: string;
  isManual: boolean;
}

export interface ITradePsychology {
  patient: string;
  followedPlan: string;
  fomo: string;
  movedSL: string;
  revenge: string;
  emotion: string;
  rating: number;
}

export interface ITradeScreenshots {
  before?: string;
  atEntry?: string;
  after?: string;
  extras: string[];
}

export interface ITrade extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tradeNumber: number;
  date: Date;
  entryTime: Date;
  closedTime?: Date;
  exitTime?: Date; // backwards-compatible alias

  // Section A - Basic & Strategy
  pair: string;
  session: string;
  direction: string;
  entryTF: string;
  analysisTF: string[];
  strategyType: string; // ICT, SMC, Price Action, News, etc.
  setupType: string;    // A+, A, B+, B, C
  accountBalance: number;
  entry: number;
  sl: number;
  tp: number;
  lot: number;
  status?: string;

  // Hybrid auto fields
  risk: IHybridNumber;
  riskPercent: IHybridNumber;
  reward: IHybridNumber;
  rewardPercent: IHybridNumber;
  rr: IHybridNumber;
  pnl: IHybridNumber;
  pnlPercent: IHybridNumber;
  pnlPips: IHybridNumber;
  duration: IHybridNumber;
  sessionAuto: IHybridString;
  confirmationScore: IHybridNumber;
  statusAuto?: IHybridString;

  // Section B - Market analysis
  marketStructure: string;
  htfDirection: string;
  srZone: string;
  entryLocation: string;
  liquidityTaken: string;
  volumeCondition: string;
  biasNotes?: string;

  // Section C - Entry confirmation
  confirmations: string[];
  followedStrategy: string;

  // Section D - Results
  result: string;
  executionQuality: string;
  exitReason: string;
  exitPrice?: number;

  // Section E - Psychology
  psychology: ITradePsychology;
  lesson?: string;

  // Section F - Media & notes
  screenshots: ITradeScreenshots;
  notes?: string;
  tags: string[];

  // Auto summary
  tradeSummary: { text: string; isManual: boolean };

  createdAt: Date;
  updatedAt: Date;
}

const HybridNumberSchema = new Schema<IHybridNumber>(
  {
    value: { type: Number, default: 0 },
    isManual: { type: Boolean, default: false },
  },
  { _id: false }
);

const HybridStringSchema = new Schema<IHybridString>(
  {
    value: { type: String, default: '' },
    isManual: { type: Boolean, default: false },
  },
  { _id: false }
);

const TradeSchema = new Schema<ITrade>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
  }
);

// Indexes
TradeSchema.index({ userId: 1, tradeNumber: 1 }, { unique: true });
TradeSchema.index({ userId: 1, date: -1 });
TradeSchema.index({ userId: 1, pair: 1 });
TradeSchema.index({ userId: 1, result: 1 });
TradeSchema.index({ userId: 1, strategyType: 1 });
TradeSchema.index({ userId: 1, setupType: 1 });

export const Trade = mongoose.model<ITrade>('Trade', TradeSchema);
