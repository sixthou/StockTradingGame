import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { useIsMobile } from '../hooks/useIsMobile';

const SPEEDS = [1, 2, 5];

interface Props {
  onNextDay: () => void;
  onEndGame: () => void;
  isLoadingMore: boolean;
}

export function TimeControls({ onNextDay, onEndGame, isLoadingMore }: Props) {
  const isMobile = useIsMobile();
  const isPlaying = useGameStore((s) => s.isPlaying);
  const playbackSpeed = useGameStore((s) => s.playbackSpeed);
  const setPlaying = useGameStore((s) => s.setPlaying);
  const setPlaybackSpeed = useGameStore((s) => s.setPlaybackSpeed);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const setDayIndex = useGameStore((s) => s.setDayIndex);

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: isMobile ? 8 : 16,
      flexWrap: isMobile ? 'nowrap' : 'wrap',
      background: theme.bg.panel, padding: isMobile ? 6 : 8, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`,
      overflowX: 'auto',
    }}>
      <button
        onClick={() => dayIndex > 0 && setDayIndex(dayIndex - 1)}
        disabled={dayIndex === 0 || isLoadingMore}
        style={{ background: 'none', border: 'none', color: dayIndex > 0 ? theme.text.secondary : theme.text.muted, cursor: 'pointer', fontSize: isMobile ? 11 : 12, minWidth: 'auto', whiteSpace: 'nowrap', flexShrink: 0, padding: 0 }}
      >
        {isMobile ? '◀ Prev' : '◀ Prev Day'}
      </button>

      <button
        onClick={() => setPlaying(!isPlaying)}
        disabled={isLoadingMore}
        style={{
          background: theme.accent, color: 'white', border: 'none',
          padding: isMobile ? '5px 10px' : '6px 12px', borderRadius: theme.radius, cursor: 'pointer', fontSize: isMobile ? 11 : 12, minWidth: 'auto', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        {isPlaying ? '⏸ Pause' : '▶ Auto'}
      </button>

      <div style={{ display: 'flex', gap: 6, minWidth: 'auto', justifyContent: 'center', flexShrink: 0 }}>
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: isMobile ? 11 : 12, padding: 0,
              color: playbackSpeed === speed ? theme.up : theme.text.muted,
              fontWeight: playbackSpeed === speed ? 700 : 400,
            }}
          >
            {speed}d/s
          </button>
        ))}
      </div>

      <button
        onClick={onNextDay}
        disabled={dailyCandles.length === 0 || isLoadingMore}
        style={{ background: 'none', border: 'none', color: isLoadingMore ? theme.text.muted : theme.text.secondary, cursor: 'pointer', fontSize: isMobile ? 11 : 12, minWidth: 'auto', whiteSpace: 'nowrap', flexShrink: 0, padding: 0 }}
      >
        {isLoadingMore ? '불러오는 중...' : isMobile ? 'Next ▶' : 'Next Day ▶'}
      </button>

      <button
        onClick={onEndGame}
        style={{
          background: theme.bg.primary, color: theme.text.primary, border: `1px solid ${theme.border}`,
          padding: isMobile ? '5px 10px' : '6px 12px', borderRadius: theme.radius, cursor: 'pointer', fontSize: isMobile ? 11 : 12, minWidth: 'auto', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        {isMobile ? 'End' : '게임 종료'}
      </button>
    </div>
  );
}
