import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMarketEvents } from './events';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('fetchMarketEvents', () => {
  it('requires a Twelve Data API key in static mode', async () => {
    await expect(fetchMarketEvents('AAPL', '2024-01-01', '2024-12-31')).rejects.toThrow(
      'Twelve Data API Key is required.',
    );
  });

  it('loads dividend and earnings events directly from Twelve Data', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          dividends: [
            { payment_date: '2024-03-01', amount: '0.24' },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          earnings: [
            { date: '2024-02-01', eps_actual: '1.25' },
          ],
        }),
      }));

    const result = await fetchMarketEvents('AAPL', '2024-01-01', '2024-12-31', 'api-key');

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('https://api.twelvedata.com/dividends_calendar?symbol=AAPL'),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('https://api.twelvedata.com/earnings_calendar?symbol=AAPL'),
    );
    expect(result).toEqual([
      {
        date: '2024-02-01',
        type: 'earnings',
        description: '실적 발표 (EPS: 1.25)',
        data: { eps: 1.25 },
      },
      {
        date: '2024-03-01',
        type: 'dividend',
        description: '배당금: 0.24',
        data: { dividendAmount: 0.24 },
      },
    ]);
  });
});
