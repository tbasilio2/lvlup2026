import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, CheckSquare, Target, TrendingUp, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "lvlup:product-tour-complete";
const baseSteps = [
  { key: "habits", title: "Habits are your daily actions", body: "Check in here each day and build repeatable momentum. Start small — consistency is the point.", icon: CheckSquare, path: "/" },
  { key: "goals", title: "Goals give you direction", body: "Use Goals for the outcomes you care about, then connect them to actions you can control.", icon: Target, path: "/goals" },
  { key: "journal", title: "Journal to find patterns", body: "Reflect on your day, mood and decisions. The value comes from noticing what repeats.", icon: BookOpen, path: "/journal" },
  { key: "trading", title: "Trading is about process", body: "Track discipline and decisions — not just results.", icon: TrendingUp, path: "/trading" },
];

const focusCopy: Record<string, { title: string; body: string; key: string }> = {
  Consistency: { title: "Your first mission: build consistency", body: "We've put Habits first because that's the focus you chose. Create one habit you can realistically repeat this week.", key: "habits" },
  Goals: { title: "Your first mission: make a goal actionable", body: "You chose Goals. After this tour, head to Goals and turn one outcome into a concrete next step.", key: "goals" },
  "Self-reflection": { title: "Your first mission: notice the pattern", body: "You chose Self-reflection. Your Journal is the place to capture what happened and learn from it.", key: "journal" },
  "Trading discipline": { title: "Your first mission: protect the process", body: "You chose Trading discipline. Focus on repeatable execution and review your decisions, not just P&L.", key: "trading" },
};

interface ProductTourProps { onNavigate?: (path: string) => void; onboardingFocus?: string | null }

const ProductTour = ({ onNavigate, onboardingFocus }: ProductTourProps) => {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => {
    if (!onboardingFocus || !focusCopy[onboardingFocus]) return baseSteps;
    const focus = focusCopy[onboardingFocus];
    const focusStep = baseSteps.find((item) => item.key === focus.key);
    if (!focusStep) return baseSteps;
    return [{ ...focusStep, title: focus.title, body: focus.body }, ...baseSteps.filter((item) => item.key !== focus.key)];
  }, [onboardingFocus]);

  useEffect(() => { setOpen(localStorage.getItem(TOUR_KEY) !== "true"); }, []);
  const finish = () => { localStorage.setItem(TOUR_KEY, "true"); setOpen(false); };
  const next = () => { if (step === steps.length - 1) return finish(); const nextStep = step + 1; setStep(nextStep); onNavigate?.(steps[nextStep].path); };
  const current = steps[step];
  const Icon = current.icon;

  if (!open) return null;
  return <div className="fixed inset-0 z-[90] bg-black/45 p-4 sm:p-6"><div className="mx-auto flex min-h-full max-w-lg items-center justify-center"><AnimatePresence mode="wait"><motion.section key={step} className="w-full rounded-3xl border border-border bg-card p-6 shadow-2xl" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
    <div className="flex items-center justify-between"><div className="flex gap-1.5">{steps.map((_, i) => <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />)}</div><button type="button" onClick={finish} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Close tutorial"><X className="h-4 w-4" /></button></div>
    <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
    <p className="mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">{step === 0 && onboardingFocus ? <><Sparkles className="h-3.5 w-3.5" /> Your focus</> : `Quick tour · ${step + 1} of ${steps.length}`}</p>
    <h2 className="mt-2 text-2xl font-semibold tracking-tight">{current.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{current.body}</p>
    <div className="mt-7 flex gap-2"><Button className="flex-1 rounded-xl" onClick={next}>{step === steps.length - 1 ? "Finish tour" : "Next"}<ArrowRight className="h-4 w-4" /></Button><Button variant="ghost" className="rounded-xl" onClick={finish}>Skip</Button></div>
  </motion.section></AnimatePresence></div></div>;
};
export default ProductTour;
