import { describe, it, expect } from 'vitest';
import {
  computeTradeAutoFields,
  deriveSession,
  calculateDurationInMinutes,
  calculateConfirmationScore,
  getPairConfig,
} from './calcService.js';

describe('calcService', () => {
  it('correctly retrieves pair configurations for forex and gold', () => {
    const eurusd = getPairConfig('EUR/USD');
    expect(eurusd.pipSize).toBe(0.0001);
    expect(eurusd.contractSize).toBe(100000);

    const xauusd = getPairConfig('XAU/USD');
    expect(xauusd.pipSize).toBe(0.1);
    expect(xauusd.contractSize).toBe(100);
  });

  it('calculates risk ($), reward ($), and percentages based on account balance', () => {
    const result = computeTradeAutoFields({
      pair: 'EUR/USD',
      direction: 'Buy',
      entry: 1.0800,
      sl: 1.0750, // 50 pips risk = $500
      tp: 1.0900, // 100 pips reward = $1000
      lot: 1,
      accountBalance: 25000,
      entryTime: new Date('2026-11-13T09:00:00Z'),
    });

    expect(result.risk.value).toBe(500);
    // $500 / $25,000 = 2.0%
    expect(result.riskPercent.value).toBe(2);
    expect(result.reward.value).toBe(1000);
    // $1000 / $25,000 = 4.0%
    expect(result.rewardPercent.value).toBe(4);
    expect(result.rr.value).toBe(2);
  });

  it('respects isManual=true and does not overwrite user edits', () => {
    const result = computeTradeAutoFields({
      pair: 'EUR/USD',
      direction: 'Buy',
      entry: 1.0800,
      sl: 1.0750,
      tp: 1.0900,
      lot: 1,
      accountBalance: 10000,
      entryTime: new Date('2026-11-13T09:00:00Z'),
      risk: { value: 750, isManual: true },
      rr: { value: 1.33, isManual: true },
    });

    expect(result.risk.value).toBe(750);
    expect(result.risk.isManual).toBe(true);
    expect(result.rr.value).toBe(1.33);
    expect(result.rr.isManual).toBe(true);
  });

  it('calculates P/L ($) and P/L (%) on Win for Sell trades', () => {
    const winResult = computeTradeAutoFields({
      pair: 'EUR/USD',
      direction: 'Sell',
      entry: 1.0900,
      sl: 1.0950,
      tp: 1.0800,
      lot: 1,
      accountBalance: 10000,
      entryTime: new Date('2026-11-13T09:00:00Z'),
      closedTime: new Date('2026-11-13T11:00:00Z'),
      result: 'Win',
      exitPrice: 1.0800,
    });

    expect(winResult.pnl.value).toBe(1000);
    expect(winResult.pnlPercent.value).toBe(10); // $1000 / $10,000 = 10%
    expect(winResult.duration.value).toBe(120);
  });
});
