import type { TradeAnalytics } from "@/hooks/useTradeAnalytics";
import { formatMoney } from "@/lib/currency";

const MONTHS = ["J","F","M","A","M","J","J","A","S","O","N","D"];

const MonthlyHeatmap = ({ a }: { a: TradeAnalytics }) => {
  if (a.monthly.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">No closed trades yet</p>
      </div>
    );
  }
  const years = Array.from(new Set(a.monthly.map((m) => m.year))).sort();
  const map = new Map(a.monthly.map((m) => [`${m.year}-${m.month}`, m]));
  const max = Math.max(...a.monthly.map((m) => Math.abs(m.pnl)), 1);

  const cellColor = (pnl: number) => {
    const intensity = Math.min(1, Math.abs(pnl) / max);
    const alpha = 0.15 + intensity * 0.7;
    return pnl > 0
      ? `hsl(160, 84%, 39%, ${alpha})`
      : pnl < 0 ? `hsl(0, 72%, 51%, ${alpha})` : "hsl(220, 15%, 15%)";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">Monthly P&L</h3>
      <div className="space-y-1.5">
        <div className="grid grid-cols-[36px_repeat(12,1fr)] gap-1 text-[9px] font-mono text-muted-foreground">
          <div />
          {MONTHS.map((m, i) => <div key={i} className="text-center">{m}</div>)}
        </div>
        {years.map((y) => (
          <div key={y} className="grid grid-cols-[36px_repeat(12,1fr)] gap-1 items-center">
            <div className="text-[10px] font-mono text-muted-foreground">{y}</div>
            {Array.from({ length: 12 }, (_, m) => {
              const cell = map.get(`${y}-${m}`);
              return (
                <div
                  key={m}
                  className="aspect-square rounded-sm border border-border/40 flex items-center justify-center text-[8px] font-mono"
                  style={{ background: cell ? cellColor(cell.pnl) : "hsl(220, 15%, 10%)" }}
                  title={cell ? `${y}-${String(m + 1).padStart(2, "0")}: ${formatMoney(cell.pnl, { signed: true })} (${cell.trades})` : ""}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyHeatmap;
