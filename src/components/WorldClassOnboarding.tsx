import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Flame, Goal, BookOpen, Sparkles, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorldClassOnboardingProps {
  userName?: string;
  onComplete: (focus?: string) => void;
}

const steps = [
  { eyebrow: "Welcome to LvLUp", title: "Build a life you can measure.", body: "LvLUp brings your habits, goals, journal and trading discipline into one place — so progress becomes something you can see, not just something you hope for.", icon: Sparkles },
  { eyebrow: "Your daily system", title: "Win the day before you chase the year.", body: "Start with a small set of habits you can actually repeat. Track them daily, build streaks and use your progress to create momentum.", icon: Flame },
  { eyebrow: "Turn intention into action", title: "Set goals. Then make them real.", body: "Your goals give direction. Your habits create the evidence. Pick the area you want LvLUp to help you improve first.", icon: Target },
  { eyebrow: "Reflect and improve", title: "Use the journal to learn from yourself.", body: "The journal is your space to slow down, capture what happened, spot patterns and decide what you will do differently tomorrow.", icon: BookOpen },
];

const focusOptions = [
  { label: "Consistency", icon: Check },
  { label: "Goals", icon: Goal },
  { label: "Self-reflection", icon: BookOpen },
  { label: "Trading discipline", icon: Target },
];

const WorldClassOnboarding = ({ userName, onComplete }: WorldClassOnboardingProps) => {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const firstName = useMemo(() => userName?.trim().split(" ")[0], [userName]);

  const finish = () => onComplete(focus ?? undefined);
  const next = () => isLast ? finish() : setStep((value) => value + 1);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 py-6 sm:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20"><Sparkles className="h-4 w-4 text-primary" /></div><span className="text-sm font-semibold tracking-tight">LvLUp</span></div>
          <button type="button" onClick={finish} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Skip onboarding">Skip <X className="h-3.5 w-3.5" /></button>
        </header>

        <div className="mt-8 flex gap-1.5" aria-label={`Onboarding step ${step + 1} of ${steps.length}`}>
          {steps.map((_, index) => <div key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: index <= step ? "100%" : "0%" }} transition={{ duration: 0.3 }} /></div>)}
        </div>

        <main className="flex flex-1 flex-col justify-center py-10">
          <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.25 }}>
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10"><Icon className="h-7 w-7 text-primary" /></div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{current.eyebrow}</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">{step === 0 && firstName ? `${firstName}, ` : ""}{current.title}</h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">{current.body}</p>

            {step === 0 && <div className="mt-8 rounded-2xl border border-border bg-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">The LvLUp loop</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-secondary/70 p-3"><Check className="mx-auto mb-2 h-4 w-4" /><span className="text-xs">Do</span></div><div className="rounded-xl bg-secondary/70 p-3"><BookOpen className="mx-auto mb-2 h-4 w-4" /><span className="text-xs">Reflect</span></div><div className="rounded-xl bg-secondary/70 p-3"><Flame className="mx-auto mb-2 h-4 w-4" /><span className="text-xs">LvL Up</span></div></div></div>}
            {step === 2 && <div className="mt-8 grid grid-cols-2 gap-2">{focusOptions.map(({ label, icon: FocusIcon }) => { const selected = focus === label; return <button key={label} type="button" onClick={() => setFocus(label)} className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all ${selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}><FocusIcon className="h-4 w-4 shrink-0" />{label}{selected && <Check className="ml-auto h-4 w-4 text-primary" />}</button>; })}</div>}
          </motion.div></AnimatePresence>
        </main>

        <footer className="space-y-4 pb-4"><Button type="button" onClick={next} className="w-full rounded-xl py-6 text-sm font-semibold">{isLast ? "Start LvLUp" : "Continue"}<ArrowRight className="h-4 w-4" /></Button><p className="text-center text-xs text-muted-foreground">{isLast ? "Your system starts with one intentional day." : `${step + 1} of ${steps.length}`}</p></footer>
      </div>
    </div>
  );
};

export default WorldClassOnboarding;
