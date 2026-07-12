import { useMemo } from "react";
import type { Trade } from "@/hooks/useTrades";
import { formatMoney } from "@/lib/currency";

interface Props {
  trades: Trade[];
}

const TradeStats = ({ trades }: Props) => {
  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.pnl != null);
    const wins = closed.filter((t) => t.pnl! > 0);
    const losses = closed.filter((t) => t.pnl! < 0);
    const totalPnl = closed.reduce((s, t) => s + t.pnl!, 0);
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl!, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl!, 0) / losses.length) : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;
    const openCount = trades.filter((t) => t.status === "open").length;

    return { totalPnl, winRate, avgWin, avgLoss, rr, total: closed.length, openCount };
  }, [trades]);

  const items = [
    { label: "Total P&L", value: formatMoney(stats.totalPnl, { signed: true }), positive: stats.totalPnl >= 0 },
    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, positive: stats.winRate >= 50 },
    { label: "Avg Win", value: formatMoney(stats.avgWin, { signed: true }), positive: true },
    { label: "Avg Loss", value: `-${formatMoney(stats.avgLoss).replace(/^R/, "R")}`.replace("--", "-"), positive: false },
    { label: "Risk:Reward", value: `1:${stats.rr.toFixed(2)}`, positive: null },
    { label: "Trades", value: `${stats.total} closed · ${stats.openCount} open`, positive: null },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{item.label}</p>
          <p className={`text-sm font-bold font-mono mt-0.5 ${
            item.positive === null ? "text-foreground" : item.positive ? "text-profit" : "text-loss"
          }`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export default TradeStats;
