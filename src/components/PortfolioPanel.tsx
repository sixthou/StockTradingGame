import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { formatSignedUsd, formatUsd } from '../utils/currency';

interface PortfolioPanelProps {
  compact?: boolean;
}

export function PortfolioPanel({ compact = false }: PortfolioPanelProps) {
  const portfolio = useGameStore((s) => s.portfolio);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);

  const currentPrice = dailyCandles.length > 0
    ? dailyCandles[Math.min(dayIndex, dailyCandles.length - 1)]?.close ?? 0
    : 0;

  const holdingsValue = portfolio.holdings.qty * currentPrice;
  const totalValue = portfolio.cash + holdingsValue;
  const pnl = totalValue - portfolio.totalInvested;
  const pnlPercent = portfolio.totalInvested > 0 ? (pnl / portfolio.totalInvested) * 100 : 0;
  const holdingReturn = portfolio.holdings.qty > 0 && portfolio.holdings.avgPrice > 0
    ? ((currentPrice - portfolio.holdings.avgPrice) / portfolio.holdings.avgPrice) * 100
    : 0;
  const isProfit = pnl >= 0;

  const rowStyle = { fontSize: compact ? 10 : 11, marginBottom: 3, display: 'flex', justifyContent: 'space-between' };

  return (
    <div style={{
      background: theme.bg.panel, padding: 10, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`, color: theme.text.secondary,
      minHeight: compact ? 112 : undefined,
    }}>
      <div style={{ fontSize: compact ? 9 : 10, color: theme.accent, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Portfolio
      </div>
      {compact ? (
        <>
          <div style={{ ...rowStyle, fontSize: 9 }}>
            <span>Cash</span>
            <span>{formatUsd(portfolio.cash)}</span>
          </div>
          <div style={{ ...rowStyle, fontSize: 9, color: theme.text.muted }}>
            <span>Qty</span>
            <span>{portfolio.holdings.qty}주</span>
          </div>
          <div style={{ ...rowStyle, fontSize: 9, color: theme.text.muted }}>
            <span>Avg</span>
            <span>{formatUsd(portfolio.holdings.avgPrice)}</span>
          </div>
          <div style={{ ...rowStyle, fontSize: 9, color: isProfit ? theme.up : theme.down, marginBottom: 0 }}>
            <span>P&L</span>
            <span>{isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%</span>
          </div>
        </>
      ) : (
        <>
          <div style={rowStyle}><span>Cash</span><span>{formatUsd(portfolio.cash)}</span></div>
          <div style={rowStyle}><span>Holdings</span><span>{formatUsd(holdingsValue)}</span></div>
          <div style={{ ...rowStyle, fontSize: 10, color: theme.text.muted, paddingLeft: 8 }}>
            <span>{portfolio.holdings.qty}주 @ {formatUsd(portfolio.holdings.avgPrice)}</span>
            <span style={{ color: portfolio.holdings.qty > 0 ? (holdingReturn >= 0 ? theme.up : theme.down) : theme.text.muted }}>
              {portfolio.holdings.qty > 0 ? `${holdingReturn >= 0 ? '+' : ''}${holdingReturn.toFixed(2)}%` : '0.00%'}
            </span>
          </div>
          <div style={{ ...rowStyle, color: isProfit ? theme.up : theme.down }}>
            <span>P&L</span>
            <span>{formatSignedUsd(pnl)} ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
          </div>
        </>
      )}
    </div>
  );
}
