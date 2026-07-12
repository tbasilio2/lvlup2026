import type { TradeAnalytics } from "@/hooks/useTradeAnalytics";
import { formatMoney } from "@/lib/currency";

const LongShortCompare = ({ a }: { a: TradeAnalytics }) => (
  <div className="grid grid-cols-2 gap-2">
    {a.longVsShort.map((s) => (
      <div key={s.side} className="rounded-xl border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-2">{s.side === "long" ? "Long" : "Short"}</p>
        <div className="space-y-1 font-mono text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Trades</span><span className="text-foreground">{s.trades}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Win Rate</span><span className="text-foreground">{s.winRate.toFixed(1)}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Net P&L</span><span className={`font-bold ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>{formatMoney(s.pnl, { signed: true })}</span></div>
        </div>
      </div>
    ))}
  </div>
);

export default LongShortCompare;
