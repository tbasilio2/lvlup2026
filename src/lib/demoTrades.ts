import type { Trade } from "@/hooks/useTrades";
/** Illustrative data only; never inserted into an account or presented as customer results. */
export const demoTrades: Trade[] = Array.from({ length: 18 }, (_, index) => {
  const date = new Date(); date.setDate(Math.max(1, date.getDate() - 18 + index)); date.setHours(14, 0, 0, 0);
  const pnl = [120, -75, 90, -60, 140, 65, -80, 110, 45][index % 9];
  return { id: `sample-${index}`, user_id: "sample", created_at: date.toISOString(), symbol: index % 2 ? "EURUSD" : "XAUUSD", direction: "long", entry_price: index % 2 ? 1.08 : 2400, exit_price: index % 2 ? 1.09 : 2410, stop_loss: null, take_profit: null, quantity: 1, entry_date: date.toISOString(), exit_date: date.toISOString(), pnl, fees: 0, strategy: index % 2 ? "Structure retest" : "Fib Strategy", notes: "Waited for confirmation. Kept risk within plan.", screenshot_url: null, status: "closed", tags: [] };
});
