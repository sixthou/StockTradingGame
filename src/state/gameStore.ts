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
  applyDividend: (amountPerShare: number) => void;
  setDailyCandles: (candles: DailyCandle[]) => void;
  setIntradayCandles: (candles: IntradayCandle[]) => void;
  setPreGameCandles: (candles: DailyCandle[]) => void;
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
  setChallengeResult: (status: 'in_progress' | 'success' | 'failure' | null, message: string | null) => void;
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
  preGameCandles: [],
  events: [],
  screen: 'start',
  selectedTimeframe: '1m',
  indicators: { ma: false, rsi: false, macd: false },
  currentEps: null,
  currentBps: null,
  challengeStatus: null,
  challengeMessage: null,
  dividendReceiptCount: 0,
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
      selectedTimeframe: '1D' as const,
      screen: 'game' as const,
      challengeStatus: null,
      challengeMessage: null,
      dividendReceiptCount: 0,
    };
    set(newState);
    saveToStorage({ ...get(), ...newState });
  },

  executeBuy: (price: number, qty: number, memo: string) => {
    const { portfolio, currentDate } = get();
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
      timestamp: `${currentDate}T00:00:00`,
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
    const { portfolio, currentDate } = get();
    if (qty > portfolio.holdings.qty) {
      throw new Error('Insufficient holdings');
    }

    const trade: Trade = {
      type: 'sell',
      price,
      qty,
      timestamp: `${currentDate}T00:00:00`,
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

  applyDividend: (amountPerShare) => {
    const { portfolio } = get();
    if (amountPerShare <= 0 || portfolio.holdings.qty <= 0) return;

    const dividendCash = amountPerShare * portfolio.holdings.qty;
    set({
      portfolio: {
        ...portfolio,
        cash: portfolio.cash + dividendCash,
      },
      dividendReceiptCount: get().dividendReceiptCount + 1,
    });
    saveToStorage(get());
  },

  setDailyCandles: (candles) => set({ dailyCandles: candles }),
  setIntradayCandles: (candles) => set({ intradayCandles: candles }),
  setPreGameCandles: (candles) => set({ preGameCandles: candles }),
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
  setChallengeResult: (status, message) => set({ challengeStatus: status, challengeMessage: message }),
  resetGame: () => set(initialState),
}));

// Expose initial state for testing
(useGameStore as any).getInitialState = () => initialState;
