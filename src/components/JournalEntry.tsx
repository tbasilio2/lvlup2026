import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, ChevronLeft, ChevronRight, TrendingUp, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  MOODS,
  getRandomPrompt,
  type Mood,
  type JournalEntry as Entry,
} from "@/lib/journal";

interface Props {
  existingEntry?: Entry;
  onSave: (entry: Omit<Entry, "id" | "createdAt">) => void;
  date: string;
}

const steps = ["mood", "gratitude", "intention", "reflection", "wins", "pnl"] as const;

const JournalEntryForm = ({ existingEntry, onSave, date }: Props) => {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<Mood>(existingEntry?.mood || "okay");
  const [gratitude, setGratitude] = useState(existingEntry?.gratitude || "");
  const [intention, setIntention] = useState(existingEntry?.intention || "");
  const [reflection, setReflection] = useState(existingEntry?.reflection || "");
  const [wins, setWins] = useState(existingEntry?.wins || "");
  const [profitLoss, setProfitLoss] = useState<string>(existingEntry?.profitLoss?.toString() ?? "");
  const [fees, setFees] = useState<string>(existingEntry?.fees?.toString() ?? "");

  const prompts = useMemo(
    () => ({
      gratitude: getRandomPrompt("gratitude"),
      intention: getRandomPrompt("intention"),
      reflection: getRandomPrompt("reflection"),
      wins: getRandomPrompt("wins"),
    }),
    []
  );

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onSave({
        date, mood, gratitude, intention, reflection, wins,
        profitLoss: profitLoss.trim() ? Number(profitLoss) : null,
        fees: fees.trim() ? Number(fees) : null,
      });
    } else {
      setStep((s) => s + 1);
    }
  };

  const textForStep: Record<string, { value: string; setter: (v: string) => void; prompt: string; title: string }> = {
    gratitude: { value: gratitude, setter: setGratitude, prompt: prompts.gratitude, title: "Gratitude" },
    intention: { value: intention, setter: setIntention, prompt: prompts.intention, title: "Intention" },
    reflection: { value: reflection, setter: setReflection, prompt: prompts.reflection, title: "Reflection" },
    wins: { value: wins, setter: setWins, prompt: prompts.wins, title: "Wins" },
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 justify-center">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/40" : "w-4 bg-border"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {currentStep === "mood" ? (
            <div className="text-center space-y-6">
              <div>
                <h3 className="font-serif text-xl text-foreground">How are you feeling?</h3>
                <p className="text-sm text-muted-foreground mt-1">Be honest with yourself</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                {MOODS.map((m) => (
                  <motion.button
                    key={m.value}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMood(m.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-colors ${
                      mood === m.value
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-card hover:bg-secondary"
                    }`}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{m.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : currentStep === "pnl" ? (
            <div className="space-y-5">
              <div className="text-center">
                <h3 className="font-serif text-xl text-foreground">Trading Performance</h3>
                <p className="text-sm text-muted-foreground mt-1">Log your daily P&L and fees</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-profit" /> Profit / Loss (R)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={profitLoss}
                    onChange={(e) => setProfitLoss(e.target.value)}
                    placeholder="e.g. 125.50 or -45.00"
                    className="rounded-xl border-border bg-card focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                    <Receipt className="h-3.5 w-3.5 text-primary" /> Fees (R)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="e.g. 12.00"
                    className="rounded-xl border-border bg-card focus:border-primary font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-serif text-xl text-foreground">{textForStep[currentStep].title}</h3>
                <p className="text-sm text-muted-foreground mt-1 italic">
                  {textForStep[currentStep].prompt}
                </p>
              </div>
              <Textarea
                value={textForStep[currentStep].value}
                onChange={(e) => textForStep[currentStep].setter(e.target.value)}
                placeholder="Write freely..."
                className="min-h-[120px] resize-none rounded-2xl border-border bg-card focus:border-primary text-sm leading-relaxed"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          size="sm"
          onClick={handleNext}
          className="gap-1 rounded-full px-5"
        >
          {isLast ? (
            <>
              Save <Send className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Next <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default JournalEntryForm;
