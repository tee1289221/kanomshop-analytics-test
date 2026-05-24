import { differenceInDays, parseISO } from 'date-fns';
import { BL, M, KWAN, FCAST_PERIODS, PERIOD_ORDER } from '../data/constants';

// Days per period derived from current cycle's FCAST_PERIODS
export const PERIOD_DAYS: Record<string, number> = Object.fromEntries(
  FCAST_PERIODS.map(p => {
    const d = differenceInDays(parseISO(p.end), parseISO(p.start)) + 1;
    return [p.key, d];
  })
);

const PERIOD_NAME: Record<string, string> = Object.fromEntries(
  FCAST_PERIODS.map(p => [p.key, p.name])
);

export const YEARS = [2022, 2023, 2024, 2025, 2026] as const;
export type Year = typeof YEARS[number];

// ---- กวนถั่ว ----------------------------------------------------------------
export interface KwanRow {
  periodKey: string;
  periodName: string;
  days: number;
  vals: Partial<Record<Year, number>>;   // actual recorded ที่ per period
  yoyPct: number | null;                  // (2026-2025)/2025 %
}

export function getKwanYoY(): KwanRow[] {
  return PERIOD_ORDER.map(key => {
    const vals: Partial<Record<Year, number>> = {};
    for (const yr of YEARS) {
      const v = KWAN[yr]?.[key];
      if (v !== undefined) vals[yr as Year] = v;
    }
    const v25 = vals[2025];
    const v26 = vals[2026];
    const yoyPct = v25 != null && v26 != null ? ((v26 - v25) / v25) * 100 : null;
    return { periodKey: key, periodName: PERIOD_NAME[key] ?? key, days: PERIOD_DAYS[key] ?? 0, vals, yoyPct };
  });
}

export interface KwanKPI {
  peakYear: Year;
  peakYearTotal: number;
  peakPeriod: string;
  peakPeriodName: string;
  peakPeriodAvg: number;
  bestTrendPct: number;
  bestTrendPeriod: string;
  worstTrendPct: number;
  worstTrendPeriod: string;
}

export function getKwanKPI(): KwanKPI {
  const rows = getKwanYoY();

  // peak year by total
  const yearTotals: Record<number, number> = {};
  for (const row of rows) {
    for (const yr of YEARS) {
      const v = row.vals[yr];
      if (v != null) yearTotals[yr] = (yearTotals[yr] ?? 0) + v;
    }
  }
  let peakYear = YEARS[0] as Year;
  let peakYearTotal = 0;
  for (const [yr, tot] of Object.entries(yearTotals)) {
    if (tot > peakYearTotal) { peakYearTotal = tot; peakYear = Number(yr) as Year; }
  }

  // peak period by weighted average
  let peakPeriod = rows[0].periodKey;
  let peakPeriodName = rows[0].periodName;
  let peakPeriodAvg = 0;
  const WEIGHTS: Record<Year, number> = { 2022: 0.05, 2023: 0.10, 2024: 0.20, 2025: 0.25, 2026: 0.40 };
  for (const row of rows) {
    let wSum = 0; let wTot = 0;
    for (const yr of YEARS) {
      const v = row.vals[yr]; const w = WEIGHTS[yr];
      if (v != null) { wSum += v * w; wTot += w; }
    }
    const avg = wTot > 0 ? wSum / wTot : 0;
    if (avg > peakPeriodAvg) { peakPeriodAvg = avg; peakPeriod = row.periodKey; peakPeriodName = row.periodName; }
  }

  // best/worst trend (2025→2026)
  let bestTrendPct = -Infinity; let bestTrendPeriod = '';
  let worstTrendPct = Infinity; let worstTrendPeriod = '';
  for (const row of rows) {
    if (row.yoyPct == null) continue;
    if (row.yoyPct > bestTrendPct) { bestTrendPct = row.yoyPct; bestTrendPeriod = row.periodName; }
    if (row.yoyPct < worstTrendPct) { worstTrendPct = row.yoyPct; worstTrendPeriod = row.periodName; }
  }

  return { peakYear, peakYearTotal: Math.round(peakYearTotal), peakPeriod, peakPeriodName, peakPeriodAvg: Math.round(peakPeriodAvg), bestTrendPct, bestTrendPeriod, worstTrendPct, worstTrendPeriod };
}

// ---- SKU (period seasonality profile) -------------------------------------
export interface SkuRow {
  periodKey: string;
  periodName: string;
  days: number;
  mVal: number;
  dailyEst: number;   // BL × M
  periodEst: number;  // BL × M × days (rounded)
}

export interface SkuKPI {
  peakPeriod: string;
  peakPeriodName: string;
  peakMVal: number;
  worstPeriod: string;
  worstPeriodName: string;
  worstMVal: number;
  avgM: number;
  annualEst: number;
}

export function getSkuRows(sku: string): SkuRow[] {
  return PERIOD_ORDER.map(key => {
    const mVal = M[sku]?.[key] ?? 1;
    const bl = BL[sku] ?? 0;
    const days = PERIOD_DAYS[key] ?? 0;
    return {
      periodKey: key,
      periodName: PERIOD_NAME[key] ?? key,
      days,
      mVal,
      dailyEst: bl * mVal,
      periodEst: Math.round(bl * mVal * days),
    };
  });
}

export function getSkuKPI(sku: string): SkuKPI {
  const rows = getSkuRows(sku);
  let peakPeriod = rows[0].periodKey; let peakPeriodName = rows[0].periodName; let peakMVal = -Infinity;
  let worstPeriod = rows[0].periodKey; let worstPeriodName = rows[0].periodName; let worstMVal = Infinity;
  let mSum = 0; let annualEst = 0;
  for (const row of rows) {
    if (row.mVal > peakMVal) { peakMVal = row.mVal; peakPeriod = row.periodKey; peakPeriodName = row.periodName; }
    if (row.mVal < worstMVal) { worstMVal = row.mVal; worstPeriod = row.periodKey; worstPeriodName = row.periodName; }
    mSum += row.mVal;
    annualEst += row.periodEst;
  }
  return { peakPeriod, peakPeriodName, peakMVal, worstPeriod, worstPeriodName, worstMVal, avgM: mSum / rows.length, annualEst };
}
