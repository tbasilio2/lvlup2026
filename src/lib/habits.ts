export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
}

export interface HabitLog {
  [date: string]: string[]; // date -> array of completed habit ids
}

const HABITS_KEY = "habits-2026";
const LOG_KEY = "habit-log-2026";

export const defaultHabits: Habit[] = [
  { id: "1", name: "Meditate", emoji: "🧘", createdAt: "2026-01-01" },
  { id: "2", name: "Exercise", emoji: "💪", createdAt: "2026-01-01" },
  { id: "3", name: "Read", emoji: "📖", createdAt: "2026-01-01" },
  { id: "4", name: "Hydrate", emoji: "💧", createdAt: "2026-01-01" },
  { id: "5", name: "Journal", emoji: "✍️", createdAt: "2026-01-01" },
];

export function getHabits(): Habit[] {
  const stored = localStorage.getItem(HABITS_KEY);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(HABITS_KEY, JSON.stringify(defaultHabits));
  return defaultHabits;
}

export function saveHabits(habits: Habit[]) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export function getLog(): HabitLog {
  const stored = localStorage.getItem(LOG_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function saveLog(log: HabitLog) {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getStreak(habitId: string, log: HabitLog, fromDate: Date): number {
  let streak = 0;
  const d = new Date(fromDate);
  // Check today first
  const todayKey = formatDate(d);
  if (!(log[todayKey]?.includes(habitId))) {
    // If not done today, start checking from yesterday
    d.setDate(d.getDate() - 1);
  }
  
  while (true) {
    const key = formatDate(d);
    if (log[key]?.includes(habitId)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
