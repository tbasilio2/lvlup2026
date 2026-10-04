import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { syncBrokerAccount } from "../_shared/brokerSync.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f-]{36}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Cron mode: sync every account
  const cron = Deno.env.get("MT5_SYNC_CRON_SECRET");
  if (cron && req.headers.get("x-cron-secret") === cron) {
    const { data } = await admin.from("broker_accounts").select("*").neq("platform", "ctrader");
    const results = [];
    for (const a of data ?? []) results.push(await syncBrokerAccount(admin, a));
    return json({ ok: true, results });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await supa.auth.getClaims(authHeader.slice(7));
  const userId = claims?.claims?.sub;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const { accountId } = await req.json().catch(() => ({}));
  let q = admin.from("broker_accounts").select("*").eq("user_id", userId);
  if (accountId) {
    if (typeof accountId !== "string" || !UUID.test(accountId)) return json({ error: "Invalid accountId" }, 400);
    q = q.eq("id", accountId);
  }
  const { data: accts } = await q;
  const results = [];
  for (const a of accts ?? []) results.push(await syncBrokerAccount(admin, a));
  return json({ ok: true, results });
});
