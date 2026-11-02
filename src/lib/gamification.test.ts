import { describe, it, expect } from "vitest";
import { computeXp, computeLevel, computeGamification, XP_VALUES, BADGES, QUESTS } from "@/lib/gamification";
import type { ActivityStats, TodayActivity } from "@/lib/gamification";

const baseStats: ActivityStats = {
  habitLogs: 0, journalEntries: 0, trades: 0, goalsCompleted: 0,
  chartAnalyses: 0, weeklyReports: 0, bestStreak: 0, perfectDays: 0,
};

const baseToday: TodayActivity = {
  habitsCompletedToday: 0, totalHabits: 0, journalEntriesToday: 0,
  tradesToday: 0, chartAnalysesToday: 0,
};

describe("computeXp", () => {
  it("sums XP for each action at the published values", () => {
    const xp = computeXp({
      ...baseStats,
      habitLogs: 10, perfectDays: 2, journalEntries: 3, trades: 4,
      chartAnalyses: 1, goalsCompleted: 1, weeklyReports: 1,
    });
    expect(xp).toBe(
      10 * XP_VALUES.habitCheckIn + 2 * XP_VALUES.perfectDay + 3 * XP_VALUES.journalEntry +
      4 * XP_VALUES.tradeLogged + 1 * XP_VALUES.chartAnalysis + 1 * XP_VALUES.goalCompleted +
      1 * XP_VALUES.weeklyReport,
    );
  });

  it("is zero with no activity", () => {
    expect(computeXp(baseStats)).toBe(0);
  });
});

describe("computeLevel", () => {
  it("starts at level 1 Rookie with 0 XP", () => {
    const l = computeLevel(0);
    expect(l.level).toBe(1);
    expect(l.name).toBe("Rookie");
    expect(l.nextLevelXp).toBe(100);
    expect(l.progress).toBe(0);
  });

  it("levels up exactly at each threshold", () => {
    expect(computeLevel(99).level).toBe(1);
    expect(computeLevel(100).level).toBe(2);
    expect(computeLevel(100).name).toBe("Starter");
  });

  it("reports full progress at max level with no next level", () => {
    const l = computeLevel(999999);
    expect(l.level).toBe(13);
    expect(l.name).toBe("Legend");
    expect(l.nextLevelXp).toBeNull();
    expect(l.progress).toBe(1);
  });
});

describe("computeGamification", () => {
  it("marks badges earned when their threshold is met", () => {
    const result = computeGamification(
      { ...baseStats, habitLogs: 7, bestStreak: 3 },
      baseToday,
    );
    const first = result.badges.find((b) => b.id === "first_step");
    const streak3 = result.badges.find((b) => b.id === "streak_3");
    const streak7 = result.badges.find((b) => b.id === "streak_7");
    expect(first?.earned).toBe(true);
    expect(streak3?.earned).toBe(true);
    expect(streak7?.earned).toBe(false);
  });

  it("completes the all-habits quest only when every habit is done today", () => {
    const partial = computeGamification(baseStats, { ...baseToday, habitsCompletedToday: 1, totalHabits: 3 });
    expect(partial.quests.find((q) => q.id === "all_habits")?.completed).toBe(false);

    const full = computeGamification(baseStats, { ...baseToday, habitsCompletedToday: 3, totalHabits: 3 });
    expect(full.quests.find((q) => q.id === "all_habits")?.completed).toBe(true);
    expect(full.questXpEarnedToday).toBe(15);
  });

  it("completes the trading-action quest for a trade or a chart analysis", () => {
    const trade = computeGamification(baseStats, { ...baseToday, tradesToday: 1 });
    const analysis = computeGamification(baseStats, { ...baseToday, chartAnalysesToday: 1 });
    expect(trade.quests.find((q) => q.id === "take_action")?.completed).toBe(true);
    expect(analysis.quests.find((q) => q.id === "take_action")?.completed).toBe(true);
  });

  it("awards level-5 badge only at level 5", () => {
    expect(computeGamification({ ...baseStats, habitLogs: 1 }, baseToday).badges.find((b) => b.id === "level_5")?.earned).toBe(false);
    // 1 journal = 20xp... need >= 900 xp for level 5: 90 habit logs = 900xp exactly
    expect(computeGamification({ ...baseStats, habitLogs: 90 }, baseToday).badges.find((b) => b.id === "level_5")?.earned).toBe(true);
  });

  it("defines unique ids for badges and quests", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
  });
});
