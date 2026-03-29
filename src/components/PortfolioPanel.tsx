import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { calcPE, calcPBR } from '../engine/fundamentals';
import { formatSignedUsd, formatUsd } from '../utils/currency';

export function PortfolioPanel() {
  const portfolio = useGameStore((s) => s.portfolio);
  const config = useGameStore((s) => s.config);
  const currentDate = useGameStore((s) => s.currentDate);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const currentEps = useGameStore((s) => s.currentEps);
  const currentBps = useGameStore((s) => s.currentBps);

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

  const pe = calcPE(currentPrice, currentEps);
  const pbr = calcPBR(currentPrice, currentBps);

  // Salary countdown
  let salaryCountdown: string | null = null;
  if (config && config.monthlySalary > 0 && currentDate) {
    const today = new Date(currentDate);
    const targetDay = config.salaryDay;
    let nextSalary = new Date(today.getFullYear(), today.getMonth(), targetDay);
    if (nextSalary <= today) {
      nextSalary = new Date(today.getFullYear(), today.getMonth() + 1, targetDay);
    }
    const diff = Math.ceil((nextSalary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    salaryCountdown = `D-${diff}`;
  }

  const rowStyle = { fontSize: 11, marginBottom: 3, display: 'flex', justifyContent: 'space-between' };

  return (
    <div style={{
      background: theme.bg.panel, padding: 10, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`, color: theme.text.secondary,
    }}>
      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Portfolio
      </div>
      <div style={rowStyle}><span>Cash</span><span>{formatUsd(portfolio.cash)}</span></div>
      <div style={rowStyle}><span>Holdings</span><span>{formatUsd(holdingsValue)}</span></div>
      {portfolio.holdings.qty > 0 && (
        <div style={{ ...rowStyle, fontSize: 10, color: theme.text.muted, paddingLeft: 8 }}>
          <span>{portfolio.holdings.qty}주 @ {formatUsd(portfolio.holdings.avgPrice)}</span>
          <span style={{ color: holdingReturn >= 0 ? theme.up : theme.down }}>
            {holdingReturn >= 0 ? '+' : ''}{holdingReturn.toFixed(2)}%
          </span>
        </div>
      )}
      <div style={{ ...rowStyle, color: isProfit ? theme.up : theme.down }}>
        <span>P&L</span>
        <span>{formatSignedUsd(pnl)} ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
      </div>
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 6, marginTop: 6, fontSize: 10, color: theme.text.muted }}>
        <div style={{ ...rowStyle, fontSize: 10 }}><span>Invested</span><span style={{ color: theme.text.secondary }}>{formatUsd(portfolio.totalInvested)}</span></div>
        <div style={{ ...rowStyle, fontSize: 10 }}><span>P/E</span><span style={{ color: theme.text.secondary }}>{pe !== null ? pe.toFixed(1) : '—'}</span></div>
        <div style={{ ...rowStyle, fontSize: 10 }}><span>PBR</span><span style={{ color: theme.text.secondary }}>{pbr !== null ? pbr.toFixed(2) : '—'}</span></div>
        <div style={{ ...rowStyle, fontSize: 10 }}><span>EPS</span><span style={{ color: theme.text.secondary }}>{currentEps !== null ? formatUsd(currentEps) : '—'}</span></div>
        {salaryCountdown && (
          <div style={{ ...rowStyle, fontSize: 10 }}><span>Salary</span><span style={{ color: theme.text.secondary }}>{salaryCountdown}</span></div>
        )}
      </div>
    </div>
  );
}
