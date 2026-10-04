export type Tier = "entry" | "journal" | "pro" | "lifetime";

/**
 * Maps store product identifiers to app tiers.
 * Replace the placeholder ids with your real Gumroad permalinks / product ids
 * and Whop plan or product ids. Matching is case-insensitive.
 */
export const GUMROAD_PRODUCTS: Record<string, Tier> = {
  entry: "entry",
  journal: "journal",
  pro: "pro",
  lifetime: "lifetime",
};

export const WHOP_PRODUCTS: Record<string, Tier> = {
  plan_entry: "entry",
  plan_journal: "journal",
  plan_pro: "pro",
  plan_lifetime: "lifetime",
};

const normalise = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** Resolve a tier from any set of candidate identifiers/names coming from the store. */
export function resolveTier(
  map: Record<string, Tier>,
  candidates: (string | null | undefined)[],
): Tier | null {
  const lookup = new Map(Object.entries(map).map(([k, v]) => [normalise(k), v]));
  for (const c of candidates) {
    const key = normalise(c);
    if (!key) continue;
    const direct = lookup.get(key);
    if (direct) return direct;
  }
  // Fallback: infer from names containing the tier word.
  for (const c of candidates) {
    const key = normalise(c);
    if (key.includes("lifetime")) return "lifetime";
    if (key.includes("pro")) return "pro";
    if (key.includes("journal")) return "journal";
    if (key.includes("entry")) return "entry";
  }
  return null;
}
