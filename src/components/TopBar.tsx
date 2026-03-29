import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { formatUsd } from '../utils/currency';
import { useIsMobile } from '../hooks/useIsMobile';

export function TopBar() {
  const isMobile = useIsMobile();
  const config = useGameStore((s) => s.config);
  const currentDate = useGameStore((s) => s.currentDate);
  const playbackSpeed = useGameStore((s) => s.playbackSpeed);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);

  const currentCandle = dailyCandles.length > 0
    ? dailyCandles[Math.min(dayIndex, dailyCandles.length - 1)]
    : null;
  const currentPrice = currentCandle?.close ?? 0;
  const openPrice = currentCandle?.open ?? 0;
  const previousClose = dayIndex > 0
    ? dailyCandles[dayIndex - 1]?.close ?? openPrice
    : 0;
  const changeBase = previousClose || openPrice;
  const change = changeBase > 0 ? ((currentPrice - changeBase) / changeBase) * 100 : 0;
  const isUp = change >= 0;

  return (
    <div style={{
      display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between',
      flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 12,
      background: theme.bg.panel, padding: '8px 12px', borderRadius: theme.radius,
      border: `1px solid ${theme.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{config?.stockSymbol ?? ''}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: isUp ? theme.up : theme.down, fontSize: 15, fontWeight: 600 }}>
          {formatUsd(currentPrice)}
        </span>
        <span style={{
          background: isUp ? '#1b3a2a' : '#3d1b1b', color: isUp ? theme.up : theme.down,
          padding: '2px 6px', borderRadius: 4, fontSize: 10,
        }}>
          {isUp ? '+' : ''}{change.toFixed(2)}%
        </span>
      </div>
      <div style={{ color: theme.text.muted, fontSize: 10, width: isMobile ? '100%' : 'auto' }}>
        {currentDate} | 종료일 {config?.endDate} | <span style={{ color: theme.up }}>{playbackSpeed}일/초</span>
      </div>
    </div>
  );
}
