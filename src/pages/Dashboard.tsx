import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { getCurrentPeriodInfo, forecast, dailyTarget, getKwanAvgForPeriod } from '../lib/business';
import { loadState, saveState } from '../lib/storage';
import { PERIOD_COLORS, SKU_GROUPS, M } from '../data/constants';

const TODAY = new Date();

function PeriodBadge({ periodKey, name, fest }: { periodKey: string; name: string; fest: boolean }) {
  const color = PERIOD_COLORS[periodKey] ?? '#64748B';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {fest && <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />}
      {name}
    </span>
  );
}

function MultiplierBadge({ value }: { value: number }) {
  const color = value >= 5 ? '#FBBF24' : value >= 2 ? '#E67E22' : value >= 1.2 ? '#3DA876' : value < 0.7 ? '#64748B' : '#EDD9A3';
  return (
    <span className="font-mono text-sm font-bold" style={{ color }}>
      ×{value.toFixed(2)}
    </span>
  );
}

function NeedBadge({ need }: { need: number }) {
  if (need <= 0) return <span className="text-jade font-semibold text-sm">✓ พอแล้ว</span>;
  return <span className="font-semibold text-sm" style={{ color: '#FBBF24' }}>{need} ชิ้น</span>;
}

interface StockRowProps {
  sku: string;
  periodKey: string;
  days: number;
  stock: number;
  onStockChange: (sku: string, val: number) => void;
}

function StockRow({ sku, periodKey, days, stock, onStockChange }: StockRowProps) {
  const target = forecast(sku, periodKey, days);
  const daily = dailyTarget(sku, periodKey);
  const mVal = M[sku]?.[periodKey] ?? 1;
  const need = Math.max(0, target - stock);

  return (
    <tr className="border-b border-border hover:bg-bg2 transition-colors">
      <td className="py-2.5 px-3 font-medium text-cream">{sku}</td>
      <td className="py-2.5 px-3 text-center text-creamD text-sm font-mono">{daily.toFixed(2)}</td>
      <td className="py-2.5 px-3 text-center"><MultiplierBadge value={mVal} /></td>
      <td className="py-2.5 px-3 text-center text-cream font-mono">{target}</td>
      <td className="py-2.5 px-3 text-center">
        <input
          type="number"
          min={0}
          value={stock === 0 ? '' : stock}
          placeholder="0"
          onChange={e => onStockChange(sku, Number(e.target.value) || 0)}
          className="w-20 text-center bg-bg3 border border-border rounded px-2 py-1 text-cream text-sm focus:outline-none focus:border-gold"
        />
      </td>
      <td className="py-2.5 px-3 text-center"><NeedBadge need={need} /></td>
    </tr>
  );
}

export default function Dashboard() {
  const [state, setState] = useState(loadState);
  const [days, setDays] = useState(1);
  const [kwanInput, setKwanInput] = useState(0);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    setKwanInput(state.kwanCurrent);
  }, [state.kwanCurrent]);

  const info = getCurrentPeriodInfo(TODAY);
  const { period } = info;
  const periodColor = PERIOD_COLORS[period.key] ?? '#64748B';

  const setStock = useCallback((sku: string, val: number) => {
    setState(prev => {
      const next = { ...prev, currentStock: { ...prev.currentStock, [sku]: val } };
      saveState(next);
      return next;
    });
  }, []);

  const handleKwanSave = () => {
    setState(prev => {
      const next = { ...prev, kwanCurrent: kwanInput };
      saveState(next);
      return next;
    });
  };

  const kwanTarget = getKwanAvgForPeriod(period.key);
  const kwanNeed = Math.max(0, kwanTarget - kwanInput);

  const dateStr = format(TODAY, 'd MMMM yyyy', { locale: th });
  const weekday = format(TODAY, 'EEEE', { locale: th });

  return (
    <div className="min-h-screen bg-bg0 text-cream font-sarabun px-4 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gold">วันนี้ต้องทำอะไร</h1>
          <span className="text-creamD text-sm">{weekday} {dateStr}</span>
        </div>

        {/* Period Info */}
        <div
          className="mt-3 rounded-xl p-4 border flex flex-wrap gap-4 items-center"
          style={{ background: `${periodColor}11`, borderColor: `${periodColor}33` }}
        >
          <div>
            <div className="text-xs text-creamD mb-1">ช่วงเทศกาลปัจจุบัน</div>
            <PeriodBadge periodKey={period.key} name={period.name} fest={period.fest} />
          </div>
          <div className="border-l border-border pl-4">
            <div className="text-xs text-creamD mb-0.5">ระยะเวลาช่วง</div>
            <div className="text-cream font-mono text-sm">{info.daysTotal} วัน</div>
          </div>
          <div className="border-l border-border pl-4">
            <div className="text-xs text-creamD mb-0.5">ผ่านไปแล้ว</div>
            <div className="text-cream font-mono text-sm">{info.daysElapsed} วัน</div>
          </div>
          <div className="border-l border-border pl-4">
            <div className="text-xs text-creamD mb-0.5">เหลืออีก</div>
            <div className="font-mono text-sm" style={{ color: periodColor }}>{info.daysRemaining} วัน</div>
          </div>

          {/* Progress bar */}
          <div className="w-full mt-2">
            <div className="h-1.5 rounded-full bg-bg3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (info.daysElapsed / info.daysTotal) * 100)}%`,
                  background: periodColor,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Days selector */}
      <div className="mb-5 flex items-center gap-3">
        <span className="text-creamD text-sm">คำนวณสำหรับ</span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 7].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: days === d ? periodColor : 'var(--bg3)',
                color: days === d ? '#0f0b06' : 'var(--creamD)',
                border: `1px solid ${days === d ? periodColor : 'var(--border)'}`,
              }}
            >
              {d} วัน
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={e => setDays(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 text-center bg-bg3 border border-border rounded-lg px-2 py-1 text-cream text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <span className="text-creamD text-sm">วัน</span>
      </div>

      {/* Large SKU group */}
      <section className="mb-6">
        <h2 className="text-gold font-semibold text-lg mb-3 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full inline-block" style={{ background: '#C9A84C' }} />
          กลุ่มใหญ่
        </h2>
        <div className="bg-bg1 rounded-xl border border-border overflow-x-auto">
          <table className="w-full min-w-[580px]">
            <thead>
              <tr className="border-b border-border text-creamD text-xs uppercase tracking-wide">
                <th className="py-2.5 px-3 text-left">SKU</th>
                <th className="py-2.5 px-3 text-center">BL/วัน</th>
                <th className="py-2.5 px-3 text-center">×M</th>
                <th className="py-2.5 px-3 text-center">เป้า ({days}วัน)</th>
                <th className="py-2.5 px-3 text-center">มีอยู่</th>
                <th className="py-2.5 px-3 text-center">ต้องทำเพิ่ม</th>
              </tr>
            </thead>
            <tbody>
              {SKU_GROUPS.large.map(sku => (
                <StockRow
                  key={sku}
                  sku={sku}
                  periodKey={period.key}
                  days={days}
                  stock={state.currentStock[sku] ?? 0}
                  onStockChange={setStock}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Small SKU group */}
      <section className="mb-6">
        <h2 className="text-gold font-semibold text-lg mb-3 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full inline-block" style={{ background: '#3DA876' }} />
          กลุ่มเล็ก (หน่วย: เตา)
        </h2>
        <div className="bg-bg1 rounded-xl border border-border overflow-x-auto">
          <table className="w-full min-w-[580px]">
            <thead>
              <tr className="border-b border-border text-creamD text-xs uppercase tracking-wide">
                <th className="py-2.5 px-3 text-left">SKU</th>
                <th className="py-2.5 px-3 text-center">BL/วัน</th>
                <th className="py-2.5 px-3 text-center">×M</th>
                <th className="py-2.5 px-3 text-center">เป้า ({days}วัน)</th>
                <th className="py-2.5 px-3 text-center">มีอยู่</th>
                <th className="py-2.5 px-3 text-center">ต้องทำเพิ่ม</th>
              </tr>
            </thead>
            <tbody>
              {SKU_GROUPS.small.map(sku => (
                <StockRow
                  key={sku}
                  sku={sku}
                  periodKey={period.key}
                  days={days}
                  stock={state.currentStock[sku] ?? 0}
                  onStockChange={setStock}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* กวนถั่ว section */}
      <section className="mb-6">
        <h2 className="text-gold font-semibold text-lg mb-3 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full inline-block" style={{ background: '#FBBF24' }} />
          กวนถั่ว (Leading Indicator)
        </h2>
        <div className="bg-bg1 rounded-xl border border-border p-4 flex flex-wrap gap-6 items-center">
          <div>
            <div className="text-xs text-creamD mb-1">มีที่กวนอยู่ (ที่)</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={kwanInput === 0 ? '' : kwanInput}
                placeholder="0"
                onChange={e => setKwanInput(Number(e.target.value) || 0)}
                className="w-24 text-center bg-bg3 border border-border rounded px-2 py-1.5 text-cream focus:outline-none focus:border-gold"
              />
              <button
                onClick={handleKwanSave}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-bg3 border border-border text-creamD hover:border-gold hover:text-gold transition-colors"
              >
                บันทึก
              </button>
            </div>
          </div>
          <div className="border-l border-border pl-6">
            <div className="text-xs text-creamD mb-1">เป้าช่วงนี้ (weighted avg)</div>
            <div className="text-cream font-mono text-xl font-semibold">{kwanTarget} ที่</div>
          </div>
          <div className="border-l border-border pl-6">
            <div className="text-xs text-creamD mb-1">ต้องกวนเพิ่ม</div>
            {kwanNeed <= 0 ? (
              <div className="text-jade font-semibold">✓ เพียงพอแล้ว</div>
            ) : (
              <div className="font-semibold text-xl" style={{ color: '#FBBF24' }}>{kwanNeed} ที่</div>
            )}
          </div>
          <div className="ml-auto text-xs text-creamD italic max-w-xs text-right">
            กวนถั่วเป็น leading indicator — ยิ่งมีมากก็ยิ่งรองรับยอดได้
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div className="text-xs text-creamD text-center pb-2">
        ข้อมูล "มีอยู่" บันทึกใน localStorage — รีเฟรชหน้าไม่หาย
      </div>
    </div>
  );
}
