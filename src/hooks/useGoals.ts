import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type GoalLevel = "annual" | "monthly" | "weekly" | "daily";

export interface Goal {
  id: string;
  title: string;
  level: GoalLevel;
  parentId: string | null;
  completed: boolean;
  createdAt: string;
}

export const childLevel: Record<GoalLevel, GoalLevel | null> = {
  annual: "monthly", monthly: "weekly", weekly: "daily", daily: null,
};

export const levelLabels: Record<GoalLevel, string> = {
  annual: "Annual", monthly: "Monthly", weekly: "Weekly", daily: "Daily",
};

export const levelEmoji: Record<GoalLevel, string> = {
  annual: "🎯", monthly: "📅", weekly: "📋", daily: "✅",
};

export function getGoalProgress(goalId: string, goals: Goal[]): number {
  const children = goals.filter((g) => g.parentId === goalId);
  if (children.length === 0) {
    return goals.find((g) => g.id === goalId)?.completed ? 1 : 0;
  }
  return children.reduce((acc, child) => acc + getGoalProgress(child.id, goals), 0) / children.length;
}

export function getGoalCounts(goalId: string, goals: Goal[]): { total: number; done: number } {
  const children = goals.filter((g) => g.parentId === goalId);
  if (children.length === 0) {
    const goal = goals.find((g) => g.id === goalId);
    return { total: 1, done: goal?.completed ? 1 : 0 };
  }
  return children.reduce(
    (acc, child) => {
      const c = getGoalCounts(child.id, goals);
      return { total: acc.total + c.total, done: acc.done + c.done };
    },
    { total: 0, done: 0 }
  );
}

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at");
      if (error) throw error;
      setGoals(data.map((g: any) => ({
        id: g.id, title: g.title, level: g.level as GoalLevel,
        parentId: g.parent_id, completed: g.completed, createdAt: g.created_at,
      })));
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const addGoal = useCallback(async (title: string, level: GoalLevel, parentId: string | null) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("goals")
      .insert({ user_id: user.id, title, level, parent_id: parentId })
      .select()
      .single();
    if (error) { toast.error("Failed to add goal"); return; }
    setGoals((prev) => [...prev, {
      id: data.id, title: data.title, level: data.level as GoalLevel,
      parentId: data.parent_id, completed: data.completed, createdAt: data.created_at,
    }]);
  }, [user]);

  const toggleGoal = useCallback(async (id: string) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    const { error } = await supabase.from("goals").update({ completed: !goal.completed }).eq("id", id);
    if (error) { toast.error("Failed to update goal"); return; }
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, completed: !g.completed } : g));
  }, [goals]);

  const deleteGoal = useCallback(async (id: string) => {
    // Cascade handled by DB
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) { toast.error("Failed to delete goal"); return; }
    // Remove from local state (including descendants)
    setGoals((prev) => {
      const toDelete = new Set<string>();
      const collect = (parentId: string) => {
        toDelete.add(parentId);
        prev.filter((g) => g.parentId === parentId).forEach((g) => collect(g.id));
      };
      collect(id);
      return prev.filter((g) => !toDelete.has(g.id));
    });
  }, []);

  return { goals, loading, addGoal, toggleGoal, deleteGoal };
}
