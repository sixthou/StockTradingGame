import { describe, it, expect } from 'vitest';
import { aggregateCandles } from './aggregator';
import { IntradayCandle } from '../types';

function makeCandle(time: number, price: number, vol: number): IntradayCandle {
  return { time, open: price, high: price + 10, low: price - 10, close: price + 5, volume: vol };
}

describe('aggregateCandles', () => {
  const base = new Date('2024-03-15T09:00:00').getTime() / 1000;
  const candles: IntradayCandle[] = [];
  for (let i = 0; i < 10; i++) {
    candles.push(makeCandle(base + i * 60, 100 + i, 1000));
  }

  it('aggregates 10 one-minute candles into 2 five-minute candles', () => {
    const result = aggregateCandles(candles, 5);
    expect(result.length).toBe(2);
  });

  it('aggregated candle open equals first sub-candle open', () => {
    const result = aggregateCandles(candles, 5);
    expect(result[0].open).toBe(candles[0].open);
  });

  it('aggregated candle close equals last sub-candle close', () => {
    const result = aggregateCandles(candles, 5);
    expect(result[0].close).toBe(candles[4].close);
  });

  it('aggregated candle high is max of sub-candle highs', () => {
    const result = aggregateCandles(candles, 5);
    const expectedHigh = Math.max(...candles.slice(0, 5).map(c => c.high));
    expect(result[0].high).toBe(expectedHigh);
  });

  it('aggregated candle low is min of sub-candle lows', () => {
    const result = aggregateCandles(candles, 5);
    const expectedLow = Math.min(...candles.slice(0, 5).map(c => c.low));
    expect(result[0].low).toBe(expectedLow);
  });

  it('aggregated volume is sum of sub-candle volumes', () => {
    const result = aggregateCandles(candles, 5);
    expect(result[0].volume).toBe(5000);
  });

  it('returns original candles for period=1', () => {
    const result = aggregateCandles(candles, 1);
    expect(result.length).toBe(10);
    expect(result[0]).toEqual(candles[0]);
  });
});
