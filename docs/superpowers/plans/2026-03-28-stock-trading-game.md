# Stock Trading Simulation Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based stock trading simulation game where users practice buy/sell decisions using historical data with intraday price interpolation.

**Architecture:** React SPA with Vite + TypeScript. No backend — all data fetched client-side via CORS proxy from Yahoo Finance. Game state persisted in localStorage. TradingView Lightweight Charts for candlestick/volume rendering. Brownian Bridge algorithm generates intraday prices from daily OHLC.

**Tech Stack:** React 18, Vite, TypeScript, lightweight-charts, zustand (state management — simpler than Context+useReducer for this scale)

---

## File Structure

```
Stock/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx                          # React entry point
│   ├── App.tsx                           # Router: StartScreen | GameScreen | ResultScreen
│   ├── types/
│   │   └── index.ts                      # All TypeScript interfaces
│   ├── engine/
│   │   ├── interpolation.ts              # Brownian Bridge intraday price generation
│   │   ├── interpolation.test.ts         # Tests for interpolation
│   │   ├── aggregator.ts                 # 1min candles → 5m/15m/30m/1h aggregation
│   │   ├── aggregator.test.ts            # Tests for aggregator
│   │   ├── indicators.ts                 # MA, RSI, MACD calculations
│   │   ├── indicators.test.ts            # Tests for indicators
│   │   └── fundamentals.ts              # P/E, PBR calculation from EPS/BPS + price
│   ├── data/
│   │   ├── yahooFinance.ts               # Fetch daily OHLC via CORS proxy
│   │   ├── yahooFinance.test.ts          # Tests with mocked fetch
│   │   ├── events.ts                     # Market events (earnings, dividends, rate decisions)
│   │   └── challenges.ts                 # Hardcoded challenge definitions
│   ├── state/
│   │   ├── gameStore.ts                  # Zustand store: game state, actions
│   │   ├── gameStore.test.ts             # Tests for store actions
│   │   └── storage.ts                    # localStorage save/load helpers
│   ├── components/
│   │   ├── StartScreen.tsx               # Game setup: stock search, date, cash, mode
│   │   ├── GameScreen.tsx                # Main game layout (classic trading layout)
│   │   ├── ChartPanel.tsx                # TradingView chart + timeframe buttons + indicator toggles
│   │   ├── PortfolioPanel.tsx            # Cash, holdings, P&L, fundamentals, salary countdown
│   │   ├── TradePanel.tsx                # Buy/Sell buttons, qty input, memo textarea
│   │   ├── EventPanel.tsx                # Upcoming market events list
│   │   ├── TimeControls.tsx              # Play/pause, speed, prev/next day
│   │   ├── TopBar.tsx                    # Stock name, price, change%, date/time/speed
│   │   ├── DayReviewModal.tsx            # End-of-day summary modal
│   │   ├── ResultScreen.tsx              # Performance metrics + trade timeline chart
│   │   └── ChallengeList.tsx             # Challenge selection grid
│   └── styles/
│       └── theme.ts                      # Pro Dark color tokens
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `Stock/package.json`
- Create: `Stock/tsconfig.json`
- Create: `Stock/vite.config.ts`
- Create: `Stock/index.html`
- Create: `Stock/src/main.tsx`
- Create: `Stock/src/App.tsx`
- Create: `Stock/src/styles/theme.ts`

- [ ] **Step 1: Initialize project with Vite**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npm create vite@latest . -- --template react-ts
```

Select "Ignore files and continue" if prompted about existing files.

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npm install lightweight-charts zustand
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest in vite.config.ts**

Replace `Stock/vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
})
```

- [ ] **Step 4: Create Pro Dark theme tokens**

Create `Stock/src/styles/theme.ts`:

```typescript
export const theme = {
  bg: {
    primary: '#0d1117',
    panel: '#161b22',
  },
  border: '#21262d',
  radius: '6px',
  accent: '#1f6feb',
  up: '#3fb950',
  down: '#f85149',
  text: {
    primary: '#f0f6fc',
    secondary: '#c9d1d9',
    muted: '#6e7681',
  },
} as const;
```

- [ ] **Step 5: Create App shell with placeholder screens**

Replace `Stock/src/App.tsx` with:

```typescript
import { useState } from 'react';
import { theme } from './styles/theme';

type Screen = 'start' | 'game' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');

  return (
    <div style={{
      backgroundColor: theme.bg.primary,
      color: theme.text.primary,
      minHeight: '100vh',
      fontFamily: "'SF Mono', 'Fira Code', monospace",
    }}>
      {screen === 'start' && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h1>Stock Trading Game</h1>
          <button onClick={() => setScreen('game')}
            style={{ background: theme.accent, color: 'white', border: 'none', padding: '8px 24px', borderRadius: theme.radius, cursor: 'pointer' }}>
            Start Game
          </button>
        </div>
      )}
      {screen === 'game' && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h1>Game Screen</h1>
          <button onClick={() => setScreen('result')}
            style={{ background: theme.accent, color: 'white', border: 'none', padding: '8px 24px', borderRadius: theme.radius, cursor: 'pointer' }}>
            End Game
          </button>
        </div>
      )}
      {screen === 'result' && (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h1>Results</h1>
          <button onClick={() => setScreen('start')}
            style={{ background: theme.accent, color: 'white', border: 'none', padding: '8px 24px', borderRadius: theme.radius, cursor: 'pointer' }}>
            New Game
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify the app runs**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npm run dev
```

Expected: Dev server starts, browser shows "Stock Trading Game" heading with Start Game button on dark background.

- [ ] **Step 7: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add -A
git commit -m "feat: scaffold React+Vite project with Pro Dark theme"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `Stock/src/types/index.ts`

- [ ] **Step 1: Define all game types**

Create `Stock/src/types/index.ts`:

```typescript
export interface GameConfig {
  stockSymbol: string;
  startDate: string;
  initialCash: number;
  monthlySalary: number;
  salaryDay: number;
  mode: 'free' | 'challenge';
  challengeId?: string;
}

export interface Holding {
  qty: number;
  avgPrice: number;
}

export interface Portfolio {
  cash: number;
  holdings: Holding;
  totalInvested: number;
  trades: Trade[];
}

export interface Trade {
  type: 'buy' | 'sell';
  price: number;
  qty: number;
  timestamp: string;
  memo: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  initialCash: number;
  targetReturn: number;
  maxDays: number;
  stockSymbol?: string;
  startDate?: string;
}

export interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IntradayCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketEvent {
  date: string;
  type: 'earnings' | 'dividend' | 'rate_decision';
  description: string;
  data?: {
    eps?: number;
    bps?: number;
    dividendAmount?: number;
  };
}

export type TimeframeKey = '1m' | '5m' | '15m' | '30m' | '1h' | '1D';

export interface GameState {
  config: GameConfig | null;
  portfolio: Portfolio;
  currentDate: string;
  currentMinute: number;
  dayIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  dailyCandles: DailyCandle[];
  intradayCandles: IntradayCandle[];
  events: MarketEvent[];
  screen: 'start' | 'game' | 'result';
  selectedTimeframe: TimeframeKey;
  indicators: {
    ma: boolean;
    rsi: boolean;
    macd: boolean;
  };
  currentEps: number | null;
  currentBps: number | null;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions for game state"
```

---

### Task 3: Intraday Price Interpolation Engine

**Files:**
- Create: `Stock/src/engine/interpolation.ts`
- Create: `Stock/src/engine/interpolation.test.ts`

- [ ] **Step 1: Write failing tests for interpolation**

Create `Stock/src/engine/interpolation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateIntradayPrices } from './interpolation';
import { DailyCandle, IntradayCandle } from '../types';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/engine/interpolation.test.ts
```

Expected: FAIL — `generateIntradayPrices` is not exported / does not exist.

- [ ] **Step 3: Implement Brownian Bridge interpolation**

Create `Stock/src/engine/interpolation.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/engine/interpolation.test.ts
```

Expected: All 8 tests PASS. If `reaches daily high/low` tests are flaky due to rounding, adjust `toBeCloseTo` precision.

- [ ] **Step 5: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/engine/interpolation.ts src/engine/interpolation.test.ts
git commit -m "feat: add Brownian Bridge intraday price interpolation engine"
```

---

### Task 4: Candle Aggregator

**Files:**
- Create: `Stock/src/engine/aggregator.ts`
- Create: `Stock/src/engine/aggregator.test.ts`

- [ ] **Step 1: Write failing tests for aggregator**

Create `Stock/src/engine/aggregator.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/engine/aggregator.test.ts
```

Expected: FAIL — `aggregateCandles` does not exist.

- [ ] **Step 3: Implement aggregator**

Create `Stock/src/engine/aggregator.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/engine/aggregator.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/engine/aggregator.ts src/engine/aggregator.test.ts
git commit -m "feat: add candle aggregator for timeframe conversion"
```

---

### Task 5: Technical Indicators (MA, RSI, MACD)

**Files:**
- Create: `Stock/src/engine/indicators.ts`
- Create: `Stock/src/engine/indicators.test.ts`

- [ ] **Step 1: Write failing tests for indicators**

Create `Stock/src/engine/indicators.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/engine/indicators.test.ts
```

Expected: FAIL — functions not found.

- [ ] **Step 3: Implement indicators**

Create `Stock/src/engine/indicators.ts`:

```typescript
export function calcMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      result.push(slice.reduce((a, b) => a + b, 0) / period);
    }
  }
  return result;
}

function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prev = sma;
      result.push(sma);
    } else {
      const val = data[i] * k + prev! * (1 - k);
      prev = val;
      result.push(val);
    }
  }
  return result;
}

export function calcRSI(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }

    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);

    if (i < period) {
      result.push(null);
    } else if (i === period) {
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      }
    } else {
      const prevRsi = result[i - 1];
      if (prevRsi === null) {
        result.push(null);
        continue;
      }
      // Use smoothed averages
      const prevAvgGain = gains.slice(i - period - 1, i - 1).reduce((a, b) => a + b, 0) / period;
      const prevAvgLoss = losses.slice(i - period - 1, i - 1).reduce((a, b) => a + b, 0) / period;
      const avgGain = (prevAvgGain * (period - 1) + gains[i - 1]) / period;
      const avgLoss = (prevAvgLoss * (period - 1) + losses[i - 1]) / period;
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
      }
    }
  }

  return result;
}

export function calcMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9,
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  const macdLine: (number | null)[] = fastEma.map((f, i) => {
    const s = slowEma[i];
    return f !== null && s !== null ? f - s : null;
  });

  const macdValues = macdLine.filter((v): v is number => v !== null);
  const signalEma = ema(macdValues, signalPeriod);

  const signal: (number | null)[] = new Array(closes.length).fill(null);
  let macdIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] !== null) {
      signal[i] = signalEma[macdIdx] ?? null;
      macdIdx++;
    }
  }

  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = signal[i];
    return m !== null && s !== null ? m - s : null;
  });

  return { macd: macdLine, signal, histogram };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/engine/indicators.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/engine/indicators.ts src/engine/indicators.test.ts
git commit -m "feat: add technical indicators (MA, RSI, MACD)"
```

---

### Task 6: Fundamentals Calculator

**Files:**
- Create: `Stock/src/engine/fundamentals.ts`

- [ ] **Step 1: Implement P/E and PBR calculation**

Create `Stock/src/engine/fundamentals.ts`:

```typescript
export function calcPE(price: number, eps: number | null): number | null {
  if (eps === null || eps === 0) return null;
  return Math.round((price / eps) * 100) / 100;
}

export function calcPBR(price: number, bps: number | null): number | null {
  if (bps === null || bps === 0) return null;
  return Math.round((price / bps) * 100) / 100;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/engine/fundamentals.ts
git commit -m "feat: add P/E and PBR fundamental calculators"
```

---

### Task 7: Yahoo Finance Data Fetcher

**Files:**
- Create: `Stock/src/data/yahooFinance.ts`
- Create: `Stock/src/data/yahooFinance.test.ts`

- [ ] **Step 1: Write failing tests with mocked fetch**

Create `Stock/src/data/yahooFinance.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDailyCandles, searchSymbol } from './yahooFinance';

const mockChartResponse = {
  chart: {
    result: [{
      timestamp: [1710460800, 1710547200],
      indicators: {
        quote: [{
          open: [70000, 71000],
          high: [73000, 72000],
          low: [69000, 70500],
          close: [72000, 71500],
          volume: [1000000, 800000],
        }],
      },
    }],
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchDailyCandles', () => {
  it('parses Yahoo Finance chart response into DailyCandle array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockChartResponse),
    }));

    const result = await fetchDailyCandles('005930.KS', '2024-01-01', '2024-03-15');
    expect(result.length).toBe(2);
    expect(result[0].open).toBe(70000);
    expect(result[0].close).toBe(72000);
    expect(result[0].volume).toBe(1000000);
  });

  it('throws on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    await expect(fetchDailyCandles('INVALID', '2024-01-01', '2024-03-15'))
      .rejects.toThrow();
  });
});

describe('searchSymbol', () => {
  it('returns matching symbols from Yahoo Finance search', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        quotes: [
          { symbol: '005930.KS', shortname: 'Samsung Electronics', exchange: 'KSC' },
          { symbol: 'SSNLF', shortname: 'Samsung Electronics', exchange: 'PNK' },
        ],
      }),
    }));

    const result = await searchSymbol('samsung');
    expect(result.length).toBe(2);
    expect(result[0].symbol).toBe('005930.KS');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/data/yahooFinance.test.ts
```

Expected: FAIL — functions not found.

- [ ] **Step 3: Implement Yahoo Finance fetcher**

Create `Stock/src/data/yahooFinance.ts`:

```typescript
import { DailyCandle } from '../types';

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

function proxyUrl(url: string): string {
  return CORS_PROXY + encodeURIComponent(url);
}

export async function fetchDailyCandles(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<DailyCandle[]> {
  const period1 = Math.floor(new Date(startDate).getTime() / 1000);
  const period2 = Math.floor(new Date(endDate).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

  const response = await fetch(proxyUrl(url));
  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${symbol}: ${response.status}`);
  }

  const data = await response.json();
  const result = data.chart.result[0];
  const { timestamp, indicators } = result;
  const quote = indicators.quote[0];

  const candles: DailyCandle[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    if (quote.open[i] == null) continue;
    const d = new Date(timestamp[i] * 1000);
    candles.push({
      date: d.toISOString().split('T')[0],
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i],
    });
  }

  return candles;
}

export interface SymbolSearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
}

export async function searchSymbol(query: string): Promise<SymbolSearchResult[]> {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;

  const response = await fetch(proxyUrl(url));
  if (!response.ok) {
    throw new Error(`Symbol search failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.quotes || []).map((q: any) => ({
    symbol: q.symbol,
    shortname: q.shortname || q.longname || q.symbol,
    exchange: q.exchange || '',
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/data/yahooFinance.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/data/yahooFinance.ts src/data/yahooFinance.test.ts
git commit -m "feat: add Yahoo Finance data fetcher with CORS proxy"
```

---

### Task 8: Challenge Definitions & Market Events

**Files:**
- Create: `Stock/src/data/challenges.ts`
- Create: `Stock/src/data/events.ts`

- [ ] **Step 1: Create challenge definitions**

Create `Stock/src/data/challenges.ts`:

```typescript
import { Challenge } from '../types';

export const challenges: Challenge[] = [
  {
    id: 'first-profit',
    title: '첫 수익 내기',
    description: '30일 안에 1% 이상 수익을 달성하세요.',
    initialCash: 10_000_000,
    targetReturn: 0.01,
    maxDays: 30,
  },
  {
    id: 'short-term-trader',
    title: '단기 트레이더',
    description: '14일 안에 10% 수익을 달성하세요.',
    initialCash: 5_000_000,
    targetReturn: 0.10,
    maxDays: 14,
  },
  {
    id: 'crisis-escape',
    title: '위기 탈출',
    description: '2008년 금융위기 속에서 60일간 손실 없이 생존하세요.',
    initialCash: 10_000_000,
    targetReturn: 0,
    maxDays: 60,
    startDate: '2008-09-01',
  },
  {
    id: 'dividend-investor',
    title: '배당 투자자',
    description: '365일 안에 배당을 3회 수령하세요.',
    initialCash: 20_000_000,
    targetReturn: 0,
    maxDays: 365,
  },
];
```

- [ ] **Step 2: Create market events module**

Create `Stock/src/data/events.ts`:

```typescript
import { MarketEvent } from '../types';

/**
 * Fetches market events for a symbol within a date range.
 * For now, this returns earnings/dividend data from Yahoo Finance calendar.
 * Falls back to empty array on failure.
 */
export async function fetchMarketEvents(
  symbol: string,
  startDate: string,
  endDate: string,
): Promise<MarketEvent[]> {
  // Yahoo Finance calendar endpoint for earnings/dividends
  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${
      Math.floor(new Date(startDate).getTime() / 1000)
    }&period2=${
      Math.floor(new Date(endDate).getTime() / 1000)
    }&interval=1d&events=div,earnings`;

    const response = await fetch(CORS_PROXY + encodeURIComponent(url));
    if (!response.ok) return [];

    const data = await response.json();
    const result = data.chart.result?.[0];
    const events: MarketEvent[] = [];

    // Parse dividend events
    const dividends = result?.events?.dividends;
    if (dividends) {
      for (const [, div] of Object.entries(dividends) as [string, any][]) {
        const date = new Date(div.date * 1000).toISOString().split('T')[0];
        events.push({
          date,
          type: 'dividend',
          description: `배당금: ${div.amount}`,
          data: { dividendAmount: div.amount },
        });
      }
    }

    // Parse earnings events
    const earnings = result?.events?.earnings;
    if (earnings) {
      for (const [, earn] of Object.entries(earnings) as [string, any][]) {
        const date = new Date(earn.date * 1000).toISOString().split('T')[0];
        events.push({
          date,
          type: 'earnings',
          description: `실적 발표 (EPS: ${earn.epsActual ?? 'N/A'})`,
          data: { eps: earn.epsActual },
        });
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/data/challenges.ts src/data/events.ts
git commit -m "feat: add challenge definitions and market events fetcher"
```

---

### Task 9: Game State Store (Zustand)

**Files:**
- Create: `Stock/src/state/storage.ts`
- Create: `Stock/src/state/gameStore.ts`
- Create: `Stock/src/state/gameStore.test.ts`

- [ ] **Step 1: Create localStorage helpers**

Create `Stock/src/state/storage.ts`:

```typescript
const STORAGE_KEY = 'stock-trading-game-state';

export function saveToStorage(state: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function loadFromStorage<T>(): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 2: Write failing tests for game store**

Create `Stock/src/state/gameStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('starts with null config and start screen', () => {
    const state = useGameStore.getState();
    expect(state.config).toBeNull();
    expect(state.screen).toBe('start');
  });

  it('startGame sets config and transitions to game screen', () => {
    const { startGame } = useGameStore.getState();
    startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      initialCash: 10_000_000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    const state = useGameStore.getState();
    expect(state.config?.stockSymbol).toBe('AAPL');
    expect(state.screen).toBe('game');
    expect(state.portfolio.cash).toBe(10_000_000);
  });

  it('executeBuy reduces cash and adds holdings', () => {
    const store = useGameStore.getState();
    store.startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      initialCash: 1_000_000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    useGameStore.getState().executeBuy(100, 10, 'test buy');

    const state = useGameStore.getState();
    expect(state.portfolio.cash).toBe(1_000_000 - 100 * 10);
    expect(state.portfolio.holdings.qty).toBe(10);
    expect(state.portfolio.holdings.avgPrice).toBe(100);
    expect(state.portfolio.trades.length).toBe(1);
    expect(state.portfolio.trades[0].memo).toBe('test buy');
  });

  it('executeSell increases cash and reduces holdings', () => {
    const store = useGameStore.getState();
    store.startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      initialCash: 1_000_000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    useGameStore.getState().executeBuy(100, 10, '');
    useGameStore.getState().executeSell(120, 5, 'taking profit');

    const state = useGameStore.getState();
    expect(state.portfolio.cash).toBe(1_000_000 - 1000 + 600);
    expect(state.portfolio.holdings.qty).toBe(5);
    expect(state.portfolio.trades.length).toBe(2);
  });

  it('applySalary adds cash and increases totalInvested', () => {
    const store = useGameStore.getState();
    store.startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      initialCash: 1_000_000,
      monthlySalary: 500_000,
      salaryDay: 1,
      mode: 'free',
    });

    useGameStore.getState().applySalary();

    const state = useGameStore.getState();
    expect(state.portfolio.cash).toBe(1_500_000);
    expect(state.portfolio.totalInvested).toBe(1_500_000);
  });

  it('cannot buy more than cash allows', () => {
    const store = useGameStore.getState();
    store.startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      initialCash: 1000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    expect(() => useGameStore.getState().executeBuy(100, 20, '')).toThrow();
  });

  it('cannot sell more than holdings', () => {
    const store = useGameStore.getState();
    store.startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      initialCash: 10000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    useGameStore.getState().executeBuy(100, 5, '');
    expect(() => useGameStore.getState().executeSell(100, 10, '')).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/state/gameStore.test.ts
```

Expected: FAIL — `useGameStore` not found.

- [ ] **Step 4: Implement game store**

Create `Stock/src/state/gameStore.ts`:

```typescript
import { create } from 'zustand';
import {
  GameConfig, GameState, Portfolio, Trade, DailyCandle,
  IntradayCandle, MarketEvent, TimeframeKey,
} from '../types';
import { saveToStorage } from './storage';

interface GameActions {
  startGame: (config: GameConfig) => void;
  executeBuy: (price: number, qty: number, memo: string) => void;
  executeSell: (price: number, qty: number, memo: string) => void;
  applySalary: () => void;
  setDailyCandles: (candles: DailyCandle[]) => void;
  setIntradayCandles: (candles: IntradayCandle[]) => void;
  setEvents: (events: MarketEvent[]) => void;
  setCurrentDate: (date: string) => void;
  setCurrentMinute: (minute: number) => void;
  setDayIndex: (index: number) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setScreen: (screen: 'start' | 'game' | 'result') => void;
  setTimeframe: (tf: TimeframeKey) => void;
  toggleIndicator: (indicator: 'ma' | 'rsi' | 'macd') => void;
  setFundamentals: (eps: number | null, bps: number | null) => void;
  resetGame: () => void;
}

const initialPortfolio: Portfolio = {
  cash: 0,
  holdings: { qty: 0, avgPrice: 0 },
  totalInvested: 0,
  trades: [],
};

const initialState: GameState = {
  config: null,
  portfolio: initialPortfolio,
  currentDate: '',
  currentMinute: 0,
  dayIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  dailyCandles: [],
  intradayCandles: [],
  events: [],
  screen: 'start',
  selectedTimeframe: '1m',
  indicators: { ma: false, rsi: false, macd: false },
  currentEps: null,
  currentBps: null,
};

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  ...initialState,

  startGame: (config: GameConfig) => {
    const newState = {
      config,
      portfolio: {
        cash: config.initialCash,
        holdings: { qty: 0, avgPrice: 0 },
        totalInvested: config.initialCash,
        trades: [],
      },
      currentDate: config.startDate,
      currentMinute: 0,
      dayIndex: 0,
      isPlaying: false,
      playbackSpeed: 1,
      screen: 'game' as const,
    };
    set(newState);
    saveToStorage({ ...get(), ...newState });
  },

  executeBuy: (price: number, qty: number, memo: string) => {
    const { portfolio, currentDate, currentMinute } = get();
    const cost = price * qty;
    if (cost > portfolio.cash) {
      throw new Error('Insufficient cash');
    }

    const newQty = portfolio.holdings.qty + qty;
    const newAvgPrice = portfolio.holdings.qty === 0
      ? price
      : (portfolio.holdings.avgPrice * portfolio.holdings.qty + price * qty) / newQty;

    const trade: Trade = {
      type: 'buy',
      price,
      qty,
      timestamp: `${currentDate}T${String(Math.floor(currentMinute / 60)).padStart(2, '0')}:${String(currentMinute % 60).padStart(2, '0')}:00`,
      memo,
    };

    const newPortfolio = {
      ...portfolio,
      cash: portfolio.cash - cost,
      holdings: { qty: newQty, avgPrice: Math.round(newAvgPrice) },
      trades: [...portfolio.trades, trade],
    };

    set({ portfolio: newPortfolio });
    saveToStorage(get());
  },

  executeSell: (price: number, qty: number, memo: string) => {
    const { portfolio, currentDate, currentMinute } = get();
    if (qty > portfolio.holdings.qty) {
      throw new Error('Insufficient holdings');
    }

    const trade: Trade = {
      type: 'sell',
      price,
      qty,
      timestamp: `${currentDate}T${String(Math.floor(currentMinute / 60)).padStart(2, '0')}:${String(currentMinute % 60).padStart(2, '0')}:00`,
      memo,
    };

    const newQty = portfolio.holdings.qty - qty;
    const newPortfolio = {
      ...portfolio,
      cash: portfolio.cash + price * qty,
      holdings: {
        qty: newQty,
        avgPrice: newQty === 0 ? 0 : portfolio.holdings.avgPrice,
      },
      trades: [...portfolio.trades, trade],
    };

    set({ portfolio: newPortfolio });
    saveToStorage(get());
  },

  applySalary: () => {
    const { portfolio, config } = get();
    if (!config || config.monthlySalary === 0) return;

    set({
      portfolio: {
        ...portfolio,
        cash: portfolio.cash + config.monthlySalary,
        totalInvested: portfolio.totalInvested + config.monthlySalary,
      },
    });
    saveToStorage(get());
  },

  setDailyCandles: (candles) => set({ dailyCandles: candles }),
  setIntradayCandles: (candles) => set({ intradayCandles: candles }),
  setEvents: (events) => set({ events }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setCurrentMinute: (minute) => set({ currentMinute: minute }),
  setDayIndex: (index) => set({ dayIndex: index }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setScreen: (screen) => set({ screen }),
  setTimeframe: (tf) => set({ selectedTimeframe: tf }),
  toggleIndicator: (indicator) => set((s) => ({
    indicators: { ...s.indicators, [indicator]: !s.indicators[indicator] },
  })),
  setFundamentals: (eps, bps) => set({ currentEps: eps, currentBps: bps }),
  resetGame: () => set(initialState),
}));

// Expose initial state for testing
useGameStore.getInitialState = () => initialState;

declare module 'zustand' {
  interface StoreApi<T> {
    getInitialState: () => T;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run src/state/gameStore.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/state/storage.ts src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "feat: add Zustand game store with buy/sell/salary actions"
```

---

### Task 10: StartScreen Component

**Files:**
- Create: `Stock/src/components/StartScreen.tsx`
- Create: `Stock/src/components/ChallengeList.tsx`

- [ ] **Step 1: Create ChallengeList component**

Create `Stock/src/components/ChallengeList.tsx`:

```typescript
import { Challenge } from '../types';
import { challenges } from '../data/challenges';
import { theme } from '../styles/theme';

interface Props {
  onSelect: (challenge: Challenge) => void;
}

export function ChallengeList({ onSelect }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {challenges.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          style={{
            background: theme.bg.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius,
            padding: 16,
            color: theme.text.primary,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
          <div style={{ fontSize: 12, color: theme.text.muted }}>{c.description}</div>
          <div style={{ fontSize: 11, color: theme.text.secondary, marginTop: 8 }}>
            자금: {c.initialCash.toLocaleString()}원 · {c.maxDays}일
            {c.targetReturn > 0 && ` · 목표: +${(c.targetReturn * 100).toFixed(0)}%`}
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create StartScreen component**

Create `Stock/src/components/StartScreen.tsx`:

```typescript
import { useState, useCallback } from 'react';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { searchSymbol, SymbolSearchResult } from '../data/yahooFinance';
import { Challenge } from '../types';
import { ChallengeList } from './ChallengeList';

export function StartScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const [mode, setMode] = useState<'free' | 'challenge'>('free');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [startDate, setStartDate] = useState('2024-01-02');
  const [initialCash, setInitialCash] = useState(10_000_000);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [salaryDay, setSalaryDay] = useState(1);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchSymbol(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, [searchQuery]);

  const handleChallengeSelect = (challenge: Challenge) => {
    startGame({
      stockSymbol: challenge.stockSymbol || '',
      startDate: challenge.startDate || '2024-01-02',
      initialCash: challenge.initialCash,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'challenge',
      challengeId: challenge.id,
    });
  };

  const handleStartFree = () => {
    if (!selectedSymbol) return;
    startGame({
      stockSymbol: selectedSymbol,
      startDate,
      initialCash,
      monthlySalary,
      salaryDay,
      mode: 'free',
    });
  };

  const inputStyle = {
    background: theme.bg.primary,
    border: `1px solid ${theme.border}`,
    color: theme.text.primary,
    padding: '8px 12px',
    borderRadius: theme.radius,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontSize: 11,
    color: theme.text.muted,
    marginBottom: 4,
    display: 'block',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>Stock Trading Game</h1>
      <p style={{ textAlign: 'center', color: theme.text.muted, marginBottom: 32 }}>
        과거 주식 데이터로 매매를 연습하세요
      </p>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: theme.bg.panel, borderRadius: theme.radius, padding: 4 }}>
        <button
          onClick={() => setMode('free')}
          style={{
            flex: 1, padding: '8px 16px', border: 'none', borderRadius: theme.radius, cursor: 'pointer',
            background: mode === 'free' ? theme.accent : 'transparent',
            color: mode === 'free' ? 'white' : theme.text.muted,
            fontWeight: 600,
          }}
        >자유 모드</button>
        <button
          onClick={() => setMode('challenge')}
          style={{
            flex: 1, padding: '8px 16px', border: 'none', borderRadius: theme.radius, cursor: 'pointer',
            background: mode === 'challenge' ? theme.accent : 'transparent',
            color: mode === 'challenge' ? 'white' : theme.text.muted,
            fontWeight: 600,
          }}
        >챌린지</button>
      </div>

      {mode === 'challenge' ? (
        <ChallengeList onSelect={handleChallengeSelect} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stock Search */}
          <div>
            <label style={labelStyle}>종목 검색</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="삼성전자, AAPL, ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                style={{ background: theme.accent, color: 'white', border: 'none', padding: '8px 16px', borderRadius: theme.radius, cursor: 'pointer' }}
              >
                {searching ? '...' : '검색'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, border: `1px solid ${theme.border}`, borderRadius: theme.radius, overflow: 'hidden' }}>
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => { setSelectedSymbol(r.symbol); setSearchResults([]); setSearchQuery(r.symbol); }}
                    style={{
                      display: 'block', width: '100%', padding: '8px 12px', border: 'none', textAlign: 'left', cursor: 'pointer',
                      background: selectedSymbol === r.symbol ? theme.accent : theme.bg.panel,
                      color: theme.text.primary, borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{r.symbol}</span>
                    <span style={{ color: theme.text.muted, marginLeft: 8, fontSize: 12 }}>{r.shortname} · {r.exchange}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedSymbol && (
              <div style={{ marginTop: 8, color: theme.up, fontSize: 13 }}>
                선택: {selectedSymbol}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label style={labelStyle}>시작일</label>
            <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          {/* Initial Cash */}
          <div>
            <label style={labelStyle}>초기 자금 (원)</label>
            <input type="number" style={inputStyle} value={initialCash} onChange={(e) => setInitialCash(Number(e.target.value))} />
          </div>

          {/* Salary */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>월급 (원, 0=비활성)</label>
              <input type="number" style={inputStyle} value={monthlySalary} onChange={(e) => setMonthlySalary(Number(e.target.value))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>월급일</label>
              <input type="number" min={1} max={28} style={inputStyle} value={salaryDay} onChange={(e) => setSalaryDay(Number(e.target.value))} />
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartFree}
            disabled={!selectedSymbol}
            style={{
              background: selectedSymbol ? theme.accent : theme.border,
              color: 'white', border: 'none', padding: '12px 24px', borderRadius: theme.radius,
              cursor: selectedSymbol ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 14, marginTop: 8,
            }}
          >
            게임 시작
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx to use StartScreen**

Replace `Stock/src/App.tsx` with:

```typescript
import { theme } from './styles/theme';
import { useGameStore } from './state/gameStore';
import { StartScreen } from './components/StartScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div style={{
      backgroundColor: theme.bg.primary,
      color: theme.text.primary,
      minHeight: '100vh',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    }}>
      {screen === 'start' && <StartScreen />}
      {screen === 'game' && <div style={{ padding: 40, textAlign: 'center' }}>Game Screen (TODO)</div>}
      {screen === 'result' && <div style={{ padding: 40, textAlign: 'center' }}>Result Screen (TODO)</div>}
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npm run dev
```

Expected: Start screen shows with stock search, date picker, cash input, salary settings, mode toggle (free/challenge).

- [ ] **Step 5: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/components/StartScreen.tsx src/components/ChallengeList.tsx src/App.tsx
git commit -m "feat: add StartScreen with stock search, game config, and challenge list"
```

---

### Task 11: TopBar & TimeControls Components

**Files:**
- Create: `Stock/src/components/TopBar.tsx`
- Create: `Stock/src/components/TimeControls.tsx`

- [ ] **Step 1: Create TopBar**

Create `Stock/src/components/TopBar.tsx`:

```typescript
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';

export function TopBar() {
  const config = useGameStore((s) => s.config);
  const currentDate = useGameStore((s) => s.currentDate);
  const currentMinute = useGameStore((s) => s.currentMinute);
  const playbackSpeed = useGameStore((s) => s.playbackSpeed);
  const intradayCandles = useGameStore((s) => s.intradayCandles);

  const currentPrice = intradayCandles.length > 0
    ? intradayCandles[Math.min(currentMinute, intradayCandles.length - 1)]?.close ?? 0
    : 0;

  const openPrice = intradayCandles.length > 0 ? intradayCandles[0]?.open ?? 0 : 0;
  const change = openPrice > 0 ? ((currentPrice - openPrice) / openPrice) * 100 : 0;
  const isUp = change >= 0;

  const hours = Math.floor(currentMinute / 60) + (config?.stockSymbol.endsWith('.KS') || config?.stockSymbol.endsWith('.KQ') ? 9 : 9);
  const mins = currentMinute % 60;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: theme.bg.panel, padding: '8px 12px', borderRadius: theme.radius,
      border: `1px solid ${theme.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{config?.stockSymbol ?? ''}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: isUp ? theme.up : theme.down, fontSize: 15, fontWeight: 600 }}>
          {currentPrice.toLocaleString()}
        </span>
        <span style={{
          background: isUp ? '#1b3a2a' : '#3d1b1b', color: isUp ? theme.up : theme.down,
          padding: '2px 6px', borderRadius: 4, fontSize: 10,
        }}>
          {isUp ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
      <div style={{ color: theme.text.muted, fontSize: 10 }}>
        {currentDate} | {timeStr} | <span style={{ color: theme.up }}>{playbackSpeed}x</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TimeControls**

Create `Stock/src/components/TimeControls.tsx`:

```typescript
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';

const SPEEDS = [1, 2, 5, 10];

export function TimeControls() {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const playbackSpeed = useGameStore((s) => s.playbackSpeed);
  const setPlaying = useGameStore((s) => s.setPlaying);
  const setPlaybackSpeed = useGameStore((s) => s.setPlaybackSpeed);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const dailyCandles = useGameStore((s) => s.dailyCandles);

  const onPrevDay = useGameStore((s) => s.setDayIndex);
  const onNextDay = useGameStore((s) => s.setDayIndex);

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
      background: theme.bg.panel, padding: 8, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`,
    }}>
      <button
        onClick={() => dayIndex > 0 && onPrevDay(dayIndex - 1)}
        disabled={dayIndex === 0}
        style={{ background: 'none', border: 'none', color: dayIndex > 0 ? theme.text.secondary : theme.text.muted, cursor: 'pointer', fontSize: 12 }}
      >
        ◀◀ Prev
      </button>

      <button
        onClick={() => setPlaying(!isPlaying)}
        style={{
          background: theme.accent, color: 'white', border: 'none',
          padding: '4px 16px', borderRadius: theme.radius, cursor: 'pointer', fontSize: 12,
        }}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </button>

      <div style={{ display: 'flex', gap: 6 }}>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setPlaybackSpeed(s)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
              color: playbackSpeed === s ? theme.up : theme.text.muted,
              fontWeight: playbackSpeed === s ? 700 : 400,
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      <button
        onClick={() => dayIndex < dailyCandles.length - 1 && onNextDay(dayIndex + 1)}
        disabled={dayIndex >= dailyCandles.length - 1}
        style={{ background: 'none', border: 'none', color: dayIndex < dailyCandles.length - 1 ? theme.text.secondary : theme.text.muted, cursor: 'pointer', fontSize: 12 }}
      >
        Next ▶▶
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/components/TopBar.tsx src/components/TimeControls.tsx
git commit -m "feat: add TopBar and TimeControls components"
```

---

### Task 12: PortfolioPanel, TradePanel, EventPanel

**Files:**
- Create: `Stock/src/components/PortfolioPanel.tsx`
- Create: `Stock/src/components/TradePanel.tsx`
- Create: `Stock/src/components/EventPanel.tsx`

- [ ] **Step 1: Create PortfolioPanel**

Create `Stock/src/components/PortfolioPanel.tsx`:

```typescript
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { calcPE, calcPBR } from '../engine/fundamentals';

export function PortfolioPanel() {
  const portfolio = useGameStore((s) => s.portfolio);
  const config = useGameStore((s) => s.config);
  const currentDate = useGameStore((s) => s.currentDate);
  const intradayCandles = useGameStore((s) => s.intradayCandles);
  const currentMinute = useGameStore((s) => s.currentMinute);
  const currentEps = useGameStore((s) => s.currentEps);
  const currentBps = useGameStore((s) => s.currentBps);

  const currentPrice = intradayCandles.length > 0
    ? intradayCandles[Math.min(currentMinute, intradayCandles.length - 1)]?.close ?? 0
    : 0;

  const holdingsValue = portfolio.holdings.qty * currentPrice;
  const totalValue = portfolio.cash + holdingsValue;
  const pnl = totalValue - portfolio.totalInvested;
  const pnlPercent = portfolio.totalInvested > 0 ? (pnl / portfolio.totalInvested) * 100 : 0;
  const isProfit = pnl >= 0;

  const pe = calcPE(currentPrice, currentEps);
  const pbr = calcPBR(currentPrice, currentBps);

  // Salary countdown
  let salaryCountdown: string | null = null;
  if (config && config.monthlySalary > 0 && currentDate) {
    const today = new Date(currentDate);
    const targetDay = config.salaryDay;
    let nextSalary = new Date(today.getFullYear(), today.getMonth(), targetDay);
    if (nextSalary <= today) {
      nextSalary = new Date(today.getFullYear(), today.getMonth() + 1, targetDay);
    }
    const diff = Math.ceil((nextSalary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    salaryCountdown = `D-${diff}`;
  }

  const rowStyle = { fontSize: 11, marginBottom: 3, display: 'flex', justifyContent: 'space-between' };

  return (
    <div style={{
      background: theme.bg.panel, padding: 10, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`, color: theme.text.secondary,
    }}>
      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Portfolio
      </div>
      <div style={rowStyle}><span>Cash</span><span>{portfolio.cash.toLocaleString()}</span></div>
      <div style={rowStyle}><span>Holdings</span><span>{holdingsValue.toLocaleString()}</span></div>
      <div style={{ ...rowStyle, color: isProfit ? theme.up : theme.down }}>
        <span>P&L</span>
        <span>{isProfit ? '+' : ''}{pnl.toLocaleString()} ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
      </div>
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 6, marginTop: 6, fontSize: 10, color: theme.text.muted }}>
        <div style={{ ...rowStyle, fontSize: 10 }}><span>Invested</span><span style={{ color: theme.text.secondary }}>{portfolio.totalInvested.toLocaleString()}</span></div>
        <div style={{ ...rowStyle, fontSize: 10 }}><span>P/E</span><span style={{ color: theme.text.secondary }}>{pe !== null ? pe.toFixed(1) : '—'}</span></div>
        <div style={{ ...rowStyle, fontSize: 10 }}><span>PBR</span><span style={{ color: theme.text.secondary }}>{pbr !== null ? pbr.toFixed(2) : '—'}</span></div>
        <div style={{ ...rowStyle, fontSize: 10 }}><span>EPS</span><span style={{ color: theme.text.secondary }}>{currentEps !== null ? currentEps.toLocaleString() : '—'}</span></div>
        {salaryCountdown && (
          <div style={{ ...rowStyle, fontSize: 10 }}><span>Salary</span><span style={{ color: theme.text.secondary }}>{salaryCountdown}</span></div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create TradePanel**

Create `Stock/src/components/TradePanel.tsx`:

```typescript
import { useState } from 'react';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';

export function TradePanel() {
  const [qty, setQty] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const executeBuy = useGameStore((s) => s.executeBuy);
  const executeSell = useGameStore((s) => s.executeSell);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const setPlaying = useGameStore((s) => s.setPlaying);
  const intradayCandles = useGameStore((s) => s.intradayCandles);
  const currentMinute = useGameStore((s) => s.currentMinute);
  const portfolio = useGameStore((s) => s.portfolio);

  const currentPrice = intradayCandles.length > 0
    ? intradayCandles[Math.min(currentMinute, intradayCandles.length - 1)]?.close ?? 0
    : 0;

  const maxBuy = currentPrice > 0 ? Math.floor(portfolio.cash / currentPrice) : 0;

  const handleTrade = (type: 'buy' | 'sell') => {
    const q = parseInt(qty);
    if (isNaN(q) || q <= 0) { setError('수량을 입력하세요'); return; }
    setError('');

    // Auto-pause when trading
    if (isPlaying) setPlaying(false);

    try {
      if (type === 'buy') {
        executeBuy(currentPrice, q, memo);
      } else {
        executeSell(currentPrice, q, memo);
      }
      setQty('');
      setMemo('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{
      background: theme.bg.panel, padding: 10, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`, color: theme.text.secondary,
    }}>
      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Trade
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button onClick={() => handleTrade('buy')} style={{
          flex: 1, background: '#238636', color: 'white', border: 'none', padding: 6, borderRadius: theme.radius, fontWeight: 600, fontSize: 11, cursor: 'pointer',
        }}>BUY</button>
        <button onClick={() => handleTrade('sell')} style={{
          flex: 1, background: '#da3633', color: 'white', border: 'none', padding: 6, borderRadius: theme.radius, fontWeight: 600, fontSize: 11, cursor: 'pointer',
        }}>SELL</button>
      </div>
      <input
        type="number"
        placeholder="Quantity"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        style={{
          width: '100%', background: theme.bg.primary, border: `1px solid ${theme.border}`,
          color: theme.text.primary, padding: '4px 8px', borderRadius: 4, fontSize: 10, marginBottom: 4, boxSizing: 'border-box',
        }}
      />
      <input
        placeholder="Trade memo..."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        style={{
          width: '100%', background: theme.bg.primary, border: `1px solid ${theme.border}`,
          color: theme.text.primary, padding: '4px 8px', borderRadius: 4, fontSize: 10, boxSizing: 'border-box',
        }}
      />
      {error && <div style={{ color: theme.down, fontSize: 10, marginTop: 4 }}>{error}</div>}
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 6, marginTop: 6, fontSize: 10, color: theme.text.muted }}>
        <div>Available: <span style={{ color: theme.text.secondary }}>{portfolio.cash.toLocaleString()}</span></div>
        <div>Max Buy: <span style={{ color: theme.text.secondary }}>{maxBuy} shares</span></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create EventPanel**

Create `Stock/src/components/EventPanel.tsx`:

```typescript
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';

const EVENT_COLORS: Record<string, string> = {
  earnings: '#d29922',
  dividend: '#58a6ff',
  rate_decision: '#f78166',
};

const EVENT_ICONS: Record<string, string> = {
  earnings: '●',
  dividend: '●',
  rate_decision: '●',
};

export function EventPanel() {
  const events = useGameStore((s) => s.events);
  const currentDate = useGameStore((s) => s.currentDate);

  const upcomingEvents = events
    .filter((e) => e.date >= currentDate)
    .slice(0, 5);

  return (
    <div style={{
      background: theme.bg.panel, padding: 10, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`, color: theme.text.secondary,
    }}>
      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Events
      </div>
      {upcomingEvents.length === 0 ? (
        <div style={{ fontSize: 10, color: theme.text.muted }}>No upcoming events</div>
      ) : (
        upcomingEvents.map((e, i) => {
          const daysUntil = Math.ceil(
            (new Date(e.date).getTime() - new Date(currentDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          return (
            <div key={i} style={{ fontSize: 10, color: EVENT_COLORS[e.type] || theme.text.secondary, marginBottom: 3 }}>
              {EVENT_ICONS[e.type]} {e.description} {daysUntil > 0 ? `(D-${daysUntil})` : '(오늘)'}
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/components/PortfolioPanel.tsx src/components/TradePanel.tsx src/components/EventPanel.tsx
git commit -m "feat: add PortfolioPanel, TradePanel, and EventPanel components"
```

---

### Task 13: ChartPanel with TradingView Lightweight Charts

**Files:**
- Create: `Stock/src/components/ChartPanel.tsx`

- [ ] **Step 1: Create ChartPanel with candlestick, volume, and indicators**

Create `Stock/src/components/ChartPanel.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData, Time } from 'lightweight-charts';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { aggregateCandles } from '../engine/aggregator';
import { calcMA, calcRSI, calcMACD } from '../engine/indicators';
import { TimeframeKey } from '../types';

const TIMEFRAME_MINUTES: Record<TimeframeKey, number> = {
  '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '1D': 390,
};

const TIMEFRAMES: TimeframeKey[] = ['1m', '5m', '15m', '30m', '1h', '1D'];

export function ChartPanel() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);

  const intradayCandles = useGameStore((s) => s.intradayCandles);
  const currentMinute = useGameStore((s) => s.currentMinute);
  const selectedTimeframe = useGameStore((s) => s.selectedTimeframe);
  const setTimeframe = useGameStore((s) => s.setTimeframe);
  const indicators = useGameStore((s) => s.indicators);
  const toggleIndicator = useGameStore((s) => s.toggleIndicator);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: theme.bg.panel },
        textColor: theme.text.muted,
      },
      grid: {
        vertLines: { color: theme.border },
        horzLines: { color: theme.border },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: { timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: theme.up,
      downColor: theme.down,
      borderUpColor: theme.up,
      borderDownColor: theme.down,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const visibleCandles = intradayCandles.slice(0, currentMinute + 1);
    const period = TIMEFRAME_MINUTES[selectedTimeframe];
    const aggregated = aggregateCandles(visibleCandles, period);

    const candleData: CandlestickData[] = aggregated.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = aggregated.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // MA lines
    maSeriesRef.current.forEach((s) => {
      try { chartRef.current?.removeSeries(s); } catch {}
    });
    maSeriesRef.current = [];

    if (indicators.ma && chartRef.current) {
      const closes = aggregated.map((c) => c.close);
      const periods = [5, 20, 60];
      const colors = ['#f0f6fc', '#1f6feb', '#f78166'];

      periods.forEach((p, idx) => {
        const maValues = calcMA(closes, p);
        const lineData: LineData[] = [];
        aggregated.forEach((c, i) => {
          if (maValues[i] !== null) {
            lineData.push({ time: c.time as Time, value: maValues[i] as number });
          }
        });

        if (lineData.length > 0) {
          const series = chartRef.current!.addLineSeries({
            color: colors[idx],
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          series.setData(lineData);
          maSeriesRef.current.push(series);
        }
      });
    }
  }, [intradayCandles, currentMinute, selectedTimeframe, indicators.ma]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        background: theme.bg.panel, padding: 10, borderRadius: theme.radius,
        border: `1px solid ${theme.border}`,
      }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  background: selectedTimeframe === tf ? theme.accent : 'transparent',
                  color: selectedTimeframe === tf ? 'white' : theme.text.muted,
                  border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['ma', 'rsi', 'macd'] as const).map((ind) => (
              <button
                key={ind}
                onClick={() => toggleIndicator(ind)}
                style={{
                  color: indicators[ind] ? theme.accent : theme.text.muted,
                  border: indicators[ind] ? `1px solid ${theme.accent}` : 'none',
                  background: 'transparent', padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div ref={chartContainerRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/components/ChartPanel.tsx
git commit -m "feat: add ChartPanel with TradingView Lightweight Charts, timeframes, and MA indicator"
```

---

### Task 14: GameScreen — Main Game Layout & Playback Loop

**Files:**
- Create: `Stock/src/components/GameScreen.tsx`
- Create: `Stock/src/components/DayReviewModal.tsx`

- [ ] **Step 1: Create DayReviewModal**

Create `Stock/src/components/DayReviewModal.tsx`:

```typescript
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';

interface Props {
  onNextDay: () => void;
  onEndGame: () => void;
}

export function DayReviewModal({ onNextDay, onEndGame }: Props) {
  const portfolio = useGameStore((s) => s.portfolio);
  const currentDate = useGameStore((s) => s.currentDate);
  const intradayCandles = useGameStore((s) => s.intradayCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const dailyCandles = useGameStore((s) => s.dailyCandles);

  const lastCandle = intradayCandles[intradayCandles.length - 1];
  const firstCandle = intradayCandles[0];
  const dayChange = firstCandle && lastCandle
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open * 100)
    : 0;
  const isUp = dayChange >= 0;
  const isLastDay = dayIndex >= dailyCandles.length - 1;

  const todayTrades = portfolio.trades.filter((t) => t.timestamp.startsWith(currentDate));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: theme.bg.panel, borderRadius: theme.radius, padding: 24,
        border: `1px solid ${theme.border}`, minWidth: 400, maxWidth: 500,
      }}>
        <h3 style={{ margin: '0 0 16px', color: theme.text.primary }}>일간 리뷰 — {currentDate}</h3>

        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: isUp ? theme.up : theme.down, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {isUp ? '▲' : '▼'} {dayChange.toFixed(2)}%
          </div>
          <div style={{ color: theme.text.secondary, marginBottom: 4 }}>
            Cash: {portfolio.cash.toLocaleString()} | Holdings: {portfolio.holdings.qty}주
          </div>
          <div style={{ color: theme.text.muted, fontSize: 11 }}>
            오늘 거래: {todayTrades.length}건
          </div>
        </div>

        {todayTrades.length > 0 && (
          <div style={{ marginBottom: 16, fontSize: 11, color: theme.text.secondary }}>
            {todayTrades.map((t, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: t.type === 'buy' ? theme.up : theme.down }}>
                  {t.type === 'buy' ? 'BUY' : 'SELL'}
                </span>
                {' '}{t.qty}주 @ {t.price.toLocaleString()}
                {t.memo && <span style={{ color: theme.text.muted }}> — {t.memo}</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {!isLastDay && (
            <button onClick={onNextDay} style={{
              flex: 1, background: theme.accent, color: 'white', border: 'none',
              padding: '10px 20px', borderRadius: theme.radius, cursor: 'pointer', fontWeight: 600,
            }}>
              다음 날로 →
            </button>
          )}
          <button onClick={onEndGame} style={{
            flex: isLastDay ? 1 : 0, background: isLastDay ? theme.accent : 'transparent',
            color: isLastDay ? 'white' : theme.text.muted, border: isLastDay ? 'none' : `1px solid ${theme.border}`,
            padding: '10px 20px', borderRadius: theme.radius, cursor: 'pointer', fontWeight: 600,
          }}>
            {isLastDay ? '결과 보기' : '게임 종료'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create GameScreen with playback loop**

Create `Stock/src/components/GameScreen.tsx`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { fetchDailyCandles } from '../data/yahooFinance';
import { fetchMarketEvents } from '../data/events';
import { generateIntradayPrices } from '../engine/interpolation';
import { TopBar } from './TopBar';
import { ChartPanel } from './ChartPanel';
import { PortfolioPanel } from './PortfolioPanel';
import { TradePanel } from './TradePanel';
import { EventPanel } from './EventPanel';
import { TimeControls } from './TimeControls';
import { DayReviewModal } from './DayReviewModal';

const TOTAL_MINUTES = 390;

export function GameScreen() {
  const config = useGameStore((s) => s.config);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const playbackSpeed = useGameStore((s) => s.playbackSpeed);
  const currentMinute = useGameStore((s) => s.currentMinute);
  const setDailyCandles = useGameStore((s) => s.setDailyCandles);
  const setIntradayCandles = useGameStore((s) => s.setIntradayCandles);
  const setEvents = useGameStore((s) => s.setEvents);
  const setCurrentDate = useGameStore((s) => s.setCurrentDate);
  const setCurrentMinute = useGameStore((s) => s.setCurrentMinute);
  const setDayIndex = useGameStore((s) => s.setDayIndex);
  const setPlaying = useGameStore((s) => s.setPlaying);
  const setScreen = useGameStore((s) => s.setScreen);
  const applySalary = useGameStore((s) => s.applySalary);

  const [loading, setLoading] = useState(true);
  const [showDayReview, setShowDayReview] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const market = config?.stockSymbol.endsWith('.KS') || config?.stockSymbol.endsWith('.KQ') ? 'KR' : 'US';

  // Fetch data on mount
  useEffect(() => {
    if (!config) return;

    const load = async () => {
      setLoading(true);
      try {
        // Fetch 1 year of daily data from start date
        const endDate = new Date(config.startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        const [candles, events] = await Promise.all([
          fetchDailyCandles(config.stockSymbol, config.startDate, endDate.toISOString().split('T')[0]),
          fetchMarketEvents(config.stockSymbol, config.startDate, endDate.toISOString().split('T')[0]),
        ]);

        setDailyCandles(candles);
        setEvents(events);

        if (candles.length > 0) {
          setCurrentDate(candles[0].date);
          const intraday = generateIntradayPrices(candles[0], market);
          setIntradayCandles(intraday);
        }
      } catch (e) {
        console.error('Failed to load data:', e);
      }
      setLoading(false);
    };

    load();
  }, [config]);

  // Generate intraday data when day changes
  useEffect(() => {
    if (dailyCandles.length === 0 || dayIndex >= dailyCandles.length) return;

    const daily = dailyCandles[dayIndex];
    setCurrentDate(daily.date);
    setCurrentMinute(0);
    const intraday = generateIntradayPrices(daily, market);
    setIntradayCandles(intraday);

    // Check salary
    if (config && config.monthlySalary > 0) {
      const date = new Date(daily.date);
      if (date.getDate() === config.salaryDay) {
        applySalary();
      }
    }

    // Check EPS/BPS from events
    const earningsEvent = useGameStore.getState().events
      .filter((e) => e.type === 'earnings' && e.date <= daily.date)
      .pop();
    if (earningsEvent?.data?.eps !== undefined) {
      useGameStore.getState().setFundamentals(earningsEvent.data.eps, earningsEvent.data.bps ?? null);
    }
  }, [dayIndex, dailyCandles]);

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / playbackSpeed; // ms per minute
      intervalRef.current = window.setInterval(() => {
        const current = useGameStore.getState().currentMinute;
        if (current >= TOTAL_MINUTES - 1) {
          setPlaying(false);
          setShowDayReview(true);
        } else {
          setCurrentMinute(current + 1);
        }
      }, interval);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed]);

  const handleNextDay = useCallback(() => {
    setShowDayReview(false);
    if (dayIndex < dailyCandles.length - 1) {
      setDayIndex(dayIndex + 1);
    }
  }, [dayIndex, dailyCandles.length]);

  const handleEndGame = useCallback(() => {
    setShowDayReview(false);
    setScreen('result');
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: theme.text.muted }}>
        주식 데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 4, height: '100vh', boxSizing: 'border-box' }}>
      <TopBar />

      <div style={{ display: 'flex', gap: 4, flex: 1, overflow: 'hidden' }}>
        {/* Chart area */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ChartPanel />
        </div>

        {/* Right panels */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
          <PortfolioPanel />
          <TradePanel />
          <EventPanel />
        </div>
      </div>

      <TimeControls />

      {showDayReview && (
        <DayReviewModal onNextDay={handleNextDay} onEndGame={handleEndGame} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx to use GameScreen**

Edit `Stock/src/App.tsx` — replace the game screen placeholder:

```typescript
import { theme } from './styles/theme';
import { useGameStore } from './state/gameStore';
import { StartScreen } from './components/StartScreen';
import { GameScreen } from './components/GameScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div style={{
      backgroundColor: theme.bg.primary,
      color: theme.text.primary,
      minHeight: '100vh',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    }}>
      {screen === 'start' && <StartScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'result' && <div style={{ padding: 40, textAlign: 'center' }}>Result Screen (TODO)</div>}
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npm run dev
```

Expected: Full game loop works — search stock, start game, see chart with candlesticks, play/pause, buy/sell, day review modal, next day.

- [ ] **Step 5: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/components/GameScreen.tsx src/components/DayReviewModal.tsx src/App.tsx
git commit -m "feat: add GameScreen with playback loop, day review, and full classic layout"
```

---

### Task 15: ResultScreen — Performance Analysis

**Files:**
- Create: `Stock/src/components/ResultScreen.tsx`

- [ ] **Step 1: Create ResultScreen with metrics and trade timeline**

Create `Stock/src/components/ResultScreen.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { createChart, IChartApi, Time } from 'lightweight-charts';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';

export function ResultScreen() {
  const portfolio = useGameStore((s) => s.portfolio);
  const config = useGameStore((s) => s.config);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const resetGame = useGameStore((s) => s.resetGame);
  const setScreen = useGameStore((s) => s.setScreen);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);

  const trades = portfolio.trades;
  const totalInvested = portfolio.totalInvested;
  const lastPrice = dailyCandles[dayIndex]?.close ?? 0;
  const holdingsValue = portfolio.holdings.qty * lastPrice;
  const totalValue = portfolio.cash + holdingsValue;
  const totalReturn = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;

  // Win rate
  const sellTrades = trades.filter((t) => t.type === 'sell');
  const buyAvg = portfolio.holdings.avgPrice;
  let wins = 0;
  for (const sell of sellTrades) {
    // Find the most recent buy before this sell
    const prevBuys = trades.filter((t) => t.type === 'buy' && t.timestamp < sell.timestamp);
    if (prevBuys.length > 0) {
      const lastBuy = prevBuys[prevBuys.length - 1];
      if (sell.price > lastBuy.price) wins++;
    }
  }
  const winRate = sellTrades.length > 0 ? (wins / sellTrades.length) * 100 : 0;

  // Chart with trade markers
  useEffect(() => {
    if (!chartRef.current || dailyCandles.length === 0) return;

    const chart = createChart(chartRef.current, {
      layout: { background: { color: theme.bg.panel }, textColor: theme.text.muted },
      grid: { vertLines: { color: theme.border }, horzLines: { color: theme.border } },
      width: chartRef.current.clientWidth,
      height: 300,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: theme.up, downColor: theme.down,
      borderUpColor: theme.up, borderDownColor: theme.down,
      wickUpColor: theme.up, wickDownColor: theme.down,
    });

    const usedCandles = dailyCandles.slice(0, dayIndex + 1);
    candleSeries.setData(usedCandles.map((c) => ({
      time: c.date as Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    })));

    // Trade markers
    const markers = trades.map((t) => ({
      time: t.timestamp.split('T')[0] as Time,
      position: t.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
      color: t.type === 'buy' ? theme.up : theme.down,
      shape: t.type === 'buy' ? 'arrowUp' as const : 'arrowDown' as const,
      text: `${t.type === 'buy' ? 'B' : 'S'} ${t.qty}`,
    }));
    candleSeries.setMarkers(markers);

    chartApiRef.current = chart;

    return () => chart.remove();
  }, [dailyCandles, dayIndex, trades]);

  const handleNewGame = () => {
    resetGame();
    setScreen('start');
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 4 }}>게임 결과</h2>
      <p style={{ textAlign: 'center', color: theme.text.muted, marginBottom: 24, fontSize: 12 }}>
        {config?.stockSymbol} · {config?.startDate} ~ {dailyCandles[dayIndex]?.date}
      </p>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        {[
          { label: '총 수익률', value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`, color: totalReturn >= 0 ? theme.up : theme.down },
          { label: '최종 자산', value: totalValue.toLocaleString(), color: theme.text.primary },
          { label: '총 투입', value: totalInvested.toLocaleString(), color: theme.text.secondary },
          { label: '승률', value: `${winRate.toFixed(0)}%`, color: theme.accent },
        ].map((m) => (
          <div key={m.label} style={{
            background: theme.bg.panel, padding: 12, borderRadius: theme.radius,
            border: `1px solid ${theme.border}`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: theme.text.muted, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Trade Timeline Chart */}
      <div style={{
        background: theme.bg.panel, padding: 12, borderRadius: theme.radius,
        border: `1px solid ${theme.border}`, marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
          매매 타이밍 분석
        </div>
        <div ref={chartRef} />
      </div>

      {/* Trade History */}
      <div style={{
        background: theme.bg.panel, padding: 12, borderRadius: theme.radius,
        border: `1px solid ${theme.border}`, marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
          거래 히스토리
        </div>
        {trades.length === 0 ? (
          <div style={{ color: theme.text.muted, fontSize: 12 }}>거래 내역이 없습니다</div>
        ) : (
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {trades.map((t, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: `1px solid ${theme.border}`, fontSize: 11,
              }}>
                <div>
                  <span style={{ color: t.type === 'buy' ? theme.up : theme.down, fontWeight: 600 }}>
                    {t.type === 'buy' ? 'BUY' : 'SELL'}
                  </span>
                  <span style={{ color: theme.text.secondary, marginLeft: 8 }}>
                    {t.qty}주 @ {t.price.toLocaleString()}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: theme.text.muted, fontSize: 10 }}>{t.timestamp}</div>
                  {t.memo && <div style={{ color: theme.text.muted, fontSize: 10, fontStyle: 'italic' }}>{t.memo}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleNewGame} style={{
        display: 'block', width: '100%', background: theme.accent, color: 'white',
        border: 'none', padding: '12px 24px', borderRadius: theme.radius,
        cursor: 'pointer', fontWeight: 600, fontSize: 14,
      }}>
        새 게임 시작
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to use ResultScreen**

Replace `Stock/src/App.tsx`:

```typescript
import { theme } from './styles/theme';
import { useGameStore } from './state/gameStore';
import { StartScreen } from './components/StartScreen';
import { GameScreen } from './components/GameScreen';
import { ResultScreen } from './components/ResultScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);

  return (
    <div style={{
      backgroundColor: theme.bg.primary,
      color: theme.text.primary,
      minHeight: '100vh',
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    }}>
      {screen === 'start' && <StartScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'result' && <ResultScreen />}
    </div>
  );
}
```

- [ ] **Step 3: Verify full game loop in browser**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npm run dev
```

Expected: Complete game loop — start → play → day review → result screen with trade markers on chart, metrics, and trade history with memos.

- [ ] **Step 4: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/components/ResultScreen.tsx src/App.tsx
git commit -m "feat: add ResultScreen with performance metrics and trade timeline analysis"
```

---

### Task 16: Final Integration & Polish

**Files:**
- Modify: `Stock/src/components/GameScreen.tsx`
- Modify: `Stock/src/components/TopBar.tsx`

- [ ] **Step 1: Add keyboard shortcuts for game controls**

Edit `Stock/src/components/GameScreen.tsx` — add keyboard event handler inside the component, before the `return`:

```typescript
  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setPlaying(!useGameStore.getState().isPlaying);
          break;
        case 'ArrowRight':
          if (!useGameStore.getState().isPlaying) {
            const m = useGameStore.getState().currentMinute;
            if (m < TOTAL_MINUTES - 1) setCurrentMinute(m + 1);
          }
          break;
        case '1': setPlaybackSpeed(1); break;
        case '2': setPlaybackSpeed(2); break;
        case '3': setPlaybackSpeed(5); break;
        case '4': setPlaybackSpeed(10); break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Build for production**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add -A
git commit -m "feat: add keyboard shortcuts and finalize integration"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Project scaffolding (Vite + React + theme) | None |
| 2 | TypeScript type definitions | Task 1 |
| 3 | Intraday price interpolation engine | Task 2 |
| 4 | Candle aggregator (timeframe conversion) | Task 2 |
| 5 | Technical indicators (MA, RSI, MACD) | Task 2 |
| 6 | Fundamentals calculator (P/E, PBR) | Task 2 |
| 7 | Yahoo Finance data fetcher | Task 2 |
| 8 | Challenge definitions & market events | Task 2 |
| 9 | Game state store (Zustand) | Tasks 2, 6 |
| 10 | StartScreen component | Tasks 7, 8, 9 |
| 11 | TopBar & TimeControls components | Task 9 |
| 12 | PortfolioPanel, TradePanel, EventPanel | Tasks 6, 9 |
| 13 | ChartPanel (TradingView Lightweight Charts) | Tasks 4, 5, 9 |
| 14 | GameScreen (layout + playback loop) | Tasks 3, 10-13 |
| 15 | ResultScreen (performance analysis) | Task 9 |
| 16 | Final integration & polish | Tasks 14, 15 |
