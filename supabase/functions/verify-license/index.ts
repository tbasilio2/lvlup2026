import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GUMROAD_PRODUCTS, WHOP_PRODUCTS, resolveTier, type Tier } from "../_shared/storeProducts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Resolved {
  provider: "gumroad" | "whop";
  tier: Tier;
  subscriptionId: string | null;
  email: string | null;
  periodEnd: string | null;
}

async function checkGumroad(licenseKey: string): Promise<Resolved | null> {
  for (const permalink of Object.keys(GUMROAD_PRODUCTS)) {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_permalink: permalink,
        license_key: licenseKey,
        increment_uses_count: "false",
      }),
    }).catch(() => null);
    if (!res?.ok) continue;
    const data = await res.json().catch(() => null);
    if (!data?.success || !data?.purchase) continue;
    const p = data.purchase;
    if (p.refunded || p.chargebacked || p.subscription_cancelled_at || p.subscription_failed_at) {
      continue;
    }
    const tier =
      resolveTier(GUMROAD_PRODUCTS, [permalink, p.product_permalink, p.product_name]) ?? "entry";
    return {
      provider: "gumroad",
      tier,
      subscriptionId: p.subscription_id ?? p.sale_id ?? null,
      email: p.email ?? null,
      periodEnd: null,
    };
  }
  return null;
}

async function checkWhop(licenseKey: string): Promise<Resolved | null> {
  const apiKey = Deno.env.get("WHOP_API_KEY");
  if (!apiKey) return null;
  const res = await fetch(`https://api.whop.com/api/v2/memberships/${encodeURIComponent(licenseKey)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => null);
  if (!res?.ok) return null;
  const m = await res.json().catch(() => null);
  if (!m?.id) return null;
  const valid = m.valid === true || ["active", "trialing", "completed"].includes(String(m.status));
  if (!valid) return null;
  const tier = resolveTier(WHOP_PRODUCTS, [m.plan, m.product, m.plan_id, m.product_id, m.name]) ?? "pro";
  const renewal = m.renewal_period_end ?? m.expires_at ?? null;
  return {
    provider: "whop",
    tier,
    subscriptionId: String(m.id),
    email: m.email ?? m.user?.email ?? null,
    periodEnd: renewal ? new Date(Number(renewal) * 1000).toISOString() : null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: authErr } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub as string | undefined;
    if (authErr || !userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const licenseKey = typeof body?.licenseKey === "string" ? body.licenseKey.trim() : "";
    if (!licenseKey || licenseKey.length < 6 || licenseKey.length > 200) {
      return json({ error: "Enter the license or membership key from your purchase receipt." }, 400);
    }

    const resolved = (await checkGumroad(licenseKey)) ?? (await checkWhop(licenseKey));
    if (!resolved) {
      return json(
        { error: "We couldn't find an active purchase for that key. Check it and try again." },
        404,
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Key already bound to someone else?
    const { data: owner } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("license_key", licenseKey)
      .maybeSingle();
    if (owner && owner.user_id !== userId) {
      return json({ error: "That key is already in use on another account." }, 409);
    }

    const { error: upErr } = await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        tier: resolved.tier,
        status: "active",
        provider: resolved.provider,
        license_key: licenseKey,
        provider_subscription_id: resolved.subscriptionId,
        provider_email: resolved.email,
        current_period_end: resolved.periodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (upErr) return json({ error: "Could not save your membership. Please try again." }, 500);

    return json({ success: true, tier: resolved.tier, provider: resolved.provider });
  } catch (_e) {
    return json({ error: "Something went wrong verifying that key." }, 500);
  }
});
