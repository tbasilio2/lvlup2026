export type Mood = "amazing" | "good" | "okay" | "low" | "rough";

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: Mood;
  gratitude: string;
  intention: string;
  reflection: string;
  wins: string;
  profitLoss: number | null;
  fees: number | null;
  createdAt: number;
}

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: "amazing", emoji: "✨", label: "Amazing" },
  { value: "good", emoji: "😊", label: "Good" },
  { value: "okay", emoji: "😐", label: "Okay" },
  { value: "low", emoji: "😔", label: "Low" },
  { value: "rough", emoji: "🌧️", label: "Rough" },
];

export const PROMPTS = {
  gratitude: [
    "What are you grateful for today?",
    "What small moment brought you joy?",
    "Who made a positive impact on you today?",
  ],
  intention: [
    "What is your intention for today?",
    "What do you want to focus your energy on?",
    "How do you want to show up today?",
  ],
  reflection: [
    "What did you learn about yourself today?",
    "What challenged you and how did you respond?",
    "What would you do differently?",
  ],
  wins: [
    "What went well today?",
    "What are you proud of?",
    "What progress did you make, however small?",
  ],
};

export function getRandomPrompt(category: keyof typeof PROMPTS): string {
  const prompts = PROMPTS[category];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

const STORAGE_KEY = "journal_entries";

export function getEntries(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveEntries(entries: JournalEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getMoodColor(mood: Mood): string {
  switch (mood) {
    case "amazing": return "hsl(var(--streak-glow))";
    case "good": return "hsl(var(--habit-complete))";
    case "okay": return "hsl(var(--primary))";
    case "low": return "hsl(var(--muted-foreground))";
    case "rough": return "hsl(var(--destructive))";
  }
}

export function getMoodTailwind(mood: Mood): string {
  switch (mood) {
    case "amazing": return "text-streak-glow";
    case "good": return "text-accent";
    case "okay": return "text-primary";
    case "low": return "text-muted-foreground";
    case "rough": return "text-destructive";
  }
}
