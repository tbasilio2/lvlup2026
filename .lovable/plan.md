## Advanced Trading Analytics Dashboard

Add a dedicated **Analytics** view powered by the existing `trades` table. All metrics recompute live from edited trade data — no schema changes needed.

### New metrics

- **Win rate** — overall + by symbol + by strategy
- **Expectancy** — `(WinRate × AvgWin) − (LossRate × AvgLoss)` per trade
- **Profit factor** — gross profit / gross loss
- **Max drawdown** — peak-to-trough on cumulative equity (absolute + %)
- **Avg R multiple** — mean of `pnl / |risk|` (risk inferred from entry/SL where available, else avg loss)
- **Streaks** — current + longest win/loss streaks
- **Monthly performance** — heatmap grid (year × month) of net P&L
- **Symbol breakdown** — table: symbol, trades, win%, net P&L, expectancy
- **Strategy breakdown** — same as above grouped by strategy
- **Day-of-week / hour-of-day** — bars showing P&L distribution
- **Long vs Short** — comparative win rate + P&L

### Components (new)

```text
src/components/trading/analytics/
  AdvancedMetrics.tsx        // top KPI grid (expectancy, profit factor, max DD, streaks)
  DrawdownChart.tsx          // underwater equity curve (recharts area, negative)
  MonthlyHeatmap.tsx         // year-rows × month-cols, color by net P&L
  BreakdownTable.tsx         // reusable: groups by symbol or strategy
  TimeOfDayChart.tsx         // bar chart by weekday + hour
  LongShortCompare.tsx       // side-by-side stat cards
```

Plus one hook:

```text
src/hooks/useTradeAnalytics.ts   // memoized derivations from trades[]
```

### Wiring

- Add a new **Analytics** tab to `Trading.tsx` (becomes 7 tabs; collapse to scrollable tab list on mobile).
- Existing `TradeStats` / `EquityCurve` / `PnLCalendar` stay where they are; the new tab is purely additive.
- All charts reuse the dark trader-terminal palette (profit/loss semantic colors, JetBrains Mono labels) already used in `EquityCurve.tsx`.

### Technical notes

- Pure client-side computation in `useTradeAnalytics` over the `trades` array from `useTrades()` — automatically reflects edits/deletes.
- Drawdown computed by walking sorted-by-`exit_date` closed trades, tracking running peak.
- Risk per trade for R-multiple: prefer explicit SL if added later; for now derive from `avg loss` as fallback and display "estimated" badge.
- Empty states for <5 closed trades on each chart (consistent with existing `EquityCurve` pattern).
- No new dependencies — recharts already present.
- No DB migration, no edge function.