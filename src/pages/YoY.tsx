import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { SKU_GROUPS, PERIOD_COLORS } from '../data/constants';
import {
  YEARS, getKwanYoY, getKwanKPI, getSkuRows, getSkuKPI,
  type Year,
} from '../lib/yoy';

// ---------- constants -------------------------------------------------------
const YEAR_COLORS: Record<Year, string> = {
  2022: '#64748B',
  2023: '#9E8B66',
  2024: '#3DA876',
  2025: '#E67E22',
  2026: '#FBBF24',
};

const MODE_OPTIONS = [
  { value: 'kwan',  label: 'กวนถั่ว', hint: 'ข้อมูลจริงรายปี (ที่)' },
  { value: 'large', label: 'กลุ่มใหญ่', hint: 'seasonality profile (M × BL)' },
  { value: 'small', label: 'กลุ่มเล็ก', hint: 'seasonality profile (M × BL)' },
] as const;
type Mode = typeof MODE_OPTIONS[number]['value'];

// ---------- helpers ---------------------------------------------------------
function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
}
function pctColor(v: number | null): string {
  if (v == null) return 'var(--creamD)';
  if (v >= 10)  return 'var(--jade)';
  if (v >= 0)   return 'var(--goldL)';
  if (v >= -10) return 'var(--amber)';
  return 'var(--red)';
}

// ---------- sub-components --------------------------------------------------
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-bg1 border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className="text-xs text-creamD">{label}</div>
      <div className="text-xl font-bold font-mono" style={{ color: color ?? 'var(--gold)' }}>{value}</div>
      {sub && <div className="text-xs text-creamD">{sub}</div>}
    </div>
  );
}

interface TooltipProps { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }
function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg2 border border-border rounded-xl px-4 py-3 text-sm shadow-xl min-w-[140px]">
      <div className="text-gold font-semibold mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4 items-center py-0.5">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono text-cream font-medium">{typeof p.value === 'number' ? p.value.toFixed(p.value < 10 ? 2 : 0) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- กวนถั่ว view ---------------------------------------------------
function KwanView() {
  const rows = useMemo(() => getKwanYoY(), []);
  const kpi = useMemo(() => getKwanKPI(), []);

  const chartData = rows.map(r => ({
    name: r.periodKey,
    fullName: r.periodName,
    ...Object.fromEntries(YEARS.map(yr => [String(yr), r.vals[yr] ?? null])),
  }));

  return (
    <>
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="ปีที่ดีที่สุด" value={String(kpi.peakYear)} sub={`รวม ${kpi.peakYearTotal} ที่`} />
        <KpiCard label="ช่วงที่ขายดีสุด" value={kpi.peakPeriodName} sub={`เฉลี่ย ${kpi.peakPeriodAvg} ที่`} />
        <KpiCard label="เติบโตดีสุด (YoY)" value={fmtPct(kpi.bestTrendPct)} sub={kpi.bestTrendPeriod} color={pctColor(kpi.bestTrendPct)} />
        <KpiCard label="ถดถอยสุด (YoY)" value={fmtPct(kpi.worstTrendPct)} sub={kpi.worstTrendPeriod} color={pctColor(kpi.worstTrendPct)} />
      </div>

      {/* Chart */}
      <div className="bg-bg1 border border-border rounded-xl p-4 mb-6">
        <div className="text-sm text-creamD mb-3">หน่วย: ที่ — เปรียบเทียบรายช่วง 5 ปี</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barCategoryGap="20%" barGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3a2c0e" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#9E8B66', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9E8B66', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9E8B66', paddingTop: 8 }} />
            {YEARS.map(yr => (
              <Bar key={yr} dataKey={String(yr)} name={String(yr)} fill={YEAR_COLORS[yr]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-bg1 border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[620px]">
          <thead>
            <tr className="border-b border-border text-creamD text-xs uppercase tracking-wide">
              <th className="py-3 px-3 text-left">ช่วง</th>
              {YEARS.map(yr => (
                <th key={yr} className="py-3 px-3 text-center" style={{ color: YEAR_COLORS[yr] }}>{yr}</th>
              ))}
              <th className="py-3 px-3 text-center">YoY%<br /><span className="text-[10px] normal-case">(2025→2026)</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.periodKey} className={`border-b border-border hover:bg-bg2 transition-colors ${i % 2 === 0 ? '' : 'bg-bg1'}`}>
                <td className="py-2.5 px-3">
                  <span className="font-medium text-cream">{row.periodName}</span>
                  <span className="text-creamD text-xs ml-1.5">({row.periodKey})</span>
                </td>
                {YEARS.map(yr => (
                  <td key={yr} className="py-2.5 px-3 text-center font-mono text-sm" style={{ color: YEAR_COLORS[yr] }}>
                    {row.vals[yr] ?? <span className="text-bg3">—</span>}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-center font-mono text-sm font-semibold" style={{ color: pctColor(row.yoyPct) }}>
                  {fmtPct(row.yoyPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------- SKU view -------------------------------------------------------
function SkuView({ sku }: { sku: string }) {
  const rows = useMemo(() => getSkuRows(sku), [sku]);
  const kpi = useMemo(() => getSkuKPI(sku), [sku]);

  const chartData = rows.map(r => ({
    name: r.periodKey,
    fullName: r.periodName,
    M: r.mVal,
    ประมาณ: r.periodEst,
  }));

  return (
    <>
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="ช่วง Peak (M สูงสุด)" value={kpi.peakPeriodName} sub={`M = ${kpi.peakMVal.toFixed(2)}`} />
        <KpiCard label="ช่วง Worst (M ต่ำสุด)" value={kpi.worstPeriodName} sub={`M = ${kpi.worstMVal.toFixed(2)}`} color="var(--creamD)" />
        <KpiCard label="M เฉลี่ยทุกช่วง" value={kpi.avgM.toFixed(2)} sub="across 13 periods" color="var(--cream)" />
        <KpiCard label="ยอดรวมประมาณ/ปี" value={kpi.annualEst.toLocaleString()} sub="BL × M × วัน" color="var(--jade)" />
      </div>

      {/* Chart — M multiplier */}
      <div className="bg-bg1 border border-border rounded-xl p-4 mb-4">
        <div className="text-sm text-creamD mb-1">Seasonal Multiplier (M) รายช่วง</div>
        <div className="text-xs text-creamD/60 mb-3">M &gt; 1 = ขายดีกว่า baseline, M &lt; 1 = ขายน้อยกว่า</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#3a2c0e" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#9E8B66', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9E8B66', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
            <Bar dataKey="M" name="M" radius={[3, 3, 0, 0]}>
              {chartData.map(entry => {
                const color = PERIOD_COLORS[entry.name] ?? '#64748B';
                return <Cell key={entry.name} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Reference line at M=1 is implied by axis */}
      </div>

      {/* Chart — estimated units per period */}
      <div className="bg-bg1 border border-border rounded-xl p-4 mb-6">
        <div className="text-sm text-creamD mb-1">ยอดประมาณการต่อช่วง (ชิ้น) = BL × M × จำนวนวัน</div>
        <div className="text-xs text-amber mb-3">⚠ ใช้ baseline เฉลี่ย — ยังไม่แสดง YoY จริงรายปี</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#3a2c0e" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#9E8B66', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9E8B66', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
            <Bar dataKey="ประมาณ" name="ประมาณการ (ชิ้น)" fill="#C9A84C" radius={[3, 3, 0, 0]}>
              {chartData.map(entry => {
                const color = PERIOD_COLORS[entry.name] ?? '#64748B';
                return <Cell key={entry.name} fill={`${color}bb`} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-bg1 border border-border rounded-xl overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border text-creamD text-xs uppercase tracking-wide">
              <th className="py-3 px-3 text-left">ช่วง</th>
              <th className="py-3 px-3 text-center">วัน</th>
              <th className="py-3 px-3 text-center">M</th>
              <th className="py-3 px-3 text-center">ชิ้น/วัน</th>
              <th className="py-3 px-3 text-center">ประมาณ/ช่วง</th>
              <th className="py-3 px-3 text-center">ระดับ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const lvl = row.mVal >= 5 ? 'Peak' : row.mVal >= 1.5 ? 'สูง' : row.mVal >= 1 ? 'ปกติ' : row.mVal >= 0.6 ? 'ต่ำ' : 'ต่ำมาก';
              const lvlColor = row.mVal >= 5 ? '#FBBF24' : row.mVal >= 1.5 ? '#3DA876' : row.mVal >= 1 ? '#EDD9A3' : row.mVal >= 0.6 ? '#E67E22' : '#C0392B';
              return (
                <tr key={row.periodKey} className={`border-b border-border hover:bg-bg2 transition-colors ${i % 2 === 0 ? '' : 'bg-bg1'}`}>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-cream">{row.periodName}</span>
                    <span className="text-creamD text-xs ml-1.5">({row.periodKey})</span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-creamD text-sm font-mono">{row.days}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-sm" style={{ color: PERIOD_COLORS[row.periodKey] ?? '#64748B' }}>
                    {row.mVal.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-sm text-cream">{row.dailyEst.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-sm text-gold font-semibold">{row.periodEst.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: lvlColor, background: `${lvlColor}22` }}>{lvl}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------- main page -------------------------------------------------------
export default function YoY() {
  const [mode, setMode] = useState<Mode>('kwan');
  const [sku, setSku] = useState(SKU_GROUPS.large[0]);

  const skuList = mode === 'large' ? SKU_GROUPS.large : mode === 'small' ? SKU_GROUPS.small : [];

  return (
    <div className="min-h-screen bg-bg0 text-cream font-sarabun px-4 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gold mb-1">YoY Analytics</h1>
        <p className="text-creamD text-sm">ข้อมูลย้อนหลัง — เปรียบเทียบรายช่วงเทศกาล</p>
      </div>

      {/* Selector bar */}
      <div className="bg-bg1 border border-border rounded-xl p-3 mb-6 flex flex-wrap gap-3 items-center">
        {/* Mode tabs */}
        <div className="flex gap-1.5">
          {MODE_OPTIONS.map(opt => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { setMode(opt.value); if (opt.value === 'large') setSku(SKU_GROUPS.large[0]); if (opt.value === 'small') setSku(SKU_GROUPS.small[0]); }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: active ? 'var(--gold)' : 'var(--bg3)',
                  color: active ? '#0f0b06' : 'var(--creamD)',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* SKU dropdown */}
        {skuList.length > 0 && (
          <select
            value={sku}
            onChange={e => setSku(e.target.value)}
            className="bg-bg3 border border-border rounded-lg px-3 py-1.5 text-cream text-sm focus:outline-none focus:border-gold"
          >
            {skuList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {/* hint */}
        <span className="text-creamD text-xs ml-auto italic">
          {MODE_OPTIONS.find(o => o.value === mode)?.hint}
        </span>
      </div>

      {/* Content */}
      {mode === 'kwan'
        ? <KwanView />
        : <SkuView sku={sku} />
      }
    </div>
  );
}
