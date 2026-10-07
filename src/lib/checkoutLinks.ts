import type { Tier } from "@/hooks/useSubscription";

export type PaidTier = Exclude<Tier, "free">;
export type StoreId = "whop" | "gumroad";
export type PublicPaidTier = "pro" | "elite";
export type BillingInterval = "monthly" | "yearly";

// LAUNCH SETUP: insert real subscription product URLs here. Empty values deliberately disable payment.
export const PUBLIC_CHECKOUT_LINKS: Record<PublicPaidTier, Record<BillingInterval, Record<StoreId, string>>> = {
  pro: { monthly: { whop: "", gumroad: "" }, yearly: { whop: "", gumroad: "" } },
  elite: { monthly: { whop: "", gumroad: "" }, yearly: { whop: "", gumroad: "" } },
};
// Separate education checkout; never grants SaaS subscription entitlements.
export const PST_CHECKOUT_URL = "";
export const publicCheckoutUrl = (tier: PublicPaidTier, interval: BillingInterval, store: StoreId) => PUBLIC_CHECKOUT_LINKS[tier][interval][store];

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
  elite: { whop: "", gumroad: "" },
  lifetime: {
    whop: "https://whop.com/your-store/lifetime-99/",
    gumroad: "https://yourstore.gumroad.com/l/lifetime",
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
  !url || !url.startsWith("https://") || url.includes("your-store") || url.includes("yourstore");
