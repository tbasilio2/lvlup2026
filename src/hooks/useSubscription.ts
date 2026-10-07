import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { hasFeature, isTier, type Tier } from "@/lib/plans";
export type { Tier } from "@/lib/plans";

export const TIERS: Record<Tier, { name: string; price: number | null; tagline: string; oneTime?: boolean }> = {
  free: { name: "Free", price: 0, tagline: "Your trader performance foundation" },
  entry: { name: "Entry", price: 17, tagline: "Habit tracker + Goals" },
  journal: { name: "Journal", price: 25, tagline: "Habit tracker + Journal" },
  pro: { name: "Pro", price: 29, tagline: "Full journal, MT5 and performance review" },
  elite: { name: "Elite", price: 49, tagline: "Multi-broker and advanced review" },
  lifetime: { name: "Lifetime", price: 99, tagline: "Everything, forever — one payment", oneTime: true },
};

export const TRIAL_DAYS = 10;

export interface SubscriptionState {
  tier: Tier;
  status: string;
  currentPeriodEnd: string | null;
  /** True when the subscription is paid, active, and not expired. */
  isActivePaid: boolean;
  /** True while the 10-day free trial is still running. */
  isTrialing: boolean;
  trialEndsAt: string | null;
  /** Whole days left in the trial (0 when no trial or expired). */
  trialDaysLeft: number;
  /** Which store the membership came from, when paid. */
  provider: string | null;
  isLegacy: boolean;
  canAccess: (feature: string) => boolean;
  refresh: () => void;
  loading: boolean;
}

const EMPTY: Omit<SubscriptionState, "canAccess" | "refresh"> = {
  tier: "free",
  status: "inactive",
  currentPeriodEnd: null,
  isActivePaid: false,
  isTrialing: false,
  trialEndsAt: null,
  trialDaysLeft: 0,
  provider: null,
  isLegacy: false,
  loading: false,
};


const daysLeft = (iso: string | null): number => {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
};

export const useSubscription = (): SubscriptionState => {
  const { user } = useAuth();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<Omit<SubscriptionState, "canAccess" | "refresh">>({
    ...EMPTY,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ ...EMPTY });
      return;
    }
    supabase
      .from("subscriptions")
      .select("tier, status, current_period_end, trial_ends_at, provider, plan_version")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const tier: Tier = isTier(data?.tier) ? data.tier : "free";
        const status = data?.status ?? "inactive";
        const end = data?.current_period_end ?? null;
        const row = data as { trial_ends_at?: string | null; provider?: string | null } | null;
        const trialEndsAt = row?.trial_ends_at ?? null;
        const notExpired = !end || new Date(end).getTime() > Date.now();
        const isActivePaid = tier !== "free" && status === "active" && notExpired;
        const trialDaysLeft = daysLeft(trialEndsAt);
        setState({
          tier,
          status,
          currentPeriodEnd: end,
          isActivePaid,
          isTrialing: !isActivePaid && trialDaysLeft > 0,
          trialEndsAt,
          trialDaysLeft,
          provider: row?.provider ?? null,
          isLegacy: data?.plan_version !== "current",
          loading: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user, nonce]);

  const canAccess = (feature: string): boolean => {
    if (state.loading) return false;
    return hasFeature(state.tier, state.isActivePaid, state.isTrialing, state.isLegacy, feature);
  };

  return { ...state, canAccess, refresh: () => setNonce((n) => n + 1) };

};
