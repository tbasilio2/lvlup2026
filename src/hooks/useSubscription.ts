import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Tier = "free" | "entry";

export interface SubscriptionState {
  tier: Tier;
  status: string;
  currentPeriodEnd: string | null;
  hasFullAccess: boolean;
  loading: boolean;
}

export const useSubscription = (): SubscriptionState => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    tier: "free",
    status: "inactive",
    currentPeriodEnd: null,
    hasFullAccess: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setState({ tier: "free", status: "inactive", currentPeriodEnd: null, hasFullAccess: false, loading: false });
      return;
    }
    supabase
      .from("subscriptions")
      .select("tier, status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const tier = (data?.tier as Tier) ?? "free";
        const status = data?.status ?? "inactive";
        const end = data?.current_period_end ?? null;
        const notExpired = !end || new Date(end).getTime() > Date.now();
        setState({
          tier,
          status,
          currentPeriodEnd: end,
          hasFullAccess: tier !== "free" && status === "active" && notExpired,
          loading: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
};
