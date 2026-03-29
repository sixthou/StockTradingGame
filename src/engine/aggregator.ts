import { IntradayCandle } from '../types';

export function aggregateCandles(
  candles: IntradayCandle[],
  periodMinutes: number,
): IntradayCandle[] {
  if (periodMinutes <= 1 || candles.length === 0) return [...candles];

  const result: IntradayCandle[] = [];
  for (let i = 0; i < candles.length; i += periodMinutes) {
    const chunk = candles.slice(i, i + periodMinutes);
    if (chunk.length === 0) break;

    result.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  return result;
}
