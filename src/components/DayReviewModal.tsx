import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { formatUsd } from '../utils/currency';

interface Props {
  onNextDay: () => void;
  onEndGame: () => void;
}

export function DayReviewModal({ onNextDay, onEndGame }: Props) {
  const portfolio = useGameStore((s) => s.portfolio);
  const currentDate = useGameStore((s) => s.currentDate);
  const intradayCandles = useGameStore((s) => s.intradayCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const dailyCandles = useGameStore((s) => s.dailyCandles);

  const lastCandle = intradayCandles[intradayCandles.length - 1];
  const firstCandle = intradayCandles[0];
  const dayChange = firstCandle && lastCandle
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open * 100)
    : 0;
  const isUp = dayChange >= 0;
  const isLastDay = dayIndex >= dailyCandles.length - 1;

  const todayTrades = portfolio.trades.filter((t) => t.timestamp.startsWith(currentDate));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: theme.bg.panel, borderRadius: theme.radius, padding: 24,
        border: `1px solid ${theme.border}`, minWidth: 400, maxWidth: 500,
      }}>
        <h3 style={{ margin: '0 0 16px', color: theme.text.primary }}>일간 리뷰 — {currentDate}</h3>

        <div style={{ marginBottom: 16, fontSize: 13 }}>
          <div style={{ color: isUp ? theme.up : theme.down, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            {isUp ? '▲' : '▼'} {dayChange.toFixed(2)}%
          </div>
          <div style={{ color: theme.text.secondary, marginBottom: 4 }}>
            Cash: {formatUsd(portfolio.cash)} | Holdings: {portfolio.holdings.qty}주
          </div>
          <div style={{ color: theme.text.muted, fontSize: 11 }}>
            오늘 거래: {todayTrades.length}건
          </div>
        </div>

        {todayTrades.length > 0 && (
          <div style={{ marginBottom: 16, fontSize: 11, color: theme.text.secondary }}>
            {todayTrades.map((t, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: t.type === 'buy' ? theme.up : theme.down }}>
                  {t.type === 'buy' ? 'BUY' : 'SELL'}
                </span>
                {' '}{t.qty}주 @ {formatUsd(t.price)}
                {t.memo && <span style={{ color: theme.text.muted }}> — {t.memo}</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {!isLastDay && (
            <button onClick={onNextDay} style={{
              flex: 1, background: theme.accent, color: 'white', border: 'none',
              padding: '10px 20px', borderRadius: theme.radius, cursor: 'pointer', fontWeight: 600,
            }}>
              다음 날로 →
            </button>
          )}
          <button onClick={onEndGame} style={{
            flex: isLastDay ? 1 : 0, background: isLastDay ? theme.accent : 'transparent',
            color: isLastDay ? 'white' : theme.text.muted, border: isLastDay ? 'none' : `1px solid ${theme.border}`,
            padding: '10px 20px', borderRadius: theme.radius, cursor: 'pointer', fontWeight: 600,
          }}>
            {isLastDay ? '결과 보기' : '게임 종료'}
          </button>
        </div>
      </div>
    </div>
  );
}
