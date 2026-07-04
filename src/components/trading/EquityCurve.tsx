import { useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import type { Trade } from "@/hooks/useTrades";
import DayTradesDialog from "./DayTradesDialog";

interface Props {
  trades: Trade[];
}

const EquityCurve = ({ trades }: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, tradeById } = useMemo(() => {
    const closed = trades
      .filter((t) => t.pnl != null && t.exit_date)
      .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());

    let cumulative = 0;
    const map: Record<string, Trade> = {};
    const points = closed.map((t) => {
      cumulative += t.pnl!;
      map[t.id] = t;
      return {
        id: t.id,
        date: format(new Date(t.exit_date!), "MMM d"),
        symbol: t.symbol,
        pnl: cumulative,
      };
    });
    return { data: points, tradeById: map };
  }, [trades]);

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Need at least 2 closed trades to show equity curve</p>
      </div>
    );
  }

  const isPositive = data[data.length - 1]?.pnl >= 0;
  const stroke = isPositive ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)";

  const selectedTrade = selectedId ? tradeById[selectedId] : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Equity Curve</h3>
        <span className="text-[10px] text-muted-foreground font-mono">Click a point</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono" }} />
          <Tooltip
            contentStyle={{
              background: "hsl(220, 18%, 12%)",
              border: "1px solid hsl(220, 15%, 15%)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "JetBrains Mono",
            }}
            labelStyle={{ color: "hsl(210, 20%, 93%)" }}
            formatter={(v: number) => [v.toFixed(2), "Cumulative P&L"]}
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={stroke}
            fill="url(#equityGrad)"
            strokeWidth={2}
            name="Cumulative P&L"
            dot={{ r: 3, fill: stroke, stroke: "hsl(220, 18%, 12%)", strokeWidth: 1, style: { cursor: "pointer" } }}
            activeDot={{
              r: 6,
              fill: stroke,
              stroke: "hsl(210, 20%, 93%)",
              strokeWidth: 2,
              style: { cursor: "pointer" },
              onClick: (_: unknown, payload: { payload?: { id?: string } }) => {
                const id = payload?.payload?.id;
                if (id) setSelectedId(id);
              },
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <DayTradesDialog
        open={selectedTrade !== null}
        onOpenChange={(o) => !o && setSelectedId(null)}
        title={selectedTrade ? `${selectedTrade.symbol} · ${format(new Date(selectedTrade.exit_date!), "MMM d, yyyy HH:mm")}` : ""}
        trades={selectedTrade ? [selectedTrade] : []}
      />
    </div>
  );
};

export default EquityCurve;
