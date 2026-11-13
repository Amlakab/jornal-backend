"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePeriodicNarrativeReport = exports.getRRDistribution = exports.getHeatmap = exports.getBreakdown = exports.getEquityCurve = exports.computeKPIsFromTrades = exports.buildMatchFilter = exports.parseDateRange = void 0;
const mongoose_1 = require("mongoose");
const parseDateRange = (query) => {
    const scope = query.scope?.toLowerCase() || (query.from ? 'range' : query.month ? 'month' : query.week ? 'week' : query.date ? 'day' : 'all');
    if (scope === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    if (scope === 'day' && query.date) {
        const start = new Date(`${query.date}T00:00:00.000Z`);
        const end = new Date(`${query.date}T23:59:59.999Z`);
        if (!isNaN(start.getTime()))
            return { start, end };
    }
    if (scope === 'week' && query.week) {
        // Format: YYYY-Www, e.g. 2026-W46
        const [yearStr, weekStr] = query.week.split('-W');
        const year = parseInt(yearStr, 10);
        const week = parseInt(weekStr, 10);
        if (!isNaN(year) && !isNaN(week)) {
            // Find 1st of Jan
            const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
            const dow = simple.getUTCDay();
            const isoWeekStart = simple;
            if (dow <= 4) {
                isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
            }
            else {
                isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
            }
            isoWeekStart.setUTCHours(0, 0, 0, 0);
            const isoWeekEnd = new Date(isoWeekStart);
            isoWeekEnd.setUTCDate(isoWeekStart.getUTCDate() + 6);
            isoWeekEnd.setUTCHours(23, 59, 59, 999);
            return { start: isoWeekStart, end: isoWeekEnd };
        }
    }
    if (scope === 'month' && query.month) {
        // Format: YYYY-MM
        const [yearStr, monthStr] = query.month.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1;
        if (!isNaN(year) && !isNaN(month)) {
            const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
            const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
            return { start, end };
        }
    }
    if (scope === 'year' && query.year) {
        const year = parseInt(query.year, 10);
        if (!isNaN(year)) {
            const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
            const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
            return { start, end };
        }
    }
    if (scope === 'range') {
        const start = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
        const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;
        return { start, end };
    }
    return {};
};
exports.parseDateRange = parseDateRange;
const buildMatchFilter = (userId, query = {}) => {
    const filter = {};
    if (userId) {
        filter.userId = typeof userId === 'string' ? new mongoose_1.Types.ObjectId(userId) : userId;
    }
    const { start, end } = (0, exports.parseDateRange)(query);
    if (start || end) {
        filter.date = {};
        if (start)
            filter.date.$gte = start;
        if (end)
            filter.date.$lte = end;
    }
    return filter;
};
exports.buildMatchFilter = buildMatchFilter;
const computeKPIsFromTrades = (trades) => {
    const totalTrades = trades.length;
    if (totalTrades === 0) {
        return {
            totalTrades: 0,
            wins: 0,
            losses: 0,
            breakEvens: 0,
            partials: 0,
            winRate: 0,
            avgRR: 0,
            netPnl: 0,
            grossProfit: 0,
            grossLoss: 0,
            profitFactor: 0,
            expectancy: 0,
            avgWin: 0,
            avgLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            maxConsecutiveWins: 0,
            maxConsecutiveLosses: 0,
            avgDuration: 0,
            bestSession: 'N/A',
            bestPair: 'N/A',
            bestSetup: 'N/A',
            bestDayOfWeek: 'N/A',
        };
    }
    let wins = 0;
    let losses = 0;
    let breakEvens = 0;
    let partials = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalRR = 0;
    let totalDuration = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let currentStreakWin = 0;
    let maxConsecutiveWins = 0;
    let currentStreakLoss = 0;
    let maxConsecutiveLosses = 0;
    const sessionPnlMap = {};
    const pairPnlMap = {};
    const setupPnlMap = {};
    const dayOfWeekPnlMap = {
        Sunday: 0,
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
    };
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Sort chronologically for consecutive streak calculation
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const t of sortedTrades) {
        const res = (t.result || '').toLowerCase();
        const pnlVal = t.pnl?.value ?? 0;
        const rrVal = t.rr?.value ?? 0;
        const durVal = t.duration?.value ?? 0;
        totalRR += rrVal;
        totalDuration += durVal;
        if (res === 'win' || pnlVal > 0) {
            wins++;
            grossProfit += Math.max(0, pnlVal);
            if (pnlVal > largestWin)
                largestWin = pnlVal;
            currentStreakWin++;
            if (currentStreakWin > maxConsecutiveWins)
                maxConsecutiveWins = currentStreakWin;
            currentStreakLoss = 0;
        }
        else if (res === 'loss' || pnlVal < 0) {
            losses++;
            const absLoss = Math.abs(pnlVal);
            grossLoss += absLoss;
            if (absLoss > largestLoss)
                largestLoss = absLoss;
            currentStreakLoss++;
            if (currentStreakLoss > maxConsecutiveLosses)
                maxConsecutiveLosses = currentStreakLoss;
            currentStreakWin = 0;
        }
        else if (res === 'break-even' || res === 'breakeven') {
            breakEvens++;
            currentStreakWin = 0;
            currentStreakLoss = 0;
        }
        else if (res === 'partial') {
            partials++;
            if (pnlVal >= 0)
                grossProfit += pnlVal;
            else
                grossLoss += Math.abs(pnlVal);
        }
        // Sessions
        const sess = t.session || 'Unknown';
        sessionPnlMap[sess] = (sessionPnlMap[sess] || 0) + pnlVal;
        // Pairs
        const pair = t.pair || 'Unknown';
        pairPnlMap[pair] = (pairPnlMap[pair] || 0) + pnlVal;
        // Setup / Strategy
        const setup = t.strategyType || t.setupType || t.followedStrategy || t.entryLocation || 'Default';
        setupPnlMap[setup] = (setupPnlMap[setup] || 0) + pnlVal;
        // Day of week
        const d = new Date(t.date);
        const dayName = DAYS[d.getDay()] || 'Monday';
        dayOfWeekPnlMap[dayName] = (dayOfWeekPnlMap[dayName] || 0) + pnlVal;
    }
    const winRate = Math.round((wins / totalTrades) * 1000) / 10;
    const lossRate = Math.round((losses / totalTrades) * 1000) / 10;
    const netPnl = Math.round((grossProfit - grossLoss) * 100) / 100;
    const profitFactor = grossLoss > 0
        ? Math.round((grossProfit / grossLoss) * 100) / 100
        : grossProfit > 0
            ? 999
            : 0;
    const avgRR = Math.round((totalRR / totalTrades) * 100) / 100;
    const avgWin = wins > 0 ? Math.round((grossProfit / wins) * 100) / 100 : 0;
    const avgLoss = losses > 0 ? Math.round((grossLoss / losses) * 100) / 100 : 0;
    const expectancy = Math.round(((winRate / 100) * avgWin - (lossRate / 100) * avgLoss) * 100) / 100;
    const avgDuration = Math.round(totalDuration / totalTrades);
    const getBest = (map) => {
        let bestKey = 'N/A';
        let maxVal = -Infinity;
        for (const [k, v] of Object.entries(map)) {
            if (v > maxVal) {
                maxVal = v;
                bestKey = k;
            }
        }
        return bestKey;
    };
    return {
        totalTrades,
        wins,
        losses,
        breakEvens,
        partials,
        winRate,
        avgRR,
        netPnl,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossLoss: Math.round(grossLoss * 100) / 100,
        profitFactor,
        expectancy,
        avgWin,
        avgLoss,
        largestWin: Math.round(largestWin * 100) / 100,
        largestLoss: Math.round(largestLoss * 100) / 100,
        maxConsecutiveWins,
        maxConsecutiveLosses,
        avgDuration,
        bestSession: getBest(sessionPnlMap),
        bestPair: getBest(pairPnlMap),
        bestSetup: getBest(setupPnlMap),
        bestDayOfWeek: getBest(dayOfWeekPnlMap),
    };
};
exports.computeKPIsFromTrades = computeKPIsFromTrades;
const getEquityCurve = (trades) => {
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cumulativePnl = 0;
    let peakPnl = 0;
    return sorted.map((t, idx) => {
        const pnl = t.pnl?.value ?? 0;
        cumulativePnl += pnl;
        if (cumulativePnl > peakPnl)
            peakPnl = cumulativePnl;
        const drawdown = peakPnl - cumulativePnl;
        const drawdownPct = peakPnl > 0 ? Math.round((drawdown / peakPnl) * 1000) / 10 : 0;
        return {
            index: idx + 1,
            tradeNumber: t.tradeNumber,
            date: t.date,
            pair: t.pair,
            result: t.result,
            pnl: Math.round(pnl * 100) / 100,
            cumulativePnl: Math.round(cumulativePnl * 100) / 100,
            peakPnl: Math.round(peakPnl * 100) / 100,
            drawdown: Math.round(drawdown * 100) / 100,
            drawdownPct,
        };
    });
};
exports.getEquityCurve = getEquityCurve;
const getBreakdown = (trades, groupBy) => {
    const groups = {};
    for (const t of trades) {
        let key = 'Other';
        if (groupBy === 'session')
            key = t.session || 'Unknown';
        else if (groupBy === 'pair')
            key = t.pair || 'Unknown';
        else if (groupBy === 'setup' || groupBy === 'strategy' || groupBy === 'strategyType')
            key = t.strategyType || t.followedStrategy || 'Default';
        else if (groupBy === 'setupType')
            key = t.setupType || 'Default';
        else if (groupBy === 'emotion')
            key = t.psychology?.emotion || 'Neutral';
        else if (groupBy === 'day') {
            const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            key = DAYS[new Date(t.date).getDay()] || 'Mon';
        }
        else if (groupBy === 'week') {
            const d = new Date(t.date);
            key = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6) / 7)}`;
        }
        else if (groupBy === 'month') {
            const d = new Date(t.date);
            key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        }
        if (!groups[key])
            groups[key] = [];
        groups[key].push(t);
    }
    return Object.entries(groups).map(([group, groupTrades]) => {
        const kpi = (0, exports.computeKPIsFromTrades)(groupTrades);
        return {
            group,
            count: groupTrades.length,
            wins: kpi.wins,
            losses: kpi.losses,
            winRate: kpi.winRate,
            avgRR: kpi.avgRR,
            netPnl: kpi.netPnl,
            expectancy: kpi.expectancy,
        };
    });
};
exports.getBreakdown = getBreakdown;
const getHeatmap = (trades) => {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const SESSIONS = ['London', 'New York', 'Asian', 'Overlap'];
    const matrix = {};
    for (const d of DAYS) {
        matrix[d] = {};
        for (const s of SESSIONS) {
            matrix[d][s] = { count: 0, netPnl: 0, winRate: 0, wins: 0 };
        }
    }
    const DAY_LOOKUP = {
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
    };
    for (const t of trades) {
        const dayName = DAY_LOOKUP[new Date(t.date).getDay()];
        const session = SESSIONS.find(s => s.toLowerCase() === (t.session || '').toLowerCase()) || 'Other';
        if (dayName && matrix[dayName] && matrix[dayName][session]) {
            const cell = matrix[dayName][session];
            cell.count++;
            const pnl = t.pnl?.value ?? 0;
            cell.netPnl = Math.round((cell.netPnl + pnl) * 100) / 100;
            if (t.result === 'Win' || pnl > 0)
                cell.wins++;
            cell.winRate = Math.round((cell.wins / cell.count) * 100);
        }
    }
    return matrix;
};
exports.getHeatmap = getHeatmap;
const getRRDistribution = (trades) => {
    const buckets = [
        { label: '< 1:1', min: -Infinity, max: 1, count: 0, pnl: 0 },
        { label: '1:1 - 1:2', min: 1, max: 2, count: 0, pnl: 0 },
        { label: '1:2 - 1:3', min: 2, max: 3, count: 0, pnl: 0 },
        { label: '1:3 - 1:5', min: 3, max: 5, count: 0, pnl: 0 },
        { label: '> 1:5', min: 5, max: Infinity, count: 0, pnl: 0 },
    ];
    for (const t of trades) {
        const rr = t.rr?.value ?? 0;
        const pnl = t.pnl?.value ?? 0;
        for (const b of buckets) {
            if (rr >= b.min && (b.max === Infinity ? true : rr < b.max)) {
                b.count++;
                b.pnl = Math.round((b.pnl + pnl) * 100) / 100;
                break;
            }
        }
    }
    return buckets;
};
exports.getRRDistribution = getRRDistribution;
const generatePeriodicNarrativeReport = (periodName, currentTrades, previousTrades) => {
    const currentKPIs = (0, exports.computeKPIsFromTrades)(currentTrades);
    const previousKPIs = (0, exports.computeKPIsFromTrades)(previousTrades);
    // Psychology flag frequency
    const flagsCount = {
        fomo: 0,
        revenge: 0,
        movedSL: 0,
        didNotFollowPlan: 0,
    };
    for (const t of currentTrades) {
        const p = t.psychology;
        if (p) {
            if (p.fomo && p.fomo.toLowerCase() === 'yes')
                flagsCount.fomo++;
            if (p.revenge && p.revenge.toLowerCase() === 'yes')
                flagsCount.revenge++;
            if (p.movedSL && p.movedSL.toLowerCase() === 'yes')
                flagsCount.movedSL++;
            if (p.followedPlan && p.followedPlan.toLowerCase() === 'no')
                flagsCount.didNotFollowPlan++;
        }
    }
    let mostFrequentFlag = 'None';
    let maxFlagCount = 0;
    for (const [f, count] of Object.entries(flagsCount)) {
        if (count > maxFlagCount) {
            maxFlagCount = count;
            mostFrequentFlag = f;
        }
    }
    // Comparisons
    const pnlDelta = Math.round((currentKPIs.netPnl - previousKPIs.netPnl) * 100) / 100;
    const winRateDelta = Math.round((currentKPIs.winRate - previousKPIs.winRate) * 10) / 10;
    const pnlTrend = pnlDelta >= 0 ? '↑' : '↓';
    const winRateTrend = winRateDelta >= 0 ? '↑' : '↓';
    const narrative = `In this ${periodName}, you executed ${currentKPIs.totalTrades} trade${currentKPIs.totalTrades === 1 ? '' : 's'} with an overall Win Rate of ${currentKPIs.winRate}% (${winRateTrend} ${Math.abs(winRateDelta)}%) and Net P/L of $${currentKPIs.netPnl.toLocaleString()} (${pnlTrend} $${Math.abs(pnlDelta).toLocaleString()}). Your most profitable session was ${currentKPIs.bestSession}, and your top performing asset was ${currentKPIs.bestPair}. Primary setup utilized: ${currentKPIs.bestSetup}. In terms of trading psychology, ${maxFlagCount > 0 ? `the most recurring friction point was '${mostFrequentFlag}' (${maxFlagCount} occurrences)` : 'discipline remained exceptionally high with no major psychological pitfalls detected'}. Overall profit factor: ${currentKPIs.profitFactor}.`;
    return {
        period: periodName,
        narrative,
        currentKPIs,
        previousKPIs,
        delta: {
            netPnlDelta: pnlDelta,
            winRateDelta,
            tradesDelta: currentKPIs.totalTrades - previousKPIs.totalTrades,
        },
        flagsCount,
        mostFrequentFlag,
    };
};
exports.generatePeriodicNarrativeReport = generatePeriodicNarrativeReport;
