## Goal

MT5 trades flow into the journal automatically twice a day, and a clearly visible **Sync All** button lets you pull them in on demand.

## 1. Scheduled auto-sync (every 12 hours)

Today `mt5-sync` requires a logged-in user token and syncs one account at a time, so it can't run unattended.

- Extract the per-account sync logic into a shared module so both the manual and scheduled paths use identical code (no duplicated parsing/import logic).
- Add a new backend function `mt5-auto-sync` that:
  - Authenticates via a shared scheduler secret (not a user token).
  - Loads every connected MT5 account across all users that is in the `DEPLOYED` state.
  - Runs the same deal-fetch and trade-import routine for each, updating `last_synced_at` / `last_error` per account.
  - Returns a per-account summary for logging.
- Register a scheduled job that calls it at 00:00 and 12:00 UTC (`0 0,12 * * *`), enabling the required scheduling extensions.
- Existing duplicate protection (unique constraint on the MetaApi deal id) means repeated runs never create duplicate trades.

## 2. Sync button in the UI

- Add a **Sync All** button in the Trading page header next to **Connect MT5**, shown only when at least one account is connected.
- It triggers a sync for each connected account, shows a spinner while running, and reports total imported trades via a toast, then refreshes the dashboard stats and trade list.
- Keep the existing per-account refresh icon in the connected-accounts list for targeted syncs.
- Show a "Last synced: X ago / Auto-syncs every 12h" line under the accounts list so the schedule is discoverable.

## Technical notes

- Shared logic lives in `supabase/functions/_shared/mt5Sync.ts`, imported by both `mt5-sync` and `mt5-auto-sync`.
- The scheduled job posts to the function with the scheduler secret in a header; the function rejects any request without it.
- Cron registration uses project-specific values, so it is applied as a data operation rather than a schema migration.
- No schema changes are needed beyond what already exists.
