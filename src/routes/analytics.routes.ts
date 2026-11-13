import { Router, Response } from 'express';
import { Trade } from '../models/Trade.js';
import { requireAuth, scopeUser, AuthenticatedRequest } from '../middleware/auth.js';
import {
  parseDateRange,
  computeKPIsFromTrades,
  getEquityCurve,
  getBreakdown,
  getHeatmap,
  getRRDistribution,
  generatePeriodicNarrativeReport,
  TimeScopeQuery,
} from '../services/analyticsService.js';

const router = Router();

router.use(requireAuth, scopeUser);

const fetchScopedTrades = async (userId: any, query: TimeScopeQuery) => {
  const filter: Record<string, any> = {};
  if (userId) filter.userId = userId;

  const { start, end } = parseDateRange(query);
  if (start || end) {
    filter.date = {};
    if (start) filter.date.$gte = start;
    if (end) filter.date.$lte = end;
  }

  return Trade.find(filter).sort({ date: 1 });
};

// GET /api/analytics/summary
router.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    const trades = await fetchScopedTrades(userId, req.query as TimeScopeQuery);
    const kpis = computeKPIsFromTrades(trades);

    res.json({ success: true, data: kpis });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch summary analytics', error: error.message });
  }
});

// GET /api/analytics/breakdown?groupBy=session|pair|setup|emotion|day|week|month
router.get('/breakdown', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    const groupBy = (req.query.groupBy as string) || 'session';
    const trades = await fetchScopedTrades(userId, req.query as TimeScopeQuery);
    const breakdown = getBreakdown(trades, groupBy);

    res.json({ success: true, data: breakdown });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch breakdown analytics', error: error.message });
  }
});

// GET /api/analytics/equity-curve
router.get('/equity-curve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    const trades = await fetchScopedTrades(userId, req.query as TimeScopeQuery);
    const curve = getEquityCurve(trades);

    res.json({ success: true, data: curve });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch equity curve', error: error.message });
  }
});

// GET /api/analytics/heatmap
router.get('/heatmap', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    const trades = await fetchScopedTrades(userId, req.query as TimeScopeQuery);
    const heatmap = getHeatmap(trades);

    res.json({ success: true, data: heatmap });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch heatmap', error: error.message });
  }
});

// GET /api/analytics/rr-distribution
router.get('/rr-distribution', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    const trades = await fetchScopedTrades(userId, req.query as TimeScopeQuery);
    const dist = getRRDistribution(trades);

    res.json({ success: true, data: dist });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch RR distribution', error: error.message });
  }
});

// GET /api/analytics/report?period=week|month&...
router.get('/report', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    const period = (req.query.period as string) || 'week';

    const currentTrades = await fetchScopedTrades(userId, req.query as TimeScopeQuery);

    // Calculate previous period window for comparison
    const { start } = parseDateRange(req.query as TimeScopeQuery);
    const prevQuery: TimeScopeQuery = {};
    if (start) {
      const prevEnd = new Date(start.getTime() - 1);
      const windowDuration = period === 'month' ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      const prevStart = new Date(prevEnd.getTime() - windowDuration);
      prevQuery.from = prevStart.toISOString().split('T')[0];
      prevQuery.to = prevEnd.toISOString().split('T')[0];
      prevQuery.scope = 'range';
    }

    const previousTrades = await fetchScopedTrades(userId, prevQuery);
    const report = generatePeriodicNarrativeReport(period, currentTrades, previousTrades);

    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to generate report', error: error.message });
  }
});

// GET /api/analytics/compare?periodA=&periodB=
router.get('/compare', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    const {
      scopeA = 'month',
      dateA,
      weekA,
      monthA,
      fromA,
      toA,
      scopeB = 'month',
      dateB,
      weekB,
      monthB,
      fromB,
      toB,
    } = req.query;

    const queryA: TimeScopeQuery = {
      scope: scopeA as string,
      date: dateA as string,
      week: weekA as string,
      month: monthA as string,
      from: fromA as string,
      to: toA as string,
    };

    const queryB: TimeScopeQuery = {
      scope: scopeB as string,
      date: dateB as string,
      week: weekB as string,
      month: monthB as string,
      from: fromB as string,
      to: toB as string,
    };

    const [tradesA, tradesB] = await Promise.all([
      fetchScopedTrades(userId, queryA),
      fetchScopedTrades(userId, queryB),
    ]);

    const kpiA = computeKPIsFromTrades(tradesA);
    const kpiB = computeKPIsFromTrades(tradesB);

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to compare periods', error: error.message });
  }
});

export default router;
