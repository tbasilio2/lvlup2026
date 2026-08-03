import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Mood } from "@/lib/journal";

export interface JournalEntry {
  id: string;
  date: string;
  mood: Mood;
  gratitude: string;
  intention: string;
  reflection: string;
  wins: string;
  profitLoss: number | null;
  fees: number | null;
  createdAt: number;
}

export function useJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      setEntries(data.map((e: any) => ({
        id: e.id, date: e.date, mood: e.mood as Mood,
        gratitude: e.gratitude || "", intention: e.intention || "",
        reflection: e.reflection || "", wins: e.wins || "",
        profitLoss: e.profit_loss != null ? Number(e.profit_loss) : null,
        fees: e.fees != null ? Number(e.fees) : null,
        createdAt: new Date(e.created_at).getTime(),
      })));
    } catch {
      toast.error("Failed to load journal");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const saveEntry = useCallback(async (data: { date: string; mood: Mood; gratitude: string; intention: string; reflection: string; wins: string; profitLoss: number | null; fees: number | null }) => {
    if (!user) return;
    const existing = entries.find((e) => e.date === data.date);
    if (existing) {
      const { error } = await supabase
        .from("journal_entries")
        .update({ mood: data.mood, gratitude: data.gratitude, intention: data.intention, reflection: data.reflection, wins: data.wins, profit_loss: data.profitLoss, fees: data.fees })
        .eq("id", existing.id);
      if (error) { toast.error("Failed to save entry"); return; }
      setEntries((prev) => prev.map((e) => e.id === existing.id ? { ...e, ...data } : e));
    } else {
      const { data: newEntry, error } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          date: data.date,
          mood: data.mood,
          gratitude: data.gratitude,
          intention: data.intention,
          reflection: data.reflection,
          wins: data.wins,
          profit_loss: data.profitLoss,
          fees: data.fees,
        })
        .select()
        .single();
      if (error) { toast.error(`Failed to save entry: ${error.message}`); return; }
      setEntries((prev) => [{
        id: newEntry.id, date: newEntry.date, mood: newEntry.mood as Mood,
        gratitude: newEntry.gratitude || "", intention: newEntry.intention || "",
        reflection: newEntry.reflection || "", wins: newEntry.wins || "",
        profitLoss: newEntry.profit_loss != null ? Number(newEntry.profit_loss) : null,
        fees: newEntry.fees != null ? Number(newEntry.fees) : null,
        createdAt: new Date(newEntry.created_at).getTime(),
      }, ...prev]);
    }
  }, [user, entries]);

  return { entries, loading, saveEntry };
}
