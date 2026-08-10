import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Heart, Lightbulb, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JournalTutorialProps { onComplete: () => void }
const steps = [
  { title: "Start with how you feel", body: "Pick the mood that best describes today. There is no right answer — honesty makes the reflection useful.", icon: Heart },
  { title: "Capture what mattered", body: "Use gratitude, intention, reflection and wins to capture the signal from your day. A few honest lines are enough.", icon: PenLine },
  { title: "Choose what comes next", body: "Finish with one intention for tomorrow. Reflection only becomes useful when it changes what you do next.", icon: Lightbulb },
];

const JournalTutorial = ({ onComplete }: JournalTutorialProps) => {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const Icon = current.icon;
  const finish = () => onComplete();
  return <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
    <div className="flex items-center justify-between"><div className="flex gap-1.5">{steps.map((_, i) => <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} />)}</div><button type="button" onClick={finish} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Skip journal tutorial"><X className="h-4 w-4" /></button></div>
    <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="mt-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-primary">Journal ritual · {step + 1} of {steps.length}</p><h3 className="mt-1 text-lg font-semibold">{current.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{current.body}</p><div className="mt-4 flex gap-2"><Button size="sm" className="rounded-xl" onClick={() => step === steps.length - 1 ? finish() : setStep(step + 1)}>{step === steps.length - 1 ? "Got it" : "Next"}<ArrowRight className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" className="rounded-xl" onClick={finish}><Check className="h-3.5 w-3.5" /> Skip</Button></div></motion.div></AnimatePresence>
  </div>;
};
export default JournalTutorial;
