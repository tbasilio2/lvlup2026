import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GUMROAD_PRODUCTS, resolveTier } from "../_shared/storeProducts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const get = (k: string) => params.get(k) ?? undefined;

    const email = get("email");
    const licenseKey = get("license_key");
    const permalink = get("permalink") ?? get("product_permalink");
    const productName = get("product_name");
    const refunded = get("refunded") === "true";
    const cancelled = Boolean(get("cancelled")) || Boolean(get("subscription_cancelled_at"));
    const ended = Boolean(get("subscription_ended_at")) || Boolean(get("subscription_failed_at"));

    if (!email && !licenseKey) return json({ ignored: true });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find the account: by stored license key first, then by the buyer's email.
    let userId: string | null = null;
    if (licenseKey) {
      const { data } = await admin
        .from("subscriptions")
        .select("user_id")
        .eq("license_key", licenseKey)
        .maybeSingle();
      userId = data?.user_id ?? null;
    }
    if (!userId && email) {
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      userId = match?.id ?? null;
    }
    // No account yet — the buyer can redeem the key after signing up.
    if (!userId) return json({ pending: true });

    const inactive = refunded || cancelled || ended;
    const tier = resolveTier(GUMROAD_PRODUCTS, [permalink, productName]) ?? "entry";

    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        tier: inactive ? "free" : tier,
        status: inactive ? "inactive" : "active",
        provider: "gumroad",
        license_key: licenseKey ?? null,
        provider_email: email ?? null,
        provider_subscription_id: get("subscription_id") ?? get("sale_id") ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return json({ success: true });
  } catch (_e) {
    return json({ error: "Webhook processing failed" }, 500);
  }
});
