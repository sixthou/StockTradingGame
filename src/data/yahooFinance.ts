import { DailyCandle } from '../types';

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';
const MISSING_API_KEY_ERROR = 'Twelve Data API Key is required.';

function parseTwelveDataCandles(data: any): DailyCandle[] {
  const values = Array.isArray(data?.values) ? data.values : [];
  const candles: DailyCandle[] = values
    .map((value: any) => ({
      date: String(value.datetime).split(' ')[0],
      open: Number(value.open),
      high: Number(value.high),
      low: Number(value.low),
      close: Number(value.close),
      volume: Number(value.volume) || 0,
    }))
    .filter((candle: DailyCandle) => candle.date && Number.isFinite(candle.open))
    .sort((a: DailyCandle, b: DailyCandle) => a.date.localeCompare(b.date));
  return candles;
}

function buildTwelveDataUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${TWELVE_DATA_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function fetchFromTwelveData(
  symbol: string,
  startDate: string,
  endDate: string,
  apiKey: string,
): Promise<DailyCandle[]> {
  const url = buildTwelveDataUrl('/time_series', {
    symbol,
    interval: '1day',
    start_date: startDate,
    end_date: endDate,
    order: 'ASC',
    apikey: apiKey,
  });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Twelve Data ${response.status}`);

  const data = await response.json();
  if (data?.status === 'error') {
    throw new Error(data.message || 'Twelve Data error');
  }

  const candles = parseTwelveDataCandles(data);
  if (candles.length < 1) throw new Error('No twelve data');
  return candles;
}

export async function fetchDailyCandles(
  symbol: string,
  startDate: string,
  endDate: string,
  twelveDataApiKey?: string,
): Promise<DailyCandle[]> {
  const apiKey = twelveDataApiKey?.trim();
  if (!apiKey) {
    throw new Error(MISSING_API_KEY_ERROR);
  }

  return fetchFromTwelveData(symbol, startDate, endDate, apiKey);
}

export interface SymbolSearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
}

const US_EXCHANGES = new Set([
  'NMS',
  'NAS',
  'NGM',
  'NCM',
  'NASDAQ',
  'NYQ',
  'NYSE',
  'ASE',
  'AMEX',
  'PCX',
  'ARCA',
  'BTS',
  'CXI',
  'OEM',
  'OQX',
  'OOTC',
  'OTC',
  'PNK',
]);

export function isSupportedUsSymbol(symbol: string, exchange = ''): boolean {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const normalizedExchange = exchange.trim().toUpperCase();

  if (!normalizedSymbol) return false;
  if (normalizedSymbol.includes(':')) return false;
  if (normalizedSymbol.includes('.')) return false;
  if (!/^[A-Z][A-Z0-9-]*$/.test(normalizedSymbol)) return false;
  if (!normalizedExchange) return true;

  return US_EXCHANGES.has(normalizedExchange);
}

const POPULAR_SYMBOLS: SymbolSearchResult[] = [
  { symbol: 'AAPL', shortname: 'Apple Inc.', exchange: 'NMS' },
  { symbol: 'MSFT', shortname: 'Microsoft Corporation', exchange: 'NMS' },
  { symbol: 'GOOGL', shortname: 'Alphabet Inc.', exchange: 'NMS' },
  { symbol: 'AMZN', shortname: 'Amazon.com Inc.', exchange: 'NMS' },
  { symbol: 'NVDA', shortname: 'NVIDIA Corporation', exchange: 'NMS' },
  { symbol: 'META', shortname: 'Meta Platforms Inc.', exchange: 'NMS' },
  { symbol: 'TSLA', shortname: 'Tesla Inc.', exchange: 'NMS' },
  { symbol: 'SPY', shortname: 'SPDR S&P 500 ETF', exchange: 'PCX' },
  { symbol: 'QQQ', shortname: 'Invesco QQQ ETF', exchange: 'NMS' },
];

export async function searchSymbol(query: string, twelveDataApiKey?: string): Promise<SymbolSearchResult[]> {
  const apiKey = twelveDataApiKey?.trim();
  if (!apiKey) return [];

  const url = buildTwelveDataUrl('/symbol_search', {
    symbol: query,
    outputsize: '10',
    apikey: apiKey,
  });
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data?.status === 'error') {
        throw new Error(data.message || 'Twelve Data error');
      }

      const results = (data.data || [])
        .map((q: any) => ({
          symbol: q.symbol,
          shortname: q.instrument_name || q.symbol,
          exchange: q.exchange || '',
          country: q.country || '',
        }))
        .filter((result: SymbolSearchResult & { country?: string }) =>
          result.country === 'United States' && isSupportedUsSymbol(result.symbol, result.exchange),
        )
        .map(({ symbol, shortname, exchange }: SymbolSearchResult & { country?: string }) => ({
          symbol,
          shortname,
          exchange,
        }));
      if (results.length > 0) return results;
    }
  } catch {
    // fall through to local fallback
  }

  // Fallback: filter US popular symbols + allow US direct entry
  const q = query.toUpperCase();
  const filtered = POPULAR_SYMBOLS.filter(
    (s) => s.symbol.includes(q) || s.shortname.toLowerCase().includes(query.toLowerCase()),
  );
  if (isSupportedUsSymbol(q)) {
    const direct: SymbolSearchResult = { symbol: q, shortname: '직접 입력', exchange: '' };
    return filtered.length > 0 ? [...filtered, direct] : [direct];
  }

  return filtered;
}
