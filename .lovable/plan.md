# MT5 Auto-Sync via MetaApi

Add real-time MT5 account syncing (Trade Art / TradeZella style) on top of the existing manual HTML/CSV wizard. The user connects an MT5 account once (broker server + login + investor read-only password), and trades stream into the journal.

## How it works

```text
Browser  ──►  Edge Function  ──►  MetaApi Cloud  ──►  User's MT5 broker
   ▲              │                     │
   └── trades ────┴── deals history ◄───┘
```

- MetaApi hosts a virtual MT5 terminal per account. We never touch MT5 directly.
- The **investor password** is read-only — it can view trades but cannot place or modify orders. Safer than the master password.
- All MetaApi calls happen in an edge function so the MetaApi token and the user's investor password never touch the browser.

## What to build

### 1. Secrets
- `METAAPI_TOKEN` — MetaApi account token (user creates a free account at metaapi.cloud, generates a token, we request it via `add_secret`).

### 2. Database
New table `mt5_accounts`:
- `id`, `user_id`, `label`, `broker_server`, `login`, `metaapi_account_id`, `state` (provisioning / deployed / failed), `last_synced_at`, `created_at`
- RLS: user can only see/modify their own rows. Investor password is **not** stored — it's sent once to the edge function, forwarded to MetaApi (which stores it), then discarded.

### 3. Edge functions
- `mt5-connect` — accepts `{ label, broker_server, login, investor_password, platform: "mt5" }`. Creates a MetaApi provisioning profile + account, deploys it, waits for `DEPLOYED`, stores the row.
- `mt5-sync` — accepts `{ account_id, since }`. Fetches historical deals via MetaApi REST, maps them to `TradeInsert[]` (reusing the deal-grouping logic already in `MT5ImportWizard.parseMT5Html`), upserts into `trades` with a `metaapi_deal_id` dedupe key, updates `last_synced_at`.
- `mt5-disconnect` — undeploys + deletes the MetaApi account, removes the DB row.

### 4. Trades table change
Add `metaapi_deal_id text unique per user` so re-syncs don't create duplicates. Existing manual/CSV trades leave it null.

### 5. UI
- New **"Connected accounts"** section on the Trading page header (next to the existing MT5 Import / CSV Import buttons).
- `MT5ConnectDialog` — form for label, broker server, login, investor password + a short "where to find these" helper. Submits to `mt5-connect`, shows a provisioning spinner (usually 30-90s).
- `ConnectedAccountsList` — card per linked account with status badge, last sync time, **Sync now** button (calls `mt5-sync`), and **Disconnect**.
- After a successful sync, existing `useTrades` refetch shows the imported trades in the dashboard, calendar, equity curve.
- Keep `MT5ImportWizard` as-is for users who don't want to share credentials.

## Technical notes (dev-only)

- MetaApi endpoints used: `POST /users/current/provisioning-profiles`, `POST /users/current/accounts`, `GET /users/current/accounts/{id}` (poll state), `GET /users/current/accounts/{id}/history-deals/time/{from}/{to}` via the History API.
- Cost: MetaApi bills per connected account per hour. Fine for a personal journal; noted in the connect dialog.
- No polling loop on our side — user hits **Sync now**, or we can later add a scheduled cron edge function.
- Investor password is transmitted over HTTPS, forwarded to MetaApi, and never written to our DB or logs.

## Out of scope for this plan
- Real-time streaming via MetaApi WebSocket (can be added later; polling is enough for a journal).
- cTrader / other platforms (MetaApi supports MT4 too — trivial add if wanted).
- Auto-scheduled background sync.

## Deliverables
- 1 migration (new table + `metaapi_deal_id` on `trades`)
- 3 edge functions (`mt5-connect`, `mt5-sync`, `mt5-disconnect`)
- 1 `METAAPI_TOKEN` secret prompt
- 2 new components (`MT5ConnectDialog`, `ConnectedAccountsList`)
- Small edit to `src/pages/Trading.tsx` to mount the accounts list
