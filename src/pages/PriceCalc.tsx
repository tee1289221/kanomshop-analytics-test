import { useState, useMemo, useEffect } from 'react';
import { loadState, saveState } from '../lib/storage';

// ---------- types -----------------------------------------------------------
interface Inputs {
  sell: number;
  raw: number;
  wastage: number;   // 0–30 %
  overhead: number;  // 0–80 %
  platform: number;  // 0–40 %
  tax: number;       // 0–35 %
  vatInclusive: boolean;
}

interface PLResult {
  cogs: number;
  grossProfit: number;
  platformFee: number;
  overheadAmt: number;
  vatAmt: number;
  preTax: number;
  taxAmt: number;
  net: number;
  netMargin: number;
}

// ---------- business logic --------------------------------------------------
function calcPL(inp: Inputs): PLResult {
  const { sell, raw, wastage, overhead, platform, tax, vatInclusive } = inp;
  const vatF = vatInclusive ? 7 / 107 : 0;
  const cogs = raw * (1 + wastage / 100);
  const grossProfit = sell - cogs;
  const platformFee = sell * (platform / 100);
  const overheadAmt = sell * (overhead / 100);
  const vatAmt = sell * vatF;
  const preTax = sell - cogs - platformFee - overheadAmt - vatAmt;
  const taxAmt = Math.max(0, preTax * (tax / 100));
  const net = preTax - taxAmt;
  return { cogs, grossProfit, platformFee, overheadAmt, vatAmt, preTax, taxAmt, net, netMargin: sell > 0 ? net / sell : 0 };
}

function minPrice(raw: number, wastage: number, overhead: number, platform: number, tax: number, vatInclusive: boolean, targetMargin: number): number | null {
  const vatF = vatInclusive ? 7 / 107 : 0;
  const fc = raw * (1 + wastage / 100);
  const A = 1 - platform / 100 - overhead / 100 - vatF;
  const denom = A * (1 - tax / 100) - targetMargin / 100;
  if (denom <= 0) return null;
  return fc * (1 - tax / 100) / denom;
}

function maxMargin(_raw: number, _wastage: number, overhead: number, platform: number, tax: number, vatInclusive: boolean): number {
  // as P→∞, COGS/P → 0, so net margin → A×(1−tax%)
  // where A = 1 − plat% − overhead% − vatF
  const vatF = vatInclusive ? 7 / 107 : 0;
  const A = 1 - platform / 100 - overhead / 100 - vatF;
  return A * (1 - tax / 100) * 100;
}

// ---------- helpers ---------------------------------------------------------
function fmtB(v: number, dec = 2) {
  return v.toFixed(dec);
}

function marginColor(pct: number): string {
  if (pct < 5)  return 'var(--red)';
  if (pct < 10) return 'var(--amber)';
  if (pct < 15) return 'var(--jade)';
  return 'var(--goldL)';
}

function marginLabel(pct: number): string {
  if (pct < 0)  return 'ขาดทุน';
  if (pct < 5)  return 'อันตราย';
  if (pct < 10) return 'Survival';
  if (pct < 15) return 'Healthy';
  return 'Scalable';
}

// ---------- sub-components --------------------------------------------------
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}
function SliderRow({ label, value, min, max, step = 1, unit = '%', onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-creamD text-sm">{label}</span>
        <span className="font-mono text-gold text-sm font-semibold">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-gold"
        />
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
          className="w-16 text-center bg-bg3 border border-border rounded px-1.5 py-0.5 text-cream text-sm font-mono focus:outline-none focus:border-gold"
        />
      </div>
    </div>
  );
}

interface PLRowProps { label: string; value: number; sub?: string; isNeg?: boolean; isBold?: boolean; isResult?: boolean }
function PLRow({ label, value, sub, isNeg, isBold, isResult }: PLRowProps) {
  const color = isResult ? marginColor(value * 100) : isBold ? 'var(--cream)' : 'var(--creamD)';
  return (
    <div className={`flex justify-between items-baseline py-1.5 ${isResult ? 'border-t border-gold/30 mt-1 pt-2' : ''}`}>
      <div>
        <span className={`text-sm ${isBold || isResult ? 'font-medium text-cream' : 'text-creamD'}`}>{label}</span>
        {sub && <span className="text-xs text-creamD/60 ml-1.5">{sub}</span>}
      </div>
      <span
        className={`font-mono text-sm ${isBold || isResult ? 'font-bold text-base' : ''}`}
        style={{ color }}
      >
        {isNeg ? '− ' : ''}{isResult ? '' : '฿'}{isResult ? `${(value * 100).toFixed(1)}%` : fmtB(Math.abs(value))}
      </span>
    </div>
  );
}

interface MinPriceRowProps { label: string; target: number; pMin: number | null; maxM: number }
function MinPriceRow({ label, target, pMin, maxM }: MinPriceRowProps) {
  const impossible = pMin === null;
  const color = impossible ? 'var(--red)' : marginColor(target);
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <div>
        <span className="text-sm font-medium text-cream">{label}</span>
        <span className="text-xs text-creamD ml-2">({target}% margin)</span>
      </div>
      <div className="text-right">
        {impossible ? (
          <div>
            <div className="font-mono font-bold text-red text-sm">ทำไม่ได้</div>
            <div className="text-xs text-creamD">max margin จริง: {maxM.toFixed(1)}%</div>
          </div>
        ) : (
          <span className="font-mono font-bold" style={{ color }}>฿{fmtB(pMin)}</span>
        )}
      </div>
    </div>
  );
}

// ---------- main page -------------------------------------------------------
export default function PriceCalc() {
  const savedDefaults = loadState().priceCalcDefaults;

  const [inp, setInp] = useState<Inputs>({
    sell: 65,
    raw: 20,
    wastage: 5,
    overhead: savedDefaults.overhead * 100,
    platform: savedDefaults.platform * 100,
    tax: savedDefaults.tax * 100,
    vatInclusive: savedDefaults.vatInclusive,
  });

  // persist defaults when they change
  useEffect(() => {
    const state = loadState();
    state.priceCalcDefaults = {
      overhead: inp.overhead / 100,
      platform: inp.platform / 100,
      tax: inp.tax / 100,
      vatInclusive: inp.vatInclusive,
    };
    saveState(state);
  }, [inp.overhead, inp.platform, inp.tax, inp.vatInclusive]);

  const set = <K extends keyof Inputs>(k: K) => (v: Inputs[K]) => setInp(prev => ({ ...prev, [k]: v }));

  const pl = useMemo(() => calcPL(inp), [inp]);
  const mMax = useMemo(() => maxMargin(inp.raw, inp.wastage, inp.overhead, inp.platform, inp.tax, inp.vatInclusive), [inp]);

  const targets = [
    { label: 'Survival', target: 5 },
    { label: 'Healthy',  target: 10 },
    { label: 'Scalable', target: 15 },
  ];

  return (
    <div className="min-h-screen bg-bg0 text-cream font-sarabun px-4 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gold mb-1">Price Calculator</h1>
        <p className="text-creamD text-sm">คำนวณ P&amp;L และราคาขั้นต่ำตาม margin target</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT — inputs */}
        <div className="space-y-4">
          <div className="bg-bg1 border border-border rounded-xl p-5 space-y-5">
            <h2 className="text-gold font-semibold">Input</h2>

            {/* Sell price */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-creamD text-sm">ราคาขาย (ลูกค้าจ่าย)</span>
                <span className="font-mono text-goldL text-lg font-bold">฿{inp.sell}</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="range" min={1} max={1000} step={1} value={inp.sell}
                  onChange={e => set('sell')(Number(e.target.value))}
                  className="flex-1 accent-gold" />
                <input type="number" min={1} value={inp.sell}
                  onChange={e => set('sell')(Number(e.target.value) || 1)}
                  className="w-20 text-center bg-bg3 border border-border rounded px-1.5 py-0.5 text-cream text-sm font-mono focus:outline-none focus:border-gold" />
              </div>
              {/* Quick picks */}
              <div className="flex gap-1.5 flex-wrap pt-1">
                {[15, 65, 130, 200, 300, 400].map(p => (
                  <button key={p} onClick={() => set('sell')(p)}
                    className="px-2 py-0.5 rounded text-xs transition-colors"
                    style={{
                      background: inp.sell === p ? 'var(--gold)' : 'var(--bg3)',
                      color: inp.sell === p ? '#0f0b06' : 'var(--creamD)',
                      border: `1px solid ${inp.sell === p ? 'var(--gold)' : 'var(--border)'}`,
                    }}>฿{p}</button>
                ))}
              </div>
            </div>

            {/* Raw cost */}
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-creamD text-sm">ต้นทุนดิบต่อหน่วย</span>
                <span className="font-mono text-cream text-sm font-semibold">฿{inp.raw}</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={inp.sell} step={0.5} value={inp.raw}
                  onChange={e => set('raw')(Number(e.target.value))}
                  className="flex-1 accent-gold" />
                <input type="number" min={0} step={0.5} value={inp.raw}
                  onChange={e => set('raw')(Number(e.target.value) || 0)}
                  className="w-20 text-center bg-bg3 border border-border rounded px-1.5 py-0.5 text-cream text-sm font-mono focus:outline-none focus:border-gold" />
              </div>
            </div>

            <SliderRow label="ของเสีย %" value={inp.wastage} min={0} max={30} onChange={set('wastage')} />
            <SliderRow label="โสหุ้ย % ของยอดขาย" value={inp.overhead} min={0} max={80} onChange={set('overhead')} />
            <SliderRow label="Platform fee %" value={inp.platform} min={0} max={40} onChange={set('platform')} />
            <SliderRow label="ภาษีเงินได้ %" value={inp.tax} min={0} max={35} onChange={set('tax')} />

            {/* VAT checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => set('vatInclusive')(!inp.vatInclusive)}
                className="w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer"
                style={{ background: inp.vatInclusive ? 'var(--gold)' : 'var(--bg3)', borderColor: inp.vatInclusive ? 'var(--gold)' : 'var(--border)' }}
              >
                {inp.vatInclusive && <span className="text-bg0 text-xs font-bold">✓</span>}
              </div>
              <span className="text-creamD text-sm group-hover:text-cream transition-colors">
                ราคาที่กรอกรวม VAT 7% แล้ว (หัก VAT นำส่ง = ราคา × 7/107)
              </span>
            </label>
          </div>
        </div>

        {/* RIGHT — results */}
        <div className="space-y-4">

          {/* P&L card */}
          <div className="bg-bg1 border border-border rounded-xl p-5">
            <h2 className="text-gold font-semibold mb-3">P&amp;L — ราคาที่ตั้งจริง</h2>

            <div className="divide-y divide-border/50">
              <PLRow label="ราคาขาย" value={inp.sell} isBold />
              <PLRow label="COGS" sub={`raw × (1 + ${inp.wastage}%)`} value={pl.cogs} isNeg />
              <PLRow label="Gross Profit" value={pl.grossProfit} isBold />
              {inp.platform > 0 && <PLRow label={`Platform fee`} sub={`${inp.platform}%`} value={pl.platformFee} isNeg />}
              {inp.overhead > 0 && <PLRow label={`โสหุ้ย`} sub={`${inp.overhead}%`} value={pl.overheadAmt} isNeg />}
              {inp.vatInclusive && <PLRow label="VAT นำส่ง" sub="× 7/107" value={pl.vatAmt} isNeg />}
              <PLRow label="Pre-tax Profit" value={pl.preTax} isBold />
              {inp.tax > 0 && pl.preTax > 0 && <PLRow label={`ภาษีเงินได้`} sub={`${inp.tax}%`} value={pl.taxAmt} isNeg />}
            </div>

            {/* Net result */}
            <div
              className="mt-4 rounded-xl px-4 py-3 flex justify-between items-center"
              style={{ background: `${marginColor(pl.netMargin * 100)}22`, border: `1px solid ${marginColor(pl.netMargin * 100)}44` }}
            >
              <div>
                <div className="text-sm font-medium text-cream">Net Profit (หลังภาษี)</div>
                <div className="text-xs mt-0.5" style={{ color: marginColor(pl.netMargin * 100) }}>
                  {marginLabel(pl.netMargin * 100)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-xl" style={{ color: marginColor(pl.netMargin * 100) }}>
                  ฿{fmtB(pl.net)}
                </div>
                <div className="font-mono text-sm" style={{ color: marginColor(pl.netMargin * 100) }}>
                  {(pl.netMargin * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Color band legend */}
            <div className="mt-3 flex gap-3 flex-wrap text-xs text-creamD">
              <span><span className="text-red">■</span> &lt;5% อันตราย</span>
              <span><span className="text-amber">■</span> 5–10% Survival</span>
              <span><span className="text-jade">■</span> 10–15% Healthy</span>
              <span><span style={{ color: 'var(--goldL)' }}>■</span> 15%+ Scalable</span>
            </div>
          </div>

          {/* Min price card */}
          <div className="bg-bg1 border border-border rounded-xl p-5">
            <h2 className="text-gold font-semibold mb-1">ราคาขั้นต่ำที่ต้องตั้ง</h2>
            <p className="text-creamD text-xs mb-3">
              สูตร: P = COGS×(1−tax%) / [A×(1−tax%) − target]
              &nbsp;โดย A = 1 − plat% − overhead% − vatF
            </p>
            <div>
              {targets.map(({ label, target }) => {
                const pMin = minPrice(inp.raw, inp.wastage, inp.overhead, inp.platform, inp.tax, inp.vatInclusive, target);
                return (
                  <MinPriceRow
                    key={label}
                    label={label}
                    target={target}
                    pMin={pMin}
                    maxM={mMax}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
