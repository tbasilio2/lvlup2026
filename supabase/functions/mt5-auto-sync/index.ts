import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { syncAccount } from "../_shared/mt5Sync.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("MT5_SYNC_CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) return json({ error: "Unauthorized" }, 401);

  const metaToken = Deno.env.get("METAAPI_TOKEN");
  if (!metaToken) return json({ error: "METAAPI_TOKEN not configured" }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: accounts, error } = await admin
      .from("mt5_accounts")
      .select("*")
      .not("metaapi_account_id", "is", null);

    if (error) return json({ error: "Failed to load accounts", detail: error.message }, 500);

    const results = [];
    for (const acct of accounts ?? []) {
      try {
        results.push(await syncAccount(admin, acct, metaToken));
      } catch (e) {
        results.push({ ok: false, accountId: acct.id, error: String(e) });
      }
    }

    const imported = results.reduce((s, r: any) => s + (r.imported ?? 0), 0);
    console.log(`mt5-auto-sync: ${results.length} accounts, ${imported} trades upserted`);
    return json({ ok: true, accounts: results.length, imported, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
