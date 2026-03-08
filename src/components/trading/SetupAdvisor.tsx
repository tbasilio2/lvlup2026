import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Brain, Loader2, ImagePlus, X, Star, Eye, Target, Shield, Lightbulb,
  ArrowUpRight, ArrowDownRight, Send
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChartAdvice {
  chart_analysis: string;
  setup_quality: number;
  setup_quality_reason: string;
  key_observations: string[];
  entry_feedback: string;
  risk_management: string;
  suggestions: string[];
}

const SetupAdvisor = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [advice, setAdvice] = useState<ChartAdvice | null>(null);
  const [extractNote, setExtractNote] = useState<string | null>(null);

  const [form, setForm] = useState({
    symbol: "",
    direction: "" as "" | "long" | "short",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    strategy: "",
    notes: "",
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const extractLevelsFromScreenshot = async (f: File) => {
    if (!user) return;
    setExtracting(true);
    setExtractNote(null);
    try {
      const ext = f.name.split(".").pop() || "png";
      const path = `${user.id}/extract-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("trade-screenshots")
        .upload(path, f, { contentType: f.type });
      if (upErr) { setExtracting(false); return; }
      const { data: urlData } = supabase.storage.from("trade-screenshots").getPublicUrl(path);

      const { data, error } = await supabase.functions.invoke("extract-chart-levels", {
        body: { screenshot_url: urlData.publicUrl },
      });
      if (error || data?.error) { setExtracting(false); return; }

      setForm((p) => ({
        ...p,
        symbol: data.symbol || p.symbol,
        direction: (data.direction === "long" || data.direction === "short") ? data.direction : p.direction,
        entry_price: data.entry_price || p.entry_price,
        stop_loss: data.stop_loss || p.stop_loss,
        take_profit: data.take_profit || p.take_profit,
      }));
      setExtractNote(`AI read levels (${data.confidence} confidence): ${data.notes}`);
      toast.success("Price levels extracted from chart");
    } catch {
      // silently fail extraction – user can still fill manually
    } finally {
      setExtracting(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAdvice(null);
    extractLevelsFromScreenshot(f);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setAdvice(null);
    setExtractNote(null);
  };

  const getAdvice = async () => {
    if (!file && !form.symbol) {
      toast.error("Upload a chart screenshot or describe your setup");
      return;
    }
    setLoading(true);
    setAdvice(null);

    try {
      let screenshotUrl: string | undefined;

      if (file && user) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${user.id}/advisor-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("trade-screenshots")
          .upload(path, file, { contentType: file.type });
        if (error) { toast.error("Upload failed"); setLoading(false); return; }
        const { data } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
        screenshotUrl = data.publicUrl;
      }

      const context: Record<string, string | undefined> = {};
      if (form.symbol) context.symbol = form.symbol.toUpperCase();
      if (form.direction) context.direction = form.direction;
      if (form.entry_price) context.entry_price = form.entry_price;
      if (form.stop_loss) context.stop_loss = form.stop_loss;
      if (form.take_profit) context.take_profit = form.take_profit;
      if (form.strategy) context.strategy = form.strategy;
      if (form.notes) context.notes = form.notes;

      const tradeContext = Object.keys(context).length > 0
        ? {
            ...context,
            // Map to what the edge function expects
            exit_price: null,
            pnl: null,
          }
        : undefined;

      const { data, error } = await supabase.functions.invoke("analyze-chart", {
        body: {
          screenshot_url: screenshotUrl || "none",
          trade_context: tradeContext,
          is_setup_advice: true,
          setup_details: {
            ...context,
            stop_loss: form.stop_loss || undefined,
            take_profit: form.take_profit || undefined,
          },
        },
      });

      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAdvice(data);
    } catch {
      toast.error("Failed to get advice");
    } finally {
      setLoading(false);
    }
  };

  const qualityColor = (q: number) =>
    q >= 8 ? "text-profit" : q >= 5 ? "text-streak-glow" : "text-loss";

  const inputCls = "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60";

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
            <h3 className="text-sm font-semibold text-foreground">Setup Advisor</h3>
            <p className="text-[10px] text-muted-foreground font-mono">Upload a chart &amp; describe your plan for AI feedback</p>
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
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border border-dashed border-border bg-secondary/20 hover:bg-secondary/40 transition-colors py-5 flex flex-col items-center gap-1.5"
          >
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload chart screenshot</span>
          </button>
        )}

        {/* Extracting indicator */}
        {extracting && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Reading price levels from chart…</span>
          </div>
        )}
        {extractNote && !extracting && (
          <div className="flex items-center gap-2 rounded-lg border border-profit/20 bg-profit/5 px-3 py-2">
            <Eye className="h-3.5 w-3.5 text-profit" />
            <span className="text-xs text-muted-foreground">{extractNote}</span>
          </div>
        )}
        {/* Setup Details */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Symbol</label>
            <input value={form.symbol} onChange={(e) => update("symbol", e.target.value)} placeholder="EURUSD" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Direction</label>
            <Select value={form.direction} onValueChange={(v) => update("direction", v)}>
              <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="long"><span className="flex items-center gap-1"><ArrowUpRight className="h-3 w-3 text-profit" /> Long</span></SelectItem>
                <SelectItem value="short"><span className="flex items-center gap-1"><ArrowDownRight className="h-3 w-3 text-loss" /> Short</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
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
          <input value={form.strategy} onChange={(e) => update("strategy", e.target.value)} placeholder="e.g. Break & Retest at support" className={inputCls} />
        </div>

        <div>
          <label className="text-[10px] font-mono text-muted-foreground mb-0.5 block">Your Reasoning</label>
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Why do you want to take this trade?" rows={2} className={inputCls + " resize-none"} />
        </div>

        <button
          onClick={getAdvice}
          disabled={loading || (!file && !form.symbol)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
          ) : (
            <><Send className="h-4 w-4" /> Get Trade Advice</>
          )}
        </button>
      </motion.div>

      {/* AI Advice Results */}
      <AnimatePresence>
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* Quality Score */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
              <div className={`text-3xl font-bold font-mono ${qualityColor(advice.setup_quality)}`}>
                {advice.setup_quality}<span className="text-base text-muted-foreground">/10</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Star className={`h-4 w-4 ${qualityColor(advice.setup_quality)}`} />
                  <span className="text-xs font-semibold text-foreground">Setup Quality</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{advice.setup_quality_reason}</p>
              </div>
            </div>

            {[
              { icon: Eye, title: "Chart Analysis", content: advice.chart_analysis, type: "text" as const },
              { icon: Target, title: "Key Observations", content: advice.key_observations, type: "list" as const, color: "text-primary" },
              { icon: Target, title: "Entry Feedback", content: advice.entry_feedback, type: "text" as const },
              { icon: Shield, title: "Risk Management", content: advice.risk_management, type: "text" as const },
              { icon: Lightbulb, title: "Suggestions", content: advice.suggestions, type: "list" as const, color: "text-primary" },
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
                {section.type === "text" ? (
                  <p className="text-xs text-foreground/90 leading-relaxed">{section.content as string}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {(section.content as string[]).map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className={`text-xs mt-0.5 ${section.color}`}>›</span>
                        <span className="text-xs text-foreground/90 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SetupAdvisor;
