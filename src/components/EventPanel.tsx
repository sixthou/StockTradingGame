import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';

const EVENT_COLORS: Record<string, string> = {
  earnings: '#d29922',
  dividend: '#58a6ff',
  rate_decision: '#f78166',
};

const EVENT_ICONS: Record<string, string> = {
  earnings: '●',
  dividend: '●',
  rate_decision: '●',
};

export function EventPanel() {
  const events = useGameStore((s) => s.events);
  const currentDate = useGameStore((s) => s.currentDate);

  const upcomingEvents = events
    .filter((e) => e.date >= currentDate)
    .slice(0, 5);

  return (
    <div style={{
      background: theme.bg.panel, padding: 10, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`, color: theme.text.secondary,
    }}>
      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Events
      </div>
      {upcomingEvents.length === 0 ? (
        <div style={{ fontSize: 10, color: theme.text.muted }}>No upcoming events</div>
      ) : (
        upcomingEvents.map((e, i) => {
          const daysUntil = Math.ceil(
            (new Date(e.date).getTime() - new Date(currentDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          return (
            <div key={i} style={{ fontSize: 10, color: EVENT_COLORS[e.type] || theme.text.secondary, marginBottom: 3 }}>
              {EVENT_ICONS[e.type]} {e.description} {daysUntil > 0 ? `(D-${daysUntil})` : '(오늘)'}
            </div>
          );
        })
      )}
    </div>
  );
}
