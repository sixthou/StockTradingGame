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
      endDate: '2024-12-31',
      twelveDataApiKey: 'test-key',
      initialCash: 10_000_000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    const state = useGameStore.getState();
    expect(state.config?.stockSymbol).toBe('AAPL');
    expect(state.config?.endDate).toBe('2024-12-31');
    expect(state.config?.twelveDataApiKey).toBe('test-key');
    expect(state.screen).toBe('game');
    expect(state.portfolio.cash).toBe(10_000_000);
  });

  it('executeBuy reduces cash and adds holdings', () => {
    const store = useGameStore.getState();
    store.startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
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
      endDate: '2024-12-31',
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
      endDate: '2024-12-31',
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

  it('applyDividend adds cash based on holdings and increments the receipt count', () => {
    const store = useGameStore.getState();
    store.startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
      initialCash: 1_000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    useGameStore.getState().executeBuy(100, 5, '');
    useGameStore.getState().applyDividend(2);

    const state = useGameStore.getState();
    expect(state.portfolio.cash).toBe(510);
    expect(state.dividendReceiptCount).toBe(1);
  });

  it('cannot buy more than cash allows', () => {
    const store = useGameStore.getState();
    store.startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
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
      endDate: '2024-12-31',
      initialCash: 10000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    useGameStore.getState().executeBuy(100, 5, '');
    expect(() => useGameStore.getState().executeSell(100, 10, '')).toThrow();
  });

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
});
