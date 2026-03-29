import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { useGameStore } from '../state/gameStore';

vi.mock('../data/yahooFinance', () => ({
  fetchDailyCandles: vi.fn(),
}));

vi.mock('../data/events', () => ({
  fetchMarketEvents: vi.fn(),
}));

vi.mock('./ChartPanel', () => ({
  ChartPanel: () => <div>Mock Chart</div>,
}));

vi.mock('./ResultScreen', () => ({
  ResultScreen: () => <div>Mock Result</div>,
}));

import { fetchDailyCandles } from '../data/yahooFinance';
import { fetchMarketEvents } from '../data/events';

describe('GameScreen load error state', () => {
  beforeEach(() => {
    useGameStore.setState((useGameStore as any).getInitialState());
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows retry and home buttons, and returns to start screen from error state', async () => {
    vi.mocked(fetchDailyCandles).mockRejectedValue(new Error('network down'));
    vi.mocked(fetchMarketEvents).mockResolvedValue([]);

    useGameStore.getState().startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
      initialCash: 1000000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    render(<App />);

    await screen.findByText('⚠ 데이터를 불러오지 못했습니다');
    expect(screen.getByRole('button', { name: '데이터 다시 불러오기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '메인 화면으로 돌아가기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '메인 화면으로 돌아가기' }));

    await waitFor(() => {
      expect(screen.getByText('Stock Trading Game')).toBeInTheDocument();
    });
  });

  it('loads 3 years of history before the start date and shows end button in game view', async () => {
    vi.mocked(fetchDailyCandles)
      .mockResolvedValueOnce([
        { date: '2021-01-04', open: 90, high: 95, low: 88, close: 94, volume: 1000 },
        { date: '2024-01-02', open: 100, high: 110, low: 99, close: 105, volume: 2000 },
        { date: '2024-01-03', open: 106, high: 112, low: 101, close: 109, volume: 2100 },
      ]);
    vi.mocked(fetchMarketEvents).mockResolvedValue([]);

    useGameStore.getState().startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
      initialCash: 1000000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    render(<App />);

    await waitFor(() => {
      expect(fetchDailyCandles).toHaveBeenCalledWith('AAPL', '2021-01-02', '2024-12-31', undefined);
    });
    expect(await screen.findByRole('button', { name: '게임 종료' })).toBeInTheDocument();
  });

  it('starts the game even when market events fail to load', async () => {
    vi.mocked(fetchDailyCandles).mockResolvedValueOnce([
      { date: '2021-01-04', open: 90, high: 95, low: 88, close: 94, volume: 1000 },
      { date: '2024-01-02', open: 100, high: 110, low: 99, close: 105, volume: 2000 },
      { date: '2024-01-03', open: 106, high: 112, low: 101, close: 109, volume: 2100 },
    ]);
    vi.mocked(fetchMarketEvents).mockRejectedValue(new Error('events unavailable'));

    useGameStore.getState().startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
      twelveDataApiKey: 'test-key',
      initialCash: 1000000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    render(<App />);

    expect(await screen.findByRole('button', { name: '게임 종료' })).toBeInTheDocument();
    expect(useGameStore.getState().screen).toBe('game');
    expect(useGameStore.getState().events).toEqual([]);
  });

  it('ends a challenge as success when the target return is reached within the allowed days', async () => {
    vi.mocked(fetchDailyCandles).mockResolvedValue([
      { date: '2021-01-04', open: 90, high: 95, low: 88, close: 94, volume: 1000 },
      { date: '2024-01-02', open: 100, high: 101, low: 99, close: 100, volume: 2000 },
      { date: '2024-01-03', open: 101, high: 102, low: 100, close: 101, volume: 2100 },
    ]);
    vi.mocked(fetchMarketEvents).mockResolvedValue([]);

    useGameStore.getState().startGame({
      stockSymbol: 'SPY',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
      twelveDataApiKey: 'challenge-key',
      initialCash: 1000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'challenge',
      challengeId: 'first-profit',
    });
    useGameStore.getState().executeBuy(100, 10, 'all in');

    render(<App />);

    await screen.findByRole('button', { name: /Next Day/ });
    fireEvent.click(screen.getByRole('button', { name: /Next Day/ }));

    await waitFor(() => {
      expect(useGameStore.getState().screen).toBe('result');
    });
    expect(useGameStore.getState().challengeStatus).toBe('success');
    expect(useGameStore.getState().challengeMessage).toBe('챌린지 성공: 목표 수익률을 달성했습니다.');
  });

  it('ends a challenge as failure when max days are exhausted without reaching the target', async () => {
    vi.mocked(fetchDailyCandles).mockResolvedValue([
      { date: '2021-01-04', open: 90, high: 95, low: 88, close: 94, volume: 1000 },
      { date: '2024-01-02', open: 100, high: 100, low: 100, close: 100, volume: 2000 },
      { date: '2024-01-03', open: 100, high: 100, low: 100, close: 100, volume: 2100 },
      { date: '2024-01-04', open: 100, high: 100, low: 100, close: 100, volume: 2200 },
      { date: '2024-01-05', open: 100, high: 100, low: 100, close: 100, volume: 2300 },
      { date: '2024-01-06', open: 100, high: 100, low: 100, close: 100, volume: 2400 },
      { date: '2024-01-07', open: 100, high: 100, low: 100, close: 100, volume: 2500 },
      { date: '2024-01-08', open: 100, high: 100, low: 100, close: 100, volume: 2600 },
      { date: '2024-01-09', open: 100, high: 100, low: 100, close: 100, volume: 2700 },
      { date: '2024-01-10', open: 100, high: 100, low: 100, close: 100, volume: 2800 },
      { date: '2024-01-11', open: 100, high: 100, low: 100, close: 100, volume: 2900 },
      { date: '2024-01-12', open: 100, high: 100, low: 100, close: 100, volume: 3000 },
      { date: '2024-01-13', open: 100, high: 100, low: 100, close: 100, volume: 3100 },
      { date: '2024-01-14', open: 100, high: 100, low: 100, close: 100, volume: 3200 },
      { date: '2024-01-15', open: 100, high: 100, low: 100, close: 100, volume: 3300 },
    ]);
    vi.mocked(fetchMarketEvents).mockResolvedValue([]);

    useGameStore.getState().startGame({
      stockSymbol: 'SPY',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
      twelveDataApiKey: 'challenge-key',
      initialCash: 1000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'challenge',
      challengeId: 'short-term-trader',
    });

    render(<App />);

    await screen.findByRole('button', { name: /Next Day/ });
    for (let i = 0; i < 13; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Next Day/ }));
    }

    await waitFor(() => {
      expect(useGameStore.getState().screen).toBe('result');
    });
    expect(useGameStore.getState().challengeStatus).toBe('failure');
    expect(useGameStore.getState().challengeMessage).toBe('챌린지 실패: 제한 일수 안에 목표 수익률을 달성하지 못했습니다.');
  });

  it('applies dividends and completes the dividend challenge after three payouts', async () => {
    vi.mocked(fetchDailyCandles).mockResolvedValue([
      { date: '2021-01-04', open: 90, high: 95, low: 88, close: 94, volume: 1000 },
      { date: '2024-01-02', open: 100, high: 100, low: 100, close: 100, volume: 2000 },
      { date: '2024-03-01', open: 100, high: 100, low: 100, close: 100, volume: 2100 },
      { date: '2024-06-01', open: 100, high: 100, low: 100, close: 100, volume: 2200 },
      { date: '2024-09-01', open: 100, high: 100, low: 100, close: 100, volume: 2300 },
    ]);
    vi.mocked(fetchMarketEvents).mockResolvedValue([
      { date: '2024-03-01', type: 'dividend', description: '배당금: 1', data: { dividendAmount: 1 } },
      { date: '2024-06-01', type: 'dividend', description: '배당금: 1', data: { dividendAmount: 1 } },
      { date: '2024-09-01', type: 'dividend', description: '배당금: 1', data: { dividendAmount: 1 } },
    ]);

    useGameStore.getState().startGame({
      stockSymbol: 'SPY',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
      twelveDataApiKey: 'challenge-key',
      initialCash: 1000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'challenge',
      challengeId: 'dividend-investor',
    });
    useGameStore.getState().executeBuy(100, 10, 'hold for dividends');

    render(<App />);

    await screen.findByRole('button', { name: /Next Day/ });
    fireEvent.click(screen.getByRole('button', { name: /Next Day/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next Day/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next Day/ }));

    await waitFor(() => {
      expect(useGameStore.getState().screen).toBe('result');
    });
    expect(useGameStore.getState().portfolio.cash).toBe(30);
    expect(useGameStore.getState().challengeStatus).toBe('success');
    expect(useGameStore.getState().challengeMessage).toBe('챌린지 성공: 목표 배당 횟수를 달성했습니다.');
  });

  it('ends the game instead of loading more when the last loaded candle is today', async () => {
    vi.mocked(fetchDailyCandles).mockResolvedValue([
      { date: '2023-03-28', open: 90, high: 95, low: 88, close: 94, volume: 1000 },
      { date: '2026-03-28', open: 100, high: 101, low: 99, close: 100, volume: 2000 },
      { date: '2026-03-29', open: 101, high: 102, low: 100, close: 101, volume: 2100 },
    ]);
    vi.mocked(fetchMarketEvents).mockResolvedValue([]);

    useGameStore.getState().startGame({
      stockSymbol: 'AAPL',
      startDate: '2026-03-28',
      endDate: '2027-03-28',
      twelveDataApiKey: 'test-key',
      initialCash: 1000000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });

    render(<App />);

    await screen.findByRole('button', { name: /Next Day/ });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'));
    fireEvent.click(screen.getByRole('button', { name: /Next Day/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next Day/ }));

    expect(useGameStore.getState().screen).toBe('result');
    expect(fetchDailyCandles).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
