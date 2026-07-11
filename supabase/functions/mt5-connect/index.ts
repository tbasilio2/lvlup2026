import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = claimsData.claims.sub;

  const metaToken = Deno.env.get("METAAPI_TOKEN");
  if (!metaToken) {
    return new Response(JSON.stringify({ error: "METAAPI_TOKEN not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json();
    const { label, server, login, password, region = "new-york", platform = "mt5" } = body || {};
    if (!server || !login || !password) {
      return new Response(JSON.stringify({ error: "Missing server / login / password" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create MetaApi account (uses managed provisioning profile)
    const createRes = await fetch(`${PROVISIONING}/users/current/accounts`, {
      method: "POST",
      headers: { "auth-token": metaToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: label || `MT5 ${login}`,
        type: "cloud-g2",
        login: String(login),
        password: String(password),
        server: String(server),
        platform,
        magic: 0,
        application: "MetaApi",
        region,
        keywords: [],
      }),
    });

    const createJson = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      return new Response(JSON.stringify({ error: "MetaApi create failed", detail: createJson }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const metaapiAccountId = createJson.id;

    // Deploy (best-effort; some accounts auto-deploy)
    await fetch(`${PROVISIONING}/users/current/accounts/${metaapiAccountId}/deploy`, {
      method: "POST",
      headers: { "auth-token": metaToken },
    }).catch(() => {});

    // Persist row (service role bypasses RLS but we set user_id explicitly)
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row, error: insErr } = await admin.from("mt5_accounts").insert({
      user_id: userId,
      label: label || `MT5 ${login}`,
      broker_server: String(server),
      login: String(login),
      platform,
      metaapi_account_id: metaapiAccountId,
      state: "DEPLOYING",
    }).select().single();

    if (insErr) {
      return new Response(JSON.stringify({ error: "DB insert failed", detail: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ account: row }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
