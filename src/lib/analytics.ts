import { supabase } from "@/integrations/supabase/client";
export type ConversionEvent = "landing_view" | "pricing_view" | "start_free_clicked" | "checkout_clicked" | "signup_completed" | "onboarding_completed" | "first_trade_added" | "broker_connect_clicked";
/** Aggregate, fire-and-forget events: deliberately no identity, URLs, inputs or trading data. */
export function trackEvent(event: ConversionEvent) {
  void supabase.from("conversion_events").insert({ event_name: event }).then(() => {});
}
