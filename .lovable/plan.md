## Goal
Display all monetary values (P&L, fees, wins, losses, expectancy, drawdown, etc.) in South African Rand (ZAR) with an `R` prefix instead of unlabeled numbers.

## Approach
Numbers today are rendered as bare `toFixed(2)` values with no currency symbol. Add a single formatting helper and use it everywhere money is shown, so we get one source of truth (easy to switch later).

### 1. New helper `src/lib/currency.ts`
```ts
export const CURRENCY = "ZAR";
export const CURRENCY_SYMBOL = "R";

// e.g. formatMoney(1234.5) -> "R 1 234.50"; signed -> "+R 1 234.50" / "-R 1 234.50"
export function formatMoney(n: number, opts?: { signed?: boolean; digits?: number }): string;
export function formatMoneyCompact(n: number): string; // "R 1.2k" for calendar cells
```
Uses `Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" })` under the hood, then normalises the symbol to a plain `R ` prefix so it fits the mono/terminal style.

### 2. Replace bare P&L / fee renderings with `formatMoney`
Files to update (UI only, no business logic):
- `src/components/trading/RecentTradesTable.tsx` — P&L cell
- `src/components/trading/TradeStats.tsx` — Total P&L, Avg Win, Avg Loss
- `src/components/trading/TradeHeroStats.tsx`
- `src/components/trading/TradeRow.tsx`
- `src/components/trading/EquityCurve.tsx` (axis + tooltip)
- `src/components/trading/PnLCalendar.tsx` (tooltip + cell → compact)
- `src/components/trading/DayTradesDialog.tsx`
- `src/components/trading/analytics/AdvancedMetrics.tsx` — Expectancy, Max DD
- `src/components/trading/analytics/BreakdownTable.tsx` — Net, Expectancy
- `src/components/trading/analytics/LongShortCompare.tsx` — Net P&L
- `src/components/trading/analytics/MonthlyHeatmap.tsx`
- `src/components/trading/CSVImport.tsx` — preview P&L
- `src/components/trading/MT5ImportWizard.tsx` — preview P&L
- `src/components/trading/AddTradeDialog.tsx` / `EditTradeDialog.tsx` — field labels ("P&L (R)", "Fees (R)")
- `src/pages/Journal.tsx` — Net P&L, Total Fees, per-entry P&L
- `src/components/JournalEntry.tsx` — field labels

Signed helper is used where a `+` prefix is already shown for wins.

### 3. Out of scope
- No DB schema changes; amounts stay as plain numbers.
- No FX conversion — this is a display-only relabel. Existing values are shown as ZAR as-is.
- Chart symbols (`OANDA:EURUSD` etc.) stay untouched — those are instruments, not currency.

## Notes
If later you want a user-selectable currency, `CURRENCY`/`CURRENCY_SYMBOL` can be moved to a profile setting and read from context — the helper API stays the same.