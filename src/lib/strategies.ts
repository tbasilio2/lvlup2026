import { useSyncExternalStore } from "react";

const KEY = "top-strategies";
export const MAX_STRATEGIES = 3;

const DEFAULTS = ["Break & Retest", "Liquidity Sweep", "Fib Strategy"];

/** Rename legacy setups to their current names. */
const RENAMES: Record<string, string> = { "trend continuation": "Fib Strategy" };
const migrate = (list: string[]) => list.map((s) => RENAMES[s.trim().toLowerCase()] ?? s);

let cache: string[] | null = null;
const listeners = new Set<() => void>();

const read = (): string[] => {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = Array.isArray(parsed) ? migrate(parsed.filter((x) => typeof x === "string")).slice(0, MAX_STRATEGIES) : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache!;
};

const emit = () => listeners.forEach((l) => l());

export const getStrategies = (): string[] => read();

export const setStrategies = (list: string[]) => {
  const clean = list.map((s) => s.trim()).filter(Boolean).slice(0, MAX_STRATEGIES);
  cache = clean;
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    /* ignore */
  }
  emit();
};

/** Add a setup to the saved list (keeps the most recent MAX_STRATEGIES). */
export const rememberStrategy = (name: string) => {
  const n = name.trim();
  if (!n) return;
  const current = read();
  if (current.some((s) => s.toLowerCase() === n.toLowerCase())) return;
  setStrategies([n, ...current]);
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const useStrategies = (): string[] => useSyncExternalStore(subscribe, getStrategies, getStrategies);
