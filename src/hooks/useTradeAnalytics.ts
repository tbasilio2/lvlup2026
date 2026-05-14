import { useMemo } from "react";
import type { Trade } from "@/hooks/useTrades";

export interface BreakdownRow {
  key: string;
  trades: number;
  wins: number;
  winRate: number;
  netPnl: number;
  expectancy: number;
}

export interface MonthlyCell {
  year: number;
  month: number; // 0-11
  pnl: number;
  trades: number;
}

export interface TradeAnalytics {
  closedCount: number;
  totalPnl: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  avgR: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  currentStreak: { type: "win" | "loss" | "none"; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
  bySymbol: BreakdownRow[];
  byStrategy: BreakdownRow[];
  byWeekday: { day: string; pnl: number; trades: number }[];
  byHour: { hour: number; pnl: number; trades: number }[];
  longVsShort: { side: "long" | "short"; trades: number; winRate: number; pnl: number }[];
  monthly: MonthlyCell[];
  drawdownSeries: { idx: number; equity: number; drawdown: number; date: string }[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const groupBreakdown = (trades: Trade[], keyFn: (t: Trade) => string | null): BreakdownRow[] => {
  const map = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const k = keyFn(t);
    if (!k) return;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  });
  return Array.from(map.entries())
    .map(([key, ts]) => {
      const wins = ts.filter((t) => (t.pnl ?? 0) > 0);
      const losses = ts.filter((t) => (t.pnl ?? 0) < 0);
      const netPnl = ts.reduce((s, t) => s + (t.pnl ?? 0), 0);
      const winRate = ts.length ? (wins.length / ts.length) * 100 : 0;
      const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl!, 0) / wins.length : 0;
      const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl!, 0) / losses.length) : 0;
      const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;
      return { key, trades: ts.length, wins: wins.length, winRate, netPnl, expectancy };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
};

export const useTradeAnalytics = (trades: Trade[]): TradeAnalytics => {
  return useMemo(() => {
    const closed = trades
      .filter((t) => t.pnl != null && t.exit_date)
      .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());

    const wins = closed.filter((t) => t.pnl! > 0);
    const losses = closed.filter((t) => t.pnl! < 0);
    const totalPnl = closed.reduce((s, t) => s + t.pnl!, 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl!, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl!, 0) / losses.length) : 0;
    const grossProfit = wins.reduce((s, t) => s + t.pnl!, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl!, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss;
    const avgR = avgLoss > 0 ? closed.reduce((s, t) => s + t.pnl! / avgLoss, 0) / closed.length : 0;

    // Drawdown
    let cum = 0;
    let peak = 0;
    let maxDd = 0;
    let maxDdPct = 0;
    const drawdownSeries = closed.map((t, idx) => {
      cum += t.pnl!;
      if (cum > peak) peak = cum;
      const dd = cum - peak;
      if (dd < maxDd) maxDd = dd;
      const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
      if (ddPct < maxDdPct) maxDdPct = ddPct;
      return { idx, equity: cum, drawdown: dd, date: t.exit_date! };
    });

    // Streaks
    let longestWin = 0, longestLoss = 0, curWin = 0, curLoss = 0;
    closed.forEach((t) => {
      if (t.pnl! > 0) { curWin++; curLoss = 0; longestWin = Math.max(longestWin, curWin); }
      else if (t.pnl! < 0) { curLoss++; curWin = 0; longestLoss = Math.max(longestLoss, curLoss); }
    });
    const last = closed[closed.length - 1];
    const currentStreak: TradeAnalytics["currentStreak"] = !last
      ? { type: "none", count: 0 }
      : last.pnl! > 0 ? { type: "win", count: curWin }
      : last.pnl! < 0 ? { type: "loss", count: curLoss }
      : { type: "none", count: 0 };

    const bySymbol = groupBreakdown(closed, (t) => t.symbol);
    const byStrategy = groupBreakdown(closed, (t) => t.strategy || "Unspecified");

    // Weekday / hour
    const wd = WEEKDAYS.map((day) => ({ day, pnl: 0, trades: 0 }));
    const hr = Array.from({ length: 24 }, (_, h) => ({ hour: h, pnl: 0, trades: 0 }));
    closed.forEach((t) => {
      const d = new Date(t.exit_date!);
      wd[d.getDay()].pnl += t.pnl!;
      wd[d.getDay()].trades += 1;
      hr[d.getHours()].pnl += t.pnl!;
      hr[d.getHours()].trades += 1;
    });

    const longTrades = closed.filter((t) => t.direction === "long");
    const shortTrades = closed.filter((t) => t.direction === "short");
    const longVsShort: TradeAnalytics["longVsShort"] = [
      {
        side: "long",
        trades: longTrades.length,
        winRate: longTrades.length ? (longTrades.filter((t) => t.pnl! > 0).length / longTrades.length) * 100 : 0,
        pnl: longTrades.reduce((s, t) => s + t.pnl!, 0),
      },
      {
        side: "short",
        trades: shortTrades.length,
        winRate: shortTrades.length ? (shortTrades.filter((t) => t.pnl! > 0).length / shortTrades.length) * 100 : 0,
        pnl: shortTrades.reduce((s, t) => s + t.pnl!, 0),
      },
    ];

    // Monthly
    const monthMap = new Map<string, MonthlyCell>();
    closed.forEach((t) => {
      const d = new Date(t.exit_date!);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const cell = monthMap.get(key) ?? { year: d.getFullYear(), month: d.getMonth(), pnl: 0, trades: 0 };
      cell.pnl += t.pnl!;
      cell.trades += 1;
      monthMap.set(key, cell);
    });
    const monthly = Array.from(monthMap.values()).sort((a, b) => a.year - b.year || a.month - b.month);

    return {
      closedCount: closed.length,
      totalPnl, winRate, avgWin, avgLoss, profitFactor, expectancy, avgR,
      maxDrawdown: maxDd, maxDrawdownPct: maxDdPct,
      currentStreak, longestWinStreak: longestWin, longestLossStreak: longestLoss,
      bySymbol, byStrategy, byWeekday: wd, byHour: hr, longVsShort, monthly, drawdownSeries,
    };
  }, [trades]);
};
