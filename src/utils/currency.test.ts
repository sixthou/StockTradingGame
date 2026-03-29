import { describe, expect, it } from 'vitest';
import { formatSignedUsd, formatUsd, parseWholeDollarInput } from './currency';

describe('currency utils', () => {
  it('formats values as USD with grouping separators', () => {
    expect(formatUsd(1000000)).toBe('$1,000,000');
    expect(formatUsd(1234.56)).toBe('$1,234.56');
  });

  it('formats signed USD values', () => {
    expect(formatSignedUsd(2500)).toBe('+$2,500');
    expect(formatSignedUsd(-2500)).toBe('-$2,500');
    expect(formatSignedUsd(0)).toBe('$0');
  });

  it('parses formatted whole-dollar input back to numbers', () => {
    expect(parseWholeDollarInput('$10,000,000')).toBe(10000000);
    expect(parseWholeDollarInput('12abc34')).toBe(1234);
    expect(parseWholeDollarInput('')).toBe(0);
  });
});
