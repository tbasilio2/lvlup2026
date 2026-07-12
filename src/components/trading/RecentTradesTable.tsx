import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";
import { formatMoney } from "@/lib/currency";

const RecentTradesTable = ({ trades }: { trades: Trade[] }) => {
  const recent = trades.slice(0, 8);
  if (recent.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-[0.14em] font-mono">Recent Trades</h3>
        <span className="text-[10px] text-muted-foreground font-mono">{trades.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
              <th className="text-left px-4 py-2 font-medium">Close</th>
              <th className="text-left px-4 py-2 font-medium">Symbol</th>
              <th className="text-left px-4 py-2 font-medium">Dir</th>
              <th className="text-right px-4 py-2 font-medium">Qty</th>
              <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Entry</th>
              <th className="text-right px-4 py-2 font-medium hidden sm:table-cell">Exit</th>
              <th className="text-right px-4 py-2 font-medium">P&L</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {recent.map((t) => {
              const isWin = (t.pnl ?? 0) > 0;
              const isLoss = (t.pnl ?? 0) < 0;
              return (
                <tr key={t.id} className="border-t border-border/60 hover:bg-secondary/40 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {format(new Date(t.exit_date ?? t.entry_date), "MMM d")}
                  </td>
                  <td className="px-4 py-2.5 text-foreground font-semibold">{t.symbol}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-0.5 ${t.direction === "long" ? "text-profit" : "text-loss"}`}>
                      {t.direction === "long" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {t.direction}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-foreground">{t.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">{t.entry_price}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground hidden sm:table-cell">{t.exit_price ?? "—"}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${isWin ? "text-profit" : isLoss ? "text-loss" : "text-muted-foreground"}`}>
                    {t.pnl != null ? formatMoney(t.pnl, { signed: true }) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentTradesTable;
