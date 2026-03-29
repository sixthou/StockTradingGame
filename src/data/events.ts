import { MarketEvent } from '../types';

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';
const MISSING_API_KEY_ERROR = 'Twelve Data API Key is required.';

function buildTwelveDataUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${TWELVE_DATA_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function parseDividendEvents(data: any): MarketEvent[] {
  const dividends = Array.isArray(data?.dividends) ? data.dividends : Array.isArray(data?.data) ? data.data : [];
  return dividends
    .map((dividend: any) => {
      const date = dividend.payment_date || dividend.ex_date || dividend.date;
      const amount = Number(dividend.amount);
      if (!date || !Number.isFinite(amount)) return null;
      return {
        date: String(date).split(' ')[0],
        type: 'dividend' as const,
        description: `배당금: ${amount}`,
        data: { dividendAmount: amount },
      };
    })
    .filter(Boolean) as MarketEvent[];
}

function parseEarningsEvents(data: any): MarketEvent[] {
  const earnings = Array.isArray(data?.earnings) ? data.earnings : Array.isArray(data?.data) ? data.data : [];
  return earnings
    .map((earning: any) => {
      const date = earning.date || earning.report_date;
      const eps = Number(earning.eps_actual ?? earning.eps);
      return {
        date: String(date).split(' ')[0],
        type: 'earnings' as const,
        description: `실적 발표 (EPS: ${Number.isFinite(eps) ? eps : 'N/A'})`,
        data: { eps: Number.isFinite(eps) ? eps : undefined },
      };
    })
    .filter((event: MarketEvent) => Boolean(event.date));
}

/**
 * Fetches market events for a symbol within a date range from Twelve Data.
 */
export async function fetchMarketEvents(
  symbol: string,
  startDate: string,
  endDate: string,
  twelveDataApiKey?: string,
): Promise<MarketEvent[]> {
  const apiKey = twelveDataApiKey?.trim();
  if (!apiKey) {
    throw new Error(MISSING_API_KEY_ERROR);
  }

  const dividendUrl = buildTwelveDataUrl('/dividends_calendar', {
    symbol,
    start_date: startDate,
    end_date: endDate,
    apikey: apiKey,
  });
  const earningsUrl = buildTwelveDataUrl('/earnings_calendar', {
    symbol,
    start_date: startDate,
    end_date: endDate,
    apikey: apiKey,
  });

  const [dividendResponse, earningsResponse] = await Promise.all([fetch(dividendUrl), fetch(earningsUrl)]);

  const [dividendJson, earningsJson] = await Promise.all([
    dividendResponse.ok ? dividendResponse.json() : Promise.resolve({ dividends: [] }),
    earningsResponse.ok ? earningsResponse.json() : Promise.resolve({ earnings: [] }),
  ]);

  if (dividendJson?.status === 'error') {
    throw new Error(dividendJson.message || 'Twelve Data dividend error');
  }
  if (earningsJson?.status === 'error') {
    throw new Error(earningsJson.message || 'Twelve Data earnings error');
  }

  return [...parseDividendEvents(dividendJson), ...parseEarningsEvents(earningsJson)]
    .sort((a, b) => a.date.localeCompare(b.date));
}
