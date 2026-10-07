export type Tier = "free" | "entry" | "journal" | "pro" | "elite" | "lifetime";
export type BillingInterval = "monthly" | "yearly";
export const PUBLIC_PLANS = {
  free: { name: "Free", monthly: 0, yearly: 0, tagline: "Build your trading process.", features: ["Habit tracker and goals", "10 manual trades", "P&L calendar and basic analytics", "Trade notes and screenshots"] },
  pro: { name: "Pro", monthly: 29, yearly: 249, tagline: "Measure and refine your edge.", features: ["Unlimited manual trades", "MT5 sync every 12 hours", "Full analytics and strategy tracking", "Habits, goals and reflection journal", "AI-assisted chart and trade review"] },
  elite: { name: "Elite", monthly: 49, yearly: 399, tagline: "A deeper view of your process.", features: ["Everything in Pro", "Multi-broker sync · beta platforms", "Multiple connected accounts", "Advanced analytics", "Advanced AI and weekly trade review", "Priority support / community · coming soon"] },
} as const;
export const isTier = (value: unknown): value is Tier => typeof value === "string" && ["free", "entry", "journal", "pro", "elite", "lifetime"].includes(value);
export function hasFeature(tier: Tier, paid: boolean, trial: boolean, legacy: boolean, feature: string) {
  if (["goals", "trading", "basic_analytics"].includes(feature)) return true;
  if (trial) return true;
  if (!paid) return false;
  if (tier === "lifetime" || tier === "elite" || (tier === "pro" && legacy)) return true;
  if (tier === "pro") return ["journal", "unlimited_trades", "mt5_sync", "analytics", "ai_review", "reflection_ai"].includes(feature);
  return tier === "journal" && ["journal", "reflection_ai"].includes(feature);
}
export function planLabel(tier: Tier, paid: boolean, legacy: boolean) {
  if (!paid) return "Free";
  if (legacy || ["entry", "journal", "lifetime"].includes(tier)) return `Legacy ${tier === "lifetime" ? "Lifetime" : tier.charAt(0).toUpperCase() + tier.slice(1)}`;
  return tier === "elite" ? "Elite" : "Pro";
}
