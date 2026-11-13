import { Router, Response } from 'express';
import { Types } from 'mongoose';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Trade, ITrade } from '../models/Trade.js';
import { requireAuth, scopeUser, AuthenticatedRequest } from '../middleware/auth.js';
import { tradeScreenshotsUpload, processUploadedFile } from '../middleware/upload.js';
import { createTradeSchema, updateTradeSchema } from '../validators/tradeValidator.js';
import { computeTradeAutoFields } from '../services/calcService.js';
import { buildTradeSummary } from '../services/summaryService.js';
import { parseDateRange } from '../services/analyticsService.js';

const router = Router();

router.use(requireAuth, scopeUser);

// GET /api/trades (List with filters, pagination, sort)
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User context required' });
      return;
    }

    const {
      page = '1',
      limit = '20',
      sortBy = 'date',
      sortOrder = 'desc',
      pair,
      session,
      direction,
      strategyType,
      setupType,
      result,
      hasScreenshots,
      search,
      scope,
      date,
      week,
      month,
      year,
      from,
      to,
    } = req.query;

    const query: Record<string, any> = { userId };

    // Scope & Date filters
    const { start, end } = parseDateRange({
      scope: scope as string,
      date: date as string,
      week: week as string,
      month: month as string,
      year: year as string,
      from: from as string,
      to: to as string,
    });

    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = start;
      if (end) query.date.$lte = end;
    }

    if (pair) query.pair = pair;
    if (session) query.session = session;
    if (direction) query.direction = direction;
    if (strategyType) query.strategyType = strategyType;
    if (setupType) query.setupType = setupType;
    if (result) query.result = result;

    if (hasScreenshots === 'true') {
      query.$or = [
        { 'screenshots.before': { $exists: true, $ne: '' } },
        { 'screenshots.atEntry': { $exists: true, $ne: '' } },
        { 'screenshots.after': { $exists: true, $ne: '' } },
        { 'screenshots.extras.0': { $exists: true } },
      ];
    } else if (hasScreenshots === 'false') {
      query['screenshots.before'] = { $in: [null, ''] };
      query['screenshots.atEntry'] = { $in: [null, ''] };
      query['screenshots.after'] = { $in: [null, ''] };
      query['screenshots.extras'] = { $size: 0 };
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { pair: { $regex: search, $options: 'i' } },
        { strategyType: { $regex: search, $options: 'i' } },
        { setupType: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { 'tradeSummary.text': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [trades, total] = await Promise.all([
      Trade.find(query)
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(limitNum),
      Trade.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        trades,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch trades', error: error.message });
  }
});

// GET /api/trades/export?format=csv|xlsx|pdf&...
router.get('/export', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User context required' });
      return;
    }

    const { format = 'csv', scope, date, week, month, year, from, to, pair, session, direction, strategyType, setupType, result } = req.query;

    const query: Record<string, any> = { userId };
    const { start, end } = parseDateRange({
      scope: scope as string,
      date: date as string,
      week: week as string,
      month: month as string,
      year: year as string,
      from: from as string,
      to: to as string,
    });

    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = start;
      if (end) query.date.$lte = end;
    }

    if (pair) query.pair = pair;
    if (session) query.session = session;
    if (direction) query.direction = direction;
    if (strategyType) query.strategyType = strategyType;
    if (setupType) query.setupType = setupType;
    if (result) query.result = result;

    const trades = await Trade.find(query).sort({ tradeNumber: 1 });
    const filename = `trades-export-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

      const headers = [
        'Trade #',
        'Date',
        'Entry Time',
        'Closed Time',
        'Pair',
        'Direction',
        'Session',
        'Strategy Type',
        'Setup Type',
        'Account Balance ($)',
        'Entry TF',
        'Entry',
        'SL',
        'TP',
        'Lot',
        'Risk ($)',
        'Risk (%)',
        'Reward ($)',
        'Reward (%)',
        'R:R',
        'Result',
        'P/L ($)',
        'P/L (%)',
        'Pips',
        'Duration (min)',
        'Emotion',
        'Summary',
      ];

      const rows = trades.map(t => [
        t.tradeNumber,
        new Date(t.date).toISOString().split('T')[0],
        t.entryTime ? new Date(t.entryTime).toISOString() : '',
        t.closedTime ? new Date(t.closedTime).toISOString() : (t.exitTime ? new Date(t.exitTime).toISOString() : ''),
        `"${t.pair}"`,
        `"${t.direction}"`,
        `"${t.session}"`,
        `"${t.strategyType || 'Price Action'}"`,
        `"${t.setupType || 'A'}"`,
        t.accountBalance || 10000,
        `"${t.entryTF}"`,
        t.entry,
        t.sl,
        t.tp,
        t.lot,
        t.risk?.value ?? 0,
        t.riskPercent?.value ?? 0,
        t.reward?.value ?? 0,
        t.rewardPercent?.value ?? 0,
        t.rr?.value ?? 0,
        `"${t.result || 'Win'}"`,
        t.pnl?.value ?? 0,
        t.pnlPercent?.value ?? 0,
        t.pnlPips?.value ?? 0,
        t.duration?.value ?? 0,
        `"${t.psychology?.emotion || ''}"`,
        `"${(t.tradeSummary?.text || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.send(csvContent);
      return;
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Trades');

      worksheet.columns = [
        { header: 'Trade #', key: 'tradeNumber', width: 10 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Closed Time', key: 'closedTime', width: 18 },
        { header: 'Pair', key: 'pair', width: 12 },
        { header: 'Direction', key: 'direction', width: 10 },
        { header: 'Strategy Type', key: 'strategyType', width: 15 },
        { header: 'Setup Type', key: 'setupType', width: 12 },
        { header: 'Balance ($)', key: 'accountBalance', width: 12 },
        { header: 'Entry', key: 'entry', width: 12 },
        { header: 'SL', key: 'sl', width: 12 },
        { header: 'TP', key: 'tp', width: 12 },
        { header: 'Lot', key: 'lot', width: 8 },
        { header: 'Risk ($)', key: 'risk', width: 12 },
        { header: 'Risk (%)', key: 'riskPercent', width: 10 },
        { header: 'Reward ($)', key: 'reward', width: 12 },
        { header: 'Reward (%)', key: 'rewardPercent', width: 10 },
        { header: 'R:R', key: 'rr', width: 8 },
        { header: 'Result', key: 'result', width: 12 },
        { header: 'P/L ($)', key: 'pnl', width: 12 },
        { header: 'P/L (%)', key: 'pnlPercent', width: 10 },
        { header: 'Duration (m)', key: 'duration', width: 12 },
        { header: 'Summary', key: 'summary', width: 45 },
      ];

      trades.forEach(t => {
        worksheet.addRow({
          tradeNumber: t.tradeNumber,
          date: new Date(t.date).toISOString().split('T')[0],
          closedTime: t.closedTime ? new Date(t.closedTime).toISOString() : (t.exitTime ? new Date(t.exitTime).toISOString() : ''),
          pair: t.pair,
          direction: t.direction,
          strategyType: t.strategyType || 'Price Action',
          setupType: t.setupType || 'A',
          accountBalance: t.accountBalance || 10000,
          entry: t.entry,
          sl: t.sl,
          tp: t.tp,
          lot: t.lot,
          risk: t.risk?.value ?? 0,
          riskPercent: `${t.riskPercent?.value ?? 0}%`,
          reward: t.reward?.value ?? 0,
          rewardPercent: `${t.rewardPercent?.value ?? 0}%`,
          rr: t.rr?.value ?? 0,
          result: t.result,
          pnl: t.pnl?.value ?? 0,
          pnlPercent: `${t.pnlPercent?.value ?? 0}%`,
          duration: t.duration?.value ?? 0,
          summary: t.tradeSummary?.text || '',
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      doc.pipe(res);

      doc.fontSize(18).text('Trading Journal Export Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()} | Total Trades: ${trades.length}`, { align: 'center' });
      doc.moveDown();

      trades.forEach((t, i) => {
        doc.fontSize(12).fillColor('#1e293b').text(
          `Trade #${t.tradeNumber} - ${t.direction.toUpperCase()} ${t.pair} [${t.strategyType || 'Strategy'} - ${t.setupType || 'Setup'}] (${t.result || 'Closed'})`
        );
        doc.fontSize(9).fillColor('#475569').text(
          `Date: ${new Date(t.date).toLocaleDateString()} | Session: ${t.session} | Closed Time: ${t.closedTime ? new Date(t.closedTime).toLocaleTimeString() : 'N/A'}`
        );
        doc.text(
          `Risk: $${t.risk?.value ?? 0} (${t.riskPercent?.value ?? 0}%) | Reward: $${t.reward?.value ?? 0} (${t.rewardPercent?.value ?? 0}%) | R:R: 1:${t.rr?.value ?? 0} | P/L: $${t.pnl?.value ?? 0} (${t.pnlPercent?.value ?? 0}%)`
        );
        if (t.tradeSummary?.text) {
          doc.fontSize(8).fillColor('#64748b').text(`Summary: ${t.tradeSummary.text}`);
        }
        doc.moveDown(0.5);

        if (doc.y > 720 && i < trades.length - 1) {
          doc.addPage();
        }
      });

      doc.end();
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid format requested.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to export trades', error: error.message });
  }
});

// POST /api/trades (Create new trade)
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User context required' });
      return;
    }

    const parseResult = createTradeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const tradeData = parseResult.data;

    // Auto-increment tradeNumber for this user
    const lastTrade = await Trade.findOne({ userId }).sort({ tradeNumber: -1 });
    const nextTradeNumber = lastTrade ? lastTrade.tradeNumber + 1 : 1;

    // Calculate auto fields
    const autoFields = computeTradeAutoFields({
      pair: tradeData.pair,
      direction: tradeData.direction,
      entry: tradeData.entry,
      sl: tradeData.sl,
      tp: tradeData.tp,
      lot: tradeData.lot,
      accountBalance: tradeData.accountBalance,
      entryTime: new Date(tradeData.entryTime || tradeData.date || Date.now()),
      closedTime: tradeData.closedTime ? new Date(tradeData.closedTime) : (tradeData.exitTime ? new Date(tradeData.exitTime) : undefined),
      exitPrice: tradeData.exitPrice ?? undefined,
      result: tradeData.result,
      confirmations: tradeData.confirmations,
      risk: tradeData.risk,
      riskPercent: tradeData.riskPercent,
      reward: tradeData.reward,
      rewardPercent: tradeData.rewardPercent,
      rr: tradeData.rr,
      pnl: tradeData.pnl,
      pnlPercent: tradeData.pnlPercent,
      pnlPips: tradeData.pnlPips,
      duration: tradeData.duration,
      sessionAuto: tradeData.sessionAuto,
      confirmationScore: tradeData.confirmationScore,
    });

    const finalData = {
      ...tradeData,
      userId,
      tradeNumber: nextTradeNumber,
      date: tradeData.date ? new Date(tradeData.date) : new Date(),
      entryTime: tradeData.entryTime ? new Date(tradeData.entryTime) : new Date(),
      closedTime: tradeData.closedTime ? new Date(tradeData.closedTime) : (tradeData.exitTime ? new Date(tradeData.exitTime) : undefined),
      exitTime: tradeData.closedTime ? new Date(tradeData.closedTime) : (tradeData.exitTime ? new Date(tradeData.exitTime) : undefined),
      ...autoFields,
    };

    if (!tradeData.tradeSummary?.isManual) {
      const summaryText = buildTradeSummary(finalData);
      finalData.tradeSummary = {
        text: summaryText,
        isManual: false,
      };
    }

    const trade = new Trade(finalData);
    await trade.save();

    res.status(201).json({ success: true, data: trade });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create trade', error: error.message });
  }
});

// GET /api/trades/:id (Get single trade detail)
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.scopedUserId;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid trade ID' });
      return;
    }

    const query: Record<string, any> = { _id: id };
    if (userId) query.userId = userId;

    const trade = await Trade.findOne(query);
    if (!trade) {
      res.status(404).json({ success: false, message: 'Trade not found' });
      return;
    }

    res.json({ success: true, data: trade });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch trade', error: error.message });
  }
});

// PATCH /api/trades/:id (Update trade)
router.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.scopedUserId;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid trade ID' });
      return;
    }

    const query: Record<string, any> = { _id: id };
    if (userId) query.userId = userId;

    const existingTrade = await Trade.findOne(query);
    if (!existingTrade) {
      res.status(404).json({ success: false, message: 'Trade not found' });
      return;
    }

    const parseResult = updateTradeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const updates = parseResult.data;
    const closedTime = updates.closedTime !== undefined
      ? (updates.closedTime ? new Date(updates.closedTime) : undefined)
      : (existingTrade.closedTime || existingTrade.exitTime);

    const merged = {
      pair: updates.pair ?? existingTrade.pair,
      direction: updates.direction ?? existingTrade.direction,
      entry: updates.entry ?? existingTrade.entry,
      sl: updates.sl ?? existingTrade.sl,
      tp: updates.tp ?? existingTrade.tp,
      lot: updates.lot ?? existingTrade.lot,
      accountBalance: updates.accountBalance ?? existingTrade.accountBalance ?? 10000,
      entryTime: updates.entryTime ? new Date(updates.entryTime) : existingTrade.entryTime,
      closedTime,
      exitPrice: updates.exitPrice !== undefined ? updates.exitPrice ?? undefined : existingTrade.exitPrice,
      result: updates.result ?? existingTrade.result,
      confirmations: updates.confirmations ?? existingTrade.confirmations,
      risk: updates.risk ?? existingTrade.risk,
      riskPercent: updates.riskPercent ?? existingTrade.riskPercent,
      reward: updates.reward ?? existingTrade.reward,
      rewardPercent: updates.rewardPercent ?? existingTrade.rewardPercent,
      rr: updates.rr ?? existingTrade.rr,
      pnl: updates.pnl ?? existingTrade.pnl,
      pnlPercent: updates.pnlPercent ?? existingTrade.pnlPercent,
      pnlPips: updates.pnlPips ?? existingTrade.pnlPips,
      duration: updates.duration ?? existingTrade.duration,
      sessionAuto: updates.sessionAuto ?? existingTrade.sessionAuto,
      confirmationScore: updates.confirmationScore ?? existingTrade.confirmationScore,
    };

    const recomputedAuto = computeTradeAutoFields(merged);

    Object.assign(existingTrade, updates);
    Object.assign(existingTrade, recomputedAuto);
    if (closedTime) {
      existingTrade.closedTime = closedTime;
      existingTrade.exitTime = closedTime;
    }

    if (updates.tradeSummary?.isManual) {
      existingTrade.tradeSummary = updates.tradeSummary;
    } else if (!existingTrade.tradeSummary?.isManual) {
      const summaryText = buildTradeSummary(existingTrade);
      existingTrade.tradeSummary = {
        text: summaryText,
        isManual: false,
      };
    }

    await existingTrade.save();

    res.json({ success: true, data: existingTrade });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update trade', error: error.message });
  }
});

// DELETE /api/trades/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.scopedUserId;

    const query: Record<string, any> = { _id: id };
    if (userId) query.userId = userId;

    const trade = await Trade.findOneAndDelete(query);
    if (!trade) {
      res.status(404).json({ success: false, message: 'Trade not found' });
      return;
    }

    res.json({ success: true, message: 'Trade deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete trade', error: error.message });
  }
});

// POST /api/trades/:id/regenerate-summary
router.post('/:id/regenerate-summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.scopedUserId;

    const query: Record<string, any> = { _id: id };
    if (userId) query.userId = userId;

    const trade = await Trade.findOne(query);
    if (!trade) {
      res.status(404).json({ success: false, message: 'Trade not found' });
      return;
    }

    const summary = buildTradeSummary(trade);
    trade.tradeSummary = {
      text: summary,
      isManual: false,
    };
    await trade.save();

    res.json({ success: true, data: trade.tradeSummary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to regenerate summary', error: error.message });
  }
});

// POST /api/trades/:id/screenshots
router.post('/:id/screenshots', tradeScreenshotsUpload, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.scopedUserId;

    const query: Record<string, any> = { _id: id };
    if (userId) query.userId = userId;

    const trade = await Trade.findOne(query);
    if (!trade) {
      res.status(404).json({ success: false, message: 'Trade not found' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (!files) {
      res.status(400).json({ success: false, message: 'No screenshot files uploaded' });
      return;
    }

    if (!trade.screenshots) {
      trade.screenshots = { extras: [] };
    }

    if (files.before && files.before[0]) {
      trade.screenshots.before = await processUploadedFile(files.before[0], req);
    }
    if (files.atEntry && files.atEntry[0]) {
      trade.screenshots.atEntry = await processUploadedFile(files.atEntry[0], req);
    }
    if (files.after && files.after[0]) {
      trade.screenshots.after = await processUploadedFile(files.after[0], req);
    }
    if (files.extras && files.extras.length > 0) {
      for (const extraFile of files.extras) {
        const extraUrl = await processUploadedFile(extraFile, req);
        trade.screenshots.extras.push(extraUrl);
      }
    }

    await trade.save();

    res.json({ success: true, data: trade.screenshots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to upload screenshots', error: error.message });
  }
});

export default router;
