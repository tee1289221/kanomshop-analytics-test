import { useState, useMemo, useCallback } from 'react';
import { parseISO, differenceInDays } from 'date-fns';
import { BL, M, FCAST_PERIODS, SKU_GROUPS, PERIOD_COLORS, ALL_SKUS } from '../data/constants';
import { getKwanAvgForPeriod } from '../lib/business';

// ---------- types -----------------------------------------------------------
interface PeriodRow {
  key: string;
  name: string;
  days: number;
  activeDays: number;   // user-editable
  mVal: number;
  dailyEst: number;
  forecast: number;
  withBuffer: number;
}

// ---------- helpers ---------------------------------------------------------
function buildRows(sku: string, activeDaysMap: Record<string, number>, bufferPct: number): PeriodRow[] {
  return FCAST_PERIODS.map(p => {
    const defaultDays = differenceInDays(parseISO(p.end), parseISO(p.start)) + 1;
    const activeDays = activeDaysMap[p.key] ?? defaultDays;
    const mVal = M[sku]?.[p.key] ?? 1;
    const bl = BL[sku] ?? 0;
    const dailyEst = bl * mVal;
    const forecast = Math.round(dailyEst * activeDays);
    return {
      key: p.key, name: p.name, days: defaultDays,
      activeDays, mVal, dailyEst,
      forecast, withBuffer: Math.round(forecast * (1 + bufferPct / 100)),
    };
  });
}

function exportCSV(bufferPct: number, activeDaysMap: Record<string, number>) {
  const header = ['SKU', 'ช่วง', 'ชื่อช่วง', 'วัน(รวม)', 'วันเปิดจริง', 'M', 'ชิ้น/วัน', 'Forecast', `Forecast+${bufferPct}%Buffer`];
  const rows: string[][] = [];
  for (const sku of ALL_SKUS) {
    for (const r of buildRows(sku, activeDaysMap, bufferPct)) {
      rows.push([
        sku, r.key, r.name,
        String(r.days), String(r.activeDays),
        r.mVal.toFixed(2), r.dailyEst.toFixed(2),
        String(r.forecast), String(r.withBuffer),
      ]);
    }
  }
  // กวนถั่ว
  rows.push(['']);
  rows.push(['กวนถั่ว (ที่)', 'ช่วง', 'ชื่อช่วง', '', '', '', '', 'Weighted avg']);
  for (const p of FCAST_PERIODS) {
    rows.push(['กวนถั่ว', p.key, p.name, '', '', '', '', String(getKwanAvgForPeriod(p.key))]);
  }

  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `kanom-forecast-buffer${bufferPct}pct.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ---------- sub-components --------------------------------------------------
function MultiplierCell({ v }: { v: number }) {
  const color = v >= 5 ? '#FBBF24' : v >= 2 ? '#E67E22' : v >= 1.2 ? '#3DA876' : v < 0.7 ? '#64748B' : '#EDD9A3';
  return <span className="font-mono font-bold text-sm" style={{ color }}>×{v.toFixed(2)}</span>;
}

interface ActiveDaysCellProps { defaultDays: number; value: number; onChange: (v: number) => void; periodKey: string }
function ActiveDaysCell({ defaultDays, value, onChange, periodKey }: ActiveDaysCellProps) {
  const isT2 = periodKey === 't2';
  const modified = value !== defaultDays;
  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="number"
        min={1}
        max={defaultDays}
        value={value}
        onChange={e => onChange(Math.min(defaultDays, Math.max(1, Number(e.target.value) || 1)))}
        className={`w-16 text-center bg-bg3 rounded px-1.5 py-1 text-sm font-mono focus:outline-none focus:border-gold border ${modified ? 'border-amber text-amber' : 'border-border text-cream'}`}
      />
      {isT2 && (
        <span title="t2 ยาว ~123 วัน แนะนำให้ใส่วันเปิดจริง" className="text-amber cursor-help select-none">⚠</span>
      )}
    </div>
  );
}

// ---------- summary grid (all SKUs × current period) -----------------------
function SummaryGrid({ bufferPct, activeDaysMap }: { bufferPct: number; activeDaysMap: Record<string, number> }) {
  const groups = [
    { label: 'กลุ่มใหญ่', skus: SKU_GROUPS.large },
    { label: 'กลุ่มเล็ก (เตา)', skus: SKU_GROUPS.small },
  ];
  return (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g.label} className="bg-bg1 border border-border rounded-xl overflow-x-auto">
          <div className="px-4 pt-3 pb-2 text-gold font-semibold text-sm border-b border-border">{g.label}</div>
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-creamD text-xs border-b border-border">
                <th className="py-2 px-3 text-left sticky left-0 bg-bg1 z-10">SKU</th>
                {FCAST_PERIODS.map(p => (
                  <th key={p.key} className="py-2 px-2 text-center" style={{ color: PERIOD_COLORS[p.key] ?? '#64748B' }}>
                    {p.key}<br /><span className="text-[10px] text-creamD">{activeDaysMap[p.key] ?? differenceInDays(parseISO(p.end), parseISO(p.start)) + 1}ว</span>
                  </th>
                ))}
                <th className="py-2 px-3 text-center">รวม/ปี</th>
              </tr>
            </thead>
            <tbody>
              {g.skus.map(sku => {
                const rows = buildRows(sku, activeDaysMap, bufferPct);
                const total = rows.reduce((s, r) => s + r.withBuffer, 0);
                return (
                  <tr key={sku} className="border-b border-border hover:bg-bg2 transition-colors">
                    <td className="py-2 px-3 font-medium text-cream text-sm sticky left-0 bg-bg1">{sku}</td>
                    {rows.map(r => (
                      <td key={r.key} className="py-2 px-2 text-center font-mono text-sm text-cream">
                        {r.withBuffer > 0 ? r.withBuffer : <span className="text-creamD/40">0</span>}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center font-mono font-bold text-sm text-gold">{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ---------- single SKU detail view -----------------------------------------
function SkuDetail({ sku, bufferPct, activeDaysMap, onActiveDayChange }: {
  sku: string;
  bufferPct: number;
  activeDaysMap: Record<string, number>;
  onActiveDayChange: (key: string, v: number) => void;
}) {
  const rows = useMemo(() => buildRows(sku, activeDaysMap, bufferPct), [sku, bufferPct, activeDaysMap]);
  const totalForecast = rows.reduce((s, r) => s + r.forecast, 0);
  const totalWithBuffer = rows.reduce((s, r) => s + r.withBuffer, 0);

  return (
    <div className="bg-bg1 border border-border rounded-xl overflow-x-auto">
      <table className="w-full min-w-[680px]">
        <thead>
          <tr className="border-b border-border text-creamD text-xs uppercase tracking-wide">
            <th className="py-3 px-3 text-left">ช่วง</th>
            <th className="py-3 px-3 text-center">วัน<br /><span className="normal-case text-[10px]">(ทั้งหมด)</span></th>
            <th className="py-3 px-3 text-center">วันเปิดจริง</th>
            <th className="py-3 px-3 text-center">M</th>
            <th className="py-3 px-3 text-center">ชิ้น/วัน</th>
            <th className="py-3 px-3 text-center">Forecast</th>
            <th className="py-3 px-3 text-center">+{bufferPct}% Buffer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} className={`border-b border-border hover:bg-bg2 transition-colors ${i % 2 ? '' : 'bg-bg1'}`}>
              <td className="py-2.5 px-3">
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: PERIOD_COLORS[r.key] ?? 'var(--cream)' }}
                >
                  {r.name}
                </span>
                <span className="text-creamD text-xs ml-1">({r.key})</span>
              </td>
              <td className="py-2.5 px-3 text-center text-creamD font-mono text-sm">{r.days}</td>
              <td className="py-2.5 px-3 text-center">
                <ActiveDaysCell
                  defaultDays={r.days}
                  value={r.activeDays}
                  onChange={v => onActiveDayChange(r.key, v)}
                  periodKey={r.key}
                />
              </td>
              <td className="py-2.5 px-3 text-center"><MultiplierCell v={r.mVal} /></td>
              <td className="py-2.5 px-3 text-center font-mono text-cream text-sm">{r.dailyEst.toFixed(2)}</td>
              <td className="py-2.5 px-3 text-center font-mono text-cream">{r.forecast.toLocaleString()}</td>
              <td className="py-2.5 px-3 text-center font-mono font-bold text-gold">{r.withBuffer.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gold/30">
            <td colSpan={5} className="py-2.5 px-3 text-right text-creamD text-sm font-medium">รวมทั้งปี</td>
            <td className="py-2.5 px-3 text-center font-mono font-bold text-cream">{totalForecast.toLocaleString()}</td>
            <td className="py-2.5 px-3 text-center font-mono font-bold text-gold">{totalWithBuffer.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------- กวนถั่ว section -------------------------------------------------
function KwanSection() {
  return (
    <div className="bg-bg1 border border-border rounded-xl overflow-x-auto">
      <div className="px-4 pt-3 pb-2 border-b border-border flex items-center gap-2">
        <span className="text-gold font-semibold">กวนถั่ว</span>
        <span className="text-creamD text-xs">(หน่วย: ที่ — Leading Indicator, weighted avg 5 ปี)</span>
      </div>
      <table className="w-full min-w-[560px]">
        <thead>
          <tr className="border-b border-border text-creamD text-xs uppercase tracking-wide">
            <th className="py-2.5 px-3 text-left">ช่วง</th>
            {FCAST_PERIODS.map(p => (
              <th key={p.key} className="py-2.5 px-2 text-center text-[11px]" style={{ color: PERIOD_COLORS[p.key] ?? '#64748B' }}>
                {p.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="hover:bg-bg2 transition-colors">
            <td className="py-2.5 px-3 text-sm text-cream">เป้าหมาย (ที่)</td>
            {FCAST_PERIODS.map(p => {
              const v = getKwanAvgForPeriod(p.key);
              return (
                <td key={p.key} className="py-2.5 px-2 text-center font-mono text-sm" style={{ color: v > 20 ? '#FBBF24' : v > 5 ? '#3DA876' : 'var(--creamD)' }}>
                  {v || <span className="text-bg3">0</span>}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------- main page -------------------------------------------------------
type ViewMode = 'detail' | 'summary';

export default function Forecast() {
  const [viewMode, setViewMode]     = useState<ViewMode>('detail');
  const [group, setGroup]           = useState<'large' | 'small'>('large');
  const [sku, setSku]               = useState(SKU_GROUPS.large[0]);
  const [bufferPct, setBufferPct]   = useState(10);
  const [activeDaysMap, setActiveDaysMap] = useState<Record<string, number>>({});

  const skuList = group === 'large' ? SKU_GROUPS.large : SKU_GROUPS.small;

  const handleGroupChange = useCallback((g: 'large' | 'small') => {
    setGroup(g);
    setSku(g === 'large' ? SKU_GROUPS.large[0] : SKU_GROUPS.small[0]);
  }, []);

  const handleActiveDayChange = useCallback((key: string, v: number) => {
    setActiveDaysMap(prev => ({ ...prev, [key]: v }));
  }, []);

  return (
    <div className="min-h-screen bg-bg0 text-cream font-sarabun px-4 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gold mb-1">Forecast</h1>
          <p className="text-creamD text-sm">แผนการผลิตปีร้านขนม 2569–70 (มี.ค. 2026 – ก.พ. 2027)</p>
        </div>
        <button
          onClick={() => exportCSV(bufferPct, activeDaysMap)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gold text-gold text-sm font-medium hover:bg-gold hover:text-bg0 transition-colors"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Control bar */}
      <div className="bg-bg1 border border-border rounded-xl p-3 mb-5 flex flex-wrap gap-4 items-center">

        {/* View mode */}
        <div className="flex gap-1.5">
          {([['detail','รายละเอียด SKU'],['summary','ภาพรวมทุก SKU']] as [ViewMode, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: viewMode === v ? 'var(--gold)' : 'var(--bg3)',
                color: viewMode === v ? '#0f0b06' : 'var(--creamD)',
                border: `1px solid ${viewMode === v ? 'var(--gold)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Group + SKU (detail only) */}
        {viewMode === 'detail' && (
          <>
            <div className="flex gap-1.5">
              {(['large','small'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => handleGroupChange(g)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{
                    background: group === g ? '#C9A84C22' : 'var(--bg3)',
                    color: group === g ? 'var(--gold)' : 'var(--creamD)',
                    border: `1px solid ${group === g ? 'var(--gold)' : 'var(--border)'}`,
                  }}
                >
                  {g === 'large' ? 'กลุ่มใหญ่' : 'กลุ่มเล็ก'}
                </button>
              ))}
            </div>
            <select
              value={sku}
              onChange={e => setSku(e.target.value)}
              className="bg-bg3 border border-border rounded-lg px-3 py-1.5 text-cream text-sm focus:outline-none focus:border-gold"
            >
              {skuList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}

        <div className="w-px h-6 bg-border" />

        {/* Buffer % */}
        <div className="flex items-center gap-2">
          <span className="text-creamD text-sm">Buffer</span>
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={bufferPct}
            onChange={e => setBufferPct(Number(e.target.value))}
            className="w-24 accent-gold"
          />
          <span className="font-mono text-gold font-semibold w-10">+{bufferPct}%</span>
        </div>

        {/* t2 note */}
        <span className="text-amber text-xs ml-auto max-w-xs text-right hidden sm:block">
          ⚠ t2 ยาว ~123 วัน — กรอก "วันเปิดจริง" เพื่อ forecast ที่แม่นขึ้น
        </span>
      </div>

      {/* t2 note (mobile) */}
      <div className="sm:hidden mb-4 text-amber text-xs bg-amber/10 border border-amber/30 rounded-lg px-3 py-2">
        ⚠ ช่วง t2 (หลังสง.→สารท) ยาว ~123 วัน — แนะนำให้ปรับ "วันเปิดจริง" ให้ตรงกับวันที่ร้านเปิดจริง
      </div>

      {/* Main content */}
      <div className="space-y-5">
        {viewMode === 'detail' ? (
          <SkuDetail
            sku={sku}
            bufferPct={bufferPct}
            activeDaysMap={activeDaysMap}
            onActiveDayChange={handleActiveDayChange}
          />
        ) : (
          <SummaryGrid bufferPct={bufferPct} activeDaysMap={activeDaysMap} />
        )}

        {/* กวนถั่ว */}
        <KwanSection />
      </div>
    </div>
  );
}
