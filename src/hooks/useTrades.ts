import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Trade {
  id: string;
  user_id: string;
  created_at: string;
  symbol: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  quantity: number;
  entry_date: string;
  exit_date: string | null;
  pnl: number | null;
  fees: number | null;
  strategy: string | null;
  notes: string | null;
  screenshot_url: string | null;
  status: "open" | "closed";
  tags: string[];
}

export interface TradeInsert {
  symbol: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price?: number | null;
  quantity: number;
  entry_date: string;
  exit_date?: string | null;
  pnl?: number | null;
  fees?: number;
  strategy?: string;
  notes?: string;
  screenshot_url?: string;
  status?: "open" | "closed";
  tags?: string[];
}

export const useTrades = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });

    if (error) {
      toast.error("Failed to load trades");
    } else {
      setTrades((data as unknown as Trade[]) ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const addTrade = async (trade: TradeInsert) => {
    if (!user) return;
    const row = {
      ...trade,
      user_id: user.id,
      status: trade.exit_price != null ? "closed" : "open",
      pnl: trade.pnl ?? (trade.exit_price != null
        ? (trade.direction === "long"
          ? (trade.exit_price - trade.entry_price) * trade.quantity
          : (trade.entry_price - trade.exit_price!) * trade.quantity) - (trade.fees ?? 0)
        : null),
    };
    const { error } = await supabase.from("trades").insert(row as any);
    if (error) {
      toast.error("Failed to add trade");
    } else {
      await fetchTrades();
      toast.success("Trade added");
    }
  };

  const addTradesBatch = async (tradesData: TradeInsert[]) => {
    if (!user) return;
    const rows = tradesData.map((t) => ({
      ...t,
      user_id: user.id,
      status: t.exit_price != null ? "closed" : "open",
      pnl: t.pnl ?? (t.exit_price != null
        ? (t.direction === "long"
          ? (t.exit_price - t.entry_price) * t.quantity
          : (t.entry_price - t.exit_price!) * t.quantity) - (t.fees ?? 0)
        : null),
    }));
    const { error } = await supabase.from("trades").insert(rows as any);
    if (error) {
      toast.error("Failed to import trades");
    } else {
      await fetchTrades();
      toast.success(`${rows.length} trades imported`);
    }
  };

  const deleteTrade = async (id: string) => {
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete trade");
    } else {
      setTrades((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const updateTrade = async (id: string, updates: Partial<TradeInsert>) => {
    const { error } = await supabase.from("trades").update(updates as any).eq("id", id);
    if (error) {
      toast.error("Failed to update trade");
    } else {
      await fetchTrades();
      toast.success("Trade updated");
    }
  };

  return { trades, loading, addTrade, addTradesBatch, deleteTrade, updateTrade, refetch: fetchTrades };
};
