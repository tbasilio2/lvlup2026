import { useMemo } from "react";
import { ArrowUpRight, Target, Scale, Flame } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";
import { formatMoney } from "@/lib/currency";

const TradeHeroStats = ({ trades }: { trades: Trade[] }) => {
  const stats = useMemo(() => {
    const closed = trades
      .filter((t) => t.pnl != null)
      .sort((a, b) => new Date(a.exit_date ?? a.entry_date).getTime() - new Date(b.exit_date ?? b.entry_date).getTime());
    const wins = closed.filter((t) => t.pnl! > 0);
    const losses = closed.filter((t) => t.pnl! < 0);
    const totalPnl = closed.reduce((s, t) => s + t.pnl!, 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl!, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl!, 0) / losses.length) : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;

    // current streak (from end)
    let streak = 0;
    let streakWin: boolean | null = null;
    for (let i = closed.length - 1; i >= 0; i--) {
      const w = closed[i].pnl! > 0;
      if (streakWin === null) {
        streakWin = w;
        streak = 1;
      } else if (w === streakWin) streak++;
      else break;
    }
    return { totalPnl, winRate, rr, streak, streakWin, wins: wins.length, losses: losses.length };
  }, [trades]);

  const cards = [
    {
      label: "Result",
      value: formatMoney(stats.totalPnl, { signed: true }),
      sub: "Net P&L",
      icon: ArrowUpRight,
      tone: stats.totalPnl >= 0 ? "profit" : "loss",
    },
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(0)}%`,
      sub: `${stats.wins}W · ${stats.losses}L`,
      icon: Target,
      tone: "neutral",
    },
    {
      label: "Avg RR",
      value: stats.rr > 0 ? stats.rr.toFixed(2) : "—",
      sub: "Reward : Risk",
      icon: Scale,
      tone: "neutral",
    },
    {
      label: "Streak",
      value: stats.streak ? `${stats.streak}` : "—",
      sub: stats.streakWin === null ? "No trades" : stats.streakWin ? "Wins" : "Losses",
      icon: Flame,
      tone: stats.streakWin === null ? "neutral" : stats.streakWin ? "profit" : "loss",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, sub, icon: Icon, tone }) => (
        <div
          key={label}
          className="relative rounded-2xl border border-border bg-card p-4 overflow-hidden group hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] font-mono">{label}</p>
            <div className={`p-1.5 rounded-lg ${
              tone === "profit" ? "bg-profit/10 text-profit" :
              tone === "loss" ? "bg-loss/10 text-loss" :
              "bg-primary/10 text-primary"
            }`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className={`text-2xl lg:text-3xl font-bold font-mono tracking-tight ${
            tone === "profit" ? "text-profit" : tone === "loss" ? "text-loss" : "text-foreground"
          }`}>
            {value}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono mt-1">{sub}</p>
          <div className={`absolute -bottom-8 -right-8 h-24 w-24 rounded-full blur-3xl opacity-20 ${
            tone === "profit" ? "bg-profit" : tone === "loss" ? "bg-loss" : "bg-primary"
          }`} />
        </div>
      ))}
    </div>
  );
};

export default TradeHeroStats;
