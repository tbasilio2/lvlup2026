import { useMemo, useState } from "react";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth,
  startOfWeek, endOfWeek, subMonths, addMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Trade } from "@/hooks/useTrades";
import DayTradesDialog from "./DayTradesDialog";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";

interface Props {
  trades: Trade[];
}

const PnLCalendar = ({ trades }: Props) => {
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const tradesByDay = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    trades.forEach((t) => {
      if (!t.exit_date) return;
      const day = format(new Date(t.exit_date), "yyyy-MM-dd");
      (map[day] ||= []).push(t);
    });
    return map;
  }, [trades]);

  const dailyPnL = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(tradesByDay).forEach(([day, ts]) => {
      const sum = ts.reduce((s, t) => s + (t.pnl ?? 0), 0);
      if (ts.some((t) => t.pnl != null)) map[day] = sum;
    });
    return map;
  }, [tradesByDay]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const maxAbs = useMemo(() => {
    const vals = Object.values(dailyPnL);
    return Math.max(...vals.map(Math.abs), 1);
  }, [dailyPnL]);

  const getColor = (pnl: number) => {
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    if (pnl > 0) return `rgba(5, 150, 105, ${0.15 + intensity * 0.6})`;
    if (pnl < 0) return `rgba(220, 38, 38, ${0.15 + intensity * 0.6})`;
    return undefined;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-1 hover:bg-secondary rounded-lg transition-colors">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{format(month, "MMMM yyyy")}</h3>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 hover:bg-secondary rounded-lg transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-[10px] text-muted-foreground font-mono font-medium py-1">{d}</div>
        ))}
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const pnl = dailyPnL[key];
          const dayTrades = tradesByDay[key] ?? [];
          const inMonth = isSameMonth(day, month);
          const clickable = dayTrades.length > 0;

          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setSelectedDay(key)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] transition-all ${
                !inMonth ? "opacity-20" : ""
              } ${clickable ? "hover:ring-2 hover:ring-primary/50 hover:scale-105 cursor-pointer" : "cursor-default"}`}
              style={{ backgroundColor: pnl != null ? getColor(pnl) : undefined }}
              title={pnl != null ? `${key}: ${formatMoney(pnl, { signed: true })} · ${dayTrades.length} trade(s)` : key}
            >
              <span className={`font-mono font-medium ${pnl != null ? "text-foreground" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </span>
              {pnl != null && (
                <span className={`text-[8px] font-bold font-mono ${pnl >= 0 ? "text-profit" : "text-loss"}`}>
                  {formatMoneyCompact(pnl, { signed: true })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <DayTradesDialog
        open={selectedDay !== null}
        onOpenChange={(o) => !o && setSelectedDay(null)}
        title={selectedDay ? format(new Date(selectedDay), "EEEE, MMM d, yyyy") : ""}
        trades={selectedDay ? tradesByDay[selectedDay] ?? [] : []}
      />
    </div>
  );
};

export default PnLCalendar;
