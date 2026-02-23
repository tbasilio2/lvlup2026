import { useMemo } from "react";
import type { HabitLog, Habit } from "@/lib/habits";
import { formatDate } from "@/lib/habits";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HeatmapProps {
  log: HabitLog;
  habits: Habit[];
}

const Heatmap = ({ log, habits }: HeatmapProps) => {
  const weeks = useMemo(() => {
    const today = new Date();
    const result: { date: Date; count: number; total: number }[][] = [];
    
    // Go back 12 weeks
    const start = new Date(today);
    start.setDate(start.getDate() - 83); // 12 weeks = 84 days, -1 for today
    // Align to Monday
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - ((dayOfWeek + 6) % 7));

    let currentWeek: { date: Date; count: number; total: number }[] = [];
    const d = new Date(start);

    while (d <= today) {
      const key = formatDate(d);
      const completed = log[key]?.length || 0;
      currentWeek.push({ date: new Date(d), count: completed, total: habits.length });
      
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) result.push(currentWeek);

    return result;
  }, [log, habits]);

  const getLevel = (count: number, total: number): string => {
    if (total === 0 || count === 0) return "bg-heatmap-empty";
    const ratio = count / total;
    if (ratio <= 0.25) return "bg-heatmap-low";
    if (ratio <= 0.5) return "bg-heatmap-mid";
    if (ratio <= 0.75) return "bg-heatmap-high";
    return "bg-heatmap-max";
  };

  const dayLabels = ["M", "", "W", "", "F", "", ""];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Last 12 Weeks
      </h3>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 mr-1 pt-0">
          {dayLabels.map((label, i) => (
            <div key={i} className="h-[14px] w-4 flex items-center justify-center text-[9px] text-muted-foreground font-medium">
              {label}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <Tooltip key={di}>
                <TooltipTrigger asChild>
                  <div
                    className={`h-[14px] w-[14px] rounded-[3px] ${getLevel(day.count, day.total)} transition-colors hover:ring-2 hover:ring-primary/30`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">
                    {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-muted-foreground">
                    {day.count}/{day.total} habits
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          {["bg-heatmap-empty", "bg-heatmap-low", "bg-heatmap-mid", "bg-heatmap-high", "bg-heatmap-max"].map((cls) => (
            <div key={cls} className={`h-[10px] w-[10px] rounded-[2px] ${cls}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

export default Heatmap;
