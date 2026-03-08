import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth,
  startOfWeek, endOfWeek, subMonths, addMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Trade } from "@/hooks/useTrades";

interface Props {
  trades: Trade[];
}

const PnLCalendar = ({ trades }: Props) => {
  const [month, setMonth] = useState(new Date());

  const dailyPnL = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach((t) => {
      if (t.pnl == null || !t.exit_date) return;
      const day = format(new Date(t.exit_date), "yyyy-MM-dd");
      map[day] = (map[day] || 0) + t.pnl;
    });
    return map;
  }, [trades]);

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
    if (pnl > 0) return `rgba(16, 185, 129, ${0.15 + intensity * 0.7})`;
    if (pnl < 0) return `rgba(239, 68, 68, ${0.15 + intensity * 0.7})`;
    return undefined;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(subMonths(month, 1))} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">{format(month, "MMMM yyyy")}</h3>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const pnl = dailyPnL[key];
          const inMonth = isSameMonth(day, month);

          return (
            <div
              key={key}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[10px] transition-colors ${
                !inMonth ? "opacity-30" : ""
              }`}
              style={{ backgroundColor: pnl != null ? getColor(pnl) : undefined }}
              title={pnl != null ? `${key}: ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}` : key}
            >
              <span className={`font-medium ${pnl != null ? "text-foreground" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </span>
              {pnl != null && (
                <span className={`text-[8px] font-bold ${pnl >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                  {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PnLCalendar;
