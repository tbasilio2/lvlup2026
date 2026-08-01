import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { syncAccount } from "../_shared/mt5Sync.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
  const userId = claimsData.claims.sub;

  const metaToken = Deno.env.get("METAAPI_TOKEN");
  if (!metaToken) return json({ error: "METAAPI_TOKEN not configured" }, 500);

  try {
    const { accountId } = await req.json();
    if (!accountId) return json({ error: "Missing accountId" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: acct, error: acctErr } = await admin
      .from("mt5_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", userId)
      .single();

    if (acctErr || !acct) return json({ error: "Account not found" }, 404);

    const result = await syncAccount(admin, acct, metaToken);
    if (result.error) return json(result, result.status ?? 400);
    return json(result);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
