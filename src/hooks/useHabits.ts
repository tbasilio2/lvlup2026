import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const DEFAULT_HABITS = [
  { name: "Meditate", emoji: "🧘" },
  { name: "Exercise", emoji: "💪" },
  { name: "Read", emoji: "📖" },
  { name: "Hydrate", emoji: "💧" },
  { name: "Journal", emoji: "✍️" },
];

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  created_at: string;
}

export interface HabitLog {
  [date: string]: string[]; // date -> array of completed habit ids
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getStreak(habitId: string, log: HabitLog, fromDate: Date): number {
  let streak = 0;
  const d = new Date(fromDate);
  const todayKey = formatDate(d);
  if (!log[todayKey]?.includes(habitId)) {
    d.setDate(d.getDate() - 1);
  }
  while (true) {
    const key = formatDate(d);
    if (log[key]?.includes(habitId)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [log, setLog] = useState<HabitLog>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [habitsRes, logsRes] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("habit_logs").select("*").eq("user_id", user.id),
      ]);
      if (habitsRes.error) throw habitsRes.error;
      if (logsRes.error) throw logsRes.error;

      setHabits(habitsRes.data.map((h: any) => ({ id: h.id, name: h.name, emoji: h.emoji, created_at: h.created_at })));

      const logMap: HabitLog = {};
      logsRes.data.forEach((l: any) => {
        if (!logMap[l.date]) logMap[l.date] = [];
        logMap[l.date].push(l.habit_id);
      });
      setLog(logMap);
    } catch (e: any) {
      toast.error("Failed to load habits");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addHabit = useCallback(async (name: string, emoji: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("habits")
      .insert({ user_id: user.id, name, emoji })
      .select()
      .single();
    if (error) { toast.error("Failed to add habit"); return; }
    setHabits((prev) => [...prev, { id: data.id, name: data.name, emoji: data.emoji, created_at: data.created_at }]);
  }, [user]);

  const deleteHabit = useCallback(async (habitId: string) => {
    const { error } = await supabase.from("habits").delete().eq("id", habitId);
    if (error) { toast.error("Failed to delete habit"); return; }
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  }, []);

  const toggleHabit = useCallback(async (habitId: string, date: string) => {
    if (!user) return;
    const isCompleted = log[date]?.includes(habitId);
    if (isCompleted) {
      const { error } = await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("date", date);
      if (error) { toast.error("Failed to update"); return; }
      setLog((prev) => ({
        ...prev,
        [date]: (prev[date] || []).filter((id) => id !== habitId),
      }));
    } else {
      const { error } = await supabase.from("habit_logs").insert({ user_id: user.id, habit_id: habitId, date });
      if (error) { toast.error("Failed to update"); return; }
      setLog((prev) => ({
        ...prev,
        [date]: [...(prev[date] || []), habitId],
      }));
    }
  }, [user, log]);

  return { habits, log, loading, addHabit, deleteHabit, toggleHabit };
}
