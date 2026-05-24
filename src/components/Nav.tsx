export type Page = 'dashboard' | 'yoy' | 'forecast' | 'price' | 'recipe';

interface NavItem { id: Page; label: string; sub: string }

const ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',       sub: 'วันนี้ต้องทำอะไร' },
  { id: 'yoy',       label: 'YoY Analytics',   sub: 'ข้อมูลย้อนหลัง' },
  { id: 'forecast',  label: 'Forecast',         sub: 'แผนการผลิตปีนี้' },
  { id: 'price',     label: 'Price Calculator', sub: 'คำนวณราคา' },
  { id: 'recipe',    label: 'Recipe Cost',      sub: 'ต้นทุนต่อชิ้น' },
];

interface Props { current: Page; onChange: (p: Page) => void }

export default function Nav({ current, onChange }: Props) {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg0/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Brand */}
          <span className="text-gold font-bold text-base shrink-0 mr-3 py-3">
            ร้านขนม
          </span>

          {ITEMS.map(item => {
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className="relative shrink-0 px-3 py-3 text-sm transition-colors group"
                style={{ color: active ? 'var(--gold)' : 'var(--creamD)' }}
              >
                <span className="font-medium">{item.label}</span>
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t transition-all"
                  style={{ background: active ? 'var(--gold)' : 'transparent' }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
