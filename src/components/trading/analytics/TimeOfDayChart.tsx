import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { TradeAnalytics } from "@/hooks/useTradeAnalytics";

const TimeOfDayChart = ({ a }: { a: TradeAnalytics }) => {
  if (a.closedCount === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">P&L by Weekday</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={a.byWeekday}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono" }} />
            <Tooltip contentStyle={{ background: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 15%, 15%)", borderRadius: 8, fontSize: 12, fontFamily: "JetBrains Mono" }} labelStyle={{ color: "hsl(210, 20%, 93%)" }} />
            <Bar dataKey="pnl">
              {a.byWeekday.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">P&L by Hour</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={a.byHour}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 15%)" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215, 15%, 50%)", fontFamily: "JetBrains Mono" }} />
            <Tooltip contentStyle={{ background: "hsl(220, 18%, 12%)", border: "1px solid hsl(220, 15%, 15%)", borderRadius: 8, fontSize: 12, fontFamily: "JetBrains Mono" }} labelStyle={{ color: "hsl(210, 20%, 93%)" }} />
            <Bar dataKey="pnl">
              {a.byHour.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TimeOfDayChart;
