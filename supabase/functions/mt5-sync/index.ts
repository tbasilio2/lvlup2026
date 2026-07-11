import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

function clientHost(region: string) {
  // MetaApi client API is regional
  return `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
}

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
    const { accountId } = await req.json();
    if (!accountId) {
      return new Response(JSON.stringify({ error: "Missing accountId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: acct, error: acctErr } = await admin
      .from("mt5_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (acctErr || !acct) {
      return new Response(JSON.stringify({ error: "Account not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch state + region from MetaApi
    const infoRes = await fetch(`${PROVISIONING}/users/current/accounts/${acct.metaapi_account_id}`, {
      headers: { "auth-token": metaToken },
    });
    const info = await infoRes.json().catch(() => ({}));
    const region = info.region || "new-york";
    const state = info.state || acct.state;

    await admin.from("mt5_accounts").update({ state }).eq("id", acct.id);

    if (state !== "DEPLOYED") {
      return new Response(JSON.stringify({ ok: false, state, message: "Account not yet DEPLOYED. Try again in ~30s." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch history deals for last 6 months
    const now = new Date();
    const from = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 180);
    const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, ".000Z");
    const url = `${clientHost(region)}/users/current/accounts/${acct.metaapi_account_id}/history-deals/time/${encodeURIComponent(fmt(from))}/${encodeURIComponent(fmt(now))}`;
    const dealsRes = await fetch(url, { headers: { "auth-token": metaToken } });
    if (!dealsRes.ok) {
      const detail = await dealsRes.text();
      await admin.from("mt5_accounts").update({ last_error: detail.slice(0, 500) }).eq("id", acct.id);
      return new Response(JSON.stringify({ error: "Failed to fetch deals", detail }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const deals: any[] = await dealsRes.json();

    // Group by positionId: DEAL_TYPE_BUY/SELL with entryType IN/OUT
    const positions = new Map<string, { in?: any; out?: any; }>();
    for (const d of deals) {
      const type = (d.type || "").toUpperCase();
      if (!type.includes("BUY") && !type.includes("SELL")) continue;
      const pid = d.positionId || d.id;
      if (!positions.has(pid)) positions.set(pid, {});
      const bucket = positions.get(pid)!;
      const entryType = (d.entryType || "").toUpperCase();
      if (entryType.includes("IN")) bucket.in = d;
      else if (entryType.includes("OUT")) bucket.out = d;
    }

    const rows: any[] = [];
    for (const [pid, { in: inD, out: outD }] of positions) {
      if (!inD) continue;
      const isLong = (inD.type || "").toUpperCase().includes("BUY");
      const commission = (inD.commission || 0) + (outD?.commission || 0);
      const swap = (inD.swap || 0) + (outD?.swap || 0);
      const profit = outD ? (outD.profit || 0) : 0;
      rows.push({
        user_id: userId,
        mt5_account_id: acct.id,
        metaapi_deal_id: pid,
        symbol: (inD.symbol || "UNKNOWN").toUpperCase(),
        direction: isLong ? "long" : "short",
        entry_price: Number(inD.price) || 0,
        exit_price: outD ? Number(outD.price) || 0 : null,
        quantity: Number(inD.volume) || 0,
        entry_date: inD.time || new Date().toISOString(),
        exit_date: outD ? (outD.time || null) : null,
        pnl: outD ? profit + commission + swap : null,
        fees: Math.abs(commission) + Math.abs(swap),
        status: outD ? "closed" : "open",
      });
    }

    let imported = 0;
    if (rows.length) {
      const { error: upErr, count } = await admin
        .from("trades")
        .upsert(rows, { onConflict: "user_id,metaapi_deal_id", count: "exact", ignoreDuplicates: false });
      if (upErr) {
        return new Response(JSON.stringify({ error: "Upsert failed", detail: upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      imported = count ?? rows.length;
    }

    await admin.from("mt5_accounts").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", acct.id);

    return new Response(JSON.stringify({ ok: true, imported, positions: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
