import type { BreakdownRow } from "@/hooks/useTradeAnalytics";

interface Props { title: string; rows: BreakdownRow[] }

const BreakdownTable = ({ title, rows }: Props) => {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="text-left py-1.5 px-2 font-medium">Key</th>
              <th className="text-right py-1.5 px-2 font-medium">N</th>
              <th className="text-right py-1.5 px-2 font-medium">Win%</th>
              <th className="text-right py-1.5 px-2 font-medium">Net</th>
              <th className="text-right py-1.5 px-2 font-medium">Exp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 px-2 text-foreground">{r.key}</td>
                <td className="py-1.5 px-2 text-right text-muted-foreground">{r.trades}</td>
                <td className="py-1.5 px-2 text-right text-foreground">{r.winRate.toFixed(0)}%</td>
                <td className={`py-1.5 px-2 text-right font-bold ${r.netPnl >= 0 ? "text-profit" : "text-loss"}`}>
                  {r.netPnl >= 0 ? "+" : ""}{r.netPnl.toFixed(2)}
                </td>
                <td className={`py-1.5 px-2 text-right ${r.expectancy >= 0 ? "text-profit" : "text-loss"}`}>
                  {r.expectancy >= 0 ? "+" : ""}{r.expectancy.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BreakdownTable;
