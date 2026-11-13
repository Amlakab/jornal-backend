"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Trade_js_1 = require("../models/Trade.js");
const auth_js_1 = require("../middleware/auth.js");
const analyticsService_js_1 = require("../services/analyticsService.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth, auth_js_1.scopeUser);
const fetchScopedTrades = async (userId, query) => {
    const filter = {};
    if (userId)
        filter.userId = userId;
    const { start, end } = (0, analyticsService_js_1.parseDateRange)(query);
    if (start || end) {
        filter.date = {};
        if (start)
            filter.date.$gte = start;
        if (end)
            filter.date.$lte = end;
    }
    return Trade_js_1.Trade.find(filter).sort({ date: 1 });
};
// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        const trades = await fetchScopedTrades(userId, req.query);
        const kpis = (0, analyticsService_js_1.computeKPIsFromTrades)(trades);
        res.json({ success: true, data: kpis });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch summary analytics', error: error.message });
    }
});
// GET /api/analytics/breakdown?groupBy=session|pair|setup|emotion|day|week|month
router.get('/breakdown', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        const groupBy = req.query.groupBy || 'session';
        const trades = await fetchScopedTrades(userId, req.query);
        const breakdown = (0, analyticsService_js_1.getBreakdown)(trades, groupBy);
        res.json({ success: true, data: breakdown });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch breakdown analytics', error: error.message });
    }
});
// GET /api/analytics/equity-curve
router.get('/equity-curve', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        const trades = await fetchScopedTrades(userId, req.query);
        const curve = (0, analyticsService_js_1.getEquityCurve)(trades);
        res.json({ success: true, data: curve });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch equity curve', error: error.message });
    }
});
// GET /api/analytics/heatmap
router.get('/heatmap', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        const trades = await fetchScopedTrades(userId, req.query);
        const heatmap = (0, analyticsService_js_1.getHeatmap)(trades);
        res.json({ success: true, data: heatmap });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch heatmap', error: error.message });
    }
});
// GET /api/analytics/rr-distribution
router.get('/rr-distribution', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        const trades = await fetchScopedTrades(userId, req.query);
        const dist = (0, analyticsService_js_1.getRRDistribution)(trades);
        res.json({ success: true, data: dist });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch RR distribution', error: error.message });
    }
});
// GET /api/analytics/report?period=week|month&...
router.get('/report', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        const period = req.query.period || 'week';
        const currentTrades = await fetchScopedTrades(userId, req.query);
        // Calculate previous period window for comparison
        const { start } = (0, analyticsService_js_1.parseDateRange)(req.query);
        const prevQuery = {};
        if (start) {
            const prevEnd = new Date(start.getTime() - 1);
            const windowDuration = period === 'month' ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
            const prevStart = new Date(prevEnd.getTime() - windowDuration);
            prevQuery.from = prevStart.toISOString().split('T')[0];
            prevQuery.to = prevEnd.toISOString().split('T')[0];
            prevQuery.scope = 'range';
        }
        const previousTrades = await fetchScopedTrades(userId, prevQuery);
        const report = (0, analyticsService_js_1.generatePeriodicNarrativeReport)(period, currentTrades, previousTrades);
        res.json({ success: true, data: report });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to generate report', error: error.message });
    }
});
// GET /api/analytics/compare?periodA=&periodB=
router.get('/compare', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        const { scopeA = 'month', dateA, weekA, monthA, fromA, toA, scopeB = 'month', dateB, weekB, monthB, fromB, toB, } = req.query;
        const queryA = {
            scope: scopeA,
            date: dateA,
            week: weekA,
            month: monthA,
            from: fromA,
            to: toA,
        };
        const queryB = {
            scope: scopeB,
            date: dateB,
            week: weekB,
            month: monthB,
            from: fromB,
            to: toB,
        };
        const [tradesA, tradesB] = await Promise.all([
            fetchScopedTrades(userId, queryA),
            fetchScopedTrades(userId, queryB),
        ]);
        const kpiA = (0, analyticsService_js_1.computeKPIsFromTrades)(tradesA);
        const kpiB = (0, analyticsService_js_1.computeKPIsFromTrades)(tradesB);
        const delta = {
            netPnlDelta: Math.round((kpiA.netPnl - kpiB.netPnl) * 100) / 100,
            winRateDelta: Math.round((kpiA.winRate - kpiB.winRate) * 10) / 10,
            tradesDelta: kpiA.totalTrades - kpiB.totalTrades,
            profitFactorDelta: Math.round((kpiA.profitFactor - kpiB.profitFactor) * 100) / 100,
            avgRRDelta: Math.round((kpiA.avgRR - kpiB.avgRR) * 100) / 100,
        };
        res.json({
            success: true,
            data: {
                periodA: { query: queryA, kpi: kpiA },
                periodB: { query: queryB, kpi: kpiB },
                delta,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to compare periods', error: error.message });
    }
});
exports.default = router;
