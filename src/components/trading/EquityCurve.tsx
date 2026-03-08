import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import type { Trade } from "@/hooks/useTrades";

interface Props {
  trades: Trade[];
}

const EquityCurve = ({ trades }: Props) => {
  const data = useMemo(() => {
    const closed = trades
      .filter((t) => t.pnl != null && t.exit_date)
      .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());

    let cumulative = 0;
    return closed.map((t) => {
      cumulative += t.pnl!;
      return {
        date: format(new Date(t.exit_date!), "MMM d"),
        fullDate: t.exit_date,
        pnl: cumulative,
      };
    });
  }, [trades]);

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Need at least 2 closed trades to show equity curve</p>
      </div>
    );
  }

  const isPositive = data[data.length - 1]?.pnl >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">Equity Curve</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"} stopOpacity={0.3} />
              <stop offset="100%" stopColor={isPositive ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"} stopOpacity={0} />
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
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={isPositive ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"}
            fill="url(#equityGrad)"
            strokeWidth={2}
            name="Cumulative P&L"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EquityCurve;
