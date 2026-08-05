// Shared MT5 -> trades sync logic used by mt5-sync (manual) and mt5-auto-sync (cron).

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

function clientHost(region: string) {
  return `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
}

export interface SyncResult {
  ok: boolean;
  accountId: string;
  imported?: number;
  positions?: number;
  state?: string;
  message?: string;
  error?: string;
  detail?: string;
  status?: number;
}

export async function syncAccount(admin: any, acct: any, metaToken: string): Promise<SyncResult> {
  const userId = acct.user_id;

  if (!acct.metaapi_account_id) {
    const message = "Account is not linked yet. Reconnect this MT5 account.";
    await admin.from("mt5_accounts").update({ state: "NOT_LINKED", last_error: message }).eq("id", acct.id);
    return { ok: false, accountId: acct.id, state: "NOT_LINKED", message };
  }

  // Fetch state + region from MetaApi
  const infoRes = await fetch(`${PROVISIONING}/users/current/accounts/${acct.metaapi_account_id}`, {
    headers: { "auth-token": metaToken },
  });
  const info = await infoRes.json().catch(() => ({}));

  if (!infoRes.ok) {
    const message = infoRes.status === 404
      ? "This MT5 account no longer exists on the broker bridge. Remove it and connect again."
      : `Broker bridge error (${infoRes.status}): ${info?.message || "unknown error"}`;
    await admin
      .from("mt5_accounts")
      .update({ state: infoRes.status === 404 ? "MISSING" : "ERROR", last_error: message.slice(0, 500) })
      .eq("id", acct.id);
    return { ok: false, accountId: acct.id, state: infoRes.status === 404 ? "MISSING" : "ERROR", message, error: message, status: infoRes.status === 404 ? 404 : 400 };
  }

  const region = info.region || "new-york";
  const state = info.state || acct.state;

  await admin.from("mt5_accounts").update({ state }).eq("id", acct.id);

  if (state !== "DEPLOYED") {
    return { ok: false, accountId: acct.id, state, message: "Account not yet DEPLOYED. Try again in ~30s." };
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
    return { ok: false, accountId: acct.id, error: "Failed to fetch deals", detail, status: 400 };
  }
  const deals: any[] = await dealsRes.json();

  // Group by positionId: DEAL_TYPE_BUY/SELL with entryType IN/OUT
  const positions = new Map<string, { in?: any; out?: any }>();
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
      await admin.from("mt5_accounts").update({ last_error: upErr.message.slice(0, 500) }).eq("id", acct.id);
      return { ok: false, accountId: acct.id, error: "Upsert failed", detail: upErr.message, status: 500 };
    }
    imported = count ?? rows.length;
  }

  await admin.from("mt5_accounts").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", acct.id);

  return { ok: true, accountId: acct.id, imported, positions: rows.length };
}
