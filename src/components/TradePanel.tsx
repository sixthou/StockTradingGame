import { useState } from 'react';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { formatUsd } from '../utils/currency';

export function TradePanel() {
  const [qty, setQty] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const executeBuy = useGameStore((s) => s.executeBuy);
  const executeSell = useGameStore((s) => s.executeSell);
  const isPlaying = useGameStore((s) => s.isPlaying);
  const setPlaying = useGameStore((s) => s.setPlaying);
  const dailyCandles = useGameStore((s) => s.dailyCandles);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const portfolio = useGameStore((s) => s.portfolio);

  const currentPrice = dailyCandles.length > 0
    ? dailyCandles[Math.min(dayIndex, dailyCandles.length - 1)]?.close ?? 0
    : 0;

  const maxBuy = currentPrice > 0 ? Math.floor(portfolio.cash / currentPrice) : 0;
  const maxSell = portfolio.holdings.qty;

  const executeMarketTrade = (type: 'buy' | 'sell', quantity: number) => {
    if (quantity <= 0) {
      setError(type === 'buy' ? '매수 가능한 수량이 없습니다' : '매도 가능한 수량이 없습니다');
      return;
    }
    setError('');

    if (isPlaying) setPlaying(false);

    try {
      if (type === 'buy') {
        executeBuy(currentPrice, quantity, memo);
      } else {
        executeSell(currentPrice, quantity, memo);
      }
      setQty('');
      setMemo('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleTrade = (type: 'buy' | 'sell') => {
    const q = parseInt(qty);
    if (isNaN(q) || q <= 0) { setError('수량을 입력하세요'); return; }
    executeMarketTrade(type, q);
  };

  return (
    <div style={{
      background: theme.bg.panel, padding: 10, borderRadius: theme.radius,
      border: `1px solid ${theme.border}`, color: theme.text.secondary,
    }}>
      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>
        Trade
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button onClick={() => handleTrade('buy')} style={{
          flex: 1, background: '#238636', color: 'white', border: 'none', padding: 6, borderRadius: theme.radius, fontWeight: 600, fontSize: 11, cursor: 'pointer',
        }}>BUY</button>
        <button onClick={() => handleTrade('sell')} style={{
          flex: 1, background: '#da3633', color: 'white', border: 'none', padding: 6, borderRadius: theme.radius, fontWeight: 600, fontSize: 11, cursor: 'pointer',
        }}>SELL</button>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button onClick={() => executeMarketTrade('buy', maxBuy)} style={{
          flex: 1, background: theme.bg.primary, color: theme.up, border: `1px solid ${theme.border}`, padding: 6, borderRadius: theme.radius, fontWeight: 600, fontSize: 10, cursor: 'pointer',
        }}>MAX BUY</button>
        <button onClick={() => executeMarketTrade('sell', maxSell)} style={{
          flex: 1, background: theme.bg.primary, color: theme.down, border: `1px solid ${theme.border}`, padding: 6, borderRadius: theme.radius, fontWeight: 600, fontSize: 10, cursor: 'pointer',
        }}>MAX SELL</button>
      </div>
      <input
        type="number"
        placeholder="Quantity"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        style={{
          width: '100%', background: theme.bg.primary, border: `1px solid ${theme.border}`,
          color: theme.text.primary, padding: '4px 8px', borderRadius: 4, fontSize: 10, marginBottom: 4, boxSizing: 'border-box',
        }}
      />
      <input
        placeholder="Trade memo..."
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        style={{
          width: '100%', background: theme.bg.primary, border: `1px solid ${theme.border}`,
          color: theme.text.primary, padding: '4px 8px', borderRadius: 4, fontSize: 10, boxSizing: 'border-box',
        }}
      />
      {error && <div style={{ color: theme.down, fontSize: 10, marginTop: 4 }}>{error}</div>}
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 6, marginTop: 6, fontSize: 10, color: theme.text.muted }}>
        <div style={{ marginBottom: 3 }}>
          Available: <span style={{ color: theme.text.secondary }}>{formatUsd(portfolio.cash)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>매수가능 <span style={{ color: theme.up }}>{maxBuy}주</span></span>
          <span>매도가능 <span style={{ color: theme.down }}>{portfolio.holdings.qty}주</span></span>
        </div>
      </div>
    </div>
  );
}
