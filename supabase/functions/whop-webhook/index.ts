import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WHOP_PRODUCTS, resolveTier } from "../_shared/storeProducts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-whop-signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEACTIVATING = [
  "membership.went_invalid",
  "membership.cancelled",
  "membership.deactivated",
  "payment.failed",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = await req.json().catch(() => null);
    if (!payload) return json({ error: "Invalid payload" }, 400);

    const event = String(payload.action ?? payload.event ?? "");
    const d = payload.data ?? payload;
    const membershipId = d.id ?? d.membership_id ?? null;
    const licenseKey = d.license_key ?? membershipId;
    const email = d.email ?? d.user?.email ?? null;

    if (!membershipId && !email) return json({ ignored: true });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    if (membershipId) {
      const { data } = await admin
        .from("subscriptions")
        .select("user_id")
        .eq("provider_subscription_id", String(membershipId))
        .maybeSingle();
      userId = data?.user_id ?? null;
    }
    if (!userId && email) {
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = users?.users?.find(
        (u) => u.email?.toLowerCase() === String(email).toLowerCase(),
      );
      userId = match?.id ?? null;
    }
    if (!userId) return json({ pending: true });

    const inactive =
      DEACTIVATING.includes(event) ||
      d.valid === false ||
      ["cancelled", "expired", "past_due", "unresolved"].includes(String(d.status));

    const tier = resolveTier(WHOP_PRODUCTS, [d.plan, d.plan_id, d.product, d.product_id, d.name]) ?? "pro";
    const renewal = d.renewal_period_end ?? d.expires_at ?? null;

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        tier: inactive ? "free" : tier,
        status: inactive ? "inactive" : "active",
        provider: "whop",
        license_key: licenseKey ? String(licenseKey) : null,
        provider_subscription_id: membershipId ? String(membershipId) : null,
        provider_email: email ? String(email) : null,
        current_period_end: renewal ? new Date(Number(renewal) * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return json({ success: true });
  } catch (_e) {
    return json({ error: "Webhook processing failed" }, 500);
  }
});
