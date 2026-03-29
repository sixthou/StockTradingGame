import { Challenge } from '../types';
import { challenges } from '../data/challenges';
import { theme } from '../styles/theme';
import { formatUsd } from '../utils/currency';

interface Props {
  onSelect: (challenge: Challenge) => void;
}

export function ChallengeList({ onSelect }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {challenges.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          style={{
            background: theme.bg.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: theme.radius,
            padding: 16,
            color: theme.text.primary,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
          <div style={{ fontSize: 12, color: theme.text.muted }}>{c.description}</div>
          <div style={{ fontSize: 11, color: theme.text.secondary, marginTop: 8 }}>
            자금: {formatUsd(c.initialCash)} · {c.maxDays}일
            {c.targetReturn > 0 && ` · 목표: +${(c.targetReturn * 100).toFixed(0)}%`}
          </div>
        </button>
      ))}
    </div>
  );
}
