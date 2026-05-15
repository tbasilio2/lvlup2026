## Add manual P&L field to Add & Edit Trade dialogs

Currently, P&L is auto-computed from entry/exit/qty/fees. This adds an optional manual P&L input that overrides the calculation when filled — useful for MT5-style trades where swaps, commissions, and partial fills make the formula inaccurate.

### Behavior
- New "P&L" input in both `AddTradeDialog.tsx` and `EditTradeDialog.tsx`, placed next to Fees.
- Optional field. Helper text: "Leave empty to auto-calculate".
- Live-shown computed P&L below the input as a hint (e.g. `Auto: +125.50`) so users see what would be saved if left blank.
- On submit:
  - If manual P&L provided → save that value as `pnl`, mark trade `closed`.
  - If empty and exit_price set → keep current auto-compute behavior.
  - If empty and no exit_price → `pnl = null`, status `open`.

### Files
- `src/components/trading/AddTradeDialog.tsx` — add `pnl` field to form state + submit logic.
- `src/components/trading/EditTradeDialog.tsx` — same; pre-fill from existing `trade.pnl`.

No DB or hook changes needed (the `trades` table already has `pnl numeric`).