import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import type { TradeAnalytics } from "@/hooks/useTradeAnalytics";

const DrawdownChart = ({ a }: { a: TradeAnalytics }) => {
  if (a.drawdownSeries.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Need at least 2 closed trades for drawdown</p>
      </div>
    );
  }
  const data = a.drawdownSeries.map((d) => ({ ...d, date: format(new Date(d.date), "MMM d") }));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">Underwater (Drawdown)</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono" }} />
          <Tooltip
            contentStyle={{ background: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 15%, 15%)", borderRadius: 8, fontSize: 12, fontFamily: "JetBrains Mono" }}
            labelStyle={{ color: "hsl(210, 20%, 93%)" }}
          />
          <Area type="monotone" dataKey="drawdown" stroke="hsl(0, 72%, 51%)" fill="url(#ddGrad)" strokeWidth={2} name="Drawdown" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DrawdownChart;
