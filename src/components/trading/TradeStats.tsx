import { useMemo } from "react";
import type { Trade } from "@/hooks/useTrades";

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
    { label: "Total P&L", value: `${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)}`, color: stats.totalPnl >= 0 ? "text-emerald-600" : "text-red-500" },
    { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? "text-emerald-600" : "text-red-500" },
    { label: "Avg Win", value: `+${stats.avgWin.toFixed(2)}`, color: "text-emerald-600" },
    { label: "Avg Loss", value: `-${stats.avgLoss.toFixed(2)}`, color: "text-red-500" },
    { label: "Risk:Reward", value: `1:${stats.rr.toFixed(2)}`, color: "text-foreground" },
    { label: "Trades", value: `${stats.total} closed · ${stats.openCount} open`, color: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
          <p className={`text-sm font-bold mt-0.5 ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export default TradeStats;
