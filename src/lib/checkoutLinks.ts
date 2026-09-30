import type { Tier } from "@/hooks/useSubscription";

export type PaidTier = Exclude<Tier, "free">;
export type StoreId = "whop" | "gumroad";

/**
 * Checkout links for each paid plan.
 * Replace the placeholder URLs below with your real Whop and Gumroad product links.
 */
export const CHECKOUT_LINKS: Record<PaidTier, Record<StoreId, string>> = {
  entry: {
    whop: "https://whop.com/your-store/entry-17/",
    gumroad: "https://yourstore.gumroad.com/l/entry",
  },
  journal: {
    whop: "https://whop.com/your-store/journal-25/",
    gumroad: "https://yourstore.gumroad.com/l/journal",
  },
  pro: {
    whop: "https://whop.com/your-store/pro-44/",
    gumroad: "https://yourstore.gumroad.com/l/pro",
  },
};

export const STORE_LABELS: Record<StoreId, string> = {
  whop: "Whop",
  gumroad: "Gumroad",
};

/** Build a checkout URL with the buyer's email prefilled so the purchase links to their account. */
export const checkoutUrl = (tier: PaidTier, store: StoreId, email?: string | null): string => {
  const base = CHECKOUT_LINKS[tier][store];
  if (!email) return base;
  const url = new URL(base);
  // Whop uses ?email=, Gumroad prefills with ?email= too (wanted[] params ignored otherwise)
  url.searchParams.set("email", email);
  return url.toString();
};

export const isPlaceholderLink = (url: string): boolean =>
  url.includes("your-store") || url.includes("yourstore");
