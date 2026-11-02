// Gamification: XP, levels, badges and daily quests.
// Everything is derived from the user's real activity data — no XP ledger is
// stored, so XP can never double-award and always matches actual history.

export interface ActivityStats {
  habitLogs: number;
  journalEntries: number;
  trades: number;
  goalsCompleted: number;
  chartAnalyses: number;
  weeklyReports: number;
  bestStreak: number;
  perfectDays: number;
}

export const XP_VALUES = {
  habitCheckIn: 10,
  perfectDay: 15,
  journalEntry: 20,
  tradeLogged: 15,
  chartAnalysis: 20,
  goalCompleted: 25,
  weeklyReport: 50,
} as const;

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500, 8300, 10500];

export const LEVEL_NAMES = [
  "Rookie",
  "Starter",
  "Disciplined",
  "Consistent",
  "Focused",
  "Sharp",
  "Systematic",
  "Resilient",
  "Veteran",
  "Elite",
  "Master",
  "Operator",
  "Legend",
];

export function computeXp(stats: ActivityStats): number {
  return (
    stats.habitLogs * XP_VALUES.habitCheckIn +
    stats.perfectDays * XP_VALUES.perfectDay +
    stats.journalEntries * XP_VALUES.journalEntry +
    stats.trades * XP_VALUES.tradeLogged +
    stats.chartAnalyses * XP_VALUES.chartAnalysis +
    stats.goalsCompleted * XP_VALUES.goalCompleted +
    stats.weeklyReports * XP_VALUES.weeklyReport
  );
}

export interface LevelInfo {
  level: number;
  name: string;
  xp: number;
  currentLevelStartXp: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpForLevel: number | null;
  progress: number; // 0..1, 1 when max level
}

export function computeLevel(xp: number): LevelInfo {
  let idx = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { idx = i; break; }
  }
  const next = LEVEL_THRESHOLDS[idx + 1] ?? null;
  const start = LEVEL_THRESHOLDS[idx];
  const span = next !== null ? next - start : null;
  return {
    level: idx + 1,
    name: LEVEL_NAMES[idx],
    xp,
    currentLevelStartXp: start,
    nextLevelXp: next,
    xpIntoLevel: xp - start,
    xpForLevel: span,
    progress: span === null ? 1 : Math.min(1, (xp - start) / span),
  };
}

// ---------- Badges ----------

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name mapped in the UI component
  test: (stats: ActivityStats & { level: number }) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first_step", name: "First Step", description: "Complete your first habit check-in", icon: "CheckCircle", test: (s) => s.habitLogs >= 1 },
  { id: "streak_3", name: "Warming Up", description: "Reach a 3-day streak", icon: "Flame", test: (s) => s.bestStreak >= 3 },
  { id: "streak_7", name: "On Fire", description: "Reach a 7-day streak", icon: "Flame", test: (s) => s.bestStreak >= 7 },
  { id: "streak_30", name: "Unstoppable", description: "Reach a 30-day streak", icon: "Flame", test: (s) => s.bestStreak >= 30 },
  { id: "perfect_week", name: "Perfect Week", description: "7 days with every habit done", icon: "Trophy", test: (s) => s.perfectDays >= 7 },
  { id: "century", name: "Century", description: "100 habit check-ins", icon: "Medal", test: (s) => s.habitLogs >= 100 },
  { id: "reflector", name: "Reflector", description: "Write your first journal entry", icon: "BookOpen", test: (s) => s.journalEntries >= 1 },
  { id: "journalist", name: "Journalist", description: "10 journal entries", icon: "BookOpen", test: (s) => s.journalEntries >= 10 },
  { id: "first_trade", name: "First Trade", description: "Log your first trade", icon: "TrendingUp", test: (s) => s.trades >= 1 },
  { id: "trades_25", name: "Volume Trader", description: "25 trades journaled", icon: "TrendingUp", test: (s) => s.trades >= 25 },
  { id: "analyst", name: "Analyst", description: "Analyse 5 charts", icon: "BarChart3", test: (s) => s.chartAnalyses >= 5 },
  { id: "goal_getter", name: "Goal Getter", description: "Complete your first goal", icon: "Target", test: (s) => s.goalsCompleted >= 1 },
  { id: "level_5", name: "Focused Mind", description: "Reach level 5", icon: "Zap", test: (s) => s.level >= 5 },
  { id: "level_10", name: "Elite Operator", description: "Reach level 10", icon: "Crown", test: (s) => s.level >= 10 },
];

export interface EarnedBadge extends BadgeDef {
  earned: boolean;
}

// ---------- Daily quests ----------

export interface TodayActivity {
  habitsCompletedToday: number;
  totalHabits: number;
  journalEntriesToday: number;
  tradesToday: number;
  chartAnalysesToday: number;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  xp: number;
  test: (today: TodayActivity) => boolean;
  progress: (today: TodayActivity) => string;
}

export const QUESTS: QuestDef[] = [
  {
    id: "all_habits",
    title: "Complete every habit",
    description: "Tick all your habits today",
    xp: 15,
    test: (t) => t.totalHabits > 0 && t.habitsCompletedToday >= t.totalHabits,
    progress: (t) => (t.totalHabits > 0 ? `${Math.min(t.habitsCompletedToday, t.totalHabits)}/${t.totalHabits}` : "—"),
  },
  {
    id: "journal_today",
    title: "Write a journal entry",
    description: "Reflect in your journal today",
    xp: 20,
    test: (t) => t.journalEntriesToday > 0,
    progress: (t) => (t.journalEntriesToday > 0 ? "Done" : "0/1"),
  },
  {
    id: "take_action",
    title: "Take one trading action",
    description: "Log a trade or analyse a chart",
    xp: 15,
    test: (t) => t.tradesToday + t.chartAnalysesToday > 0,
    progress: (t) => `${Math.min(t.tradesToday + t.chartAnalysesToday, 1)}/1`,
  },
];

export interface EarnedQuest extends QuestDef {
  completed: boolean;
  progressLabel: string;
}

export function computeGamification(stats: ActivityStats, today: TodayActivity): {
  level: LevelInfo;
  badges: EarnedBadge[];
  quests: EarnedQuest[];
  questsCompletedToday: number;
  questXpEarnedToday: number;
} {
  const xp = computeXp(stats);
  const level = computeLevel(xp);
  const withLevel: ActivityStats & { level: number } = { ...stats, level: level.level };
  const badges: EarnedBadge[] = BADGES.map((b) => ({ ...b, earned: b.test(withLevel) }));
  const quests: EarnedQuest[] = QUESTS.map((q) => ({
    ...q,
    completed: q.test(today),
    progressLabel: q.progress(today),
  }));
  return {
    level,
    badges,
    quests,
    questsCompletedToday: quests.filter((q) => q.completed).length,
    questXpEarnedToday: quests.filter((q) => q.completed).reduce((sum, q) => sum + q.xp, 0),
  };
}
