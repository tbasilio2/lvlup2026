import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, getStreak, type Habit, type HabitLog } from "@/hooks/useHabits";
import { getActiveDays, getCurrentStreak, getBestStreakEver } from "@/components/StreakWidget";
import { computeGamification, type ActivityStats, type TodayActivity, type LevelInfo, type EarnedBadge, type EarnedQuest } from "@/lib/gamification";

interface GamificationState {
  loading: boolean;
  level: LevelInfo;
  badges: EarnedBadge[];
  quests: EarnedQuest[];
  questsCompletedToday: number;
  questXpEarnedToday: number;
  streak: number;
  stats: ActivityStats;
}

const emptyStats: ActivityStats = {
  habitLogs: 0, journalEntries: 0, trades: 0, goalsCompleted: 0,
  chartAnalyses: 0, weeklyReports: 0, bestStreak: 0, perfectDays: 0,
};

const emptyToday: TodayActivity = {
  habitsCompletedToday: 0, totalHabits: 0, journalEntriesToday: 0,
  tradesToday: 0, chartAnalysesToday: 0,
};

function deriveStats(habits: Habit[], log: HabitLog, counts: { journals: number; trades: number; goals: number; analyses: number; reports: number }): { stats: ActivityStats; streak: number } {
  const habitLogs = Object.values(log).reduce((sum, ids) => sum + ids.length, 0);
  let perfectDays = 0;
  Object.entries(log).forEach(([date, ids]) => {
    const activeHabits = habits.filter((h) => h.created_at.slice(0, 10) <= date).length;
    if (activeHabits > 0 && ids.length >= activeHabits) perfectDays++;
  });
  const activeDays = getActiveDays(log);
  const bestOverall = getBestStreakEver(activeDays);
  const bestPerHabit = habits.reduce((best, habit) => Math.max(best, getStreak(habit.id, log, new Date())), 0);
  const current = getCurrentStreak(activeDays);
  const streak = Math.max(current, bestPerHabit);
  return {
    stats: {
      habitLogs,
      perfectDays,
      journalEntries: counts.journals,
      trades: counts.trades,
      goalsCompleted: counts.goals,
      chartAnalyses: counts.analyses,
      weeklyReports: counts.reports,
      bestStreak: Math.max(bestOverall, streak),
    },
    streak: current,
  };
}

export function useGamification() {
  const { user } = useAuth();
  const [state, setState] = useState<GamificationState>({
    loading: true,
    level: { ...computeGamification(emptyStats, emptyToday).level },
    badges: computeGamification(emptyStats, emptyToday).badges,
    quests: computeGamification(emptyStats, emptyToday).quests,
    questsCompletedToday: 0,
    questXpEarnedToday: 0,
    streak: 0,
    stats: emptyStats,
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const count = (query: any, key: string, map: (n: number) => number = (n) => n) =>
        query.then((res: any) => ({ key, n: res.error ? 0 : map(res.count ?? 0) }));

      const [habitsRes, logsRes, ...countRes] = await Promise.all([
        supabase.from("habits").select("id, created_at").eq("user_id", user.id),
        supabase.from("habit_logs").select("habit_id, date").eq("user_id", user.id),
        count(supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id), "journals"),
        count(supabase.from("trades").select("id", { count: "exact", head: true }).eq("user_id", user.id), "trades"),
        count(supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("completed", true), "goals"),
        count(supabase.from("chart_analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id), "analyses"),
        count(supabase.from("weekly_reports").select("id", { count: "exact", head: true }).eq("user_id", user.id), "reports"),
        count(
          supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("date", formatDate(new Date())),
          "journalsToday",
        ),
        count(
          supabase.from("trades").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", `${formatDate(new Date())}T00:00:00Z`),
          "tradesToday",
        ),
        count(
          supabase.from("chart_analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", `${formatDate(new Date())}T00:00:00Z`),
          "analysesToday",
        ),
      ]);

      if (habitsRes.error || logsRes.error) throw habitsRes.error ?? logsRes.error;

      const habits: Habit[] = habitsRes.data.map((h: any) => ({ id: h.id, name: h.name, emoji: h.emoji, created_at: h.created_at }));
      const log: HabitLog = {};
      logsRes.data.forEach((l: any) => {
        if (!log[l.date]) log[l.date] = [];
        log[l.date].push(l.habit_id);
      });

      const counts = {
        journals: countRes.find((c) => c.key === "journals")?.n ?? 0,
        trades: countRes.find((c) => c.key === "trades")?.n ?? 0,
        goals: countRes.find((c) => c.key === "goals")?.n ?? 0,
        analyses: countRes.find((c) => c.key === "analyses")?.n ?? 0,
        reports: countRes.find((c) => c.key === "reports")?.n ?? 0,
      };
      const { stats } = deriveStats(habits, log, counts);
      const today: TodayActivity = {
        habitsCompletedToday: log[formatDate(new Date())]?.length ?? 0,
        totalHabits: habits.length,
        journalEntriesToday: countRes.find((c) => c.key === "journalsToday")?.n ?? 0,
        tradesToday: countRes.find((c) => c.key === "tradesToday")?.n ?? 0,
        chartAnalysesToday: countRes.find((c) => c.key === "analysesToday")?.n ?? 0,
      };
      const g = computeGamification(stats, today);
      setState({
        loading: false,
        level: g.level,
        badges: g.badges,
        quests: g.quests,
        questsCompletedToday: g.questsCompletedToday,
        questXpEarnedToday: g.questXpEarnedToday,
        streak: deriveStats(habits, log, counts).streak,
        stats,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refresh = useCallback(() => { setState((s) => ({ ...s, loading: true })); fetchData(); }, [fetchData]);

  return { ...state, refresh };
}

export default useGamification;
