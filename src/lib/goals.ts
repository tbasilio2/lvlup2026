export type GoalLevel = "annual" | "monthly" | "weekly" | "daily";

export interface Goal {
  id: string;
  title: string;
  level: GoalLevel;
  parentId: string | null;
  completed: boolean;
  createdAt: string;
}

const GOALS_KEY = "goals-2026";

export function getGoals(): Goal[] {
  const stored = localStorage.getItem(GOALS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveGoals(goals: Goal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function generateGoalId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const childLevel: Record<GoalLevel, GoalLevel | null> = {
  annual: "monthly",
  monthly: "weekly",
  weekly: "daily",
  daily: null,
};

export const levelLabels: Record<GoalLevel, string> = {
  annual: "Annual",
  monthly: "Monthly",
  weekly: "Weekly",
  daily: "Daily",
};

export const levelEmoji: Record<GoalLevel, string> = {
  annual: "🎯",
  monthly: "📅",
  weekly: "📋",
  daily: "✅",
};

/**
 * Calculate progress for a goal based on its children.
 * - If it has children, progress = avg of children's progress (recursive)
 * - If no children (leaf), progress = completed ? 1 : 0
 */
export function getGoalProgress(goalId: string, goals: Goal[]): number {
  const children = goals.filter((g) => g.parentId === goalId);
  if (children.length === 0) {
    const goal = goals.find((g) => g.id === goalId);
    return goal?.completed ? 1 : 0;
  }
  const sum = children.reduce((acc, child) => acc + getGoalProgress(child.id, goals), 0);
  return sum / children.length;
}

/**
 * Count total and completed descendants
 */
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
