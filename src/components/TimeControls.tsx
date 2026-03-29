import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';

const SPEEDS = [1, 2, 5];

interface Props {
  onNextDay: () => void;
  onEndGame: () => void;
  isLoadingMore: boolean;
}

export function TimeControls({ onNextDay, onEndGame, isLoadingMore }: Props) {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const playbackSpeed = useGameStore((s) => s.playbackSpeed);
  const setPlaying = useGameStore((s) => s.setPlaying);
  const setPlaybackSpeed = useGameStore((s) => s.setPlaybackSpeed);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const setDayIndex = useGameStore((s) => s.setDayIndex);

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
      background: theme.bg.panel, padding: 8, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`,
    }}>
      <button
        onClick={() => dayIndex > 0 && setDayIndex(dayIndex - 1)}
        disabled={dayIndex === 0 || isLoadingMore}
        style={{ background: 'none', border: 'none', color: dayIndex > 0 ? theme.text.secondary : theme.text.muted, cursor: 'pointer', fontSize: 12 }}
      >
        ◀ Prev Day
      </button>

      <button
        onClick={() => setPlaying(!isPlaying)}
        disabled={isLoadingMore}
        style={{
          background: theme.accent, color: 'white', border: 'none',
          padding: '4px 16px', borderRadius: theme.radius, cursor: 'pointer', fontSize: 12,
        }}
      >
        {isPlaying ? '⏸ Pause' : '▶ Auto'}
      </button>

      <div style={{ display: 'flex', gap: 6 }}>
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => setPlaybackSpeed(speed)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
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
        style={{ background: 'none', border: 'none', color: isLoadingMore ? theme.text.muted : theme.text.secondary, cursor: 'pointer', fontSize: 12 }}
      >
        {isLoadingMore ? '불러오는 중...' : 'Next Day ▶'}
      </button>

      <button
        onClick={onEndGame}
        style={{
          background: theme.bg.primary, color: theme.text.primary, border: `1px solid ${theme.border}`,
          padding: '4px 14px', borderRadius: theme.radius, cursor: 'pointer', fontSize: 12,
        }}
      >
        게임 종료
      </button>
    </div>
  );
}
