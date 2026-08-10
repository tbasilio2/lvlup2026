import { useMemo } from "react";
import { Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";
import { formatMoney } from "@/lib/currency";

interface StratStat {
  key: string;
  trades: number;
  wins: number;
  winRate: number;
  netPnl: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  profitFactor: number;
  score: number;
}

const MIN_SAMPLE = 5;

const buildStats = (trades: Trade[]): StratStat[] => {
  const closed = trades.filter((t) => t.pnl != null && t.exit_date);
  const map = new Map<string, Trade[]>();
  closed.forEach((t) => {
    const k = (t.strategy || "").trim() || "Unspecified";
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  });

  return Array.from(map.entries())
    .map(([key, ts]) => {
      const wins = ts.filter((t) => t.pnl! > 0);
      const losses = ts.filter((t) => t.pnl! < 0);
      const netPnl = ts.reduce((s, t) => s + t.pnl!, 0);
      const winRate = (wins.length / ts.length) * 100;
      const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl!, 0) / wins.length : 0;
      const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl!, 0) / losses.length) : 0;
      const grossProfit = wins.reduce((s, t) => s + t.pnl!, 0);
      const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl!, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
      const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;
      // Confidence-weighted expectancy: small samples get discounted.
      const confidence = ts.length / (ts.length + MIN_SAMPLE);
      const score = expectancy * confidence;
      return { key, trades: ts.length, wins: wins.length, winRate, netPnl, avgWin, avgLoss, expectancy, profitFactor, score };
    })
    .sort((a, b) => b.score - a.score);
};

const pf = (v: number) => (v === Infinity ? "∞" : v.toFixed(2));

/** Ranks every strategy by confidence-weighted expectancy and highlights the best one. */
const StrategyPerformance = ({ trades }: { trades: Trade[] }) => {
  const stats = useMemo(() => buildStats(trades), [trades]);

  if (stats.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">No closed trades yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Tag your trades with a setup to compare strategy performance.</p>
      </div>
    );
  }

  const best = stats[0];
  const worst = stats[stats.length - 1];
  const thin = best.trades < MIN_SAMPLE;
  const maxAbs = Math.max(...stats.map((s) => Math.abs(s.netPnl)), 1);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-primary">Recommended setup</span>
        </div>
        <p className="text-lg font-semibold text-foreground">{best.key}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {best.winRate.toFixed(0)}% win rate over {best.trades} trade{best.trades === 1 ? "" : "s"} ·{" "}
          expectancy {formatMoney(best.expectancy, { signed: true })}/trade · profit factor {pf(best.profitFactor)}
        </p>
        {thin && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 mt-2">
            <AlertTriangle className="h-3 w-3" /> Small sample — log at least {MIN_SAMPLE} trades for a reliable read.
          </p>
        )}
        {!thin && stats.length > 1 && worst.expectancy < 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-loss mt-2">
            <TrendingUp className="h-3 w-3 rotate-180" /> "{worst.key}" is losing {formatMoney(Math.abs(worst.expectancy))} per trade — consider cutting it.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">Strategy performance</h3>
        <div className="space-y-3">
          {stats.map((s, i) => (
            <div key={s.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-foreground truncate">
                  <span className="font-mono text-[10px] text-muted-foreground mr-2">#{i + 1}</span>
                  {s.key}
                </span>
                <span className={`font-mono text-sm font-bold ${s.netPnl >= 0 ? "text-profit" : "text-loss"}`}>
                  {formatMoney(s.netPnl, { signed: true })}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.netPnl >= 0 ? "bg-profit" : "bg-loss"}`}
                  style={{ width: `${Math.max((Math.abs(s.netPnl) / maxAbs) * 100, 3)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] font-mono text-muted-foreground">
                <span>{s.trades} trades</span>
                <span>{s.winRate.toFixed(0)}% win</span>
                <span>PF {pf(s.profitFactor)}</span>
                <span className={s.expectancy >= 0 ? "text-profit" : "text-loss"}>
                  Exp {formatMoney(s.expectancy, { signed: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StrategyPerformance;
