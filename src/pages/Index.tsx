import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, CalendarDays, BookOpen, Target, ArrowRight, Flame, Goal, Trophy } from "lucide-react";
import { useHabits, formatDate, getStreak } from "@/hooks/useHabits";
import ProgressRing from "@/components/ProgressRing";
import HabitItem from "@/components/HabitItem";
import Heatmap from "@/components/Heatmap";
import AddHabitDialog from "@/components/AddHabitDialog";
import StatsCharts from "@/components/StatsCharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

interface IndexProps { onboardingFocus?: string | null }
const focusContent: Record<string, { title: string; body: string; icon: typeof Flame }> = {
  Consistency: { title: "Build your first streak", body: "Choose one small habit you can repeat today. Consistency beats intensity.", icon: Flame },
  Goals: { title: "Turn a goal into action", body: "Start with one habit that moves your biggest goal forward.", icon: Goal },
  "Self-reflection": { title: "Make reflection part of the system", body: "Build one daily habit, then use your journal to learn what helps you keep it.", icon: BookOpen },
  "Trading discipline": { title: "Build trading discipline", body: "Track one repeatable process habit before you worry about the outcome.", icon: Target },
};

const Index = ({ onboardingFocus }: IndexProps) => {
  const { user } = useAuth();
  const { habits, log, loading, addHabit, deleteHabit, toggleHabit } = useHabits();
  const today = useMemo(() => formatDate(new Date()), []);
  const todayCompleted = log[today] || [];
  const progress = habits.length > 0 ? todayCompleted.length / habits.length : 0;
  const [showQuickStart, setShowQuickStart] = useState(true);
  const handleToggle = (habitId: string) => toggleHabit(habitId, today);
  const greeting = useMemo(() => { const hour = new Date().getHours(); if (hour < 12) return "Good morning"; if (hour < 17) return "Good afternoon"; return "Good evening"; }, []);
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "";
  const dateDisplay = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const focus = onboardingFocus ? focusContent[onboardingFocus] : undefined;
  const FocusIcon = focus?.icon;
  const allDone = habits.length > 0 && progress === 1;
  const totalCompleted = useMemo(() => Object.values(log).reduce((sum, ids) => sum + ids.length, 0), [log]);
  const bestStreak = useMemo(() => habits.reduce((best, habit) => Math.max(best, getStreak(habit.id, log, new Date())), 0), [habits, log]);

  if (loading) return <div className="min-h-screen bg-background"><div className="mx-auto max-w-lg px-5 py-8 pb-20 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-5 w-64" /><div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div></div></div>;
  return <div className="min-h-screen bg-background"><div className="mx-auto max-w-lg px-5 py-8 pb-20">
    <motion.header className="mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}><div className="flex items-start justify-between"><div><h1 className="text-3xl text-foreground">{greeting}{firstName ? `, ${firstName}` : ""}</h1><p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {dateDisplay}</p></div><ProgressRing progress={progress} size={80} strokeWidth={6} /></div>
      {allDone && <motion.div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15"><Trophy className="h-4 w-4 text-primary" /></div><div><p className="text-sm font-semibold text-primary">Day complete</p><p className="text-xs text-muted-foreground">You showed up. Come back tomorrow and keep the streak alive.</p></div></motion.div>}
    </motion.header>

    {showQuickStart && habits.length === 0 && <motion.section className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">{FocusIcon ? <FocusIcon className="h-5 w-5 text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{onboardingFocus ? `${onboardingFocus} focus` : "Your first LvLUp day"}</p><h2 className="mt-1 text-lg font-semibold">{focus?.title ?? "Start small. Build momentum."}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{focus?.body ?? "Add one habit you genuinely want to repeat. You don't need a perfect system today — you need a first win."}</p><div className="mt-4 flex flex-wrap gap-2"><AddHabitDialog onAdd={(h) => { addHabit(h.name, h.emoji); setShowQuickStart(false); }} /><Button variant="ghost" className="rounded-xl" onClick={() => setShowQuickStart(false)}>I'll do it later</Button></div></div></div></motion.section>}

    <section className="mb-8"><h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Habits</h2><div className="space-y-2"><AnimatePresence mode="popLayout">{habits.map((habit) => <HabitItem key={habit.id} habit={{ id: habit.id, name: habit.name, emoji: habit.emoji, createdAt: habit.created_at }} completed={todayCompleted.includes(habit.id)} streak={getStreak(habit.id, log, new Date())} onToggle={() => handleToggle(habit.id)} onDelete={() => deleteHabit(habit.id)} />)}</AnimatePresence>{habits.length > 0 && <AddHabitDialog onAdd={(h) => addHabit(h.name, h.emoji)} />}</div></section>

    {habits.length > 0 && <motion.section className="mb-8 rounded-2xl border border-border bg-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="flex items-center justify-between mb-4"><div><h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your week so far</h2><p className="mt-1 text-sm text-foreground">Small wins add up.</p></div><Sparkles className="h-4 w-4 text-primary" /></div><div className="grid grid-cols-3 gap-2"><div className="rounded-xl bg-secondary/60 p-3 text-center"><p className="text-xl font-semibold">{totalCompleted}</p><p className="text-[10px] text-muted-foreground">Check-ins</p></div><div className="rounded-xl bg-secondary/60 p-3 text-center"><p className="text-xl font-semibold">{bestStreak}</p><p className="text-[10px] text-muted-foreground">Best streak</p></div><div className="rounded-xl bg-secondary/60 p-3 text-center"><p className="text-xl font-semibold">{Math.round(progress * 100)}%</p><p className="text-[10px] text-muted-foreground">Today</p></div></div></motion.section>}

    <section className="mb-8 rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-4 mb-4"><div><h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keep the loop going</h2><p className="mt-1 text-sm text-foreground">Do → Reflect → LvL Up</p></div></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-auto justify-between rounded-xl p-3 text-left" onClick={() => window.location.href = "/journal"}><span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Reflect</span><ArrowRight className="h-4 w-4" /></Button><Button variant="outline" className="h-auto justify-between rounded-xl p-3 text-left" onClick={() => window.location.href = "/goals"}><span className="flex items-center gap-2"><Target className="h-4 w-4" /> Goals</span><ArrowRight className="h-4 w-4" /></Button></div></section>
    <section className="mb-8"><h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Progress</h2><StatsCharts log={log} habits={habits.map((h) => ({ ...h, createdAt: h.created_at }))} /></section><motion.section className="rounded-2xl border border-border bg-card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}><Heatmap log={log} habits={habits.map((h) => ({ ...h, createdAt: h.created_at }))} /></motion.section>
  </div></div>;
};
export default Index;
