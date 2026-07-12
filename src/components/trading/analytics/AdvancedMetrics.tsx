import type { TradeAnalytics } from "@/hooks/useTradeAnalytics";
import { formatMoney } from "@/lib/currency";

interface Props { a: TradeAnalytics }

const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "∞");

const AdvancedMetrics = ({ a }: Props) => {
  const items = [
    { label: "Expectancy", value: formatMoney(a.expectancy, { signed: true }), positive: a.expectancy >= 0 },
    { label: "Profit Factor", value: fmt(a.profitFactor), positive: a.profitFactor >= 1 },
    { label: "Avg R", value: `${a.avgR >= 0 ? "+" : ""}${fmt(a.avgR)}R`, positive: a.avgR >= 0 },
    { label: "Max DD", value: `${formatMoney(a.maxDrawdown)} (${fmt(a.maxDrawdownPct, 1)}%)`, positive: false },
    {
      label: "Current Streak",
      value: a.currentStreak.type === "none" ? "—" : `${a.currentStreak.count} ${a.currentStreak.type === "win" ? "W" : "L"}`,
      positive: a.currentStreak.type === "win" ? true : a.currentStreak.type === "loss" ? false : null,
    },
    { label: "Longest W / L", value: `${a.longestWinStreak} / ${a.longestLossStreak}`, positive: null },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{it.label}</p>
          <p className={`text-sm font-bold font-mono mt-0.5 ${
            it.positive === null ? "text-foreground" : it.positive ? "text-profit" : "text-loss"
          }`}>{it.value}</p>
        </div>
      ))}
    </div>
  );
};

export default AdvancedMetrics;
