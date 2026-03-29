export interface GameConfig {
  stockSymbol: string;
  startDate: string;
  endDate: string;
  twelveDataApiKey?: string;
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
  requiredDividends?: number;
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
  challengeStatus: 'in_progress' | 'success' | 'failure' | null;
  challengeMessage: string | null;
  dividendReceiptCount: number;
}
