export type Direction = "long" | "short";

export interface PnlInput {
  direction: Direction;
  entry_price: number;
  exit_price?: number | null;
  quantity: number;
  fees?: number | null;
  manual_pnl?: number | null;
}

export interface PnlResult {
  pnl: number | null;
  status: "open" | "closed";
}

/**
 * Resolve the final P&L + status for a trade.
 * - Manual override always wins and marks the trade closed.
 * - Otherwise, if exit_price is set, auto-calc gross - fees and mark closed.
 * - Otherwise, leave pnl null and mark open.
 */
export function resolvePnl(input: PnlInput): PnlResult {
  const { direction, entry_price, exit_price, quantity, fees, manual_pnl } = input;

  if (manual_pnl != null && Number.isFinite(manual_pnl)) {
    return { pnl: manual_pnl, status: "closed" };
  }

  if (exit_price == null || !Number.isFinite(exit_price)) {
    return { pnl: null, status: "open" };
  }

  const gross =
    direction === "long"
      ? (exit_price - entry_price) * quantity
      : (entry_price - exit_price) * quantity;

  const f = fees != null && Number.isFinite(fees) ? fees : 0;
  return { pnl: gross - f, status: "closed" };
}
