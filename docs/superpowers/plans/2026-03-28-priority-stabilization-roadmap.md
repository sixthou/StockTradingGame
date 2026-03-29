# Stock Trading Game Stabilization Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the current stock trading game so it has a runnable test baseline, correct market-time behavior, working indicator toggles, state restoration, and a clearer boundary between synthetic and real intraday data.

**Architecture:** Keep the current Vite + React + Zustand structure, but split corrections into five small tasks: environment baseline, market-time utilities, chart indicator rendering, persisted state hydration, and intraday-source strategy. Each task is independently testable and leaves the app in a better state even if later tasks are deferred.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Zustand, lightweight-charts

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Declare supported Node runtime so test failures stop being ambiguous |
| `.nvmrc` | Create | Pin a local Node version for contributors |
| `src/engine/marketTime.ts` | Create | Centralize KR/US market open/close/time-label rules |
| `src/engine/marketTime.test.ts` | Create | Verify market clock calculations |
| `src/components/TopBar.tsx` | Modify | Fix displayed market clock |
| `src/components/GameScreen.tsx` | Modify | Use shared market helpers instead of ad-hoc symbol checks |
| `src/components/ChartPanel.tsx` | Modify | Render RSI/MACD panels instead of no-op toggles |
| `src/engine/indicators.ts` | Modify | Add small helpers for chart panel integration if needed |
| `src/engine/indicators.test.ts` | Modify | Lock in RSI/MACD behavior with integration-friendly expectations |
| `src/state/storage.ts` | Modify | Add typed restore helper and sanitization |
| `src/state/gameStore.ts` | Modify | Add hydrate action for saved state |
| `src/state/gameStore.test.ts` | Modify | Verify persisted state restore |
| `src/App.tsx` | Modify | Hydrate store on first mount |
| `src/types/index.ts` | Modify | Add explicit intraday source metadata |
| `src/engine/interpolation.ts` | Modify | Tag generated data as synthetic input for UI and future branching |
| `src/engine/interpolation.test.ts` | Modify | Keep synthetic-data behavior explicit |
| `src/components/PortfolioPanel.tsx` | Modify | Surface whether current intraday replay is synthetic |

---

### Task 1: Establish a runnable test baseline

**Files:**
- Modify: `package.json`
- Create: `.nvmrc`

- [ ] **Step 1: Add a failing environment assertion**

Append this test script note to `package.json` so contributors stop running Vitest on unsupported Node versions:

```json
{
  "engines": {
    "node": ">=20.19.0"
  }
}
```

- [ ] **Step 2: Create `.nvmrc`**

Create `.nvmrc`:

```txt
20.19.0
```

- [ ] **Step 3: Verify local runtime mismatch is explicit**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
node -v
npm test -- --run
```

Expected:
- `node -v` prints a version lower than `v20.19.0` in the current environment.
- `npm test -- --run` still fails until Node is upgraded, but the repository now documents the correct runtime.

- [ ] **Step 4: Verify tests under supported runtime**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run
```

Expected: Vitest starts successfully. Individual test failures, if any, are now real code failures rather than runtime incompatibility.

- [ ] **Step 5: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add package.json .nvmrc
git commit -m "chore: declare supported node runtime"
```

---

### Task 2: Centralize market-time rules and fix the top-bar clock

**Files:**
- Create: `src/engine/marketTime.ts`
- Create: `src/engine/marketTime.test.ts`
- Modify: `src/components/TopBar.tsx`
- Modify: `src/components/GameScreen.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/engine/marketTime.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { detectMarket, formatMarketTimeLabel, getMarketStartMinute } from './marketTime';

describe('marketTime', () => {
  it('detects Korean tickers', () => {
    expect(detectMarket('005930.KS')).toBe('KR');
    expect(detectMarket('035720.KQ')).toBe('KR');
  });

  it('detects US tickers', () => {
    expect(detectMarket('AAPL')).toBe('US');
  });

  it('returns 09:00 start for KR', () => {
    expect(getMarketStartMinute('KR')).toBe(9 * 60);
  });

  it('returns 09:30 start for US', () => {
    expect(getMarketStartMinute('US')).toBe(9 * 60 + 30);
  });

  it('formats KR minute offsets correctly', () => {
    expect(formatMarketTimeLabel('KR', 0)).toBe('09:00');
    expect(formatMarketTimeLabel('KR', 75)).toBe('10:15');
  });

  it('formats US minute offsets correctly', () => {
    expect(formatMarketTimeLabel('US', 0)).toBe('09:30');
    expect(formatMarketTimeLabel('US', 45)).toBe('10:15');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run src/engine/marketTime.test.ts
```

Expected: FAIL with `Cannot find module './marketTime'`.

- [ ] **Step 3: Create `src/engine/marketTime.ts`**

Create `src/engine/marketTime.ts`:

```typescript
export type Market = 'KR' | 'US';

export function detectMarket(symbol: string | undefined | null): Market {
  return symbol?.endsWith('.KS') || symbol?.endsWith('.KQ') ? 'KR' : 'US';
}

export function getMarketStartMinute(market: Market): number {
  return market === 'KR' ? 9 * 60 : 9 * 60 + 30;
}

export function formatMarketTimeLabel(market: Market, currentMinute: number): string {
  const absoluteMinute = getMarketStartMinute(market) + currentMinute;
  const hours = Math.floor(absoluteMinute / 60);
  const mins = absoluteMinute % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Update `src/components/TopBar.tsx`**

Replace the time-label section in `src/components/TopBar.tsx` with:

```typescript
import { detectMarket, formatMarketTimeLabel } from '../engine/marketTime';

// inside TopBar()
const market = detectMarket(config?.stockSymbol);
const timeStr = formatMarketTimeLabel(market, currentMinute);
```

Remove this old code:

```typescript
const hours = Math.floor(currentMinute / 60) + (config?.stockSymbol.endsWith('.KS') || config?.stockSymbol.endsWith('.KQ') ? 9 : 9);
const mins = currentMinute % 60;
const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
```

- [ ] **Step 5: Update `src/components/GameScreen.tsx`**

Replace the inline market detection with:

```typescript
import { detectMarket } from '../engine/marketTime';

const market = detectMarket(config?.stockSymbol);
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run src/engine/marketTime.test.ts src/engine/interpolation.test.ts
```

Expected: PASS. Existing interpolation behavior remains unchanged while the displayed clock is now correct.

- [ ] **Step 7: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/engine/marketTime.ts src/engine/marketTime.test.ts src/components/TopBar.tsx src/components/GameScreen.tsx
git commit -m "fix: centralize market time handling"
```

---

### Task 3: Make RSI and MACD toggles do real work

**Files:**
- Modify: `src/components/ChartPanel.tsx`
- Modify: `src/engine/indicators.ts`
- Modify: `src/engine/indicators.test.ts`

- [ ] **Step 1: Extend indicator tests for chart-friendly output**

Add to `src/engine/indicators.test.ts`:

```typescript
it('returns at least one RSI value once enough closes exist', () => {
  const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
  const result = calcRSI(closes, 14);
  expect(result.some((value) => value !== null)).toBe(true);
});

it('returns at least one MACD and signal pair once enough closes exist', () => {
  const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 4) * 10);
  const { macd, signal } = calcMACD(closes);
  const pairExists = macd.some((value, index) => value !== null && signal[index] !== null);
  expect(pairExists).toBe(true);
});
```

- [ ] **Step 2: Run test to verify current chart toggle gap remains unimplemented**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run src/engine/indicators.test.ts
```

Expected: PASS. The indicator engine already works, which confirms the missing piece is chart rendering, not calculations.

- [ ] **Step 3: Refactor `src/components/ChartPanel.tsx` to render sub-panels**

Implement the chart structure below in `src/components/ChartPanel.tsx`:

```typescript
const mainChartHeight = indicators.rsi || indicators.macd ? 220 : 300;
const subPanelHeight = 80;

// create one chart for price/volume and separate lightweight-charts instances
// for RSI and MACD panels. Reuse the same candleData closes from buildCombinedData.
```

Add these refs:

```typescript
const rsiContainerRef = useRef<HTMLDivElement>(null);
const macdContainerRef = useRef<HTMLDivElement>(null);
const rsiChartRef = useRef<IChartApi | null>(null);
const macdChartRef = useRef<IChartApi | null>(null);
```

Within the data-update effect, add:

```typescript
const closes = candleData.map((c) => c.close);
const times = candleData.map((c) => c.time as Time);

if (indicators.rsi && rsiChartRef.current) {
  const rsiValues = calcRSI(closes, 14);
  const rsiSeries = rsiChartRef.current.addLineSeries({ color: '#d29922', lineWidth: 1 });
  rsiSeries.setData(
    times
      .map((time, index) => ({ time, value: rsiValues[index] }))
      .filter((point): point is { time: Time; value: number } => point.value !== null),
  );
}

if (indicators.macd && macdChartRef.current) {
  const { macd, signal, histogram } = calcMACD(closes);
  const macdSeries = macdChartRef.current.addLineSeries({ color: '#58a6ff', lineWidth: 1 });
  const signalSeries = macdChartRef.current.addLineSeries({ color: '#f78166', lineWidth: 1 });
  const histogramSeries = macdChartRef.current.addHistogramSeries({});

  macdSeries.setData(
    times
      .map((time, index) => ({ time, value: macd[index] }))
      .filter((point): point is { time: Time; value: number } => point.value !== null),
  );

  signalSeries.setData(
    times
      .map((time, index) => ({ time, value: signal[index] }))
      .filter((point): point is { time: Time; value: number } => point.value !== null),
  );

  histogramSeries.setData(
    times
      .map((time, index) => ({
        time,
        value: histogram[index],
        color: (histogram[index] ?? 0) >= 0 ? theme.up : theme.down,
      }))
      .filter((point): point is { time: Time; value: number; color: string } => point.value !== null),
  );
}
```

Also import the missing indicator functions:

```typescript
import { calcMA, calcRSI, calcMACD } from '../engine/indicators';
```

- [ ] **Step 4: Make cleanup idempotent**

Before creating new RSI/MACD series on updates, remove prior indicator-only charts and recreate them so toggling does not stack duplicate series.

Use this cleanup shape:

```typescript
rsiChartRef.current?.remove();
rsiChartRef.current = null;
macdChartRef.current?.remove();
macdChartRef.current = null;
```

- [ ] **Step 5: Verify behavior**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run src/engine/indicators.test.ts
npm run build
```

Expected:
- Indicator tests PASS.
- Production build succeeds.
- In the running app, clicking `RSI` or `MACD` visibly adds a sub-panel instead of doing nothing.

- [ ] **Step 6: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/components/ChartPanel.tsx src/engine/indicators.ts src/engine/indicators.test.ts
git commit -m "feat: render rsi and macd chart panels"
```

---

### Task 4: Restore saved game state on app startup

**Files:**
- Modify: `src/state/storage.ts`
- Modify: `src/state/gameStore.ts`
- Modify: `src/state/gameStore.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing store hydration tests**

Add to `src/state/gameStore.test.ts`:

```typescript
it('hydrates persisted state into the store', () => {
  const persisted = {
    screen: 'game',
    currentDate: '2024-01-05',
    currentMinute: 120,
    portfolio: {
      cash: 900000,
      holdings: { qty: 10, avgPrice: 10000 },
      totalInvested: 1000000,
      trades: [],
    },
  };

  useGameStore.getState().hydrateFromStorage(persisted as any);

  const state = useGameStore.getState();
  expect(state.screen).toBe('game');
  expect(state.currentDate).toBe('2024-01-05');
  expect(state.currentMinute).toBe(120);
  expect(state.portfolio.cash).toBe(900000);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run src/state/gameStore.test.ts
```

Expected: FAIL with `hydrateFromStorage is not a function`.

- [ ] **Step 3: Add a typed restore helper in `src/state/storage.ts`**

Append:

```typescript
import type { GameState } from '../types';

export function loadGameSnapshot(): Partial<GameState> | null {
  return loadFromStorage<Partial<GameState>>();
}
```

- [ ] **Step 4: Add hydrate action to `src/state/gameStore.ts`**

In `GameActions`, add:

```typescript
hydrateFromStorage: (snapshot: Partial<GameState>) => void;
```

In the store body, add:

```typescript
hydrateFromStorage: (snapshot) => set((state) => ({
  ...state,
  ...snapshot,
  portfolio: snapshot.portfolio ? { ...state.portfolio, ...snapshot.portfolio } : state.portfolio,
  indicators: snapshot.indicators ? { ...state.indicators, ...snapshot.indicators } : state.indicators,
})),
```

- [ ] **Step 5: Hydrate on first app mount**

At the top of `src/App.tsx`, add:

```typescript
import { useEffect } from 'react';
import { loadGameSnapshot } from './state/storage';
```

Inside `App()` add:

```typescript
const hydrateFromStorage = useGameStore((s) => s.hydrateFromStorage);

useEffect(() => {
  const snapshot = loadGameSnapshot();
  if (snapshot) {
    hydrateFromStorage(snapshot);
  }
}, [hydrateFromStorage]);
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run src/state/gameStore.test.ts
npm run build
```

Expected: PASS. Reloading the browser preserves the in-progress session.

- [ ] **Step 7: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/state/storage.ts src/state/gameStore.ts src/state/gameStore.test.ts src/App.tsx
git commit -m "feat: hydrate saved game state on startup"
```

---

### Task 5: Make synthetic intraday replay explicit and prepare a future real-data path

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/engine/interpolation.ts`
- Modify: `src/engine/interpolation.test.ts`
- Modify: `src/state/gameStore.ts`
- Modify: `src/components/PortfolioPanel.tsx`

- [ ] **Step 1: Add failing type-level expectations through tests**

Add to `src/engine/interpolation.test.ts`:

```typescript
it('returns metadata that identifies candles as synthetic replay data', () => {
  const result = generateIntradayPrices(candle, 'KR');
  expect(result[0].source).toBe('synthetic');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run src/engine/interpolation.test.ts
```

Expected: FAIL because `source` does not exist on `IntradayCandle`.

- [ ] **Step 3: Extend `IntradayCandle` type**

In `src/types/index.ts`, update the interface:

```typescript
export interface IntradayCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: 'synthetic' | 'historical';
}
```

- [ ] **Step 4: Tag generated candles in `src/engine/interpolation.ts`**

Inside the pushed candle object, add:

```typescript
source: 'synthetic',
```

- [ ] **Step 5: Surface this in the UI**

In `src/components/PortfolioPanel.tsx`, add a small row under valuation metrics:

```typescript
<div style={{ ...rowStyle, fontSize: 10 }}>
  <span>Replay Data</span>
  <span style={{ color: theme.text.secondary }}>
    {intradayCandles[0]?.source === 'synthetic' ? 'Synthetic Intraday' : 'Historical Intraday'}
  </span>
</div>
```

- [ ] **Step 6: Verify**

Run:

```bash
cd /Users/yugcheonho/Documents/claude/Stock
~/.nvm/versions/node/v20.19.0/bin/node node_modules/.bin/vitest run src/engine/interpolation.test.ts
npm run build
```

Expected:
- Interpolation tests PASS.
- Build succeeds.
- Users can now see that intraday replay is synthetic, which reduces false precision before a real historical intraday provider is added.

- [ ] **Step 7: Commit**

```bash
cd /Users/yugcheonho/Documents/claude/Stock
git add src/types/index.ts src/engine/interpolation.ts src/engine/interpolation.test.ts src/components/PortfolioPanel.tsx
git commit -m "feat: label synthetic intraday replay data"
```

---

## Self-Review

### Spec coverage

- Runtime baseline: covered by Task 1.
- Market-time correctness: covered by Task 2.
- Indicator toggle completion: covered by Task 3.
- Persistence recovery: covered by Task 4.
- Synthetic-vs-real intraday clarity: covered by Task 5.

### Placeholder scan

- No `TBD`, `TODO`, or deferred pseudo-steps remain.
- Each task includes explicit files, commands, and concrete code snippets.

### Type consistency

- `Market` is introduced once in `src/engine/marketTime.ts` and reused consistently.
- `hydrateFromStorage` is the single restore action name across tests and store code.
- `IntradayCandle.source` uses the same `'synthetic' | 'historical'` union in tests, types, and UI.
