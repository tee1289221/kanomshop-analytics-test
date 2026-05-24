import { differenceInDays, parseISO } from 'date-fns';
import { BL, M, FCAST_PERIODS, KWAN } from '../data/constants';
import type { FcastPeriod } from '../data/constants';

export interface CurrentPeriodInfo {
  period: FcastPeriod;
  daysTotal: number;
  daysRemaining: number;
  daysElapsed: number;
}

export function getCurrentPeriodInfo(date: Date): CurrentPeriodInfo {
  const today = date;

  // Try exact match first
  for (const p of FCAST_PERIODS) {
    const start = parseISO(p.start);
    const end = parseISO(p.end);
    if (today >= start && today <= end) {
      const daysTotal = differenceInDays(end, start) + 1;
      const daysElapsed = differenceInDays(today, start);
      return { period: p, daysTotal, daysRemaining: daysTotal - daysElapsed, daysElapsed };
    }
  }

  // Fallback: find nearest period
  let nearest = FCAST_PERIODS[0];
  let minDist = Infinity;
  for (const p of FCAST_PERIODS) {
    const start = parseISO(p.start);
    const dist = Math.abs(differenceInDays(today, start));
    if (dist < minDist) { minDist = dist; nearest = p; }
  }
  const start = parseISO(nearest.start);
  const end = parseISO(nearest.end);
  const daysTotal = differenceInDays(end, start) + 1;
  return { period: nearest, daysTotal, daysRemaining: daysTotal, daysElapsed: 0 };
}

export function forecast(sku: string, periodKey: string, days: number): number {
  return Math.round((BL[sku] ?? 0) * (M[sku]?.[periodKey] ?? 1) * days);
}

export function dailyTarget(sku: string, periodKey: string): number {
  return (BL[sku] ?? 0) * (M[sku]?.[periodKey] ?? 1);
}

export function getKwanAvgForPeriod(periodKey: string): number {
  const years = [2022, 2023, 2024, 2025, 2026] as const;
  const weights: Record<number, number> = { 2022: 0.05, 2023: 0.10, 2024: 0.20, 2025: 0.25, 2026: 0.40 };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const yr of years) {
    const val = KWAN[yr]?.[periodKey];
    if (val !== undefined) {
      weightedSum += val * weights[yr];
      totalWeight += weights[yr];
    }
  }
  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}
