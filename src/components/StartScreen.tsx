import { useState, useCallback, useMemo, useRef } from 'react';
import { theme } from '../styles/theme';
import { useGameStore } from '../state/gameStore';
import { isSupportedUsSymbol, searchSymbol, SymbolSearchResult } from '../data/yahooFinance';
import { Challenge } from '../types';
import { ChallengeList } from './ChallengeList';
import { formatUsd, parseWholeDollarInput } from '../utils/currency';
import { useIsMobile } from '../hooks/useIsMobile';

const TWELVE_DATA_KEY_STORAGE_KEY = 'stock-trading-game-twelve-data-key';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addOneYear(date: string): string {
  const value = parseDate(date);
  value.setFullYear(value.getFullYear() + 1);
  return formatDate(value);
}

function subtractYears(date: Date, years: number): Date {
  const value = new Date(date);
  value.setFullYear(value.getFullYear() - years);
  return value;
}

function clampEndDate(start: string, latestAllowedDate: string): string {
  const nextYear = addOneYear(start);
  return nextYear <= latestAllowedDate ? nextYear : latestAllowedDate;
}

function randomDateBetween(start: Date, end: Date): string {
  const startMs = start.getTime();
  const endMs = end.getTime();
  const randomMs = startMs + Math.floor(Math.random() * (endMs - startMs + 1));
  return formatDate(new Date(randomMs));
}

export function StartScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const isMobile = useIsMobile();
  const today = useMemo(() => new Date(), []);
  const latestPlayableDate = useMemo(() => {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  }, [today]);
  const earliestRandomDate = useMemo(() => formatDate(subtractYears(new Date(`${latestPlayableDate}T00:00:00`), 10)), [latestPlayableDate]);
  const [mode, setMode] = useState<'free' | 'challenge'>('free');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [startDate, setStartDate] = useState('2024-01-02');
  const [endDate, setEndDate] = useState(() => clampEndDate('2024-01-02', latestPlayableDate));
  const [twelveDataApiKey, setTwelveDataApiKey] = useState(() => {
    try {
      return localStorage.getItem(TWELVE_DATA_KEY_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [initialCash, setInitialCash] = useState(10_000_000);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const [salaryDay, setSalaryDay] = useState(1);
  const [searching, setSearching] = useState(false);
  const [symbolError, setSymbolError] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

  const persistApiKey = useCallback((apiKey: string) => {
    try {
      if (apiKey.trim()) {
        localStorage.setItem(TWELVE_DATA_KEY_STORAGE_KEY, apiKey.trim());
      } else {
        localStorage.removeItem(TWELVE_DATA_KEY_STORAGE_KEY);
      }
    } catch {
      // ignore localStorage failures
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    if (!twelveDataApiKey.trim()) {
      setApiKeyError('검색을 하려면 Twelve Data API Key를 먼저 입력하세요.');
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSymbolError('');
    setApiKeyError('');
    try {
      const results = await searchSymbol(searchQuery, twelveDataApiKey);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, [searchQuery, twelveDataApiKey]);

  const handleChallengeSelect = (challenge: Challenge) => {
    const apiKey = twelveDataApiKey.trim();
    if (!apiKey) {
      setApiKeyError('챌린지는 Twelve Data API Key가 필요합니다.');
      return;
    }

    persistApiKey(apiKey);
    startGame({
      stockSymbol: challenge.stockSymbol || 'SPY',
      startDate: challenge.startDate || '2024-01-02',
      endDate: challenge.startDate
        ? new Date(new Date(challenge.startDate).setFullYear(new Date(challenge.startDate).getFullYear() + 1)).toISOString().split('T')[0]
        : '2024-12-31',
      twelveDataApiKey: apiKey,
      initialCash: challenge.initialCash,
      monthlySalary: 0,
      salaryDay: 1,
      mode: 'challenge',
      challengeId: challenge.id,
    });
  };

  const handleStartFree = () => {
    if (!selectedSymbol) return;
    const apiKey = twelveDataApiKey.trim();
    if (!apiKey) {
      setApiKeyError('자유 모드도 Twelve Data API Key가 필요합니다.');
      return;
    }
    if (!isSupportedUsSymbol(selectedSymbol)) {
      setSymbolError('현재는 미국 종목만 지원합니다.');
      return;
    }
    setApiKeyError('');
    persistApiKey(apiKey);
    startGame({
      stockSymbol: selectedSymbol,
      startDate,
      endDate,
      twelveDataApiKey: apiKey,
      initialCash,
      monthlySalary,
      salaryDay,
      mode: 'free',
    });
  };

  const handleStartDateChange = (nextStartDate: string) => {
    setStartDate(nextStartDate);
    setEndDate(clampEndDate(nextStartDate, latestPlayableDate));
  };

  const handleRandomDate = () => {
    const nextStartDate = randomDateBetween(
      parseDate(earliestRandomDate),
      parseDate(latestPlayableDate),
    );
    handleStartDateChange(nextStartDate);
  };

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const inputStyle = {
    background: theme.bg.primary,
    border: `1px solid ${theme.border}`,
    color: theme.text.primary,
    padding: '8px 12px',
    borderRadius: theme.radius,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontSize: 11,
    color: theme.text.muted,
    marginBottom: 4,
    display: 'block',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  };

  return (
    <div style={{ maxWidth: isMobile ? '100%' : 680, margin: '0 auto', padding: isMobile ? '20px 16px 28px' : '40px 20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 8 }}>Stock Trading Game</h1>
      <p style={{ textAlign: 'center', color: theme.text.muted, marginBottom: 32 }}>
        과거 주식 데이터로 매매를 연습하세요
      </p>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: theme.bg.panel, borderRadius: theme.radius, padding: 4 }}>
        <button
          onClick={() => setMode('free')}
          style={{
            flex: 1, padding: '8px 16px', border: 'none', borderRadius: theme.radius, cursor: 'pointer',
            background: mode === 'free' ? theme.accent : 'transparent',
            color: mode === 'free' ? 'white' : theme.text.muted,
            fontWeight: 600,
          }}
        >자유 모드</button>
        <button
          onClick={() => setMode('challenge')}
          style={{
            flex: 1, padding: '8px 16px', border: 'none', borderRadius: theme.radius, cursor: 'pointer',
            background: mode === 'challenge' ? theme.accent : 'transparent',
            color: mode === 'challenge' ? 'white' : theme.text.muted,
            fontWeight: 600,
          }}
        >챌린지</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          background: theme.bg.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius,
          padding: 14,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
            먼저 Twelve Data API Key를 입력하세요
          </div>
          <div style={{ color: theme.text.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
            이 앱은 정적 호스팅 기준으로 Twelve Data를 브라우저에서 직접 호출합니다. API Key를 입력하지 않으면 종목 검색과 정상적인 플레이를 진행할 수 없습니다.
          </div>
          <div>
            <label style={labelStyle}>Twelve Data API Key</label>
            <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                style={{ ...inputStyle, flex: 1 }}
                value={twelveDataApiKey}
                placeholder="먼저 API Key를 입력하세요"
                onChange={(e) => {
                  setTwelveDataApiKey(e.target.value);
                  setApiKeyError('');
                }}
              />
              <button
                onClick={() => setShowApiKey((v) => !v)}
                style={{ background: theme.bg.primary, color: theme.text.primary, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: theme.radius, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}
              >
                {showApiKey ? '숨기기' : '보기'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, marginTop: 10, fontSize: 12 }}>
            <span style={{ color: theme.text.muted }}>무료 키를 발급받아 입력한 뒤 시작하세요.</span>
            <a
              href="https://twelvedata.com/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ color: theme.accent, textDecoration: 'none', fontWeight: 600 }}
            >
              API Key 발급하기
            </a>
          </div>
          {apiKeyError && (
            <div style={{ marginTop: 10, color: theme.down, fontSize: 13 }}>
              {apiKeyError}
            </div>
          )}
        </div>

        {mode === 'challenge' ? (
          <ChallengeList onSelect={handleChallengeSelect} />
        ) : (
          <>
          {/* Stock Search */}
          <div>
            <label style={labelStyle}>종목 검색</label>
            <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="AAPL, MSFT, NVDA, ..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSymbolError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !twelveDataApiKey.trim()}
                style={{ background: theme.accent, color: 'white', border: 'none', padding: '8px 16px', borderRadius: theme.radius, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}
              >
                {searching ? '...' : '검색'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, border: `1px solid ${theme.border}`, borderRadius: theme.radius, overflow: 'hidden' }}>
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => {
                      setSelectedSymbol(r.symbol);
                      setSearchResults([]);
                      setSearchQuery(r.symbol);
                      setSymbolError('');
                    }}
                    style={{
                      display: 'block', width: '100%', padding: '8px 12px', border: 'none', textAlign: 'left', cursor: 'pointer',
                      background: selectedSymbol === r.symbol ? theme.accent : theme.bg.panel,
                      color: theme.text.primary, borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{r.symbol}</span>
                    <span style={{ color: theme.text.muted, marginLeft: 8, fontSize: 12 }}>{r.shortname} · {r.exchange}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedSymbol && (
              <div style={{ marginTop: 8, color: theme.up, fontSize: 13 }}>
                선택: {selectedSymbol}
              </div>
            )}
            <div style={{ marginTop: 8, color: theme.text.muted, fontSize: 12 }}>
              현재는 미국 종목만 지원합니다.
            </div>
            {symbolError && (
              <div style={{ marginTop: 8, color: theme.down, fontSize: 13 }}>
                {symbolError}
              </div>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label style={labelStyle}>시작일</label>
            <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
              <input
                ref={startDateInputRef}
                type="date"
                style={{ ...inputStyle, flex: 1 }}
                value={startDate}
                min={earliestRandomDate}
                max={latestPlayableDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                onClick={() => openDatePicker(startDateInputRef.current)}
                onFocus={() => openDatePicker(startDateInputRef.current)}
              />
              <button
                type="button"
                onClick={handleRandomDate}
                style={{ background: theme.accent, color: 'white', border: 'none', padding: '8px 12px', borderRadius: theme.radius, cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}
              >
                랜덤
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>종료일</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={endDateInputRef}
                type="date"
                style={{ ...inputStyle, flex: 1 }}
                value={endDate}
                min={startDate}
                max={latestPlayableDate}
                onChange={(e) => setEndDate(e.target.value)}
                onClick={() => openDatePicker(endDateInputRef.current)}
                onFocus={() => openDatePicker(endDateInputRef.current)}
              />
            </div>
          </div>

          {/* Initial Cash */}
          <div>
            <label style={labelStyle}>초기 자금 (USD)</label>
            <input
              type="text"
              inputMode="numeric"
              style={inputStyle}
              value={formatUsd(initialCash)}
              onChange={(e) => setInitialCash(parseWholeDollarInput(e.target.value))}
            />
          </div>

          {/* Salary */}
          <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>월급 (USD, 0=비활성)</label>
              <input
                type="text"
                inputMode="numeric"
                style={inputStyle}
                value={formatUsd(monthlySalary)}
                onChange={(e) => setMonthlySalary(parseWholeDollarInput(e.target.value))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>월급일</label>
              <input type="number" min={1} max={28} style={inputStyle} value={salaryDay} onChange={(e) => setSalaryDay(Number(e.target.value))} />
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartFree}
            disabled={!selectedSymbol}
            style={{
              background: selectedSymbol ? theme.accent : theme.border,
              color: 'white', border: 'none', padding: '12px 24px', borderRadius: theme.radius,
              cursor: selectedSymbol ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 14, marginTop: 8, width: '100%',
            }}
          >
            게임 시작
          </button>
          </>
        )}
      </div>
    </div>
  );
}
