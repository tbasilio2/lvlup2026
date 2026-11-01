import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { formatDate, type HabitLog } from "@/hooks/useHabits";

export function getActiveDays(log: HabitLog): Set<string> {
  const active = new Set<string>();
  Object.entries(log).forEach(([date, ids]) => {
    if (ids && ids.length > 0) active.add(date);
  });
  return active;
}

/** Consecutive active days ending today (grace: an unfinished today doesn't break the streak). */
export function getCurrentStreak(activeDays: Set<string>): number {
  let streak = 0;
  const d = new Date();
  const todayKey = formatDate(d);
  if (!activeDays.has(todayKey)) d.setDate(d.getDate() - 1);
  while (activeDays.has(formatDate(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive active days across all history. */
export function getBestStreakEver(activeDays: Set<string>): number {
  if (activeDays.size === 0) return 0;
  const sorted = Array.from(activeDays).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    prev.setDate(prev.getDate() + 1);
    if (formatDate(prev) === sorted[i]) {
      run++;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
  }
  return best;
}

interface StreakWidgetProps {
  log: HabitLog;
  hasHabits: boolean;
}

const StreakWidget = ({ log, hasHabits }: StreakWidgetProps) => {
  const { currentStreak, bestStreak, last14 } = useMemo(() => {
    const activeDays = getActiveDays(log);
    const streak = getCurrentStreak(activeDays);
    const best = Math.max(getBestStreakEver(activeDays), streak);
    const days: { key: string; active: boolean; isToday: boolean }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      days.push({ key, active: activeDays.has(key), isToday: i === 0 });
    }
    return { currentStreak: streak, bestStreak: best, last14: days };
  }, [log]);

  const started = hasHabits && last14.some((d) => d.active);

  return (
    <motion.section
      className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <Flame className={`h-7 w-7 ${currentStreak > 0 ? "text-primary" : "text-muted-foreground"} ${currentStreak >= 3 ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current streak</h2>
            <p className="mt-0.5 text-3xl font-semibold tabular-nums leading-none">
              {currentStreak}
              <span className="ml-2 text-sm font-normal text-muted-foreground">{currentStreak === 1 ? "day" : "days"}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {!started ? "Complete a habit today to start one." : currentStreak === 0 ? "Today is a fresh start." : "Keep it alive — one habit is enough."}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end text-right">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold tabular-nums">{bestStreak}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">best ever</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-1">
        {last14.map((d) => (
          <div
            key={d.key}
            title={d.key}
            className={`h-6 flex-1 rounded-md transition-colors ${
              d.active ? "bg-primary" : d.isToday ? "bg-primary/20 border border-dashed border-primary/40" : "bg-secondary/60"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Last 14 days</p>
    </motion.section>
  );
};

export default StreakWidget;
