import { describe, it, expect } from 'vitest';
import { generateIntradayPrices } from './interpolation';
import { DailyCandle } from '../types';

describe('generateIntradayPrices', () => {
  const candle: DailyCandle = {
    date: '2024-03-15',
    open: 70000,
    high: 73000,
    low: 69000,
    close: 72000,
    volume: 1000000,
  };

  it('generates correct number of minute candles for Korean market (390 min)', () => {
    const result = generateIntradayPrices(candle, 'KR');
    expect(result.length).toBe(390);
  });

  it('generates correct number of minute candles for US market (390 min)', () => {
    const result = generateIntradayPrices(candle, 'US');
    expect(result.length).toBe(390);
  });

  it('first candle opens at daily open price', () => {
    const result = generateIntradayPrices(candle, 'KR');
    expect(result[0].open).toBe(70000);
  });

  it('last candle closes at daily close price', () => {
    const result = generateIntradayPrices(candle, 'KR');
    expect(result[result.length - 1].close).toBe(72000);
  });

  it('all prices stay within daily high/low range', () => {
    const result = generateIntradayPrices(candle, 'KR');
    for (const c of result) {
      expect(c.high).toBeLessThanOrEqual(73000);
      expect(c.low).toBeGreaterThanOrEqual(69000);
      expect(c.open).toBeLessThanOrEqual(73000);
      expect(c.open).toBeGreaterThanOrEqual(69000);
      expect(c.close).toBeLessThanOrEqual(73000);
      expect(c.close).toBeGreaterThanOrEqual(69000);
    }
  });

  it('reaches daily high at some point', () => {
    const result = generateIntradayPrices(candle, 'KR');
    const maxHigh = Math.max(...result.map(c => c.high));
    expect(maxHigh).toBeCloseTo(73000, -1);
  });

  it('reaches daily low at some point', () => {
    const result = generateIntradayPrices(candle, 'KR');
    const minLow = Math.min(...result.map(c => c.low));
    expect(minLow).toBeCloseTo(69000, -1);
  });

  it('total volume equals daily volume', () => {
    const result = generateIntradayPrices(candle, 'KR');
    const totalVol = result.reduce((sum, c) => sum + c.volume, 0);
    expect(totalVol).toBeCloseTo(1000000, -2);
  });

  it('generates different paths on repeated calls', () => {
    const result1 = generateIntradayPrices(candle, 'KR');
    const result2 = generateIntradayPrices(candle, 'KR');
    const prices1 = result1.map(c => c.close);
    const prices2 = result2.map(c => c.close);
    expect(prices1).not.toEqual(prices2);
  });
});
