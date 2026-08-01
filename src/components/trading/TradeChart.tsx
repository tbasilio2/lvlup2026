import { useMemo } from "react";
import { format } from "date-fns";
import type { Trade } from "@/hooks/useTrades";

interface Props {
  trade: Trade;
  height?: number;
}

type Level = { key: string; label: string; price: number; color: string; dash?: boolean };

/**
 * Trade Map — plots the trade's price structure on a price/time canvas:
 * entry, stop-loss, take-profit and the realised path from entry to exit.
 */
const TradeChart = ({ trade, height = 240 }: Props) => {
  const sl = (trade as any).stop_loss as number | null | undefined;
  const tp = (trade as any).take_profit as number | null | undefined;

  const model = useMemo(() => {
    const prices = [trade.entry_price];
    if (trade.exit_price != null) prices.push(trade.exit_price);
    if (sl != null) prices.push(sl);
    if (tp != null) prices.push(tp);

    let min = Math.min(...prices);
    let max = Math.max(...prices);
    if (min === max) { min -= min * 0.001 || 1; max += max * 0.001 || 1; }
    const pad = (max - min) * 0.18;
    min -= pad; max += pad;

    const levels: Level[] = [
      { key: "entry", label: "Entry", price: trade.entry_price, color: "hsl(var(--primary))" },
    ];
    if (sl != null) levels.push({ key: "sl", label: "Stop Loss", price: sl, color: "hsl(var(--loss))", dash: true });
    if (tp != null) levels.push({ key: "tp", label: "Take Profit", price: tp, color: "hsl(var(--profit))", dash: true });
    if (trade.exit_price != null) {
      levels.push({
        key: "exit",
        label: "Exit",
        price: trade.exit_price,
        color: (trade.pnl ?? 0) >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))",
      });
    }

    const risk = sl != null ? Math.abs(trade.entry_price - sl) : null;
    const reward = tp != null ? Math.abs(tp - trade.entry_price) : null;
    const rr = risk && reward ? reward / risk : null;
    const realisedR =
      risk && trade.exit_price != null
        ? ((trade.direction === "long" ? trade.exit_price - trade.entry_price : trade.entry_price - trade.exit_price) / risk)
        : null;

    return { min, max, levels, rr, realisedR };
  }, [trade, sl, tp]);

  const W = 100; // viewBox units (percent-based, responsive)
  const y = (price: number) => ((model.max - price) / (model.max - model.min)) * 100;

  const entryY = y(trade.entry_price);
  const exitY = trade.exit_price != null ? y(trade.exit_price) : null;
  const slY = sl != null ? y(sl) : null;
  const tpY = tp != null ? y(tp) : null;

  const x1 = 6;   // entry x
  const x2 = 82;  // exit x

  const decimals = trade.entry_price < 10 ? 5 : trade.entry_price < 1000 ? 3 : 2;
  const fmt = (n: number) => n.toFixed(decimals);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-foreground">{trade.symbol}</span>
          <span className={`text-[10px] font-mono uppercase ${trade.direction === "long" ? "text-profit" : "text-loss"}`}>
            {trade.direction}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          {model.rr != null && <span>R:R {model.rr.toFixed(2)}</span>}
          {model.realisedR != null && (
            <span className={model.realisedR >= 0 ? "text-profit" : "text-loss"}>
              {model.realisedR >= 0 ? "+" : ""}{model.realisedR.toFixed(2)}R
            </span>
          )}
        </div>
      </div>

      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${W} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {/* target zone */}
          {tpY != null && (
            <rect
              x={x1} y={Math.min(entryY, tpY)} width={x2 - x1} height={Math.abs(entryY - tpY)}
              fill="hsl(var(--profit))" opacity={0.1}
            />
          )}
          {/* risk zone */}
          {slY != null && (
            <rect
              x={x1} y={Math.min(entryY, slY)} width={x2 - x1} height={Math.abs(entryY - slY)}
              fill="hsl(var(--loss))" opacity={0.1}
            />
          )}

          {/* level lines */}
          {model.levels.filter((l) => l.key !== "exit").map((l) => (
            <line
              key={l.key}
              x1={x1} x2={W} y1={y(l.price)} y2={y(l.price)}
              stroke={l.color} strokeWidth={0.4}
              strokeDasharray={l.dash ? "1.5 1.5" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* price path entry -> exit */}
          {exitY != null && (
            <line
              x1={x1} y1={entryY} x2={x2} y2={exitY}
              stroke={(trade.pnl ?? 0) >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"}
              strokeWidth={0.8} vectorEffect="non-scaling-stroke"
            />
          )}
          <circle cx={x1} cy={entryY} r={0.9} fill="hsl(var(--primary))" />
          {exitY != null && (
            <circle cx={x2} cy={exitY} r={0.9} fill={(trade.pnl ?? 0) >= 0 ? "hsl(var(--profit))" : "hsl(var(--loss))"} />
          )}
        </svg>

        {/* price labels */}
        {model.levels.map((l) => (
          <div
            key={l.key}
            className="absolute right-1 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-background/80 backdrop-blur-sm border"
            style={{ top: `${y(l.price)}%`, color: l.color, borderColor: l.color }}
          >
            {l.label} {fmt(l.price)}
          </div>
        ))}

        {(sl == null || tp == null) && (
          <div className="absolute bottom-1 left-2 text-[9px] text-muted-foreground font-mono">
            {sl == null && tp == null ? "Add stop-loss & take-profit to plot your levels" : sl == null ? "No stop-loss set" : "No take-profit set"}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-[9px] font-mono text-muted-foreground">
        <span>{format(new Date(trade.entry_date), "MMM d, HH:mm")}</span>
        <span>{trade.exit_date ? format(new Date(trade.exit_date), "MMM d, HH:mm") : "open"}</span>
      </div>
    </div>
  );
};

export default TradeChart;
