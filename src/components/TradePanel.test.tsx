import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { TradePanel } from './TradePanel';
import { useGameStore } from '../state/gameStore';

describe('TradePanel', () => {
  beforeEach(() => {
    useGameStore.setState((useGameStore as any).getInitialState());
    useGameStore.getState().startGame({
      stockSymbol: 'AAPL',
      startDate: '2024-01-02',
      endDate: '2024-12-31',
      initialCash: 1000,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'free',
    });
    useGameStore.getState().setDailyCandles([
      { date: '2024-01-02', open: 90, high: 110, low: 85, close: 100, volume: 1000 },
    ]);
  });

  it('executes buy for the max affordable quantity', () => {
    render(<TradePanel />);

    fireEvent.click(screen.getByRole('button', { name: 'MAX BUY' }));

    const state = useGameStore.getState();
    expect(state.portfolio.holdings.qty).toBe(10);
    expect(state.portfolio.cash).toBe(0);
  });

  it('executes sell for the full holding quantity', () => {
    useGameStore.setState((state) => ({
      portfolio: {
        ...state.portfolio,
        cash: 300,
        holdings: { qty: 7, avgPrice: 95 },
      },
    }));

    render(<TradePanel />);

    fireEvent.click(screen.getByRole('button', { name: 'MAX SELL' }));

    const state = useGameStore.getState();
    expect(state.portfolio.holdings.qty).toBe(0);
    expect(state.portfolio.cash).toBe(1000);
  });

  it('shows available cash as formatted USD', () => {
    render(<TradePanel />);

    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('keeps auto play running after a trade executes', () => {
    useGameStore.getState().setPlaying(true);

    render(<TradePanel />);

    fireEvent.click(screen.getByRole('button', { name: 'MAX BUY' }));

    expect(useGameStore.getState().isPlaying).toBe(true);
  });
});
