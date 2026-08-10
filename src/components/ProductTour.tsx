import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, CheckSquare, Target, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "lvlup:product-tour-complete";
const steps = [
  { title: "Habits are your daily actions", body: "Check in here each day and build repeatable momentum. Start small — consistency is the point.", icon: CheckSquare, path: "/" },
  { title: "Goals give you direction", body: "Use Goals for the outcomes you care about, then connect them to the actions you can control.", icon: Target, path: "/goals" },
  { title: "Journal to find patterns", body: "Reflect on your day, mood and decisions. The value comes from noticing what repeats.", icon: BookOpen, path: "/journal" },
  { title: "Trading is about process", body: "If trading is part of your system, use this space to track discipline and decisions — not just results.", icon: TrendingUp, path: "/trading" },
];

interface ProductTourProps { onNavigate?: (path: string) => void }

const ProductTour = ({ onNavigate }: ProductTourProps) => {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem(TOUR_KEY) !== "true");
  }, []);

  const finish = () => { localStorage.setItem(TOUR_KEY, "true"); setOpen(false); };
  const next = () => {
    if (step === steps.length - 1) return finish();
    const nextStep = step + 1;
    setStep(nextStep);
    onNavigate?.(steps[nextStep].path);
  };
  const current = steps[step];
  const Icon = current.icon;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/45 p-4 sm:p-6">
      <div className="mx-auto flex min-h-full max-w-lg items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.section key={step} className="w-full rounded-3xl border border-border bg-card p-6 shadow-2xl" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}>
            <div className="flex items-center justify-between"><div className="flex gap-1.5">{steps.map((_, i) => <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />)}</div><button type="button" onClick={finish} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Close tutorial"><X className="h-4 w-4" /></button></div>
            <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-primary">Quick tour · {step + 1} of {steps.length}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{current.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{current.body}</p>
            <div className="mt-7 flex gap-2"><Button className="flex-1 rounded-xl" onClick={next}>{step === steps.length - 1 ? "Finish tour" : "Next"}<ArrowRight className="h-4 w-4" /></Button><Button variant="ghost" className="rounded-xl" onClick={finish}>Skip</Button></div>
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProductTour;
