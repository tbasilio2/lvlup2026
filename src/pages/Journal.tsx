import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronLeft, ChevronRight, PenLine, TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import JournalEntryForm from "@/components/JournalEntry";
import WeeklyReflection from "@/components/WeeklyReflection";
import MoodTimeline from "@/components/MoodTimeline";
import { useJournal } from "@/hooks/useJournal";
import { formatDate, MOODS, getMoodTailwind } from "@/lib/journal";
import type { Mood } from "@/lib/journal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, formatMoneyCompact } from "@/lib/currency";

const Journal = () => {
  const { entries, loading, saveEntry } = useJournal();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [isWriting, setIsWriting] = useState(false);

  const todayEntry = useMemo(() => entries.find((e) => e.date === selectedDate), [entries, selectedDate]);

  const handleSave = useCallback((data: { date: string; mood: Mood; gratitude: string; intention: string; reflection: string; wins: string; profitLoss: number | null; fees: number | null }) => {
    saveEntry(data);
    setIsWriting(false);
  }, [saveEntry]);

  const navigateDate = (dir: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    if (d <= new Date()) setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === formatDate(new Date());
  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const streak = useMemo(() => {
    let count = 0;
    const d = new Date();
    while (true) {
      const key = formatDate(d);
      if (entries.some((e) => e.date === key)) { count++; d.setDate(d.getDate() - 1); } else break;
    }
    return count;
  }, [entries]);

  const moodDistribution = useMemo(() => {
    const counts: Record<Mood, number> = { amazing: 0, good: 0, okay: 0, low: 0, rough: 0 };
    entries.forEach((e) => counts[e.mood]++);
    return counts;
  }, [entries]);

  const topMood = useMemo(() => {
    const sorted = Object.entries(moodDistribution).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[1] > 0 ? (sorted[0][0] as Mood) : null;
  }, [moodDistribution]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-5 py-8 pb-24 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 py-8 pb-24">
        <motion.header className="mb-8" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-foreground flex items-center gap-2">
                <BookOpen className="h-7 w-7 text-primary" /> Journal
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Intentional reflection & mood tracking</p>
            </div>
            {streak > 0 && (
              <motion.div className="flex flex-col items-center rounded-2xl bg-primary/10 border border-primary/20 px-4 py-2" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <span className="text-2xl font-serif text-primary">{streak}</span>
                <span className="text-[10px] font-medium text-primary/70">day streak</span>
              </motion.div>
            )}
          </div>
        </motion.header>

        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{displayDate}</p>
            {isToday && <span className="text-[10px] text-primary font-medium">Today</span>}
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateDate(1)} disabled={isToday}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <AnimatePresence mode="wait">
          {isWriting ? (
            <motion.section key="form" className="rounded-2xl border border-border bg-card p-5 mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <JournalEntryForm existingEntry={todayEntry} onSave={handleSave} date={selectedDate} />
            </motion.section>
          ) : todayEntry ? (
            <motion.section key="view" className="rounded-2xl border border-border bg-card p-5 mb-8 space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{MOODS.find((m) => m.value === todayEntry.mood)?.emoji}</span>
                  <span className={`text-sm font-medium ${getMoodTailwind(todayEntry.mood)}`}>Feeling {todayEntry.mood}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsWriting(true)} className="gap-1 text-muted-foreground">
                  <PenLine className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
              {[
                { label: "Gratitude", value: todayEntry.gratitude },
                { label: "Intention", value: todayEntry.intention },
                { label: "Reflection", value: todayEntry.reflection },
                { label: "Wins", value: todayEntry.wins },
              ].filter((s) => s.value).map((s) => (
                <div key={s.label}>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{s.label}</h4>
                  <p className="text-sm text-foreground leading-relaxed">{s.value}</p>
                </div>
              ))}
              {(todayEntry.profitLoss != null || todayEntry.fees != null) && (
                <div className="flex items-center gap-4 pt-1">
                  {todayEntry.profitLoss != null && (
                    <div className="flex items-center gap-1.5">
                      {todayEntry.profitLoss >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-profit" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-loss" />
                      )}
                      <span className={`text-sm font-bold font-mono ${todayEntry.profitLoss >= 0 ? "text-profit" : "text-loss"}`}>
                        {formatMoney(todayEntry.profitLoss, { signed: true })}
                      </span>
                    </div>
                  )}
                  {todayEntry.fees != null && todayEntry.fees > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-mono text-muted-foreground">{formatMoney(todayEntry.fees)}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          ) : (
            <motion.section key="empty" className="rounded-2xl border border-dashed border-border bg-card/50 p-8 mb-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PenLine className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">{isToday ? "Take a moment to reflect on your day" : "No entry for this day"}</p>
              <Button onClick={() => setIsWriting(true)} className="rounded-full gap-2">
                <PenLine className="h-4 w-4" /> {isToday ? "Write Today's Entry" : "Add Entry"}
              </Button>
            </motion.section>
          )}
        </AnimatePresence>

        {entries.length > 0 && (
          <motion.section className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Insights</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-serif text-foreground">{entries.length}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Entries</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-2xl font-serif text-foreground">{streak}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Streak</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-2xl">{topMood ? MOODS.find((m) => m.value === topMood)?.emoji : "—"}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Top Mood</p>
              </div>
            </div>
            {(() => {
              const entriesWithPnl = entries.filter((e) => e.profitLoss != null);
              if (entriesWithPnl.length === 0) return null;
              const totalPnl = entriesWithPnl.reduce((sum, e) => sum + (e.profitLoss ?? 0), 0);
              const totalFees = entriesWithPnl.reduce((sum, e) => sum + (e.fees ?? 0), 0);
              const net = totalPnl - totalFees;
              const winDays = entriesWithPnl.filter((e) => (e.profitLoss ?? 0) > 0).length;
              return (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className={`text-2xl font-serif font-mono ${net >= 0 ? "text-profit" : "text-loss"}`}>
                      {formatMoneyCompact(net, { signed: true })}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">Net P&L</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-serif font-mono text-foreground">{winDays}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Win Days</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <p className="text-2xl font-serif font-mono text-muted-foreground">{formatMoneyCompact(totalFees)}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Total Fees</p>
                  </div>
                </div>
              );
            })()}
          </motion.section>
        )}

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <MoodTimeline entries={entries} />
        </motion.section>

        <WeeklyReflection entries={entries} />
      </div>
    </div>
  );
};

export default Journal;
