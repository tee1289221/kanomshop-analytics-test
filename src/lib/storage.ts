export interface AppState {
  currentStock: Record<string, number>;
  recipeCosts: Record<string, number>;
  kwanCurrent: number;
  priceCalcDefaults: {
    overhead: number;
    platform: number;
    tax: number;
    vatInclusive: boolean;
  };
  lastUpdated: string;
}

const KEY = 'kanomshop_v1';

const defaults: AppState = {
  currentStock: {},
  recipeCosts: {},
  kwanCurrent: 0,
  priceCalcDefaults: { overhead: 0.3, platform: 0.3, tax: 0.15, vatInclusive: false },
  lastUpdated: new Date().toISOString(),
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, lastUpdated: new Date().toISOString() }));
  } catch {
    // storage full — ignore
  }
}
