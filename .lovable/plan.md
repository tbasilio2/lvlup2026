# MT5 Auto-Sync via MetaApi

Add real-time MT5 account syncing (Trade Art / TradeZella style) on top of the existing manual HTML/CSV wizard. The user connects an MT5 account once (broker server + login + investor read-only password), and trades stream into the journal.

## How it works

```text
Browser  ──►  Edge Function  ──►  MetaApi Cloud  ──►  User's MT5 broker
   ▲              │                     │
   └── trades ────┴── deals history ◄───┘
```

- MetaApi hosts a virtual MT5 terminal per account. We never touch MT5 directly.
- The **investor password** is read-only — it can view trades but cannot place or modify orders.
- All MetaApi calls happen in an edge function so the MetaApi token and the user's investor password never touch the browser.

## What to build

### 1. Secret
- `METAAPI_TOKEN` — the token you generate at app.metaapi.cloud/token. Requested via secure form after implementation starts.

### 2. Database (already migrated)
- Table `mt5_accounts` with label, broker_server, login, metaapi_account_id, state, last_synced_at (RLS: own rows only).
- `trades.metaapi_deal_id` + `trades.mt5_account_id` for dedupe on re-sync.

### 3. Edge functions
- `mt5-connect` — creates a MetaApi provisioning profile + account, deploys it, polls until `DEPLOYED`, stores the row. Investor password is forwarded to MetaApi and never persisted on our side.
- `mt5-sync` — fetches historical deals via MetaApi REST, groups entry/exit deals by position, upserts into `trades` with `metaapi_deal_id` dedupe, updates `last_synced_at`.
- `mt5-disconnect` — undeploys + deletes the MetaApi account, removes the DB row.

### 4. UI
- `MT5ConnectDialog` — form for label, broker server, login, investor password, region dropdown (new-york / london / singapore). Submits to `mt5-connect`, shows provisioning spinner.
- `ConnectedAccountsList` — one card per linked account with state badge, last sync time, **Sync now**, **Disconnect**.
- Mount both on the Trading page header, next to existing MT5 Import / CSV Import.
- Keep `MT5ImportWizard` as-is for users who prefer manual export.

## Technical notes

- MetaApi endpoints: `POST /users/current/provisioning-profiles`, `POST /users/current/accounts`, `GET /users/current/accounts/{id}` (poll state), `GET /users/current/accounts/{id}/history-deals/time/{from}/{to}`.
- Cost is on the user's MetaApi account (free tier for 1 account, then per-account/month).
- No polling loop server-side — user hits **Sync now**. Scheduled cron can be added later.

## Out of scope
- Real-time WebSocket streaming
- MT4/cTrader (trivial to add later)
- Auto-scheduled background sync

## Deliverables
- 3 edge functions (`mt5-connect`, `mt5-sync`, `mt5-disconnect`)
- 1 `METAAPI_TOKEN` secret prompt
- 2 new components (`MT5ConnectDialog`, `ConnectedAccountsList`)
- Small edit to `src/pages/Trading.tsx`
