import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Heart, Lightbulb, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type JournalEntry, formatDate } from "@/lib/journal";

interface WeeklyReflectionData {
  summary: string;
  moodPattern: string;
  strengths: string[];
  improvements: string[];
  affirmation: string;
}

type WeeklyReflectionResponse = WeeklyReflectionData & { error?: string };

interface Props {
  entries: JournalEntry[];
}

const WeeklyReflection = ({ entries }: Props) => {
  const [reflection, setReflection] = useState<WeeklyReflectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const weekEntries = useMemo(() => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    const weekAgoStr = formatDate(weekAgo);
    const todayStr = formatDate(today);
    return entries.filter((e) => e.date >= weekAgoStr && e.date <= todayStr);
  }, [entries]);

  const handleGenerate = async () => {
    if (weekEntries.length === 0) {
      toast.error("No entries from this week to reflect on");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<WeeklyReflectionResponse>("weekly-reflection", {
        body: { entries: weekEntries },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data) throw new Error("Weekly reflection returned no data");
      setReflection(data);
      setGenerated(true);
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to generate reflection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Weekly Reflection
        </h2>
        {weekEntries.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {weekEntries.length} {weekEntries.length === 1 ? "entry" : "entries"} this week
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!generated ? (
          <motion.div
            key="prompt"
            className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Sparkles className="h-8 w-8 text-primary/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Get AI-powered insights from your week
            </p>
            <p className="text-[10px] text-muted-foreground/60 mb-4">
              {weekEntries.length > 0
                ? `Based on ${weekEntries.length} journal ${weekEntries.length === 1 ? "entry" : "entries"} from the last 7 days`
                : "Write some journal entries first to unlock insights"}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={loading || weekEntries.length === 0}
              className="rounded-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Reflecting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Weekly Summary
                </>
              )}
            </Button>
          </motion.div>
        ) : reflection ? (
          <motion.div
            key="result"
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Summary */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">How Your Week Went</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{reflection.summary}</p>
                </div>
              </div>

              {/* Mood Pattern */}
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">Mood Pattern</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{reflection.moodPattern}</p>
                </div>
              </div>
            </div>

            {/* Strengths */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">What You Did Well</h3>
              </div>
              <ul className="space-y-2">
                {reflection.strengths.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-accent mt-0.5">✓</span>
                    {s}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Ideas for Next Week</h3>
              </div>
              <ul className="space-y-2">
                {reflection.improvements.map((s, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.2 }}
                  >
                    <span className="text-primary mt-0.5">→</span>
                    {s}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Affirmation */}
            <motion.div
              className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-sm font-medium text-foreground italic">
                "{reflection.affirmation}"
              </p>
            </motion.div>

            {/* Regenerate */}
            <div className="text-center pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
                className="gap-1.5 text-muted-foreground text-xs"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Regenerate
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
};

export default WeeklyReflection;
