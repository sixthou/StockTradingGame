import { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { fetchDailyCandles } from '../data/yahooFinance';
import { fetchMarketEvents } from '../data/events';
import { getChallengeById } from '../data/challenges';
import { evaluateChallengeProgress } from '../engine/challenges';
import { TopBar } from './TopBar';
import { ChartPanel } from './ChartPanel';
import { PortfolioPanel } from './PortfolioPanel';
import { TradePanel } from './TradePanel';
import { EventPanel } from './EventPanel';
import { TimeControls } from './TimeControls';
import { useIsMobile } from '../hooks/useIsMobile';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addYears(date: string, years: number): string {
  const value = parseDate(date);
  value.setFullYear(value.getFullYear() + years);
  return formatDate(value);
}

function addDays(date: string, days: number): string {
  const value = parseDate(date);
  value.setDate(value.getDate() + days);
  return formatDate(value);
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function getTodayDate(): string {
  return formatDate(new Date());
}

export function GameScreen() {
  const isMobile = useIsMobile();
  const config = useGameStore((s) => s.config);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const playbackSpeed = useGameStore((s) => s.playbackSpeed);
  const setDailyCandles = useGameStore((s) => s.setDailyCandles);
  const setPreGameCandles = useGameStore((s) => s.setPreGameCandles);
  const setEvents = useGameStore((s) => s.setEvents);
  const setCurrentDate = useGameStore((s) => s.setCurrentDate);
  const setDayIndex = useGameStore((s) => s.setDayIndex);
  const setPlaying = useGameStore((s) => s.setPlaying);
  const setScreen = useGameStore((s) => s.setScreen);
  const applySalary = useGameStore((s) => s.applySalary);
  const applyDividend = useGameStore((s) => s.applyDividend);
  const resetGame = useGameStore((s) => s.resetGame);
  const setFundamentals = useGameStore((s) => s.setFundamentals);
  const setChallengeResult = useGameStore((s) => s.setChallengeResult);
  const dividendReceiptCount = useGameStore((s) => s.dividendReceiptCount);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const appliedSalaryDatesRef = useRef<Set<string>>(new Set());
  const appliedDividendDatesRef = useRef<Set<string>>(new Set());

  const loadMoreCandles = useCallback(async (fromDate: string) => {
    if (!config) return [];

    const fetchEnd = minDate(addYears(fromDate, 1), config.endDate);
    if (fetchEnd < fromDate) return [];

    const fetched = await fetchDailyCandles(
      config.stockSymbol,
      fromDate,
      fetchEnd,
      config.twelveDataApiKey,
    );
    const newCandles = fetched.filter((candle) => candle.date >= fromDate && candle.date <= fetchEnd);
    return newCandles;
  }, [config]);

  useEffect(() => {
    if (!config) return;

    const load = async () => {
      setLoading(true);
      setLoadError(false);
      appliedSalaryDatesRef.current = new Set();
      appliedDividendDatesRef.current = new Set();
      setChallengeResult(null, null);

      try {
        const historyStart = addYears(config.startDate, -3);
        const initialEnd = minDate(addYears(config.startDate, 1), config.endDate);

        const allCandles = await fetchDailyCandles(
          config.stockSymbol,
          historyStart,
          initialEnd,
          config.twelveDataApiKey,
        );
        const events = await fetchMarketEvents(
          config.stockSymbol,
          historyStart,
          config.endDate,
          config.twelveDataApiKey,
        ).catch((error) => {
          console.warn('Failed to load market events:', error);
          return [];
        });

        const preGame = allCandles.filter((c) => c.date < config.startDate);
        const gameCandles = allCandles.filter((c) => c.date >= config.startDate);

        setPreGameCandles(preGame);
        setDailyCandles(gameCandles);
        setEvents(events);

        if (gameCandles.length > 0) {
          setDayIndex(0);
          setCurrentDate(gameCandles[0].date);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [config, retryCount, setCurrentDate, setDailyCandles, setEvents, setPreGameCandles, setDayIndex]);

  useEffect(() => {
    if (!config || dailyCandles.length === 0 || dayIndex >= dailyCandles.length) return;

    const daily = dailyCandles[dayIndex];
    setCurrentDate(daily.date);

    if (config.monthlySalary > 0) {
      const date = new Date(daily.date);
      if (date.getDate() === config.salaryDay && !appliedSalaryDatesRef.current.has(daily.date)) {
        applySalary();
        appliedSalaryDatesRef.current.add(daily.date);
      }
    }

    let nextDividendReceiptCount = dividendReceiptCount;
    const dividendEvents = useGameStore.getState().events.filter(
      (event) => event.type === 'dividend' && event.date === daily.date,
    );
    for (const event of dividendEvents) {
      const dividendKey = `${event.date}:${event.data?.dividendAmount ?? 0}`;
      if (appliedDividendDatesRef.current.has(dividendKey)) continue;
      const amountPerShare = event.data?.dividendAmount ?? 0;
      if (amountPerShare > 0 && useGameStore.getState().portfolio.holdings.qty > 0) {
        applyDividend(amountPerShare);
        nextDividendReceiptCount += 1;
      }
      appliedDividendDatesRef.current.add(dividendKey);
    }

    const earningsEvent = useGameStore.getState().events
      .filter((event) => event.type === 'earnings' && event.date <= daily.date)
      .pop();
    if (earningsEvent?.data?.eps !== undefined) {
      setFundamentals(earningsEvent.data.eps, earningsEvent.data.bps ?? null);
    }

    if (config.mode === 'challenge') {
      const challenge = getChallengeById(config.challengeId);
      if (challenge) {
        const totalValue = useGameStore.getState().portfolio.cash
          + useGameStore.getState().portfolio.holdings.qty * daily.close;
        const totalReturn = useGameStore.getState().portfolio.totalInvested > 0
          ? (totalValue - useGameStore.getState().portfolio.totalInvested) / useGameStore.getState().portfolio.totalInvested
          : 0;
        const progress = evaluateChallengeProgress(challenge, dayIndex + 1, totalReturn, nextDividendReceiptCount);

        if (progress.status !== 'in_progress') {
          setChallengeResult(progress.status, progress.message);
          setPlaying(false);
          setScreen('result');
          return;
        }
      }
    }

    if (daily.date >= config.endDate) {
      setPlaying(false);
      setScreen('result');
    }
  }, [applyDividend, applySalary, config, dailyCandles, dayIndex, dividendReceiptCount, setChallengeResult, setCurrentDate, setFundamentals, setPlaying, setScreen]);

  const handleEndGame = useCallback(() => {
    setPlaying(false);
    setScreen('result');
  }, [setPlaying, setScreen]);

  const handleNextDay = useCallback(async () => {
    if (!config || dailyCandles.length === 0) return;

    const nextIndex = dayIndex + 1;
    if (nextIndex < dailyCandles.length) {
      setDayIndex(nextIndex);
      return;
    }

    const lastLoaded = dailyCandles[dailyCandles.length - 1];
    const today = getTodayDate();
    if (!lastLoaded || lastLoaded.date >= config.endDate || lastLoaded.date >= today || isLoadingMore) {
      setPlaying(false);
      setScreen('result');
      return;
    }

    setIsLoadingMore(true);
    try {
      const moreCandles = await loadMoreCandles(addDays(lastLoaded.date, 1));
      if (moreCandles.length > 0) {
        setDailyCandles([...dailyCandles, ...moreCandles]);
        setDayIndex(nextIndex);
        return;
      }
      setPlaying(false);
      setScreen('result');
    } catch (error) {
      console.error('Failed to load more data:', error);
      setLoadError(true);
      setPlaying(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [config, dailyCandles, dayIndex, isLoadingMore, loadMoreCandles, setDailyCandles, setDayIndex, setPlaying, setScreen]);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      void handleNextDay();
    }, Math.max(250, 1000 / Math.max(playbackSpeed, 1)));

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [handleNextDay, isPlaying, playbackSpeed]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setPlaying(!useGameStore.getState().isPlaying);
          break;
        case 'ArrowRight':
          if (!useGameStore.getState().isPlaying) {
            void handleNextDay();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNextDay, setPlaying]);

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
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setRetryCount((count) => count + 1)}
            style={{
              background: theme.accent, color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: theme.radius, cursor: 'pointer', fontWeight: 600,
            }}
          >
            데이터 다시 불러오기
          </button>
          <button
            onClick={() => resetGame()}
            style={{
              background: theme.bg.panel, color: theme.text.primary, border: `1px solid ${theme.border}`,
              padding: '10px 24px', borderRadius: theme.radius, cursor: 'pointer', fontWeight: 600,
            }}
          >
            메인 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 4, height: '100vh', minHeight: '100vh', boxSizing: 'border-box', overflow: 'hidden' }}>
      {isMobile ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <TopBar compact />
          <PortfolioPanel compact />
        </div>
      ) : (
        <TopBar />
      )}

      <div style={{ display: 'flex', gap: 4, flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row', minHeight: 0 }}>
        <div style={{ flex: isMobile ? 1 : 3, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
          <ChartPanel />
        </div>

        <div style={{ flex: isMobile ? 'none' : 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr', gap: 4, minWidth: isMobile ? 0 : 200 }}>
          {!isMobile && <PortfolioPanel />}
          {!isMobile && <EventPanel />}
          {!isMobile && <TradePanel />}
        </div>
      </div>

      {!isMobile && <TimeControls onNextDay={handleNextDay} onEndGame={handleEndGame} isLoadingMore={isLoadingMore} />}
      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <TimeControls onNextDay={handleNextDay} onEndGame={handleEndGame} isLoadingMore={isLoadingMore} />
          <TradePanel compact />
        </div>
      )}
    </div>
  );
}
