"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTradeAutoFields = exports.calculateConfirmationScore = exports.calculateDurationInMinutes = exports.deriveSession = exports.calculatePipValue = exports.getPairConfig = exports.PAIR_CONFIGS = void 0;
exports.PAIR_CONFIGS = {
    // Forex Majors
    'EUR/USD': { pipSize: 0.0001, contractSize: 100000 },
    'GBP/USD': { pipSize: 0.0001, contractSize: 100000 },
    'AUD/USD': { pipSize: 0.0001, contractSize: 100000 },
    'NZD/USD': { pipSize: 0.0001, contractSize: 100000 },
    'USD/CAD': { pipSize: 0.0001, contractSize: 100000 },
    'USD/CHF': { pipSize: 0.0001, contractSize: 100000 },
    'USD/JPY': { pipSize: 0.01, contractSize: 1000 },
    'EUR/JPY': { pipSize: 0.01, contractSize: 1000 },
    'GBP/JPY': { pipSize: 0.01, contractSize: 1000 },
    // Commodities
    'XAU/USD': { pipSize: 0.1, contractSize: 100 }, // Gold: 1 lot = 100 oz, $1 diff = $100
    'XAG/USD': { pipSize: 0.01, contractSize: 5000 },
    'USO/USD': { pipSize: 0.01, contractSize: 1000 },
    // Indices
    'US30': { pipSize: 1, contractSize: 1 },
    'NAS100': { pipSize: 1, contractSize: 1 },
    'SPX500': { pipSize: 1, contractSize: 1 },
    'GER30': { pipSize: 1, contractSize: 1 },
    // Crypto
    'BTC/USD': { pipSize: 1, contractSize: 1 },
    'ETH/USD': { pipSize: 0.1, contractSize: 1 },
};
const getPairConfig = (pair) => {
    const normalized = pair.toUpperCase().trim();
    if (exports.PAIR_CONFIGS[normalized]) {
        return exports.PAIR_CONFIGS[normalized];
    }
    // Fallbacks
    if (normalized.includes('JPY')) {
        return { pipSize: 0.01, contractSize: 1000 };
    }
    if (normalized.includes('XAU') || normalized.includes('GOLD')) {
        return { pipSize: 0.1, contractSize: 100 };
    }
    if (normalized.includes('BTC') || normalized.includes('ETH') || normalized.includes('30') || normalized.includes('100')) {
        return { pipSize: 1, contractSize: 1 };
    }
    return { pipSize: 0.0001, contractSize: 100000 };
};
exports.getPairConfig = getPairConfig;
const calculatePipValue = (pair, lot) => {
    const config = (0, exports.getPairConfig)(pair);
    return config.pipSize * config.contractSize * lot;
};
exports.calculatePipValue = calculatePipValue;
const deriveSession = (date) => {
    const d = new Date(date);
    const hour = d.getUTCHours();
    // London / NY Overlap: 13:00 - 16:00 UTC
    if (hour >= 13 && hour < 16) {
        return 'Overlap';
    }
    // London Session: 08:00 - 16:00 UTC
    if (hour >= 8 && hour < 16) {
        return 'London';
    }
    // New York Session: 13:00 - 21:00 UTC
    if (hour >= 16 && hour < 21) {
        return 'New York';
    }
    // Asian Session: 00:00 - 08:00 UTC
    if (hour >= 0 && hour < 8) {
        return 'Asian';
    }
    return 'Asian';
};
exports.deriveSession = deriveSession;
const calculateDurationInMinutes = (entryTime, exitTime) => {
    if (!exitTime)
        return 0;
    const start = new Date(entryTime).getTime();
    const end = new Date(exitTime).getTime();
    if (isNaN(start) || isNaN(end) || end < start)
        return 0;
    return Math.round((end - start) / (1000 * 60));
};
exports.calculateDurationInMinutes = calculateDurationInMinutes;
const calculateConfirmationScore = (confirmations = [], totalAvailable = 8) => {
    if (!confirmations || confirmations.length === 0)
        return 0;
    const score = (confirmations.length / Math.max(1, totalAvailable)) * 100;
    return Math.min(100, Math.round(score));
};
exports.calculateConfirmationScore = calculateConfirmationScore;
const computeTradeAutoFields = (trade) => {
    const { pipSize, contractSize } = (0, exports.getPairConfig)(trade.pair);
    const lot = trade.lot > 0 ? trade.lot : 1;
    const dirSign = trade.direction?.toLowerCase() === 'sell' ? -1 : 1;
    const balance = (trade.accountBalance && trade.accountBalance > 0) ? trade.accountBalance : 10000;
    // 1. Risk ($) and Risk (%)
    const computedRisk = Math.abs(trade.entry - trade.sl) * contractSize * lot;
    const finalRisk = trade.risk?.isManual
        ? trade.risk.value
        : Math.round(computedRisk * 100) / 100;
    const computedRiskPercent = Math.round((finalRisk / balance) * 10000) / 100;
    const finalRiskPercent = trade.riskPercent?.isManual
        ? trade.riskPercent.value
        : computedRiskPercent;
    // 2. Reward ($) and Reward (%)
    const computedReward = Math.abs(trade.tp - trade.entry) * contractSize * lot;
    const finalReward = trade.reward?.isManual
        ? trade.reward.value
        : Math.round(computedReward * 100) / 100;
    const computedRewardPercent = Math.round((finalReward / balance) * 10000) / 100;
    const finalRewardPercent = trade.rewardPercent?.isManual
        ? trade.rewardPercent.value
        : computedRewardPercent;
    // 3. RR = reward / risk
    const computedRR = finalRisk > 0 ? finalReward / finalRisk : 0;
    const finalRR = trade.rr?.isManual
        ? trade.rr.value
        : Math.round(computedRR * 100) / 100;
    // 4. Exit / PnL / PnL Pips / PnL (%)
    let effectiveExitPrice = trade.exitPrice;
    if (effectiveExitPrice === undefined || effectiveExitPrice === null) {
        if (trade.result === 'Win')
            effectiveExitPrice = trade.tp;
        else if (trade.result === 'Loss')
            effectiveExitPrice = trade.sl;
        else if (trade.result === 'Break-even')
            effectiveExitPrice = trade.entry;
    }
    let computedPnl = 0;
    let computedPnlPips = 0;
    if (effectiveExitPrice !== undefined && effectiveExitPrice !== null) {
        const priceDiff = (effectiveExitPrice - trade.entry) * dirSign;
        computedPnl = priceDiff * contractSize * lot;
        computedPnlPips = priceDiff / pipSize;
    }
    const finalPnl = trade.pnl?.isManual
        ? trade.pnl.value
        : Math.round(computedPnl * 100) / 100;
    const computedPnlPercent = Math.round((finalPnl / balance) * 10000) / 100;
    const finalPnlPercent = trade.pnlPercent?.isManual
        ? trade.pnlPercent.value
        : computedPnlPercent;
    const finalPnlPips = trade.pnlPips?.isManual
        ? trade.pnlPips.value
        : Math.round(computedPnlPips * 10) / 10;
    // 5. Duration (minutes) between entry and closedTime
    const effectiveExitTime = trade.closedTime || trade.exitTime;
    const computedDuration = (0, exports.calculateDurationInMinutes)(trade.entryTime, effectiveExitTime);
    const finalDuration = trade.duration?.isManual
        ? trade.duration.value
        : computedDuration;
    // 6. Session Auto
    const computedSession = (0, exports.deriveSession)(trade.entryTime);
    const finalSession = trade.sessionAuto?.isManual
        ? trade.sessionAuto.value
        : computedSession;
    // 7. Confirmation Score
    const computedConfScore = (0, exports.calculateConfirmationScore)(trade.confirmations, trade.totalAvailableConfirmations || 8);
    const finalConfScore = trade.confirmationScore?.isManual
        ? trade.confirmationScore.value
        : computedConfScore;
    return {
        risk: { value: finalRisk, isManual: !!trade.risk?.isManual },
        riskPercent: { value: finalRiskPercent, isManual: !!trade.riskPercent?.isManual },
        reward: { value: finalReward, isManual: !!trade.reward?.isManual },
        rewardPercent: { value: finalRewardPercent, isManual: !!trade.rewardPercent?.isManual },
        rr: { value: finalRR, isManual: !!trade.rr?.isManual },
        pnl: { value: finalPnl, isManual: !!trade.pnl?.isManual },
        pnlPercent: { value: finalPnlPercent, isManual: !!trade.pnlPercent?.isManual },
        pnlPips: { value: finalPnlPips, isManual: !!trade.pnlPips?.isManual },
        duration: { value: finalDuration, isManual: !!trade.duration?.isManual },
        sessionAuto: { value: finalSession, isManual: !!trade.sessionAuto?.isManual },
        confirmationScore: { value: finalConfScore, isManual: !!trade.confirmationScore?.isManual },
    };
};
exports.computeTradeAutoFields = computeTradeAutoFields;
