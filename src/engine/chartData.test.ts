import { describe, it, expect } from 'vitest';
import { buildCombinedData } from './chartData';
import { DailyCandle } from '../types';

function makeDaily(date: string, price = 100): DailyCandle {
  return { date, open: price, high: price + 5, low: price - 5, close: price, volume: 1000 };
}

const preGame = [makeDaily('2021-12-20'), makeDaily('2021-12-21')];
const gameDaily = [
  makeDaily('2024-01-02'),
  makeDaily('2024-01-03'),
  makeDaily('2024-01-04'),
];

describe('buildCombinedData', () => {
  it('returns pre-game candles plus visible game candles up to dayIndex', () => {
    const { candles } = buildCombinedData(preGame, gameDaily, 1);
    expect(candles.length).toBe(4);
    expect(candles[0].time).toBe('2021-12-20');
    expect(candles[3].time).toBe('2024-01-03');
  });

  it('does not expose future game candles', () => {
    const { candles } = buildCombinedData(preGame, gameDaily, 0);
    expect(candles.map((c) => c.time)).toEqual(['2021-12-20', '2021-12-21', '2024-01-02']);
  });

  it('keeps volume points aligned with candles', () => {
    const { candles, volumes } = buildCombinedData(preGame, gameDaily, 2);
    expect(volumes.length).toBe(candles.length);
    expect(volumes[volumes.length - 1].time).toBe(candles[candles.length - 1].time);
  });
});
