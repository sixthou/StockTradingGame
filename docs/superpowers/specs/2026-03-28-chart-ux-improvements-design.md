# Chart UX Improvements Design

## Overview

Four improvements to the game's data loading and chart/portfolio UX:

1. **Data load error + reload button** — show error state when data fetch fails; let user retry
2. **Chart history** — show 10 pre-game business days + accumulated game daily bars before today's intraday
3. **Portfolio: holdings qty + per-holding return** — display share count, avg price, and per-holding P&L %
4. **Trade panel: max sell quantity** — display max buyable and max sellable shares side-by-side

---

## Feature 1: Data Load Error + Reload Button

### Current behavior
`GameScreen` has a `loading: boolean`. On failure, it silently sets `loading = false` with empty `dailyCandles`, resulting in a blank chart with no feedback.

### New behavior
- Add `loadError: boolean` local state to `GameScreen`
- On fetch failure, set `loadError = true`
- Render an error screen when `!loading && loadError`:
  ```
  ⚠ 데이터를 불러오지 못했습니다
  [다시 시도] 버튼
  ```
- Retry: add `retryCount: number` state; clicking the button increments it; `useEffect` depends on `[config, retryCount]` so it re-runs
- On retry start: reset `loadError = false`, `loading = true`

### Files changed
- `src/components/GameScreen.tsx` — add `loadError`, `retryCount` state; add error UI

---

## Feature 2: Chart History

### Pre-game candles

**Goal:** When a game starts on `startDate`, the chart already shows 10 trading days of prior daily candles as context before the game's first intraday day.

**Data fetch change (`GameScreen`):**
- Fetch from `startDate - 14 calendar days` (ensures ≥10 business days even with weekends/holidays)
- Split result at `startDate`:
  - `date < startDate` → `preGameCandles` (take last 10)
  - `date >= startDate` → `dailyCandles` (existing game candles, unchanged)
- Store `preGameCandles` in Zustand via new `setPreGameCandles` action

**State change:**
- Add `preGameCandles: DailyCandle[]` to `GameState` (default `[]`)
- Add `setPreGameCandles(candles: DailyCandle[])` action to store

### Chart rendering (`ChartPanel`)

Read `preGameCandles`, `dailyCandles`, `dayIndex` from store.

**1D timeframe:**
```
[...preGameCandles, ...dailyCandles[0..dayIndex]] as date-string time
```
All rendered as a single daily series using `"YYYY-MM-DD"` time strings.

**Intraday timeframes (1m / 5m / 15m / 30m / 1h):**
```
[...preGameCandles, ...dailyCandles[0..dayIndex-1]]   ← daily bars (Unix midnight timestamps)
+ aggregateCandles(intradayCandles[0..currentMinute], period)  ← today's bars
```
Convert daily candles to Unix timestamps using `new Date(date + 'T00:00:00').getTime() / 1000` (local midnight). Local midnight is always before market open (9:00/9:30), so timestamps increase monotonically.

**Volume series:** built the same way — preGame + prior game days daily volume, then today's intraday volume.

**Helper function** (in `ChartPanel.tsx`):
```ts
function buildCombinedData(
  preGame: DailyCandle[],
  gamePrior: DailyCandle[],   // dailyCandles[0..dayIndex-1]
  todayIntraday: IntradayCandle[],
  timeframe: TimeframeKey,
  period: number,
): { candles: CandlestickData[]; volumes: HistogramData[] }
```

### Files changed
- `src/types/index.ts` — add `preGameCandles: DailyCandle[]` to `GameState`
- `src/state/gameStore.ts` — add `preGameCandles: []` to `initialState`, add `setPreGameCandles` action
- `src/components/GameScreen.tsx` — fetch extended date range, split, call `setPreGameCandles`
- `src/components/ChartPanel.tsx` — read `preGameCandles`/`dailyCandles`/`dayIndex`, implement `buildCombinedData`, use it in the data update effect

---

## Feature 3: Portfolio — Holdings Qty + Per-holding Return

### Current behavior
`PortfolioPanel` shows `Holdings: {holdingsValue}` (total money value only).

### New behavior
Add a holdings detail row when `portfolio.holdings.qty > 0`:
```
Holdings   23주 @ 185,000
보유수익률  +2.31%             ← green/red
```

Calculation:
- `qty = portfolio.holdings.qty`
- `avgPrice = portfolio.holdings.avgPrice`
- `holdingReturn = (currentPrice - avgPrice) / avgPrice * 100`

Shown only when `qty > 0`. Color: `theme.up` if positive, `theme.down` if negative.

### Files changed
- `src/components/PortfolioPanel.tsx` — add holdings detail rows

---

## Feature 4: Trade Panel — Max Sell Quantity

### Current behavior
`TradePanel` shows:
```
Available: {cash}
Max Buy: {maxBuy} shares
```

### New behavior
```
Available: {cash}
Max Buy: {maxBuy}주   Max Sell: {holdings.qty}주
```

`maxSell = portfolio.holdings.qty` — already available, just not displayed.

### Files changed
- `src/components/TradePanel.tsx` — add `Max Sell` display

---

## Testing

- `GameScreen` error state: mock `fetchDailyCandles` to throw; assert error UI and retry button render
- `buildCombinedData`: unit test with sample pre-game + game + intraday data; assert correct time ordering and bar count
- `PortfolioPanel`: test holdings row renders qty/avgPrice/return when `qty > 0`, hidden when `qty === 0`
- `TradePanel`: test Max Sell shows `holdings.qty`
