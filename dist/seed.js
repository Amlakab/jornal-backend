"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = exports.SYSTEM_OPTIONS = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_js_1 = require("./config/db.js");
const User_js_1 = require("./models/User.js");
const DropdownOption_js_1 = require("./models/DropdownOption.js");
const Trade_js_1 = require("./models/Trade.js");
const calcService_js_1 = require("./services/calcService.js");
const summaryService_js_1 = require("./services/summaryService.js");
exports.SYSTEM_OPTIONS = {
    strategyType: ['ICT', 'SMC', 'Price Action', 'News Trading', 'Wyckoff', 'Order Flow', 'Trend Following', 'Breakout'],
    setupType: ['A+', 'A', 'B+', 'B', 'C'],
    pair: ['EUR/USD', 'GBP/USD', 'XAU/USD', 'USD/JPY', 'AUD/USD', 'US30', 'BTC/USD'],
    session: ['London', 'New York', 'Asian', 'Overlap'],
    direction: ['Buy', 'Sell'],
    entryTF: ['1M', '5M', '15M', '1H', '4H'],
    analysisTF: ['15M', '1H', '4H', 'Daily', 'Weekly'],
    marketStructure: ['Uptrend', 'Downtrend', 'Ranging'],
    htfDirection: ['Bullish', 'Bearish', 'Neutral'],
    entryLocation: ['At Support', 'At Resistance', 'Breakout', 'Retest'],
    liquidityTaken: ['Yes', 'No'],
    volumeCondition: ['High', 'Low', 'Increasing', 'Decreasing'],
    confirmations: [
        'Bullish/Bearish engulfing',
        'Long wick rejection',
        'Strong candle close',
        'Failed breakout',
        'Break and retest',
        'Volume confirmation',
        'Market structure shift',
        'Liquidity sweep',
        'Fair Value Gap (FVG)',
        'Order Block (OB)',
    ],
    followedStrategy: ['Yes', 'Partially', 'No'],
    result: ['Win', 'Loss', 'Break-even', 'Partial'],
    executionQuality: ['Good', 'Average', 'Bad'],
    exitReason: ['TP hit', 'SL hit', 'Manual', 'Trailing', 'Early close'],
    emotion: ['Confident', 'Afraid', 'Neutral', 'Greedy', 'Anxious'],
    yesno: ['Yes', 'No'],
    patient: ['Yes', 'No'],
    followedPlan: ['Yes', 'No', 'Partially'],
    fomo: ['Yes', 'No'],
    movedSL: ['Yes', 'No'],
    revenge: ['Yes', 'No'],
    role: ['admin', 'trader'],
    tags: ['Scalp', 'DayTrade', 'Swing', 'HighRR', 'NewsEvent', 'TrendContinuation', 'ICT-SilverBullet'],
};
const seedDatabase = async () => {
    await (0, db_js_1.connectDB)();
    console.log('Seeding initial system data...');
    // 1. Seed or update Admin Account
    const adminEmail = 'admin@journal.local';
    let admin = await User_js_1.User.findOne({ email: adminEmail });
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';
    const salt = await bcryptjs_1.default.genSalt(10);
    const adminHash = await bcryptjs_1.default.hash(adminPassword, salt);
    if (!admin) {
        admin = new User_js_1.User({
            name: 'System Administrator',
            email: adminEmail,
            passwordHash: adminHash,
            role: 'admin',
            isActive: true,
        });
        await admin.save();
        console.log(`Created default admin account: ${adminEmail}`);
    }
    else {
        admin.passwordHash = adminHash;
        admin.isActive = true;
        await admin.save();
    }
    console.log('----------------------------------------------------');
    console.log(`🔑 ADMIN CREDENTIALS:`);
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('----------------------------------------------------');
    // 2. Seed Default Trader Account
    const traderEmail = 'trader@journal.local';
    let trader = await User_js_1.User.findOne({ email: traderEmail });
    const traderPassword = 'Trader@123456';
    const traderHash = await bcryptjs_1.default.hash(traderPassword, salt);
    if (!trader) {
        trader = new User_js_1.User({
            name: 'Alex Rivera (Trader)',
            email: traderEmail,
            passwordHash: traderHash,
            role: 'trader',
            isActive: true,
            createdBy: admin._id,
        });
        await trader.save();
        console.log(`Created default trader account: ${traderEmail}`);
    }
    console.log(`🔑 TRADER CREDENTIALS:`);
    console.log(`Email:    ${traderEmail}`);
    console.log(`Password: ${traderPassword}`);
    console.log('----------------------------------------------------');
    // 3. Seed System Dropdown Options
    let seededOptionsCount = 0;
    for (const [field, values] of Object.entries(exports.SYSTEM_OPTIONS)) {
        for (const val of values) {
            const exists = await DropdownOption_js_1.DropdownOption.findOne({
                field,
                value: val,
                isSystem: true,
            });
            if (!exists) {
                await DropdownOption_js_1.DropdownOption.create({
                    field,
                    value: val,
                    isSystem: true,
                });
                seededOptionsCount++;
            }
        }
    }
    console.log(`Seeded ${seededOptionsCount} new system dropdown options.`);
    // 4. Seed Sample Trades for Trader if none exist
    const existingTradeCount = await Trade_js_1.Trade.countDocuments({ userId: trader._id });
    if (existingTradeCount === 0) {
        console.log('Generating initial sample trade journal history for demonstration...');
        const samples = [
            {
                tradeNumber: 1,
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                entryTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
                closedTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
                pair: 'EUR/USD',
                session: 'London',
                direction: 'Buy',
                entryTF: '5M',
                analysisTF: ['15M', '1H'],
                strategyType: 'ICT',
                setupType: 'A+',
                accountBalance: 10000,
                entry: 1.0850,
                sl: 1.0820,
                tp: 1.0920,
                lot: 1,
                result: 'Win',
                exitPrice: 1.0920,
                executionQuality: 'Good',
                exitReason: 'TP hit',
                marketStructure: 'Uptrend',
                htfDirection: 'Bullish',
                srZone: 'Daily Support',
                entryLocation: 'At Support',
                liquidityTaken: 'Yes',
                volumeCondition: 'High',
                biasNotes: 'Bullish order block test on 1H',
                confirmations: ['Bullish/Bearish engulfing', 'Strong candle close', 'Liquidity sweep', 'Fair Value Gap (FVG)'],
                followedStrategy: 'Yes',
                psychology: {
                    patient: 'Yes',
                    followedPlan: 'Yes',
                    fomo: 'No',
                    movedSL: 'No',
                    revenge: 'No',
                    emotion: 'Confident',
                    rating: 5,
                },
                lesson: 'Waiting for 1H liquidity sweep yielded an effortless runner to target.',
                tags: ['DayTrade', 'HighRR', 'ICT-SilverBullet'],
            },
            {
                tradeNumber: 2,
                date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
                entryTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
                closedTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
                pair: 'XAU/USD',
                session: 'New York',
                direction: 'Sell',
                entryTF: '15M',
                analysisTF: ['1H', '4H'],
                strategyType: 'Price Action',
                setupType: 'B',
                accountBalance: 10000,
                entry: 2650.0,
                sl: 2660.0,
                tp: 2630.0,
                lot: 1,
                result: 'Loss',
                exitPrice: 2660.0,
                executionQuality: 'Average',
                exitReason: 'SL hit',
                marketStructure: 'Ranging',
                htfDirection: 'Neutral',
                srZone: 'Resistance Level',
                entryLocation: 'At Resistance',
                liquidityTaken: 'No',
                volumeCondition: 'Increasing',
                biasNotes: 'Anticipated rejection from key high',
                confirmations: ['Long wick rejection'],
                followedStrategy: 'Partially',
                psychology: {
                    patient: 'No',
                    followedPlan: 'Partially',
                    fomo: 'Yes',
                    movedSL: 'No',
                    revenge: 'No',
                    emotion: 'Anxious',
                    rating: 3,
                },
                lesson: 'Entered prematurely before NY market open volatility settled.',
                tags: ['Scalp'],
            },
            {
                tradeNumber: 3,
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                entryTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000),
                closedTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
                pair: 'GBP/USD',
                session: 'Overlap',
                direction: 'Buy',
                entryTF: '5M',
                analysisTF: ['1H', '4H'],
                strategyType: 'SMC',
                setupType: 'A',
                accountBalance: 10000,
                entry: 1.2950,
                sl: 1.2925,
                tp: 1.3025,
                lot: 1,
                result: 'Win',
                exitPrice: 1.3025,
                executionQuality: 'Good',
                exitReason: 'TP hit',
                marketStructure: 'Uptrend',
                htfDirection: 'Bullish',
                srZone: 'Support',
                entryLocation: 'Retest',
                liquidityTaken: 'Yes',
                volumeCondition: 'High',
                biasNotes: 'Break and retest of previous London high',
                confirmations: ['Break and retest', 'Volume confirmation', 'Strong candle close'],
                followedStrategy: 'Yes',
                psychology: {
                    patient: 'Yes',
                    followedPlan: 'Yes',
                    fomo: 'No',
                    movedSL: 'No',
                    revenge: 'No',
                    emotion: 'Confident',
                    rating: 5,
                },
                lesson: 'Flawless execution during London/NY overlap session.',
                tags: ['TrendContinuation', 'HighRR'],
            },
        ];
        for (const sample of samples) {
            const autoFields = (0, calcService_js_1.computeTradeAutoFields)({
                ...sample,
                entryTime: sample.entryTime,
                closedTime: sample.closedTime,
            });
            const tradeDoc = {
                ...sample,
                userId: trader._id,
                ...autoFields,
            };
            tradeDoc.tradeSummary = {
                text: (0, summaryService_js_1.buildTradeSummary)(tradeDoc),
                isManual: false,
            };
            await Trade_js_1.Trade.create(tradeDoc);
        }
        console.log(`Seeded ${samples.length} sample trades for Alex Rivera.`);
    }
    console.log('Database seeding complete!');
};
exports.seedDatabase = seedDatabase;
// Direct script execution
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
    (0, exports.seedDatabase)()
        .then(async () => {
        await (0, db_js_1.disconnectDB)();
        process.exit(0);
    })
        .catch(async (err) => {
        console.error('Seeding failed:', err);
        await (0, db_js_1.disconnectDB)();
        process.exit(1);
    });
}
