import { useSyncExternalStore } from "react";

export type CurrencyCode = "ZAR" | "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "JPY" | "CHF" | "NZD" | "INR";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  ZAR: { code: "ZAR", symbol: "R",    locale: "en-ZA", label: "South African Rand" },
  USD: { code: "USD", symbol: "$",    locale: "en-US", label: "US Dollar" },
  EUR: { code: "EUR", symbol: "€",    locale: "en-IE", label: "Euro" },
  GBP: { code: "GBP", symbol: "£",    locale: "en-GB", label: "British Pound" },
  AUD: { code: "AUD", symbol: "A$",   locale: "en-AU", label: "Australian Dollar" },
  CAD: { code: "CAD", symbol: "C$",   locale: "en-CA", label: "Canadian Dollar" },
  JPY: { code: "JPY", symbol: "¥",    locale: "ja-JP", label: "Japanese Yen" },
  CHF: { code: "CHF", symbol: "CHF",  locale: "de-CH", label: "Swiss Franc" },
  NZD: { code: "NZD", symbol: "NZ$",  locale: "en-NZ", label: "New Zealand Dollar" },
  INR: { code: "INR", symbol: "₹",    locale: "en-IN", label: "Indian Rupee" },
};

const STORAGE_KEY = "app.currency";

const readStored = (): CurrencyCode => {
  if (typeof window === "undefined") return "ZAR";
  const v = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
  return v && v in CURRENCIES ? v : "ZAR";
};

let current: CurrencyCode = readStored();
const listeners = new Set<() => void>();

export const getCurrency = (): CurrencyCode => current;

export const setCurrency = (code: CurrencyCode) => {
  if (!(code in CURRENCIES) || code === current) return;
  current = code;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, code);
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Hook: current currency code, re-renders on change. */
export const useCurrency = (): CurrencyCode =>
  useSyncExternalStore(subscribe, getCurrency, getCurrency);

// Default digits per currency (JPY has no minor units).
const defaultDigits = (code: CurrencyCode) => (code === "JPY" ? 0 : 2);

const nfCache = new Map<string, Intl.NumberFormat>();
const nf = (locale: string, digits: number) => {
  const key = `${locale}|${digits}`;
  let f = nfCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    nfCache.set(key, f);
  }
  return f;
};

/**
 * Format a number in the user's selected currency.
 * - Prepends the currency symbol (e.g. "R 1 234.50", "$ 1,234.50").
 * - `signed` prefixes an explicit "+" on positives.
 */
export function formatMoney(
  n: number | null | undefined,
  opts: { signed?: boolean; digits?: number } = {},
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const info = CURRENCIES[current];
  const digits = opts.digits ?? defaultDigits(current);
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : opts.signed ? "+" : "";
  return `${sign}${info.symbol} ${nf(info.locale, digits).format(abs)}`;
}

/**
 * Compact form for small cells (e.g. calendar squares).
 * "R 1.2k", "$ 950", "-€ 2.4k"
 */
export function formatMoneyCompact(
  n: number | null | undefined,
  opts: { signed?: boolean } = {},
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const info = CURRENCIES[current];
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : opts.signed ? "+" : "";
  let body: string;
  if (abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) body = `${(abs / 1_000).toFixed(1)}k`;
  else body = abs.toFixed(0);
  return `${sign}${info.symbol} ${body}`;
}

// Legacy exports (kept for any leftover imports; reflect current selection).
export const CURRENCY = current;
export const CURRENCY_SYMBOL = CURRENCIES[current].symbol;
