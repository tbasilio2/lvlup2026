import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Tier = "free" | "entry" | "journal" | "pro";

export const TIERS: Record<Tier, { name: string; price: number | null; tagline: string }> = {
  free: { name: "Free", price: null, tagline: "Habit tracker only" },
  entry: { name: "Entry", price: 17, tagline: "Habit tracker + Goals" },
  journal: { name: "Journal", price: 25, tagline: "Habit tracker + Journal" },
  pro: { name: "Pro", price: 44, tagline: "Everything included" },
};

/** Tiers that unlock each paid feature. */
const FEATURE_ACCESS: Record<string, Tier[]> = {
  goals: ["entry", "pro"],
  journal: ["journal", "pro"],
  trading: ["pro"],
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
  canAccess: (feature: string) => boolean;
  loading: boolean;
}

const isValidTier = (t: string | undefined): t is Tier => t === "entry" || t === "journal" || t === "pro";

const EMPTY: Omit<SubscriptionState, "canAccess"> = {
  tier: "free",
  status: "inactive",
  currentPeriodEnd: null,
  isActivePaid: false,
  isTrialing: false,
  trialEndsAt: null,
  trialDaysLeft: 0,
  loading: false,
};

const daysLeft = (iso: string | null): number => {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
};

export const useSubscription = (): SubscriptionState => {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<SubscriptionState, "canAccess">>({ ...EMPTY, loading: true });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ ...EMPTY });
      return;
    }
    supabase
      .from("subscriptions")
      .select("tier, status, current_period_end, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const tier: Tier = isValidTier(data?.tier) ? data.tier : "free";
        const status = data?.status ?? "inactive";
        const end = data?.current_period_end ?? null;
        const trialEndsAt = (data as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null;
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
          loading: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const canAccess = (feature: string): boolean => {
    if (state.loading) return false;
    if (state.isTrialing) return true;
    if (state.tier === "free" || !state.isActivePaid) return false;
    const allowed = FEATURE_ACCESS[feature];
    return allowed ? allowed.includes(state.tier) : false;
  };

  return { ...state, canAccess };
};
