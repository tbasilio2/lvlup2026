import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, CalendarDays } from "lucide-react";
import { getHabits, saveHabits, getLog, saveLog, formatDate, getStreak } from "@/lib/habits";
import type { Habit, HabitLog } from "@/lib/habits";
import ProgressRing from "@/components/ProgressRing";
import HabitItem from "@/components/HabitItem";
import Heatmap from "@/components/Heatmap";
import AddHabitDialog from "@/components/AddHabitDialog";
import StatsCharts from "@/components/StatsCharts";

const Index = () => {
  const [habits, setHabits] = useState<Habit[]>(getHabits);
  const [log, setLog] = useState<HabitLog>(getLog);

  const today = useMemo(() => formatDate(new Date()), []);
  const todayCompleted = log[today] || [];

  const progress = habits.length > 0 ? todayCompleted.length / habits.length : 0;

  const updateLog = useCallback((newLog: HabitLog) => {
    setLog(newLog);
    saveLog(newLog);
  }, []);

  const toggleHabit = useCallback((habitId: string) => {
    setLog((prev) => {
      const dayLog = prev[today] || [];
      const newDayLog = dayLog.includes(habitId)
        ? dayLog.filter((id) => id !== habitId)
        : [...dayLog, habitId];
      const newLog = { ...prev, [today]: newDayLog };
      saveLog(newLog);
      return newLog;
    });
  }, [today]);

  const addHabit = useCallback((habit: Habit) => {
    setHabits((prev) => {
      const next = [...prev, habit];
      saveHabits(next);
      return next;
    });
  }, []);

  const deleteHabit = useCallback((habitId: string) => {
    setHabits((prev) => {
      const next = prev.filter((h) => h.id !== habitId);
      saveHabits(next);
      return next;
    });
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const dateDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 py-8 pb-20">
        {/* Header */}
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl text-foreground">{greeting}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {dateDisplay}
              </p>
            </div>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <ProgressRing progress={progress} size={80} strokeWidth={6} />
            </motion.div>
          </div>

          {progress === 1 && habits.length > 0 && (
            <motion.div
              className="mt-4 flex items-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">All habits complete today! 🎉</span>
            </motion.div>
          )}
        </motion.header>

        {/* Habit List */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Today's Habits
          </h2>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {habits.map((habit) => (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  completed={todayCompleted.includes(habit.id)}
                  streak={getStreak(habit.id, log, new Date())}
                  onToggle={() => toggleHabit(habit.id)}
                  onDelete={() => deleteHabit(habit.id)}
                />
              ))}
            </AnimatePresence>
            <AddHabitDialog onAdd={addHabit} />
          </div>
        </section>

        {/* Stats */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your Progress
          </h2>
          <StatsCharts log={log} habits={habits} />
        </section>

        {/* Heatmap */}
        <motion.section
          className="rounded-2xl border border-border bg-card p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Heatmap log={log} habits={habits} />
        </motion.section>
      </div>
    </div>
  );
};

export default Index;
