import { describe, it, expect } from "vitest";
import { getActiveDays, getCurrentStreak, getBestStreakEver } from "@/components/StreakWidget";
import { formatDate } from "@/hooks/useHabits";
import type { HabitLog } from "@/hooks/useHabits";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
};

describe("getActiveDays", () => {
  it("treats a day as active only when at least one habit is completed", () => {
    const log: HabitLog = { [daysAgo(1)]: [], [daysAgo(2)]: ["h1"] };
    expect(getActiveDays(log).has(daysAgo(1))).toBe(false);
    expect(getActiveDays(log).has(daysAgo(2))).toBe(true);
  });
});

describe("getCurrentStreak", () => {
  it("counts consecutive active days ending today", () => {
    const log: HabitLog = {
      [daysAgo(0)]: ["h1"],
      [daysAgo(1)]: ["h1"],
      [daysAgo(2)]: ["h1", "h2"],
    };
    expect(getCurrentStreak(getActiveDays(log))).toBe(3);
  });

  it("does not break the streak when today is not yet done", () => {
    const log: HabitLog = {
      [daysAgo(1)]: ["h1"],
      [daysAgo(2)]: ["h1"],
    };
    expect(getCurrentStreak(getActiveDays(log))).toBe(2);
  });

  it("resets at the first gap", () => {
    const log: HabitLog = { [daysAgo(0)]: ["h1"], [daysAgo(3)]: ["h1"] };
    expect(getCurrentStreak(getActiveDays(log))).toBe(1);
  });

  it("is zero with no active days", () => {
    expect(getCurrentStreak(getActiveDays({}))).toBe(0);
  });
});

describe("getBestStreakEver", () => {
  it("finds the longest historical run even if broken", () => {
    const log: HabitLog = {
      [daysAgo(0)]: ["h1"],
      [daysAgo(5)]: ["h1"],
      [daysAgo(6)]: ["h1"],
      [daysAgo(7)]: ["h1"],
      [daysAgo(8)]: ["h1"],
    };
    expect(getBestStreakEver(getActiveDays(log))).toBe(4);
  });

  it("is zero with no history", () => {
    expect(getBestStreakEver(getActiveDays({}))).toBe(0);
  });
});
