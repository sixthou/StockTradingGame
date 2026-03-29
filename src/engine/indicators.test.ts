import { describe, it, expect } from 'vitest';
import { calcMA, calcRSI, calcMACD } from './indicators';

describe('calcMA', () => {
  const closes = [10, 20, 30, 40, 50];

  it('calculates simple moving average correctly', () => {
    const result = calcMA(closes, 3);
    // MA(3) for [10,20,30,40,50] = [null, null, 20, 30, 40]
    expect(result).toEqual([null, null, 20, 30, 40]);
  });

  it('returns all nulls if period > data length', () => {
    const result = calcMA(closes, 10);
    expect(result).toEqual([null, null, null, null, null]);
  });
});

describe('calcRSI', () => {
  // 15 data points to get RSI(14) with at least 1 value
  const closes = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10,
    45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28];

  it('returns array same length as input', () => {
    const result = calcRSI(closes, 14);
    expect(result.length).toBe(closes.length);
  });

  it('first 14 values are null', () => {
    const result = calcRSI(closes, 14);
    for (let i = 0; i < 14; i++) {
      expect(result[i]).toBeNull();
    }
  });

  it('RSI is between 0 and 100', () => {
    const result = calcRSI(closes, 14);
    for (const v of result) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('calcMACD', () => {
  const closes = Array.from({ length: 35 }, (_, i) => 100 + Math.sin(i / 3) * 10);

  it('returns macd, signal, histogram arrays of same length', () => {
    const { macd, signal, histogram } = calcMACD(closes);
    expect(macd.length).toBe(closes.length);
    expect(signal.length).toBe(closes.length);
    expect(histogram.length).toBe(closes.length);
  });

  it('histogram equals macd minus signal where both exist', () => {
    const { macd, signal, histogram } = calcMACD(closes);
    for (let i = 0; i < closes.length; i++) {
      if (macd[i] !== null && signal[i] !== null && histogram[i] !== null) {
        expect(histogram[i]).toBeCloseTo(macd[i]! - signal[i]!, 10);
      }
    }
  });
});
