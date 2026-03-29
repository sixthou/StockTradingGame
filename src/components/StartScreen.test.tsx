import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StartScreen } from './StartScreen';
import { useGameStore } from '../state/gameStore';

vi.mock('../data/yahooFinance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/yahooFinance')>();
  return {
    ...actual,
    searchSymbol: vi.fn(),
  };
});

import { searchSymbol } from '../data/yahooFinance';

describe('StartScreen US-only symbol support', () => {
  beforeEach(() => {
    useGameStore.setState((useGameStore as any).getInitialState());
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('shows a US-only warning and keeps the game on the start screen when a non-US symbol is selected', async () => {
    vi.mocked(searchSymbol).mockResolvedValue([
      { symbol: '005930.KS', shortname: 'Samsung Electronics', exchange: 'KSC' },
    ]);

    render(<StartScreen />);

    fireEvent.change(screen.getByPlaceholderText('먼저 API Key를 입력하세요'), {
      target: { value: 'test-key' },
    });
    fireEvent.change(screen.getByPlaceholderText('AAPL, MSFT, NVDA, ...'), {
      target: { value: '005930.KS' },
    });
    fireEvent.click(screen.getByRole('button', { name: '검색' }));

    fireEvent.click(await screen.findByRole('button', { name: /005930\.KS/ }));
    fireEvent.click(screen.getByRole('button', { name: '게임 시작' }));

    await waitFor(() => {
      expect(screen.getAllByText('현재는 미국 종목만 지원합니다.')).toHaveLength(2);
    });
    expect(useGameStore.getState().screen).toBe('start');
  });

  it('shows initial cash as formatted USD input', () => {
    render(<StartScreen />);

    expect(screen.getByDisplayValue('$10,000,000')).toBeInTheDocument();
  });

  it('starts challenge mode with Twelve Data API key and SPY symbol', async () => {
    render(<StartScreen />);

    fireEvent.change(screen.getByPlaceholderText('먼저 API Key를 입력하세요'), {
      target: { value: 'challenge-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: '챌린지' }));
    fireEvent.click(screen.getByRole('button', { name: /첫 수익 내기/ }));

    await waitFor(() => {
      const state = useGameStore.getState();
      expect(state.screen).toBe('game');
      expect(state.config?.twelveDataApiKey).toBe('challenge-key');
      expect(state.config?.stockSymbol).toBe('SPY');
    });
  });

  it('blocks challenge mode when Twelve Data API key is missing', async () => {
    render(<StartScreen />);

    fireEvent.click(screen.getByRole('button', { name: '챌린지' }));
    fireEvent.click(screen.getByRole('button', { name: /첫 수익 내기/ }));

    await waitFor(() => {
      expect(screen.getByText('챌린지는 Twelve Data API Key가 필요합니다.')).toBeInTheDocument();
    });
    expect(useGameStore.getState().screen).toBe('start');
  });

  it('blocks free mode when Twelve Data API key is missing', async () => {
    render(<StartScreen />);

    expect(screen.getByRole('button', { name: '검색' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('AAPL, MSFT, NVDA, ...'), {
      target: { value: 'AAPL' },
    });
    expect(screen.getByRole('button', { name: '검색' })).toBeDisabled();
    expect(useGameStore.getState().screen).toBe('start');
  });

  it('resets end date to one year later when start date changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'));

    render(<StartScreen />);

    const [startInput, endInput] = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/) as HTMLInputElement[];
    fireEvent.change(startInput, { target: { value: '2025-02-10' } });

    expect(startInput.value).toBe('2025-02-10');
    expect(endInput.value).toBe('2026-02-10');
    vi.useRealTimers();
  });

  it('random button picks a date before today and resets end date to one year later', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    render(<StartScreen />);

    fireEvent.click(screen.getByRole('button', { name: '랜덤' }));

    const [startInput, endInput] = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/) as HTMLInputElement[];
    const [year, month, day] = startInput.value.split('-').map(Number);
    const expectedEnd = new Date(year + 1, month - 1, day);
    const expectedEndValue = `${expectedEnd.getFullYear()}-${String(expectedEnd.getMonth() + 1).padStart(2, '0')}-${String(expectedEnd.getDate()).padStart(2, '0')}`;

    expect(startInput.value >= '2016-03-28').toBe(true);
    expect(startInput.value <= '2026-03-28').toBe(true);
    expect(endInput.value).toBe(expectedEndValue);
    vi.useRealTimers();
  });
});
