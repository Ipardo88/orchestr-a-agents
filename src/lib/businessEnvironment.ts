/**
 * Business Environment — lightweight FRED data fetcher for Cloudflare Workers.
 *
 * Fetches 8 key US macroeconomic indicators from the St. Louis Fed (FRED) API
 * and formats them as a text block for injection into the businessModelAgent
 * system prompt during PESTEL analysis phases.
 *
 * FRED API is free. Add FRED_API_KEY to .dev.vars / wrangler secrets for
 * higher rate limits (recommended). The module degrades gracefully if the key
 * is missing or any fetch fails — the agent simply proceeds without live data.
 *
 * Free key: https://fred.stlouisfed.org/docs/api/api_key.html
 */

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

// 8 key series that cover the Economic, Political, and Social PESTEL dimensions
const KEY_SERIES = [
  { id: 'A191RL1Q225SBEA', label: 'Real GDP Growth',       unit: '%',   fmt: (v: number) => `${v.toFixed(1)}%`  },
  { id: 'UNRATE',          label: 'US Unemployment Rate',  unit: '%',   fmt: (v: number) => `${v.toFixed(1)}%`  },
  { id: 'CPIAUCSL',        label: 'CPI (Inflation Index)', unit: 'idx', fmt: (v: number) => v.toFixed(1)         },
  { id: 'DFF',             label: 'Fed Funds Rate',        unit: '%',   fmt: (v: number) => `${v.toFixed(2)}%`  },
  { id: 'UMCSENT',         label: 'Consumer Sentiment',    unit: 'idx', fmt: (v: number) => v.toFixed(1)         },
  { id: 'DGS10',           label: '10-Year Treasury Yield',unit: '%',   fmt: (v: number) => `${v.toFixed(2)}%`  },
  { id: 'RSXFS',           label: 'Retail Sales',          unit: '$M',  fmt: (v: number) => `$${(v/1000).toFixed(1)}B` },
  { id: 'ICSA',            label: 'Initial Jobless Claims',unit: 'wkly',fmt: (v: number) => `${Math.round(v/1000)}K`   },
] as const;

interface Observation { date: string; value: string }
interface FredResponse { observations: Observation[] }

export interface EconDataPoint {
  label:     string;
  formatted: string;
  date:      string;
  yoyPct:    number | null;
  direction: '↑' | '↓' | '→';
}

export interface BusinessEnvironmentSnapshot {
  fetchedAt:  string;
  dataPoints: EconDataPoint[];
  asText:     string;           // Ready-to-inject block for system prompt
  isPartial:  boolean;          // True if some fetches failed
}

async function fetchSeries(
  seriesId: string,
  apiKey: string | undefined,
): Promise<Array<{ date: string; value: number }>> {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);

  const params = new URLSearchParams({
    series_id:        seriesId,
    file_type:        'json',
    observation_start: startDate.toISOString().split('T')[0],
    sort_order:       'desc',
    limit:            '16',
  });
  if (apiKey) params.set('api_key', apiKey);

  const res = await fetch(`${FRED_BASE}?${params}`, {
    headers: { 'Accept': 'application/json' },
    // 8-second timeout via AbortController
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return [];

  const data = await res.json() as FredResponse;
  return (data.observations ?? [])
    .filter(o => o.value !== '.' && o.value !== '')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }));
}

/**
 * Fetch a snapshot of US macroeconomic conditions from FRED.
 * Returns a snapshot with formatted text ready for system prompt injection.
 * Never throws — returns isPartial=true on partial failure.
 */
export async function fetchBusinessEnvironment(
  fredApiKey?: string,
): Promise<BusinessEnvironmentSnapshot> {
  const results = await Promise.allSettled(
    KEY_SERIES.map(s => fetchSeries(s.id, fredApiKey)),
  );

  const dataPoints: EconDataPoint[] = [];
  let failCount = 0;

  for (let i = 0; i < KEY_SERIES.length; i++) {
    const series = KEY_SERIES[i];
    const result = results[i];

    if (result.status !== 'fulfilled' || result.value.length === 0) {
      failCount++;
      continue;
    }

    const obs = result.value;  // sorted desc: obs[0] is latest
    const latest = obs[0];

    // YoY: find the observation closest to 12 months ago
    const cutoffMs = new Date(latest.date).getTime() - 365 * 24 * 3600 * 1000;
    const yearAgo  = obs.find(o => new Date(o.date).getTime() <= cutoffMs);
    const yoyPct   = yearAgo
      ? Math.round(((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 1000) / 10
      : null;

    const direction: EconDataPoint['direction'] =
      yoyPct === null ? '→' : yoyPct > 0.5 ? '↑' : yoyPct < -0.5 ? '↓' : '→';

    dataPoints.push({
      label:     series.label,
      formatted: series.fmt(latest.value),
      date:      latest.date,
      yoyPct,
      direction,
    });
  }

  // Format as compact text block for injection into system prompt
  const lines: string[] = [
    '--- US Macroeconomic Snapshot (Live — FRED) ---',
  ];

  for (const dp of dataPoints) {
    const yoyStr = dp.yoyPct !== null
      ? ` ${dp.direction} ${dp.yoyPct > 0 ? '+' : ''}${dp.yoyPct.toFixed(1)}% YoY`
      : '';
    lines.push(`  ${dp.label}: ${dp.formatted}${yoyStr}  [${dp.date}]`);
  }

  if (failCount > 0) {
    lines.push(`  (${failCount} of ${KEY_SERIES.length} indicators unavailable)`);
  }
  lines.push('--- End Snapshot ---');

  return {
    fetchedAt:  new Date().toISOString(),
    dataPoints,
    asText:     lines.join('\n'),
    isPartial:  failCount > 0,
  };
}

/**
 * Returns true if the given text (phase + recent message) suggests
 * the conversation is in or approaching a PESTEL / environment analysis phase.
 */
export function isPestelContext(text: string): boolean {
  return /pestel|political|economic|social|technolog|environmental|legal|external.environment|market.force|industry.force|macro|economic.climate|interest.rate|inflation|consumer.sentiment/i.test(text);
}
