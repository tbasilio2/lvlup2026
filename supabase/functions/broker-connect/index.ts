import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { matchTraderLogin, syncBrokerAccount, tradeLockerAccounts, tradeLockerLogin } from "../_shared/brokerSync.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("platform", [
  z.object({
    platform: z.literal("tradelocker"),
    label: z.string().trim().min(1).max(80),
    env: z.enum(["live", "demo"]),
    server: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(200),
  }),
  z.object({
    platform: z.literal("matchtrader"),
    label: z.string().trim().min(1).max(80),
    baseUrl: z.string().trim().url().max(255).refine((u) => u.startsWith("https://"), "Must be https"),
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(200),
    brokerId: z.string().trim().max(60).optional(),
  }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await supa.auth.getClaims(authHeader.slice(7));
  const userId = claims?.claims?.sub;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Please check the form fields.", fields: parsed.error.flatten().fieldErrors }, 400);
  const b = parsed.data;

  // Verify the login works before saving anything
  let externalId: string | null = null;
  try {
    if (b.platform === "tradelocker") {
      const token = await tradeLockerLogin(b.env, b.email, b.password, b.server);
      const accts = await tradeLockerAccounts(b.env, token);
      externalId = accts[0] ? String(accts[0].id) : null;
    } else {
      const login = await matchTraderLogin(b.baseUrl, b.email, b.password, b.brokerId);
      externalId = login.accounts?.[0]?.tradingAccountId ? String(login.accounts[0].tradingAccountId) : null;
    }
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message ?? e) }, 200);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: acct, error } = await admin.from("broker_accounts").insert({
    user_id: userId,
    platform: b.platform,
    label: b.label,
    server: b.platform === "tradelocker" ? b.server : null,
    base_url: b.platform === "matchtrader" ? b.baseUrl : null,
    email: b.email,
    external_account_id: externalId,
  }).select("*").single();
  if (error || !acct) return json({ error: error?.message ?? "Could not save account" }, 500);

  const secret = b.platform === "tradelocker"
    ? { password: b.password, env: b.env }
    : { password: b.password, brokerId: b.brokerId };
  await admin.from("broker_credentials").insert({ broker_account_id: acct.id, secret });

  const result = await syncBrokerAccount(admin, acct);
  return json({ ok: true, account: acct, sync: result });
});
