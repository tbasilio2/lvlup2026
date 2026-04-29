import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { History, Trash2, ArrowUpRight, ArrowDownRight, Star, Brain, Zap, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";

interface Analysis {
  id: string;
  created_at: string;
  kind: string;
  symbol: string | null;
  direction: string | null;
  entry_price: string | null;
  stop_loss: string | null;
  take_profit: string | null;
  risk_reward: string | null;
  quality: number | null;
  screenshot_url: string | null;
  payload: any;
}

const AnalysesHistory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chart_analyses" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load history");
    else setItems((data as unknown as Analysis[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("chart_analyses_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "chart_analyses" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchItems]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("chart_analyses" as any).delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      setItems((p) => p.filter((i) => i.id !== id));
      toast.success("Deleted");
    }
  };

  const fmtDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const qualityColor = (q: number | null) =>
    q == null ? "text-muted-foreground" : q >= 8 ? "text-profit" : q >= 5 ? "text-streak-glow" : "text-loss";

  if (loading) {
    return <div className="text-center py-8 text-xs text-muted-foreground font-mono">Loading history…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card/50">
        <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No saved analyses yet.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Run AI Trade or Advisor to save one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-4 w-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {items.length} saved {items.length === 1 ? "analysis" : "analyses"}
        </span>
      </div>

      <AnimatePresence>
        {items.map((it) => {
          const isOpen = openId === it.id;
          const KindIcon = it.kind === "ai_trade" ? Zap : Brain;
          return (
            <motion.div
              key={it.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : it.id)}
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <KindIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-foreground truncate">{it.symbol || "—"}</span>
                    {it.direction && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        it.direction === "long" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                      }`}>
                        {it.direction === "long" ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                        {it.direction.toUpperCase()}
                      </span>
                    )}
                    {it.quality != null && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold ${qualityColor(it.quality)}`}>
                        <Star className="h-2.5 w-2.5" />{it.quality}/10
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground">
                    <span>{fmtDate(it.created_at)}</span>
                    <span>·</span>
                    <span>{it.kind === "ai_trade" ? "AI Trade" : "Advisor"}</span>
                    {it.entry_price && <><span>·</span><span>E {it.entry_price}</span></>}
                    {it.stop_loss && <><span>·</span><span className="text-loss">SL {it.stop_loss}</span></>}
                    {it.take_profit && <><span>·</span><span className="text-profit">TP {it.take_profit}</span></>}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-3 space-y-3">
                      {it.screenshot_url && (
                        <a href={it.screenshot_url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-border">
                          <img src={it.screenshot_url} alt="Chart" className="w-full max-h-48 object-contain bg-secondary/30" />
                        </a>
                      )}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-secondary/40 p-2 text-center">
                          <div className="text-[9px] font-mono text-muted-foreground uppercase mb-0.5">Entry</div>
                          <div className="text-xs font-bold font-mono text-foreground">{it.entry_price || "—"}</div>
                        </div>
                        <div className="rounded-lg bg-loss/5 border border-loss/10 p-2 text-center">
                          <div className="text-[9px] font-mono text-loss uppercase mb-0.5">Stop Loss</div>
                          <div className="text-xs font-bold font-mono text-loss">{it.stop_loss || "—"}</div>
                        </div>
                        <div className="rounded-lg bg-profit/5 border border-profit/10 p-2 text-center">
                          <div className="text-[9px] font-mono text-profit uppercase mb-0.5">Take Profit</div>
                          <div className="text-xs font-bold font-mono text-profit">{it.take_profit || "—"}</div>
                        </div>
                      </div>
                      {it.risk_reward && (
                        <div className="text-[10px] font-mono text-muted-foreground text-center">R:R {it.risk_reward}</div>
                      )}
                      {it.payload?.chart_analysis && (
                        <div className="rounded-lg bg-secondary/30 p-3">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Chart Analysis</div>
                          <p className="text-xs text-foreground/90 leading-relaxed">{it.payload.chart_analysis}</p>
                        </div>
                      )}
                      {it.payload?.entry_reasoning && (
                        <div className="rounded-lg bg-secondary/30 p-3">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Entry Reasoning</div>
                          <p className="text-xs text-foreground/90 leading-relaxed">{it.payload.entry_reasoning}</p>
                        </div>
                      )}
                      {it.payload?.suggestions && Array.isArray(it.payload.suggestions) && it.payload.suggestions.length > 0 && (
                        <div className="rounded-lg bg-secondary/30 p-3">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Suggestions</div>
                          <ul className="space-y-1">
                            {it.payload.suggestions.map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-2"><span className="text-primary text-xs">›</span><span className="text-xs text-foreground/90">{s}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button
                        onClick={() => remove(it.id)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-loss/20 bg-loss/5 px-3 py-2 text-xs font-semibold text-loss hover:bg-loss/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnalysesHistory;
