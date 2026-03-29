import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDailyCandles, searchSymbol } from './yahooFinance';

const mockTwelveDataResponse = {
  values: [
    { datetime: '2024-03-15', open: '71000', high: '72000', low: '70500', close: '71500', volume: '800000' },
    { datetime: '2024-03-14', open: '70000', high: '73000', low: '69000', close: '72000', volume: '1000000' },
  ],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchDailyCandles', () => {
  it('requires a Twelve Data API key in static mode', async () => {
    await expect(fetchDailyCandles('AAPL', '2024-01-01', '2024-03-15')).rejects.toThrow(
      'Twelve Data API Key is required.',
    );
  });

  it('loads daily candles directly from Twelve Data when api key is provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTwelveDataResponse),
    }));

    const result = await fetchDailyCandles('AAPL', '2024-01-01', '2024-03-15', 'api-key');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.twelvedata.com/time_series?symbol=AAPL'),
    );
    expect(result[0]).toEqual({
      date: '2024-03-14',
      open: 70000,
      high: 73000,
      low: 69000,
      close: 72000,
      volume: 1000000,
    });
  });

  it('throws when Twelve Data returns an error payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'error', message: 'bad key' }),
    }));

    await expect(fetchDailyCandles('AAPL', '2024-01-01', '2024-03-15', 'api-key')).rejects.toThrow('bad key');
  });
});

describe('searchSymbol', () => {
  it('returns matching US symbols from Twelve Data search', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { symbol: '005930', instrument_name: 'Samsung Electronics', exchange: 'KRX', country: 'South Korea' },
          { symbol: 'AAPL', instrument_name: 'Apple Inc.', exchange: 'NASDAQ', country: 'United States' },
        ],
      }),
    }));

    const result = await searchSymbol('apple', 'api-key');
    expect(result).toEqual([
      { symbol: 'AAPL', shortname: 'Apple Inc.', exchange: 'NASDAQ' },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.twelvedata.com/symbol_search?symbol=apple'),
    );
  });

  it('falls back to US-only popular symbols when Twelve Data search fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(searchSymbol('삼성전자', 'api-key')).resolves.toEqual([]);
    await expect(searchSymbol('005930.KS', 'api-key')).resolves.toEqual([]);
    await expect(searchSymbol('AAPL', 'api-key')).resolves.toEqual([
      { symbol: 'AAPL', shortname: 'Apple Inc.', exchange: 'NMS' },
      { symbol: 'AAPL', shortname: '직접 입력', exchange: '' },
    ]);
  });

  it('returns no results without a Twelve Data API key', async () => {
    await expect(searchSymbol('AAPL')).resolves.toEqual([]);
  });
});
