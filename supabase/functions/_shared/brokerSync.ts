// Shared sync logic for TradeLocker and Match-Trader accounts.
// Credentials live in broker_credentials (service-role only).

export type Platform = "tradelocker" | "matchtrader" | "ctrader";

export interface BrokerResult {
  ok: boolean;
  accountId: string;
  imported?: number;
  message?: string;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toIso = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  const d = Number.isFinite(n) ? new Date(n < 1e12 ? n * 1000 : n) : new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// ---------------- TradeLocker ----------------
export function tradeLockerBase(env: string) {
  return env === "demo" ? "https://demo.tradelocker.com/backend-api" : "https://live.tradelocker.com/backend-api";
}

export async function tradeLockerLogin(env: string, email: string, password: string, server: string) {
  const res = await fetch(`${tradeLockerBase(env)}/auth/jwt/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, server }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.accessToken) throw new Error(body?.message || `TradeLocker login failed (${res.status})`);
  return body.accessToken as string;
}

export async function tradeLockerAccounts(env: string, token: string) {
  const res = await fetch(`${tradeLockerBase(env)}/auth/jwt/all-accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`TradeLocker accounts failed (${res.status})`);
  return (body.accounts ?? []) as any[];
}

async function syncTradeLocker(acct: any, secret: any) {
  const env = secret.env || "live";
  const token = await tradeLockerLogin(env, acct.email, secret.password, acct.server);
  const accounts = await tradeLockerAccounts(env, token);
  const info = accounts.find((a) => String(a.id) === String(acct.external_account_id)) ?? accounts[0];
  if (!info) throw new Error("No TradeLocker accounts found for this login");
  const headers = { Authorization: `Bearer ${token}`, accNum: String(info.accNum) };
  const base = tradeLockerBase(env);

  // Column names come from /trade/config
  const cfgRes = await fetch(`${base}/trade/config`, { headers });
  const cfg = await cfgRes.json().catch(() => ({}));
  const cols: string[] = (cfg?.d?.ordersHistoryConfig?.columns ?? []).map((c: any) => c.id);

  // Instruments (id -> symbol)
  const instRes = await fetch(`${base}/trade/accounts/${info.id}/instruments`, { headers });
  const inst = await instRes.json().catch(() => ({}));
  const symbols = new Map<string, string>();
  for (const i of inst?.d?.instruments ?? []) symbols.set(String(i.tradableInstrumentId), i.name);

  const histRes = await fetch(`${base}/trade/accounts/${info.id}/ordersHistory`, { headers });
  if (!histRes.ok) throw new Error(`TradeLocker history failed (${histRes.status})`);
  const hist = await histRes.json().catch(() => ({}));
  const orders: any[] = (hist?.d?.ordersHistory ?? []).map((row: any[]) =>
    Object.fromEntries(cols.map((c, i) => [c, row[i]]))
  );

  // Group filled orders by positionId: first fill = open, last = close
  const byPos = new Map<string, any[]>();
  for (const o of orders) {
    if (String(o.status).toLowerCase() !== "filled" || !o.positionId) continue;
    const k = String(o.positionId);
    if (!byPos.has(k)) byPos.set(k, []);
    byPos.get(k)!.push(o);
  }

  const rows: any[] = [];
  for (const [pid, list] of byPos) {
    list.sort((a, b) => num(a.createdDate) - num(b.createdDate));
    const open = list[0];
    const close = list.length > 1 ? list[list.length - 1] : null;
    const isLong = String(open.side).toLowerCase() === "buy";
    const entry = num(open.avgPrice || open.price);
    const exit = close ? num(close.avgPrice || close.price) : null;
    const qty = num(open.filledQty || open.qty);
    rows.push({
      external_id: `tl:${pid}`,
      symbol: symbols.get(String(open.tradableInstrumentId)) ?? String(open.tradableInstrumentId ?? "UNKNOWN"),
      direction: isLong ? "long" : "short",
      entry_price: entry,
      exit_price: exit,
      quantity: qty,
      entry_date: toIso(open.createdDate) ?? new Date().toISOString(),
      exit_date: close ? toIso(close.lastModified ?? close.createdDate) : null,
      // TradeLocker order history has no realised P&L field; estimate from prices (lot size unknown => price diff × qty)
      pnl: null,
      fees: 0,
      status: close ? "closed" : "open",
    });
  }

  return {
    rows,
    balance: num(info.accountBalance) || null,
    equity: null,
    currency: info.currency ?? null,
    externalId: String(info.id),
  };
}

// ---------------- Match-Trader ----------------
export async function matchTraderLogin(baseUrl: string, email: string, password: string, brokerId?: string) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/mtr-backend/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...(brokerId ? { brokerId } : {}) }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) throw new Error(body?.message || `Match-Trader login failed (${res.status})`);
  return body as { token: string; accounts: any[] };
}

async function syncMatchTrader(acct: any, secret: any) {
  const base = String(acct.base_url).replace(/\/$/, "");
  const login = await matchTraderLogin(base, acct.email, secret.password, secret.brokerId);
  const ta = login.accounts?.find((a: any) => String(a.tradingAccountId) === String(acct.external_account_id))
    ?? login.accounts?.[0];
  if (!ta) throw new Error("No Match-Trader trading accounts found");
  const systemUuid = ta.offer?.system?.uuid;
  const headers = {
    "Auth-trading-api": ta.tradingApiToken,
    Cookie: `co-auth=${login.token}`,
    "Content-Type": "application/json",
  };

  const to = new Date();
  const from = new Date(to.getTime() - 180 * 864e5);
  const res = await fetch(
    `${base}/mtr-api/${systemUuid}/closed-positions?from=${from.toISOString()}&to=${to.toISOString()}`,
    { headers },
  );
  if (!res.ok) throw new Error(`Match-Trader history failed (${res.status})`);
  const body = await res.json().catch(() => ({}));
  const list: any[] = body.closedPositions ?? body.positions ?? (Array.isArray(body) ? body : []);

  const rows = list.map((p) => {
    const commission = num(p.commission);
    const swap = num(p.swap);
    return {
      external_id: `mtr:${p.id ?? p.positionId}`,
      symbol: String(p.symbol ?? "UNKNOWN").toUpperCase(),
      direction: String(p.side).toUpperCase() === "BUY" ? "long" : "short",
      entry_price: num(p.openPrice),
      exit_price: num(p.closePrice) || null,
      quantity: num(p.volume),
      entry_date: toIso(p.openTime) ?? new Date().toISOString(),
      exit_date: toIso(p.closeTime),
      pnl: num(p.profit) + commission + swap,
      fees: Math.abs(commission) + Math.abs(swap),
      status: "closed",
    };
  });

  let balance: number | null = null, equity: number | null = null, currency: string | null = null;
  try {
    const bRes = await fetch(`${base}/mtr-api/${systemUuid}/balance`, { headers });
    if (bRes.ok) {
      const b = await bRes.json();
      balance = num(b.balance) || null;
      equity = num(b.equity) || null;
      currency = b.currency ?? null;
    }
  } catch (_) { /* non-fatal */ }

  return { rows, balance, equity, currency, externalId: String(ta.tradingAccountId ?? "") };
}

// ---------------- Entry ----------------
export async function syncBrokerAccount(admin: any, acct: any): Promise<BrokerResult> {
  try {
    const { data: cred } = await admin
      .from("broker_credentials").select("secret").eq("broker_account_id", acct.id).single();
    if (!cred) throw new Error("Missing saved login. Remove and reconnect this account.");

    let out;
    if (acct.platform === "tradelocker") out = await syncTradeLocker(acct, cred.secret);
    else if (acct.platform === "matchtrader") out = await syncMatchTrader(acct, cred.secret);
    else throw new Error("cTrader sync is not enabled yet.");

    const rows = out.rows.map(({ external_id, ...r }: any) => ({
      ...r,
      user_id: acct.user_id,
      broker_account_id: acct.id,
      metaapi_deal_id: external_id, // reuse the unique (user_id, metaapi_deal_id) dedupe key
    }));

    if (rows.length) {
      const { error } = await admin.from("trades").upsert(rows, { onConflict: "user_id,metaapi_deal_id" });
      if (error) throw new Error(`Saving trades failed: ${error.message}`);
    }

    await admin.from("broker_accounts").update({
      state: "CONNECTED",
      balance: out.balance,
      equity: out.equity,
      currency: out.currency,
      external_account_id: acct.external_account_id || out.externalId,
      last_synced_at: new Date().toISOString(),
      last_error: null,
    }).eq("id", acct.id);

    return { ok: true, accountId: acct.id, imported: rows.length };
  } catch (e) {
    const message = String((e as Error).message ?? e).slice(0, 500);
    await admin.from("broker_accounts").update({ state: "ERROR", last_error: message }).eq("id", acct.id);
    return { ok: false, accountId: acct.id, message };
  }
}
