import { describe, it, expect } from 'vitest';
import { buildTradeSummary } from './summaryService.js';

describe('summaryService', () => {
  it('generates a coherent multi-sentence paragraph from full trade details', () => {
    const summary = buildTradeSummary({
      tradeNumber: 14,
      direction: 'Buy',
      pair: 'XAU/USD',
      session: 'London',
      date: new Date('2026-11-13T09:00:00Z'),
      entryTF: '5M',
      analysisTF: ['15M', '1H'],
      marketStructure: 'Uptrend',
      htfDirection: 'Bullish',
      entryLocation: 'a support zone',
      liquidityTaken: 'Yes',
      volumeCondition: 'increasing',
      confirmations: ['bullish engulfing candle', 'strong close'],
      risk: { value: 5 },
      reward: { value: 10 },
      rr: { value: 2 },
      result: 'Win',
      pnl: { value: 10 },
      executionQuality: 'Good',
      exitReason: 'TP',
      psychology: {
        patient: 'Yes',
        followedPlan: 'Yes',
        fomo: 'No',
        revenge: 'No',
        emotion: 'Confident',
        rating: 4,
      },
      lesson: 'wait for confirmed 5M candle close before entering.',
    });

    expect(summary).toContain('Trade #014 was a BUY on XAU/USD');
    expect(summary).toContain('during the London session');
    expect(summary).toContain('5M entry timeframe');
    expect(summary).toContain('Market structure was uptrend with a bullish HTF bias');
    expect(summary).toContain('entry was taken at a support zone after a liquidity sweep');
    expect(summary).toContain('Risk was $5 for a $10 reward (1:2).');
    expect(summary).toContain('closed as a Win, with +$10 P/L');
    expect(summary).toContain('Psychologically, the trader was patient');
    expect(summary).toContain('avoided FOMO and revenge trading');
    expect(summary).toContain('Lesson learned: wait for confirmed 5M candle close before entering.');
  });

  it('skips missing fields gracefully without undefined or broken grammar', () => {
    const summary = buildTradeSummary({
      tradeNumber: 1,
      direction: 'Sell',
      pair: 'EUR/USD',
    });

    expect(summary).toContain('Trade #001 was a SELL on EUR/USD');
    expect(summary).not.toContain('undefined');
    expect(summary).not.toContain('null');
  });
});
