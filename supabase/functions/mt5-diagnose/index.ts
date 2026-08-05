import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("MT5_SYNC_CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) return json({ error: "Unauthorized" }, 401);

  const metaToken = Deno.env.get("METAAPI_TOKEN");
  if (!metaToken) return json({ error: "METAAPI_TOKEN not configured" }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: accounts } = await admin.from("mt5_accounts").select("*").not("metaapi_account_id", "is", null);

  const out = [];
  for (const a of accounts ?? []) {
    const res = await fetch(`${PROVISIONING}/users/current/accounts/${a.metaapi_account_id}`, {
      headers: { "auth-token": metaToken },
    });
    const info = await res.json().catch(() => ({}));
    out.push({ accountId: a.id, httpStatus: res.status, info });
  }
  return json({ accounts: out });
});
