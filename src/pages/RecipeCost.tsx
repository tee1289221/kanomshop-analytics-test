import { useState, useEffect } from 'react';
import { ALL_SKUS, SKU_GROUPS } from '../data/constants';
import { loadState, saveState } from '../lib/storage';

interface RecipeEntry {
  batchCost: number;
  batchQty: number;
}

function costPerUnit(e: RecipeEntry): number {
  if (e.batchQty <= 0) return 0;
  return e.batchCost / e.batchQty;
}

export default function RecipeCost() {
  const [recipes, setRecipes] = useState<Record<string, RecipeEntry>>({});
  const [selected, setSelected] = useState(ALL_SKUS[0]);
  const [copied, setCopied] = useState<string | null>(null);
  const [group, setGroup] = useState<'large' | 'small'>('large');

  useEffect(() => {
    const state = loadState();
    const loaded: Record<string, RecipeEntry> = {};
    for (const sku of ALL_SKUS) {
      const cost = state.recipeCosts[sku] ?? 0;
      loaded[sku] = { batchCost: 0, batchQty: 1 };
      if (cost > 0) loaded[sku] = { batchCost: cost, batchQty: 1 };
    }
    setRecipes(loaded);
  }, []);

  const getEntry = (sku: string): RecipeEntry => recipes[sku] ?? { batchCost: 0, batchQty: 1 };

  const updateEntry = (sku: string, patch: Partial<RecipeEntry>) => {
    setRecipes(prev => {
      const entry = { ...getEntry(sku), ...patch };
      const next = { ...prev, [sku]: entry };

      // persist cost/unit to localStorage
      const state = loadState();
      state.recipeCosts[sku] = costPerUnit(entry);
      saveState(state);

      return next;
    });
  };

  const handleCopy = (sku: string) => {
    const cpu = costPerUnit(getEntry(sku));
    navigator.clipboard.writeText(cpu.toFixed(2)).catch(() => {});
    setCopied(sku);
    setTimeout(() => setCopied(null), 1800);
  };

  const skuList = group === 'large' ? SKU_GROUPS.large : SKU_GROUPS.small;
  const entry = getEntry(selected);
  const cpu = costPerUnit(entry);

  return (
    <div className="min-h-screen bg-bg0 text-cream font-sarabun px-4 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gold mb-1">Recipe Cost</h1>
        <p className="text-creamD text-sm">ต้นทุนต่อชิ้น — ตั้งค่าครั้งเดียว บันทึก localStorage รายชนิด</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT — SKU list */}
        <div className="lg:col-span-2">
          {/* Group tabs */}
          <div className="flex gap-1.5 mb-3">
            {(['large','small'] as const).map(g => (
              <button
                key={g}
                onClick={() => { setGroup(g); setSelected(g === 'large' ? SKU_GROUPS.large[0] : SKU_GROUPS.small[0]); }}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: group === g ? 'var(--gold)' : 'var(--bg3)',
                  color: group === g ? '#0f0b06' : 'var(--creamD)',
                  border: `1px solid ${group === g ? 'var(--gold)' : 'var(--border)'}`,
                }}
              >
                {g === 'large' ? 'กลุ่มใหญ่' : 'กลุ่มเล็ก'}
              </button>
            ))}
          </div>

          <div className="bg-bg1 border border-border rounded-xl overflow-hidden">
            {skuList.map(sku => {
              const e = getEntry(sku);
              const c = costPerUnit(e);
              const hasData = e.batchCost > 0 && e.batchQty > 0;
              const active = selected === sku;
              return (
                <button
                  key={sku}
                  onClick={() => setSelected(sku)}
                  className="w-full flex justify-between items-center px-4 py-3 border-b border-border last:border-0 transition-colors text-left"
                  style={{ background: active ? '#C9A84C15' : 'transparent' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: hasData ? 'var(--jade)' : 'var(--border)' }}
                    />
                    <span className={`text-sm font-medium ${active ? 'text-gold' : 'text-cream'}`}>{sku}</span>
                  </div>
                  {hasData && (
                    <span className="font-mono text-xs text-creamD">฿{c.toFixed(2)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — editor + result */}
        <div className="lg:col-span-3 space-y-4">

          {/* Editor */}
          <div className="bg-bg1 border border-border rounded-xl p-5">
            <h2 className="text-gold font-semibold mb-4 flex items-center gap-2">
              {selected}
              <span className="text-xs font-normal text-creamD">— กรอกข้อมูล batch</span>
            </h2>

            <div className="space-y-4">
              {/* Batch cost */}
              <div>
                <label className="text-creamD text-sm block mb-1.5">ต้นทุนรวมต่อ batch (บาท)</label>
                <div className="flex items-center gap-2">
                  <span className="text-creamD text-sm">฿</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={entry.batchCost || ''}
                    placeholder="0"
                    onChange={e => updateEntry(selected, { batchCost: Number(e.target.value) || 0 })}
                    className="w-40 bg-bg3 border border-border rounded-lg px-3 py-2 text-cream font-mono focus:outline-none focus:border-gold text-sm"
                  />
                </div>
              </div>

              {/* Batch qty */}
              <div>
                <label className="text-creamD text-sm block mb-1.5">ได้กี่ชิ้น (จาก batch นี้)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={entry.batchQty || ''}
                    placeholder="1"
                    onChange={e => updateEntry(selected, { batchQty: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-32 bg-bg3 border border-border rounded-lg px-3 py-2 text-cream font-mono focus:outline-none focus:border-gold text-sm"
                  />
                  <span className="text-creamD text-sm">ชิ้น</span>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="mt-5 rounded-xl bg-bg2 border border-border px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-creamD mb-0.5">ต้นทุนต่อชิ้น</div>
                <div className="text-3xl font-bold font-mono text-gold">
                  {cpu > 0 ? `฿${cpu.toFixed(2)}` : <span className="text-creamD text-xl">—</span>}
                </div>
                {cpu > 0 && (
                  <div className="text-xs text-creamD mt-1">
                    = ฿{entry.batchCost} ÷ {entry.batchQty} ชิ้น
                  </div>
                )}
              </div>
              <button
                disabled={cpu <= 0}
                onClick={() => handleCopy(selected)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: copied === selected ? 'var(--jade)' : 'var(--gold)',
                  color: '#0f0b06',
                }}
              >
                {copied === selected ? '✓ Copied!' : 'Copy ฿'}
              </button>
            </div>

            <p className="text-xs text-creamD/60 mt-2">
              กด Copy แล้ว paste ลงช่อง "ต้นทุนดิบ" ใน Price Calculator ได้เลย
            </p>
          </div>

          {/* Summary table */}
          <div className="bg-bg1 border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-gold font-semibold text-sm">
              สรุปต้นทุน/ชิ้น ทุก SKU ที่กรอกแล้ว
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-creamD text-xs uppercase tracking-wide">
                  <th className="py-2.5 px-4 text-left">SKU</th>
                  <th className="py-2.5 px-4 text-center">Batch (฿)</th>
                  <th className="py-2.5 px-4 text-center">ชิ้น</th>
                  <th className="py-2.5 px-4 text-center">ต้นทุน/ชิ้น</th>
                  <th className="py-2.5 px-4 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {ALL_SKUS.filter(sku => {
                  const e = getEntry(sku);
                  return e.batchCost > 0;
                }).map(sku => {
                  const e = getEntry(sku);
                  const c = costPerUnit(e);
                  return (
                    <tr key={sku} className="border-b border-border hover:bg-bg2 transition-colors">
                      <td className="py-2.5 px-4 text-sm font-medium text-cream">{sku}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-sm text-creamD">฿{e.batchCost}</td>
                      <td className="py-2.5 px-4 text-center font-mono text-sm text-creamD">{e.batchQty}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-gold">฿{c.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleCopy(sku)}
                          className="text-xs px-2 py-0.5 rounded border transition-colors"
                          style={{
                            color: copied === sku ? 'var(--jade)' : 'var(--creamD)',
                            borderColor: copied === sku ? 'var(--jade)' : 'var(--border)',
                          }}
                        >
                          {copied === sku ? '✓' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {ALL_SKUS.filter(sku => getEntry(sku).batchCost > 0).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-creamD text-sm">
                      ยังไม่มีข้อมูล — กรอก batch cost ด้านบนแล้วระบบจะบันทึกอัตโนมัติ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
