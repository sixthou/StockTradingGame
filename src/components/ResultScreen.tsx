import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, createSeriesMarkers, IChartApi, Time } from 'lightweight-charts';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { formatUsd } from '../utils/currency';
import { getChallengeById } from '../data/challenges';
import { evaluateChallengeProgress } from '../engine/challenges';

export function ResultScreen() {
  const portfolio = useGameStore((s) => s.portfolio);
  const config = useGameStore((s) => s.config);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const resetGame = useGameStore((s) => s.resetGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const challengeStatus = useGameStore((s) => s.challengeStatus);
  const challengeMessage = useGameStore((s) => s.challengeMessage);
  const dividendReceiptCount = useGameStore((s) => s.dividendReceiptCount);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);

  const trades = portfolio.trades;
  const totalInvested = portfolio.totalInvested;
  const lastPrice = dailyCandles[dayIndex]?.close ?? 0;
  const holdingsValue = portfolio.holdings.qty * lastPrice;
  const totalValue = portfolio.cash + holdingsValue;
  const totalReturn = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
  const challenge = config?.mode === 'challenge' ? getChallengeById(config.challengeId) : undefined;
  const derivedChallengeResult = challenge
    ? evaluateChallengeProgress(
      challenge,
      dayIndex + 1,
      totalInvested > 0 ? (totalValue - totalInvested) / totalInvested : 0,
      dividendReceiptCount,
    )
    : null;
  const finalChallengeStatus = challengeStatus ?? derivedChallengeResult?.status ?? null;
  const finalChallengeMessage = challengeMessage ?? derivedChallengeResult?.message ?? null;

  // Win rate
  const sellTrades = trades.filter((t) => t.type === 'sell');
  let wins = 0;
  for (const sell of sellTrades) {
    const prevBuys = trades.filter((t) => t.type === 'buy' && t.timestamp < sell.timestamp);
    if (prevBuys.length > 0) {
      const lastBuy = prevBuys[prevBuys.length - 1];
      if (sell.price > lastBuy.price) wins++;
    }
  }
  const winRate = sellTrades.length > 0 ? (wins / sellTrades.length) * 100 : 0;

  // Chart with trade markers
  useEffect(() => {
    if (!chartRef.current || dailyCandles.length === 0) return;

    const chart = createChart(chartRef.current, {
      layout: { background: { color: theme.bg.panel }, textColor: theme.text.muted },
      grid: { vertLines: { color: theme.border }, horzLines: { color: theme.border } },
      autoSize: true,
      height: 300,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: theme.up, downColor: theme.down,
      borderUpColor: theme.up, borderDownColor: theme.down,
      wickUpColor: theme.up, wickDownColor: theme.down,
    });

    const usedCandles = dailyCandles.slice(0, dayIndex + 1);
    candleSeries.setData(usedCandles.map((c) => ({
      time: c.date as Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    })));

    // Trade markers using v5 API
    const markers = trades.map((t) => ({
      time: t.timestamp.split('T')[0] as Time,
      position: t.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
      color: t.type === 'buy' ? theme.up : theme.down,
      shape: t.type === 'buy' ? 'arrowUp' as const : 'arrowDown' as const,
      text: `${t.type === 'buy' ? 'B' : 'S'} ${t.qty}`,
    }));
    createSeriesMarkers(candleSeries, markers);

    chartApiRef.current = chart;

    return () => chart.remove();
  }, [dailyCandles, dayIndex, trades]);

  const handleNewGame = () => {
    resetGame();
    setScreen('start');
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 4 }}>게임 결과</h2>
      <p style={{ textAlign: 'center', color: theme.text.muted, marginBottom: 24, fontSize: 12 }}>
        {config?.stockSymbol} · {config?.startDate} ~ {dailyCandles[dayIndex]?.date}
      </p>

      {challenge && finalChallengeStatus && finalChallengeStatus !== 'in_progress' && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          borderRadius: theme.radius,
          border: `1px solid ${finalChallengeStatus === 'success' ? theme.up : theme.down}`,
          background: theme.bg.panel,
          color: finalChallengeStatus === 'success' ? theme.up : theme.down,
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
        }}>
          {finalChallengeMessage}
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        {[
          { label: '총 수익률', value: `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`, color: totalReturn >= 0 ? theme.up : theme.down },
          { label: '최종 자산', value: formatUsd(totalValue), color: theme.text.primary },
          { label: '총 투입', value: formatUsd(totalInvested), color: theme.text.secondary },
          { label: '승률', value: `${winRate.toFixed(0)}%`, color: theme.accent },
        ].map((m) => (
          <div key={m.label} style={{
            background: theme.bg.panel, padding: 12, borderRadius: theme.radius,
            border: `1px solid ${theme.border}`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: theme.text.muted, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Trade Timeline Chart */}
      <div style={{
        background: theme.bg.panel, padding: 12, borderRadius: theme.radius,
        border: `1px solid ${theme.border}`, marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
          매매 타이밍 분석
        </div>
        <div ref={chartRef} style={{ height: 300 }} />
      </div>

      {/* Trade History */}
      <div style={{
        background: theme.bg.panel, padding: 12, borderRadius: theme.radius,
        border: `1px solid ${theme.border}`, marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: theme.accent, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
          거래 히스토리
        </div>
        {trades.length === 0 ? (
          <div style={{ color: theme.text.muted, fontSize: 12 }}>거래 내역이 없습니다</div>
        ) : (
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {trades.map((t, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: `1px solid ${theme.border}`, fontSize: 11,
              }}>
                <div>
                  <span style={{ color: t.type === 'buy' ? theme.up : theme.down, fontWeight: 600 }}>
                    {t.type === 'buy' ? 'BUY' : 'SELL'}
                  </span>
                  <span style={{ color: theme.text.secondary, marginLeft: 8 }}>
                    {t.qty}주 @ {formatUsd(t.price)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: theme.text.muted, fontSize: 10 }}>{t.timestamp}</div>
                  {t.memo && <div style={{ color: theme.text.muted, fontSize: 10, fontStyle: 'italic' }}>{t.memo}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleNewGame} style={{
        display: 'block', width: '100%', background: theme.accent, color: 'white',
        border: 'none', padding: '12px 24px', borderRadius: theme.radius,
        cursor: 'pointer', fontWeight: 600, fontSize: 14,
      }}>
        새 게임 시작
      </button>
    </div>
  );
}
