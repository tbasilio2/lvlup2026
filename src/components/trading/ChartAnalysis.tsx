import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { Trade } from "@/hooks/useTrades";
import { toast } from "sonner";
import { Brain, Loader2, Eye, Target, Shield, Lightbulb, Star, X } from "lucide-react";

interface ChartAnalysisResult {
  chart_analysis: string;
  setup_quality: number;
  setup_quality_reason: string;
  key_observations: string[];
  entry_feedback: string;
  risk_management: string;
  suggestions: string[];
}

interface Props {
  trade: Trade;
}

const ChartAnalysis = ({ trade }: Props) => {
  const [analysis, setAnalysis] = useState<ChartAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setShow(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-chart", {
        body: {
          screenshot_url: trade.screenshot_url,
          trade_context: {
            symbol: trade.symbol,
            direction: trade.direction,
            entry_price: trade.entry_price,
            exit_price: trade.exit_price,
            pnl: trade.pnl,
            strategy: trade.strategy,
            notes: trade.notes,
          },
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setAnalysis(data);
    } catch {
      toast.error("Failed to analyze chart");
    } finally {
      setLoading(false);
    }
  };

  const qualityColor = (q: number) =>
    q >= 8 ? "text-profit" : q >= 5 ? "text-streak-glow" : "text-loss";

  if (!show) {
    return (
      <button
        onClick={analyze}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-[11px] font-mono text-primary hover:bg-primary/20 transition-colors"
      >
        <Brain className="h-3 w-3" />
        AI Analyze Chart
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary">Chart Analysis</span>
          </div>
          <button onClick={() => { setShow(false); setAnalysis(null); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-mono">Analyzing chart…</span>
          </div>
        ) : analysis ? (
          <div className="space-y-3">
            {/* Quality Score */}
            <div className="flex items-center gap-2">
              <Star className={`h-4 w-4 ${qualityColor(analysis.setup_quality)}`} />
              <span className={`text-lg font-bold font-mono ${qualityColor(analysis.setup_quality)}`}>
                {analysis.setup_quality}/10
              </span>
              <span className="text-xs text-muted-foreground">{analysis.setup_quality_reason}</span>
            </div>

            {/* Chart Analysis */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Overview</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">{analysis.chart_analysis}</p>
            </div>

            {/* Key Observations */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Key Observations</span>
              </div>
              <ul className="space-y-1">
                {analysis.key_observations.map((obs, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary text-xs mt-0.5">›</span>
                    <span className="text-xs text-foreground/90">{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Entry Feedback */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3 w-3 text-profit" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Entry Feedback</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">{analysis.entry_feedback}</p>
            </div>

            {/* Risk */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Shield className="h-3 w-3 text-streak-glow" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Risk Management</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">{analysis.risk_management}</p>
            </div>

            {/* Suggestions */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Suggestions</span>
              </div>
              <ul className="space-y-1">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary text-xs mt-0.5">›</span>
                    <span className="text-xs text-foreground/90">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
};

export default ChartAnalysis;
