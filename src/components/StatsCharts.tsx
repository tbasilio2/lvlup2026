import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Flame } from "lucide-react";
import type { Habit, HabitLog } from "@/lib/habits";
import { formatDate } from "@/lib/habits";

interface StatsChartsProps {
  log: HabitLog;
  habits: Habit[];
}

const StatsCharts = ({ log, habits }: StatsChartsProps) => {
  const weeklyData = useMemo(() => {
    const today = new Date();
    const data: { day: string; completed: number; total: number; pct: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      const completed = log[key]?.length || 0;
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      data.push({
        day: dayName,
        completed,
        total: habits.length,
        pct: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0,
      });
    }
    return data;
  }, [log, habits]);

  const monthlyData = useMemo(() => {
    const today = new Date();
    const data: { week: string; avg: number; completed: number; total: number }[] = [];

    for (let w = 3; w >= 0; w--) {
      let totalCompleted = 0;
      let totalPossible = 0;

      for (let d = 6; d >= 0; d--) {
        const date = new Date(today);
        date.setDate(date.getDate() - w * 7 - d);
        const key = formatDate(date);
        totalCompleted += log[key]?.length || 0;
        totalPossible += habits.length;
      }

      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - w * 7 - 6);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - w * 7);

      const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      data.push({
        week: label,
        avg: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
        completed: totalCompleted,
        total: totalPossible,
      });
    }
    return data;
  }, [log, habits]);

  // Summary stats
  const stats = useMemo(() => {
    const today = new Date();
    const thisWeekCompleted = weeklyData.reduce((s, d) => s + d.completed, 0);
    const thisWeekTotal = weeklyData.reduce((s, d) => s + d.total, 0);
    const weekPct = thisWeekTotal > 0 ? Math.round((thisWeekCompleted / thisWeekTotal) * 100) : 0;

    // Last week for comparison
    let lastWeekCompleted = 0;
    let lastWeekTotal = 0;
    for (let i = 13; i >= 7; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      lastWeekCompleted += log[key]?.length || 0;
      lastWeekTotal += habits.length;
    }
    const lastWeekPct = lastWeekTotal > 0 ? Math.round((lastWeekCompleted / lastWeekTotal) * 100) : 0;
    const weekTrend = weekPct - lastWeekPct;

    // Best streak across all habits
    let bestStreak = 0;
    habits.forEach((h) => {
      // Check streak from today backward
      let streak = 0;
      const d = new Date(today);
      for (let i = 0; i < 365; i++) {
        const key = formatDate(d);
        if (log[key]?.includes(h.id)) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      if (streak > bestStreak) bestStreak = streak;
    });

    // Perfect days this month
    let perfectDays = 0;
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const d = new Date(monthStart);
    while (d <= today) {
      const key = formatDate(d);
      if ((log[key]?.length || 0) >= habits.length && habits.length > 0) {
        perfectDays++;
      }
      d.setDate(d.getDate() + 1);
    }

    return { weekPct, weekTrend, bestStreak, perfectDays, thisWeekCompleted, thisWeekTotal };
  }, [log, habits, weeklyData]);

  const TrendIcon = stats.weekTrend > 0 ? TrendingUp : stats.weekTrend < 0 ? TrendingDown : Minus;
  const trendColor = stats.weekTrend > 0 ? "text-accent" : stats.weekTrend < 0 ? "text-destructive" : "text-muted-foreground";

  const getBarColor = (pct: number) => {
    if (pct >= 80) return "hsl(var(--accent))";
    if (pct >= 50) return "hsl(var(--primary))";
    if (pct > 0) return "hsl(var(--heatmap-low))";
    return "hsl(var(--habit-incomplete))";
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl bg-card border border-border px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">{payload[0].value}% completion</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-2">
        <motion.div
          className="rounded-2xl border border-border bg-card p-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.weekPct}%</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">This Week</p>
          <div className={`flex items-center justify-center gap-0.5 mt-1 ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span className="text-[10px] font-semibold">{Math.abs(stats.weekTrend)}%</span>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card p-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className="h-3.5 w-3.5 text-streak-glow" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.bestStreak}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Best Streak</p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-border bg-card p-4 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.perfectDays}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Perfect Days</p>
        </motion.div>
      </div>

      {/* Weekly Chart */}
      <motion.div
        className="rounded-2xl border border-border bg-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Daily Completion — This Week
        </h3>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="pct" radius={[6, 6, 2, 2]} maxBarSize={32}>
                {weeklyData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Monthly Chart */}
      <motion.div
        className="rounded-2xl border border-border bg-card p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Weekly Average — Last 4 Weeks
        </h3>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} barCategoryGap="20%">
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="avg" radius={[6, 6, 2, 2]} maxBarSize={40}>
                {monthlyData.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default StatsCharts;
