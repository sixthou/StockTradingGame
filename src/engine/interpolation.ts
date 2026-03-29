import { DailyCandle, IntradayCandle } from '../types';

type Market = 'KR' | 'US';

const MARKET_MINUTES = 390; // Both KR (09:00-15:30) and US (09:30-16:00) have 390 trading minutes

function marketStartMinute(market: Market): number {
  return market === 'KR' ? 9 * 60 : 9 * 60 + 30; // 540 or 570
}

/**
 * Brownian Bridge: generate a path from start to end value over n steps,
 * constrained within [low, high].
 */
function brownianBridge(
  n: number,
  start: number,
  end: number,
  low: number,
  high: number,
  highIdx: number,
  lowIdx: number,
): number[] {
  const path = new Array(n).fill(0);
  path[0] = start;
  path[n - 1] = end;

  // Place high and low at their designated indices
  if (highIdx > 0 && highIdx < n - 1) path[highIdx] = high;
  if (lowIdx > 0 && lowIdx < n - 1) path[lowIdx] = low;

  // Fill gaps with interpolated random walk
  const filledIndices = new Set([0, n - 1]);
  if (highIdx > 0 && highIdx < n - 1) filledIndices.add(highIdx);
  if (lowIdx > 0 && lowIdx < n - 1) filledIndices.add(lowIdx);

  const sorted = Array.from(filledIndices).sort((a, b) => a - b);

  for (let seg = 0; seg < sorted.length - 1; seg++) {
    const iStart = sorted[seg];
    const iEnd = sorted[seg + 1];
    const vStart = path[iStart];
    const vEnd = path[iEnd];
    const segLen = iEnd - iStart;

    for (let i = 1; i < segLen; i++) {
      const t = i / segLen;
      const mean = vStart * (1 - t) + vEnd * t;
      const variance = (1 - t) * t * segLen * 0.01;
      const noise = gaussianRandom() * Math.sqrt(variance) * (high - low) * 0.05;
      let value = mean + noise;
      value = Math.max(low, Math.min(high, value));
      path[iStart + i] = value;
    }
  }

  return path;
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * U-shaped volume distribution: higher at open/close, lower in middle.
 */
function distributeVolume(totalVolume: number, n: number): number[] {
  const volumes = new Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0 to 1
    const weight = 2.0 - 3.0 * t * (1 - t) * 4; // U-shape
    const w = Math.max(0.3, weight);
    volumes[i] = w;
    sum += w;
  }
  for (let i = 0; i < n; i++) {
    volumes[i] = Math.round((volumes[i] / sum) * totalVolume);
  }
  // Adjust rounding error on last element
  const currentTotal = volumes.reduce((a: number, b: number) => a + b, 0);
  volumes[n - 1] += totalVolume - currentTotal;
  return volumes;
}

export function generateIntradayPrices(
  daily: DailyCandle,
  market: Market,
): IntradayCandle[] {
  const n = MARKET_MINUTES;
  const { open, high, low, close, volume } = daily;

  // Decide where high and low occur (random, but high before low or vice versa)
  const highFirst = Math.random() > 0.5;
  const firstExtreme = Math.floor(Math.random() * (n * 0.6)) + Math.floor(n * 0.1);
  const secondExtreme = Math.floor(Math.random() * (n * 0.6)) + Math.floor(n * 0.3);
  const highIdx = highFirst ? Math.min(firstExtreme, secondExtreme) : Math.max(firstExtreme, secondExtreme);
  const lowIdx = highFirst ? Math.max(firstExtreme, secondExtreme) : Math.min(firstExtreme, secondExtreme);

  const pricePath = brownianBridge(n, open, close, low, high, highIdx, lowIdx);
  const volumes = distributeVolume(volume, n);

  const startMin = marketStartMinute(market);
  const dateObj = new Date(daily.date + 'T00:00:00');

  const candles: IntradayCandle[] = [];
  for (let i = 0; i < n; i++) {
    const currentPrice = pricePath[i];
    const nextPrice = i < n - 1 ? pricePath[i + 1] : currentPrice;
    const candleOpen = currentPrice;
    const candleClose = nextPrice;
    const candleHigh = Math.max(candleOpen, candleClose) * (1 + Math.random() * 0.001);
    const candleLow = Math.min(candleOpen, candleClose) * (1 - Math.random() * 0.001);

    const minuteOfDay = startMin + i;
    const hours = Math.floor(minuteOfDay / 60);
    const mins = minuteOfDay % 60;
    const timestamp = new Date(dateObj);
    timestamp.setHours(hours, mins, 0, 0);

    candles.push({
      time: Math.floor(timestamp.getTime() / 1000),
      open: Math.round(candleOpen),
      high: Math.min(high, Math.round(candleHigh)),
      low: Math.max(low, Math.round(candleLow)),
      close: Math.round(candleClose),
      volume: volumes[i],
    });
  }

  // Ensure last candle closes at daily close
  candles[n - 1].close = close;

  return candles;
}
