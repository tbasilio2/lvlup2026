import StrategySelect from "@/components/trading/StrategySelect";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Brain, Loader2, ImagePlus, X, Star, Eye, Target, Shield, Lightbulb,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Crosshair, RefreshCw, Send,
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

interface ChartAdvice {
  chart_analysis: string;
  setup_quality: number;
  setup_quality_reason: string;
  key_observations: string[];
  entry_feedback: string;
  risk_management: string;
  suggestions: string[];
}

type ChartAnalysisRow = Record<string, unknown>;

type ChartAnalysisClient = {
  from: (table: string) => {
    insert: (row: ChartAnalysisRow) => PromiseLike<unknown>;
  };
};

const insertChartAnalysis = (row: ChartAnalysisRow) => {
  const client = supabase as unknown as ChartAnalysisClient;
  return client.from("chart_analyses").insert(row);
};

const qualityColor = (q: number) =>
  q >= 8 ? "text-profit" : q >= 5 ? "text-streak-glow" : "text-loss";

const inputCls =
  "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60";

const AICopilot = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [advising, setAdvising] = useState(false);
  const [plan, setPlan] = useState<TradePlan | null>(null);
  const [advice, setAdvice] = useState<ChartAdvice | null>(null);

  const [form, setForm] = useState({
    symbol: "",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    strategy: "",
    notes: "",
  });
  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const uploadChart = async (file: File) => {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/copilot-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("trade-screenshots")
      .upload(path, file, { contentType: file.type });
    if (error) return null;
    const { data } = await supabase.storage.from("trade-screenshots").createSignedUrl(path, 3600);
    if (!data?.signedUrl) return null;
    return { path, url: data.signedUrl };
  };

  const runAdvice = async (
    screenshotUrl: string | undefined,
    screenshotPath: string | null,
    ctx: Record<string, string>,
  ) => {
    setAdvising(true);
    setAdvice(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-chart", {
        body: {
          screenshot_url: screenshotUrl || "none",
          trade_context: Object.keys(ctx).length ? { ...ctx, exit_price: null, pnl: null } : undefined,
          is_setup_advice: true,
          setup_details: ctx,
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAdvice(data);

      if (user) {
        await insertChartAnalysis({
          user_id: user.id,
          kind: "advisor",
          symbol: ctx.symbol ?? null,
          direction: ctx.direction ?? null,
          entry_price: ctx.entry_price ?? null,
          stop_loss: ctx.stop_loss ?? null,
          take_profit: ctx.take_profit ?? null,
          risk_reward: null,
          quality: typeof data.setup_quality === "number" ? data.setup_quality : null,
          screenshot_url: screenshotPath,
          payload: data,
        });
      }
    } catch {
      toast.error("Failed to get advice");
    } finally {
      setAdvising(false);
    }
  };

  /** Full pipeline: plan the trade, then critique the same setup — one upload, everything. */
  const runAll = async (file: File, dirOverride?: "long" | "short") => {
    if (!user) { toast.error("Sign in required"); return; }
    setPlanning(true);
    setPlan(null);
    setAdvice(null);

    const uploaded = await uploadChart(file);
    if (!uploaded) { toast.error("Upload failed"); setPlanning(false); return; }

    let generated: TradePlan | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("ai-trade-plan", {
        body: { screenshot_url: uploaded.url, direction: dirOverride },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setPlanning(false); return; }
      generated = data as TradePlan;
      setPlan(generated);
      setForm((p) => ({
        ...p,
        symbol: generated!.symbol || p.symbol,
        entry_price: generated!.entry_price || p.entry_price,
        stop_loss: generated!.stop_loss || p.stop_loss,
        take_profit: generated!.take_profit || p.take_profit,
      }));

      await insertChartAnalysis({
        user_id: user.id,
        kind: "ai_trade",
        symbol: generated.symbol ?? null,
        direction: generated.direction ?? null,
        entry_price: generated.entry_price ?? null,
        stop_loss: generated.stop_loss ?? null,
        take_profit: generated.take_profit ?? null,
        risk_reward: generated.risk_reward ?? null,
        quality: typeof generated.trade_quality === "number" ? generated.trade_quality : null,
        screenshot_url: uploaded.path,
        payload: generated,
      });
    } catch {
      toast.error("Failed to generate trade plan");
      setPlanning(false);
      return;
    }
    setPlanning(false);

    const ctx: Record<string, string> = {};
    const merged = {
      symbol: generated?.symbol || form.symbol,
      direction: generated?.direction || dirOverride || "",
      entry_price: generated?.entry_price || form.entry_price,
      stop_loss: generated?.stop_loss || form.stop_loss,
      take_profit: generated?.take_profit || form.take_profit,
      strategy: form.strategy,
      notes: form.notes,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) ctx[k] = String(v); });
    await runAdvice(uploaded.url, uploaded.path, ctx);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    lastFileRef.current = f;
    setPreview(URL.createObjectURL(f));
    runAll(f);
  };

  const clearFile = () => {
    lastFileRef.current = null;
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setPlan(null);
    setAdvice(null);
  };

  const flipDirection = (dir: "long" | "short") => {
    if (lastFileRef.current) runAll(lastFileRef.current, dir);
  };

  const rerunAdvice = async () => {
    const ctx: Record<string, string> = {};
    const merged = { ...form, direction: plan?.direction ?? "" };
    Object.entries(merged).forEach(([k, v]) => { if (v) ctx[k] = String(v); });
    if (!Object.keys(ctx).length) { toast.error("Upload a chart or fill in your setup"); return; }
    await runAdvice(undefined, null, ctx);
  };

  const busy = planning || advising;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Trade Copilot</h3>
            <p className="text-[10px] text-muted-foreground font-mono">
              One upload → plan (direction, entry, SL, TP) + setup critique
            </p>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        {preview ? (
          <div className="relative rounded-xl border border-border overflow-hidden">
            <img src={preview} alt="Uploaded trading chart for AI analysis" className="w-full max-h-44 object-contain bg-secondary/30" />
            <button type="button" onClick={clearFile} className="absolute top-2 right-2 p-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive/20 transition-colors">
              <X className="h-3.5 w-3.5 text-foreground" />
            </button>
            {busy && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs font-mono text-foreground">
                  {planning ? "Building trade plan…" : "Reviewing setup…"}
                </span>
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
            <span className="text-[10px] text-muted-foreground/70 font-mono">Plan + advice generated automatically</span>
          </button>
        )}

        {plan && !planning && (
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-1 flex items-center gap-1">
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

        {/* Manual refinement */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Symbol</label>
            <input value={form.symbol} onChange={(e) => update("symbol", e.target.value)} placeholder="EURUSD" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Entry Price</label>
            <input type="number" step="any" value={form.entry_price} onChange={(e) => update("entry_price", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Stop Loss</label>
            <input type="number" step="any" value={form.stop_loss} onChange={(e) => update("stop_loss", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Take Profit</label>
            <input type="number" step="any" value={form.take_profit} onChange={(e) => update("take_profit", e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Strategy / Setup</label>
          <StrategySelect value={form.strategy} onChange={(v) => update("strategy", v)} className={inputCls} />
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Your Reasoning</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Why do you want to take this trade?" rows={2} className={inputCls + " resize-none"} />
        </div>

        <button
          onClick={rerunAdvice}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {advising ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Send className="h-4 w-4" /> Re-run Advice</>}
        </button>
        <p className="text-[10px] text-muted-foreground/70 font-mono text-center -mt-1">
          Tip: edit any field above and re-run for refined feedback
        </p>
      </motion.div>

      {/* Plan results */}
      <AnimatePresence>
        {plan && (
          <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-foreground">{plan.symbol}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    plan.direction === "long" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                  }`}>
                    {plan.direction === "long" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {plan.direction?.toUpperCase()}
                  </span>
                </div>
                <div className={`text-lg font-bold font-mono ${qualityColor(plan.trade_quality)}`}>
                  {plan.trade_quality}/10
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{plan.trade_quality_reason}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-background/60 border border-border p-2">
                  <p className="text-[9px] text-muted-foreground font-mono">ENTRY</p>
                  <p className="text-xs font-mono font-semibold">{plan.entry_price}</p>
                </div>
                <div className="rounded-lg bg-background/60 border border-loss/20 p-2">
                  <p className="text-[9px] text-muted-foreground font-mono">STOP</p>
                  <p className="text-xs font-mono font-semibold text-loss">{plan.stop_loss}</p>
                </div>
                <div className="rounded-lg bg-background/60 border border-profit/20 p-2">
                  <p className="text-[9px] text-muted-foreground font-mono">TARGET</p>
                  <p className="text-xs font-mono font-semibold text-profit">{plan.take_profit}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-primary" /> Chart Analysis</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{plan.chart_analysis}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-[9px] text-muted-foreground font-mono mb-1">ENTRY REASONING</p>
                  <p className="text-xs text-foreground/80">{plan.entry_reasoning}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-[9px] text-muted-foreground font-mono mb-1">RISK / REWARD</p>
                  <p className="text-xs text-foreground/80">{plan.risk_reward}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-[9px] text-muted-foreground font-mono mb-1">STOP REASONING</p>
                  <p className="text-xs text-foreground/80">{plan.sl_reasoning}</p>
                </div>
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-[9px] text-muted-foreground font-mono mb-1">TARGET REASONING</p>
                  <p className="text-xs text-foreground/80">{plan.tp_reasoning}</p>
                </div>
              </div>
              {plan.key_levels?.length > 0 && (
                <div>
                  <p className="text-[9px] text-muted-foreground font-mono mb-1">KEY LEVELS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.key_levels.map((level, i) => <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-secondary text-foreground/80">{level}</span>)}
                  </div>
                </div>
              )}
              {plan.warnings?.length > 0 && (
                <div className="rounded-lg border border-loss/20 bg-loss/5 p-3">
                  <p className="text-[9px] text-loss font-mono mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> WARNINGS</p>
                  <ul className="space-y-1">{plan.warnings.map((w, i) => <li key={i} className="text-[10px] text-loss/80">• {w}</li>)}</ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {advice && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-streak-glow/20 bg-streak-glow/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-streak-glow" /> Setup Critique</h4>
            <span className={`text-sm font-mono font-bold ${qualityColor(advice.setup_quality)}`}>{advice.setup_quality}/10</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{advice.chart_analysis}</p>
          <p className="text-xs text-foreground/80"><strong>Verdict:</strong> {advice.setup_quality_reason}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {advice.key_observations?.map((o, i) => <div key={i} className="rounded-lg bg-background/50 p-2 text-[10px] text-muted-foreground">• {o}</div>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><p className="text-[9px] text-muted-foreground font-mono mb-1">ENTRY FEEDBACK</p><p className="text-[10px] text-foreground/80">{advice.entry_feedback}</p></div>
            <div><p className="text-[9px] text-muted-foreground font-mono mb-1">RISK MANAGEMENT</p><p className="text-[10px] text-foreground/80">{advice.risk_management}</p></div>
          </div>
          {advice.suggestions?.length > 0 && <div><p className="text-[9px] text-muted-foreground font-mono mb-1">SUGGESTIONS</p><ul className="space-y-1">{advice.suggestions.map((s, i) => <li key={i} className="text-[10px] text-foreground/80">• {s}</li>)}</ul></div>}
        </motion.div>
      )}
    </div>
  );
};

export default AICopilot;
