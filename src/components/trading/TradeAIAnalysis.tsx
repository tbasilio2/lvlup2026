import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { Trade } from "@/hooks/useTrades";
import { toast } from "sonner";
import { Brain, TrendingUp, Shield, Target, Zap, ChevronRight, Loader2, Sparkles } from "lucide-react";

interface TradeAnalysis {
  performance_summary: string;
  patterns: { title: string; description: string }[];
  strengths: string[];
  improvements: string[];
  risk_assessment: string;
  next_steps: string[];
}

interface Props {
  trades: Trade[];
}

const TradeAIAnalysis = ({ trades }: Props) => {
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    if (trades.length === 0) {
      toast.error("Add some trades first to get AI analysis");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("trade-analysis", {
        body: {
          trades: trades.slice(0, 50).map((t) => ({
            symbol: t.symbol,
            direction: t.direction,
            entry_price: t.entry_price,
            exit_price: t.exit_price,
            quantity: t.quantity,
            entry_date: t.entry_date,
            exit_date: t.exit_date,
            pnl: t.pnl,
            fees: t.fees,
            strategy: t.strategy,
            notes: t.notes,
            status: t.status,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setAnalysis(data);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  };

  if (!analysis) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">AI Trade Analysis</h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
          Get AI-powered insights on your trading patterns, risk management, and actionable next steps.
        </p>
        <button
          onClick={runAnalysis}
          disabled={loading || trades.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing {trades.length} trades…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Analyze My Trades
            </>
          )}
        </button>
        {trades.length === 0 && (
          <p className="text-[10px] text-muted-foreground/60 mt-2">Add trades to enable analysis</p>
        )}
      </motion.div>
    );
  }

  const sections = [
    {
      icon: TrendingUp,
      title: "Performance",
      content: analysis.performance_summary,
      type: "text" as const,
    },
    {
      icon: Zap,
      title: "Patterns",
      content: analysis.patterns,
      type: "patterns" as const,
    },
    {
      icon: Target,
      title: "Strengths",
      content: analysis.strengths,
      type: "list" as const,
      color: "text-profit",
    },
    {
      icon: ChevronRight,
      title: "Improvements",
      content: analysis.improvements,
      type: "list" as const,
      color: "text-loss",
    },
    {
      icon: Shield,
      title: "Risk Assessment",
      content: analysis.risk_assessment,
      type: "text" as const,
    },
    {
      icon: Sparkles,
      title: "Next Steps",
      content: analysis.next_steps,
      type: "list" as const,
      color: "text-primary",
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground font-mono">AI Analysis</h3>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-mono flex items-center gap-1"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Refresh
          </button>
        </div>

        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <section.icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {section.title}
              </span>
            </div>

            {section.type === "text" && (
              <p className="text-xs text-foreground/90 leading-relaxed">{section.content as string}</p>
            )}

            {section.type === "list" && (
              <ul className="space-y-1.5">
                {(section.content as string[]).map((item, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className={`text-xs mt-0.5 ${section.color ?? "text-foreground"}`}>›</span>
                    <span className="text-xs text-foreground/90 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.type === "patterns" && (
              <div className="space-y-2">
                {(section.content as { title: string; description: string }[]).map((p, j) => (
                  <div key={j}>
                    <p className="text-xs font-semibold text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default TradeAIAnalysis;
