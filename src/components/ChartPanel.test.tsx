import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartPanel } from './ChartPanel';
import { useGameStore } from '../state/gameStore';

const { createChart } = vi.hoisted(() => {
  const addSeriesMock = vi.fn(() => ({
    setData: vi.fn(),
  }));
  const createChartMock = vi.fn(() => ({
    addSeries: addSeriesMock,
    applyOptions: vi.fn(),
    priceScale: vi.fn(() => ({ applyOptions: vi.fn() })),
    timeScale: vi.fn(() => ({
      getVisibleLogicalRange: vi.fn(() => null),
      subscribeVisibleLogicalRangeChange: vi.fn(),
      unsubscribeVisibleLogicalRangeChange: vi.fn(),
      setVisibleLogicalRange: vi.fn(),
    })),
    remove: vi.fn(),
  }));

  return { createChart: createChartMock };
});

vi.mock('lightweight-charts', () => ({
  createChart,
  CandlestickSeries: 'CandlestickSeries',
  HistogramSeries: 'HistogramSeries',
  LineSeries: 'LineSeries',
}));

describe('ChartPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState((useGameStore as any).getInitialState());
    useGameStore.setState({
      preGameCandles: [
        { date: '2021-01-01', open: 90, high: 100, low: 85, close: 95, volume: 1000 },
      ],
      dailyCandles: [
        { date: '2024-01-02', open: 100, high: 110, low: 95, close: 105, volume: 2000 },
      ],
      dayIndex: 0,
    });
  });

  it('creates the RSI chart when the RSI toggle is enabled', () => {
    render(<ChartPanel />);

    expect(createChart).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'rsi' }));

    expect(createChart).toHaveBeenCalledTimes(2);
  });
});
