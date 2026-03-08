import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, CalendarDays } from "lucide-react";
import { useHabits, formatDate, getStreak } from "@/hooks/useHabits";
import ProgressRing from "@/components/ProgressRing";
import HabitItem from "@/components/HabitItem";
import Heatmap from "@/components/Heatmap";
import AddHabitDialog from "@/components/AddHabitDialog";
import StatsCharts from "@/components/StatsCharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { habits, log, loading, addHabit, deleteHabit, toggleHabit } = useHabits();
  const { signOut } = useAuth();

  const today = useMemo(() => formatDate(new Date()), []);
  const todayCompleted = log[today] || [];
  const progress = habits.length > 0 ? todayCompleted.length / habits.length : 0;

  const handleToggle = (habitId: string) => toggleHabit(habitId, today);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const dateDisplay = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-5 py-8 pb-20 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 py-8 pb-20">
        <motion.header className="mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl text-foreground">{greeting}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {dateDisplay}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                <ProgressRing progress={progress} size={80} strokeWidth={6} />
              </motion.div>
            </div>
          </div>

          {progress === 1 && habits.length > 0 && (
            <motion.div className="mt-4 flex items-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">All habits complete today! 🎉</span>
            </motion.div>
          )}

          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1 text-muted-foreground text-xs">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </motion.header>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Habits</h2>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {habits.map((habit) => (
                <HabitItem
                  key={habit.id}
                  habit={{ id: habit.id, name: habit.name, emoji: habit.emoji, createdAt: habit.created_at }}
                  completed={todayCompleted.includes(habit.id)}
                  streak={getStreak(habit.id, log, new Date())}
                  onToggle={() => handleToggle(habit.id)}
                  onDelete={() => deleteHabit(habit.id)}
                />
              ))}
            </AnimatePresence>
            <AddHabitDialog onAdd={(h) => addHabit(h.name, h.emoji)} />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Progress</h2>
          <StatsCharts log={log} habits={habits.map((h) => ({ ...h, createdAt: h.created_at }))} />
        </section>

        <motion.section className="rounded-2xl border border-border bg-card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Heatmap log={log} habits={habits.map((h) => ({ ...h, createdAt: h.created_at }))} />
        </motion.section>
      </div>
    </div>
  );
};

export default Index;
