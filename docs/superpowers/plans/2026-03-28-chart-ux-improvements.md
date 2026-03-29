# Chart UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add data load error/retry, pre-game chart history (10 business days), accumulated daily bars + intraday chart view, portfolio holdings detail, and max sell quantity display.

**Architecture:** Four independent changes across types/store, a new pure `chartData` engine module, and four component files. The `buildCombinedData` function is extracted into `src/engine/chartData.ts` for testability. Store gains `preGameCandles` field. `GameScreen` fetches 14 extra calendar days before `startDate` and splits them into pre-game context vs game candles.

**Tech Stack:** React 18, Zustand, TypeScript, Lightweight Charts v5, Vitest, @testing-library/react

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add `preGameCandles: DailyCandle[]` to `GameState` |
| `src/state/gameStore.ts` | Modify | Add `preGameCandles` to initialState + `setPreGameCandles` action |
| `src/engine/chartData.ts` | Create | `buildCombinedData` pure function |
| `src/engine/chartData.test.ts` | Create | Unit tests for `buildCombinedData` |
| `src/components/GameScreen.tsx` | Modify | Error state, retry button, extended fetch + pre-game split |
| `src/components/ChartPanel.tsx` | Modify | Read preGame/daily/dayIndex, call `buildCombinedData` |
| `src/components/PortfolioPanel.tsx` | Modify | Add holdings qty, avg price, per-holding return row |
| `src/components/TradePanel.tsx` | Modify | Add Max Sell quantity display |

---

## Task 1: Add `preGameCandles` to types and store

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/state/gameStore.ts`
- Test: `src/state/gameStore.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/state/gameStore.test.ts` (after the last existing `it(...)` block, inside the `describe`):

```typescript
  it('setPreGameCandles stores pre-game candles', () => {
    const { setPreGameCandles } = useGameStore.getState();
    const candles = [
      { date: '2023-12-20', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
    ];
    setPreGameCandles(candles);
    expect(useGameStore.getState().preGameCandles).toEqual(candles);
  });

  it('resetGame clears preGameCandles', () => {
    const store = useGameStore.getState();
    store.setPreGameCandles([
      { date: '2023-12-20', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
    ]);
    store.resetGame();
    expect(useGameStore.getState().preGameCandles).toEqual([]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Stock && ~/.nvm/versions/node/v20.20.2/bin/node node_modules/.bin/vitest run src/state/gameStore.test.ts
```

Expected: FAIL — `setPreGameCandles is not a function` or similar.

- [ ] **Step 3: Add `preGameCandles` to `GameState` in `src/types/index.ts`**

In `src/types/index.ts`, add `preGameCandles` field to the `GameState` interface (after `intradayCandles`):

```typescript
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
  preGameCandles: DailyCandle[];
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

- [ ] **Step 4: Add action + state to `src/state/gameStore.ts`**

In `GameActions` interface, add after `setIntradayCandles`:
```typescript
  setPreGameCandles: (candles: DailyCandle[]) => void;
```

In `initialState`, add after `intradayCandles: []`:
```typescript
  preGameCandles: [],
```

At the bottom of the store implementation, add after `setIntradayCandles`:
```typescript
  setPreGameCandles: (candles) => set({ preGameCandles: candles }),
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd Stock && ~/.nvm/versions/node/v20.20.2/bin/node node_modules/.bin/vitest run src/state/gameStore.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd Stock && git add src/types/index.ts src/state/gameStore.ts src/state/gameStore.test.ts
git commit -m "feat: add preGameCandles to GameState and store"
```

---

## Task 2: Create `buildCombinedData` engine function

**Files:**
- Create: `src/engine/chartData.ts`
- Create: `src/engine/chartData.test.ts`

- [ ] **Step 1: Write the failing tests in `src/engine/chartData.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { buildCombinedData } from './chartData';
import { DailyCandle, IntradayCandle } from '../types';

function makeDaily(date: string, price = 100): DailyCandle {
  return { date, open: price, high: price + 5, low: price - 5, close: price, volume: 1000 };
}

function makeIntraday(time: number, price = 100): IntradayCandle {
  return { time, open: price, high: price + 2, low: price - 2, close: price, volume: 500 };
}

// Intraday timestamps clearly after any daily midnight timestamp:
// 1704200000 = 2024-01-02 ~16:13 UTC (well after local midnight everywhere)
const preGame = [makeDaily('2023-12-20'), makeDaily('2023-12-21')];
const gameDaily = [
  makeDaily('2024-01-02'),
  makeDaily('2024-01-03'),
  makeDaily('2024-01-04'),
];
const todayIntraday = [
  makeIntraday(1704200000),
  makeIntraday(1704200060),
  makeIntraday(1704200120),
];

describe('buildCombinedData — 1D timeframe', () => {
  it('returns preGame + game candles up to dayIndex inclusive', () => {
    const { candles } = buildCombinedData(preGame, gameDaily, 1, todayIntraday, '1D', 390);
    // preGame(2) + gameDaily[0..1](2) = 4
    expect(candles.length).toBe(4);
    expect(candles[0].time).toBe('2023-12-20');
    expect(candles[3].time).toBe('2024-01-03');
  });

  it('volumes length matches candles length', () => {
    const { candles, volumes } = buildCombinedData(preGame, gameDaily, 0, todayIntraday, '1D', 390);
    expect(volumes.length).toBe(candles.length);
  });

  it('uses date string times (not numbers)', () => {
    const { candles } = buildCombinedData(preGame, gameDaily, 0, todayIntraday, '1D', 390);
    expect(typeof candles[0].time).toBe('string');
  });
});

describe('buildCombinedData — intraday timeframe', () => {
  it('prepends daily bars then appends minute bars', () => {
    const { candles } = buildCombinedData(preGame, gameDaily, 1, todayIntraday, '1m', 1);
    // preGame(2) + gameDaily[0..0](1) = 3 daily + 3 intraday = 6
    expect(candles.length).toBe(6);
  });

  it('daily bar times are Unix timestamps (numbers)', () => {
    const { candles } = buildCombinedData(preGame, gameDaily, 1, todayIntraday, '1m', 1);
    expect(typeof candles[0].time).toBe('number');
  });

  it('times are strictly increasing', () => {
    const { candles } = buildCombinedData(preGame, gameDaily, 1, todayIntraday, '1m', 1);
    for (let i = 1; i < candles.length; i++) {
      expect(Number(candles[i].time) > Number(candles[i - 1].time)).toBe(true);
    }
  });

  it('volumes length matches candles length', () => {
    const { candles, volumes } = buildCombinedData(preGame, gameDaily, 1, todayIntraday, '1m', 1);
    expect(volumes.length).toBe(candles.length);
  });

  it('with dayIndex=0, no prior game daily bars (only preGame + today)', () => {
    const { candles } = buildCombinedData(preGame, gameDaily, 0, todayIntraday, '5m', 5);
    // preGame(2) + gameDaily[0..−1](0) = 2 daily + 3 intraday bars (5m aggregates 3 1m bars to 1 bar? no - each minute is its own bar at period=5 if < 5 candles)
    // aggregateCandles(3 candles, 5) → 1 bar (chunk[0..2])
    expect(candles.length).toBe(2 + 1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd Stock && ~/.nvm/versions/node/v20.20.2/bin/node node_modules/.bin/vitest run src/engine/chartData.test.ts
```

Expected: FAIL — `Cannot find module './chartData'`

- [ ] **Step 3: Create `src/engine/chartData.ts`**

```typescript
import type { CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { DailyCandle, IntradayCandle, TimeframeKey } from '../types';
import { aggregateCandles } from './aggregator';

function dailyToTimestamp(date: string): number {
  return new Date(date + 'T00:00:00').getTime() / 1000;
}

function dailyColor(c: DailyCandle): string {
  return c.close >= c.open ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)';
}

function intradayColor(c: IntradayCandle): string {
  return c.close >= c.open ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)';
}

export function buildCombinedData(
  preGame: DailyCandle[],
  gameDailyAll: DailyCandle[],
  dayIndex: number,
  todayIntraday: IntradayCandle[],
  timeframe: TimeframeKey,
  period: number,
): { candles: CandlestickData<Time>[]; volumes: HistogramData<Time>[] } {
  if (timeframe === '1D') {
    const all = [...preGame, ...gameDailyAll.slice(0, dayIndex + 1)];
    return {
      candles: all.map((c) => ({
        time: c.date as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
      volumes: all.map((c) => ({
        time: c.date as Time,
        value: c.volume,
        color: dailyColor(c),
      })),
    };
  }

  // Intraday: prior daily bars (Unix midnight) + today's aggregated minute bars
  const priorDaily = [...preGame, ...gameDailyAll.slice(0, dayIndex)];
  const aggregated = aggregateCandles(todayIntraday, period);

  const candles: CandlestickData<Time>[] = [
    ...priorDaily.map((c) => ({
      time: dailyToTimestamp(c.date) as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })),
    ...aggregated.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })),
  ];

  const volumes: HistogramData<Time>[] = [
    ...priorDaily.map((c) => ({
      time: dailyToTimestamp(c.date) as Time,
      value: c.volume,
      color: dailyColor(c),
    })),
    ...aggregated.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: intradayColor(c),
    })),
  ];

  return { candles, volumes };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd Stock && ~/.nvm/versions/node/v20.20.2/bin/node node_modules/.bin/vitest run src/engine/chartData.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd Stock && ~/.nvm/versions/node/v20.20.2/bin/node node_modules/.bin/vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd Stock && git add src/engine/chartData.ts src/engine/chartData.test.ts
git commit -m "feat: add buildCombinedData for chart history rendering"
```

---

## Task 3: Update `GameScreen` — error state + pre-game fetch

**Files:**
- Modify: `src/components/GameScreen.tsx`

Current state of this file: `src/components/GameScreen.tsx`
- `loading: boolean` state only
- `useEffect([config])` fetches from `config.startDate`
- On catch: only `console.error`, then `setLoading(false)` — no error UI

- [ ] **Step 1: Add `loadError` and `retryCount` state, update the data-loading `useEffect`**

Replace the state declarations and data-loading useEffect at the top of `GameScreen`. The existing component currently has:

```typescript
  const [loading, setLoading] = useState(true);
  const [showDayReview, setShowDayReview] = useState(false);
  const intervalRef = useRef<number | null>(null);
```

And the fetch useEffect:
```typescript
  // Fetch data on mount
  useEffect(() => {
    if (!config) return;

    const load = async () => {
      setLoading(true);
      try {
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
```

Replace both with:

```typescript
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showDayReview, setShowDayReview] = useState(false);
  const intervalRef = useRef<number | null>(null);
```

And:

```typescript
  // Fetch data on mount (or retry)
  useEffect(() => {
    if (!config) return;

    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const preStart = new Date(config.startDate);
        preStart.setDate(preStart.getDate() - 14);
        const fetchStart = preStart.toISOString().split('T')[0];

        const endDate = new Date(config.startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        const fetchEnd = endDate.toISOString().split('T')[0];

        const [allCandles, events] = await Promise.all([
          fetchDailyCandles(config.stockSymbol, fetchStart, fetchEnd),
          fetchMarketEvents(config.stockSymbol, config.startDate, fetchEnd),
        ]);

        const preGame = allCandles.filter((c) => c.date < config.startDate).slice(-10);
        const gameCandles = allCandles.filter((c) => c.date >= config.startDate);

        setPreGameCandles(preGame);
        setDailyCandles(gameCandles);
        setEvents(events);

        if (gameCandles.length > 0) {
          setCurrentDate(gameCandles[0].date);
          const intraday = generateIntradayPrices(gameCandles[0], market);
          setIntradayCandles(intraday);
        }
      } catch (e) {
        console.error('Failed to load data:', e);
        setLoadError(true);
      }
      setLoading(false);
    };

    load();
  }, [config, retryCount]);
```

- [ ] **Step 2: Add `setPreGameCandles` to the store subscriptions at the top of `GameScreen`**

The existing store subscriptions are:
```typescript
  const setDailyCandles = useGameStore((s) => s.setDailyCandles);
  const setIntradayCandles = useGameStore((s) => s.setIntradayCandles);
  const setEvents = useGameStore((s) => s.setEvents);
```

Add after `setIntradayCandles`:
```typescript
  const setPreGameCandles = useGameStore((s) => s.setPreGameCandles);
```

- [ ] **Step 3: Add error UI — replace the loading check section**

Current loading check:
```typescript
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: theme.text.muted }}>
        주식 데이터를 불러오는 중...
      </div>
    );
  }
```

Replace with:
```typescript
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: theme.text.muted }}>
        주식 데이터를 불러오는 중...
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <div style={{ color: theme.down, fontSize: 14 }}>⚠ 데이터를 불러오지 못했습니다</div>
        <button
          onClick={() => setRetryCount((c) => c + 1)}
          style={{
            background: theme.accent, color: 'white', border: 'none',
            padding: '10px 24px', borderRadius: theme.radius, cursor: 'pointer', fontWeight: 600,
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }
```

- [ ] **Step 4: TypeScript check**

```bash
cd Stock && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd Stock && git add src/components/GameScreen.tsx
git commit -m "feat: add data load error state and retry button, fetch pre-game candles"
```

---

## Task 4: Update `ChartPanel` to use `buildCombinedData`

**Files:**
- Modify: `src/components/ChartPanel.tsx`

Current state: reads only `intradayCandles`, `currentMinute`, `selectedTimeframe`, `indicators`. Builds chart data inline in the update useEffect.

- [ ] **Step 1: Add new store subscriptions at the top of `ChartPanel`**

After the existing store reads:
```typescript
  const intradayCandles = useGameStore((s) => s.intradayCandles);
  const currentMinute = useGameStore((s) => s.currentMinute);
  const selectedTimeframe = useGameStore((s) => s.selectedTimeframe);
  const setTimeframe = useGameStore((s) => s.setTimeframe);
  const indicators = useGameStore((s) => s.indicators);
  const toggleIndicator = useGameStore((s) => s.toggleIndicator);
```

Add three new reads:
```typescript
  const preGameCandles = useGameStore((s) => s.preGameCandles);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);
```

- [ ] **Step 2: Add the import for `buildCombinedData`**

At the top of `ChartPanel.tsx`, add to imports:
```typescript
import { buildCombinedData } from '../engine/chartData';
```

- [ ] **Step 3: Replace the chart data update useEffect**

Current data update useEffect:
```typescript
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
          const series = chartRef.current!.addSeries(LineSeries, {
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
```

Replace with:
```typescript
  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const period = TIMEFRAME_MINUTES[selectedTimeframe];
    const todaySlice = intradayCandles.slice(0, currentMinute + 1);
    const { candles: candleData, volumes: volumeData } = buildCombinedData(
      preGameCandles,
      dailyCandles,
      dayIndex,
      todaySlice,
      selectedTimeframe,
      period,
    );

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // MA lines
    maSeriesRef.current.forEach((s) => {
      try { chartRef.current?.removeSeries(s); } catch {}
    });
    maSeriesRef.current = [];

    if (indicators.ma && chartRef.current) {
      const closes = candleData.map((c) => c.close);
      const periods = [5, 20, 60];
      const colors = ['#f0f6fc', '#1f6feb', '#f78166'];

      periods.forEach((p, idx) => {
        const maValues = calcMA(closes, p);
        const lineData: LineData[] = [];
        candleData.forEach((c, i) => {
          if (maValues[i] !== null) {
            lineData.push({ time: c.time as Time, value: maValues[i] as number });
          }
        });

        if (lineData.length > 0) {
          const series = chartRef.current!.addSeries(LineSeries, {
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
  }, [preGameCandles, dailyCandles, dayIndex, intradayCandles, currentMinute, selectedTimeframe, indicators.ma]);
```

- [ ] **Step 4: Remove unused `aggregateCandles` import (it's now called inside `buildCombinedData`)**

In `ChartPanel.tsx`, find the imports line:
```typescript
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, LineSeries, CandlestickData, HistogramData, LineData, Time } from 'lightweight-charts';
```

And:
```typescript
import { aggregateCandles } from '../engine/aggregator';
```

Remove the `aggregateCandles` import line entirely.

- [ ] **Step 5: TypeScript check**

```bash
cd Stock && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
cd Stock && ~/.nvm/versions/node/v20.20.2/bin/node node_modules/.bin/vitest run
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
cd Stock && git add src/components/ChartPanel.tsx
git commit -m "feat: chart shows pre-game history and accumulated daily bars"
```

---

## Task 5: Update `PortfolioPanel` — holdings qty + per-holding return

**Files:**
- Modify: `src/components/PortfolioPanel.tsx`

Current: `Holdings` row shows `holdingsValue` (total money). No per-share detail.

- [ ] **Step 1: Add `holdingReturn` calculation and the new holdings detail rows**

In `PortfolioPanel.tsx`, after the existing `pnlPercent` calculation (which is for total portfolio), add:

```typescript
  const holdingReturn = portfolio.holdings.qty > 0 && portfolio.holdings.avgPrice > 0
    ? ((currentPrice - portfolio.holdings.avgPrice) / portfolio.holdings.avgPrice) * 100
    : 0;
```

Then find the existing Holdings row:
```typescript
      <div style={rowStyle}><span>Holdings</span><span>{holdingsValue.toLocaleString()}</span></div>
```

Replace with:
```typescript
      <div style={rowStyle}><span>Holdings</span><span>{holdingsValue.toLocaleString()}</span></div>
      {portfolio.holdings.qty > 0 && (
        <div style={{ ...rowStyle, fontSize: 10, color: theme.text.muted, paddingLeft: 8 }}>
          <span>{portfolio.holdings.qty}주 @ {portfolio.holdings.avgPrice.toLocaleString()}</span>
          <span style={{ color: holdingReturn >= 0 ? theme.up : theme.down }}>
            {holdingReturn >= 0 ? '+' : ''}{holdingReturn.toFixed(2)}%
          </span>
        </div>
      )}
```

- [ ] **Step 2: TypeScript check**

```bash
cd Stock && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd Stock && git add src/components/PortfolioPanel.tsx
git commit -m "feat: show holdings qty, avg price, and per-holding return in portfolio panel"
```

---

## Task 6: Update `TradePanel` — max sell quantity

**Files:**
- Modify: `src/components/TradePanel.tsx`

Current bottom info section:
```typescript
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 6, marginTop: 6, fontSize: 10, color: theme.text.muted }}>
        <div>Available: <span style={{ color: theme.text.secondary }}>{portfolio.cash.toLocaleString()}</span></div>
        <div>Max Buy: <span style={{ color: theme.text.secondary }}>{maxBuy} shares</span></div>
      </div>
```

- [ ] **Step 1: Replace the info section with Max Buy + Max Sell side-by-side**

```typescript
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 6, marginTop: 6, fontSize: 10, color: theme.text.muted }}>
        <div style={{ marginBottom: 3 }}>
          Available: <span style={{ color: theme.text.secondary }}>{portfolio.cash.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>매수가능 <span style={{ color: theme.up }}>{maxBuy}주</span></span>
          <span>매도가능 <span style={{ color: theme.down }}>{portfolio.holdings.qty}주</span></span>
        </div>
      </div>
```

- [ ] **Step 2: TypeScript check**

```bash
cd Stock && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
cd Stock && ~/.nvm/versions/node/v20.20.2/bin/node node_modules/.bin/vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
cd Stock && git add src/components/TradePanel.tsx
git commit -m "feat: add max sell quantity display in trade panel"
```

---

## Final Verification

- [ ] **TypeScript build passes**

```bash
cd Stock && npx tsc --noEmit
```

Expected: no errors.

- [ ] **All tests pass**

```bash
cd Stock && ~/.nvm/versions/node/v20.20.2/bin/node node_modules/.bin/vitest run
```

Expected: ≥ 48 tests pass (42 existing + 6 new for chartData + 2 new for store).

- [ ] **Dev server runs without errors**

Start server and confirm `[yahoo] ✓` or `[yahoo] ✗` line appears (crumb attempt), then visit `http://localhost:5173`.

```bash
cd Stock && npm run dev
```
