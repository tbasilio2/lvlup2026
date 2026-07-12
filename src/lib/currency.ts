export const CURRENCY = "ZAR";
export const CURRENCY_SYMBOL = "R";

const nfCache = new Map<number, Intl.NumberFormat>();
const nf = (digits: number) => {
  let f = nfCache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat("en-ZA", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    nfCache.set(digits, f);
  }
  return f;
};

/**
 * Format a number as South African Rand.
 * - Prepends "R " (matches the mono/terminal aesthetic; no NBSP from Intl currency).
 * - `signed` prefixes an explicit "+" on positives (e.g. "+R 1 234.50").
 */
export function formatMoney(
  n: number | null | undefined,
  opts: { signed?: boolean; digits?: number } = {},
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const digits = opts.digits ?? 2;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : opts.signed ? "+" : "";
  return `${sign}${CURRENCY_SYMBOL} ${nf(digits).format(abs)}`;
}

/**
 * Compact form for small cells (e.g. calendar squares).
 * "R 1.2k", "R 950", "-R 2.4k"
 */
export function formatMoneyCompact(
  n: number | null | undefined,
  opts: { signed?: boolean } = {},
): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : opts.signed ? "+" : "";
  let body: string;
  if (abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) body = `${(abs / 1_000).toFixed(1)}k`;
  else body = abs.toFixed(0);
  return `${sign}${CURRENCY_SYMBOL} ${body}`;
}
