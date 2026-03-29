import type { CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { DailyCandle } from '../types';

function candleColor(candle: DailyCandle): string {
  return candle.close >= candle.open ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)';
}

export function buildCombinedData(
  preGame: DailyCandle[],
  gameDailyAll: DailyCandle[],
  dayIndex: number,
): { candles: CandlestickData<Time>[]; volumes: HistogramData<Time>[] } {
  const visibleGameCandles = dayIndex >= 0 ? gameDailyAll.slice(0, dayIndex + 1) : [];
  const all = [...preGame, ...visibleGameCandles];

  return {
    candles: all.map((candle) => ({
      time: candle.date as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })),
    volumes: all.map((candle) => ({
      time: candle.date as Time,
      value: candle.volume,
      color: candleColor(candle),
    })),
  };
}
