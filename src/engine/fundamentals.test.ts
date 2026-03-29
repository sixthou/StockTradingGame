import { describe, it, expect } from 'vitest';
import { calcPE, calcPBR } from './fundamentals';

describe('calcPE', () => {
  it('calculates trailing P/E from price and EPS', () => {
    expect(calcPE(50000, 5000)).toBe(10.00);
  });

  it('rounds to 2 decimal places', () => {
    expect(calcPE(10000, 3000)).toBe(3.33);
  });

  it('returns null when eps is null', () => {
    expect(calcPE(50000, null)).toBeNull();
  });

  it('returns null when eps is 0 (division by zero)', () => {
    expect(calcPE(50000, 0)).toBeNull();
  });

  it('returns negative P/E for negative EPS (loss-making company)', () => {
    expect(calcPE(50000, -5000)).toBe(-10.00);
  });
});

describe('calcPBR', () => {
  it('calculates PBR from price and BPS', () => {
    expect(calcPBR(50000, 25000)).toBe(2.00);
  });

  it('rounds to 2 decimal places', () => {
    expect(calcPBR(10000, 3000)).toBe(3.33);
  });

  it('returns null when bps is null', () => {
    expect(calcPBR(50000, null)).toBeNull();
  });

  it('returns null when bps is 0 (division by zero)', () => {
    expect(calcPBR(50000, 0)).toBeNull();
  });
});
