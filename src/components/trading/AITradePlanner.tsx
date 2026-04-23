import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Brain, Loader2, ImagePlus, X, Star, Eye, Target, Shield,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Crosshair, Zap, RefreshCw
} from "lucide-react";

interface TradePlan {
  symbol: string;
  direction: string;
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  risk_reward: string;
  trade_quality: number;
  trade_quality_reason: string;
  chart_analysis: string;
  entry_reasoning: string;
  sl_reasoning: string;
  tp_reasoning: string;
  key_levels: string[];
  warnings: string[];
}

const AITradePlanner = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TradePlan | null>(null);

  const runPlan = async (file: File, dirOverride?: "long" | "short") => {
    if (!user) { toast.error("Sign in required"); return; }
    setLoading(true);
    setPlan(null);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/ai-trade-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("trade-screenshots")
        .upload(path, file, { contentType: file.type });
      if (upErr) { toast.error("Upload failed"); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from("trade-screenshots").getPublicUrl(path);

      const { data, error } = await supabase.functions.invoke("ai-trade-plan", {
        body: {
          screenshot_url: urlData.publicUrl,
          direction: dirOverride,
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setPlan(data);
    } catch {
      toast.error("Failed to generate trade plan");
    } finally {
      setLoading(false);
    }
  };

  const lastFileRef = useRef<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    lastFileRef.current = f;
    setPreview(URL.createObjectURL(f));
    runPlan(f);
  };

  const clearFile = () => {
    lastFileRef.current = null;
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setPlan(null);
  };

  const flipDirection = (dir: "long" | "short") => {
    if (!lastFileRef.current) return;
    runPlan(lastFileRef.current, dir);
  };

  const qualityColor = (q: number) =>
    q >= 8 ? "text-profit" : q >= 5 ? "text-streak-glow" : "text-loss";

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Trade Planner</h3>
            <p className="text-[10px] text-muted-foreground font-mono">Upload a chart → AI picks direction, entry, SL &amp; TP automatically</p>
          </div>
        </div>

        {/* Screenshot Upload */}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        {preview ? (
          <div className="relative rounded-xl border border-border overflow-hidden">
            <img src={preview} alt="Chart" className="w-full max-h-44 object-contain bg-secondary/30" />
            <button type="button" onClick={clearFile} className="absolute top-2 right-2 p-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive/20 transition-colors">
              <X className="h-3.5 w-3.5 text-foreground" />
            </button>
            {loading && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs font-mono text-foreground">Analyzing chart…</span>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border border-dashed border-border bg-secondary/20 hover:bg-secondary/40 transition-colors py-8 flex flex-col items-center gap-1.5"
          >
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload chart screenshot</span>
            <span className="text-[10px] text-muted-foreground/70 font-mono">AI will auto-analyze instantly</span>
          </button>
        )}

        {/* Direction override – only after a plan exists */}
        {plan && !loading && (
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-1 block flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Re-analyze as
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => flipDirection("long")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  plan.direction === "long"
                    ? "border-profit bg-profit/10 text-profit"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" /> Long
              </button>
              <button
                type="button"
                onClick={() => flipDirection("short")}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-all ${
                  plan.direction === "short"
                    ? "border-loss bg-loss/10 text-loss"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                <ArrowDownRight className="h-3.5 w-3.5" /> Short
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Quality + Symbol Header */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">{plan.symbol}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    plan.direction === "long" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                  }`}>
                    {plan.direction === "long" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {plan.direction.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className={`h-4 w-4 ${qualityColor(plan.trade_quality)}`} />
                  <span className={`text-2xl font-bold font-mono ${qualityColor(plan.trade_quality)}`}>
                    {plan.trade_quality}<span className="text-sm text-muted-foreground">/10</span>
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{plan.trade_quality_reason}</p>
            </div>

            {/* Price Levels Card */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crosshair className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Trade Levels</span>
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">R:R {plan.risk_reward}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-secondary/40 p-2.5 text-center">
                  <div className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Entry</div>
                  <div className="text-sm font-bold font-mono text-foreground">{plan.entry_price}</div>
                </div>
                <div className="rounded-lg bg-loss/5 border border-loss/10 p-2.5 text-center">
                  <div className="text-[9px] font-mono text-loss uppercase mb-1">Stop Loss</div>
                  <div className="text-sm font-bold font-mono text-loss">{plan.stop_loss}</div>
                </div>
                <div className="rounded-lg bg-profit/5 border border-profit/10 p-2.5 text-center">
                  <div className="text-[9px] font-mono text-profit uppercase mb-1">Take Profit</div>
                  <div className="text-sm font-bold font-mono text-profit">{plan.take_profit}</div>
                </div>
              </div>
            </div>

            {/* Analysis Sections */}
            {[
              { icon: Eye, title: "Chart Analysis", content: plan.chart_analysis },
              { icon: Crosshair, title: "Entry Reasoning", content: plan.entry_reasoning },
              { icon: Shield, title: "Stop Loss Reasoning", content: plan.sl_reasoning },
              { icon: Target, title: "Take Profit Reasoning", content: plan.tp_reasoning },
            ].map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <section.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{section.title}</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">{section.content}</p>
              </motion.div>
            ))}

            {/* Key Levels */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Key Levels</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {plan.key_levels.map((lvl, j) => (
                  <span key={j} className="text-xs font-mono px-2 py-1 rounded-lg bg-secondary/50 text-foreground/80">{lvl}</span>
                ))}
              </div>
            </motion.div>

            {/* Warnings */}
            {plan.warnings.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-streak-glow/20 bg-streak-glow/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-streak-glow" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-streak-glow">Warnings</span>
                </div>
                <ul className="space-y-1.5">
                  {plan.warnings.map((w, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-xs mt-0.5 text-streak-glow">⚠</span>
                      <span className="text-xs text-foreground/90 leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AITradePlanner;
