import { motion } from "framer-motion";
import { ArrowLeft, Check, Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const freeFeatures = ["Daily habit tracker", "Streaks and progress rings", "12-week activity heatmap"];

const entryFeatures = [
  "Goals with hierarchy and roll-ups",
  "Full trading journal and P&L calendar",
  "MT5 auto-sync every 12 hours",
  "Pro analytics: drawdown, expectancy, strategy ranking",
  "AI chart copilot and weekly trade reports",
  "Reflection journal with AI weekly reviews",
];

const Paywall = ({ feature }: { feature?: string }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-5 pt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to habits
          </button>

          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>

          <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-primary">Entry access</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {feature ? `${feature} is part of Entry access` : "Unlock the full system"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The habit tracker stays free forever. Everything else — goals, the trading journal, MT5 sync, Pro analytics
            and the AI copilot — is included in Entry access.
          </p>

          <div className="mt-8 rounded-2xl border border-primary/30 bg-card p-5">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-4xl font-semibold text-foreground tabular-nums">$30</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <ul className="mt-5 space-y-2.5">
              {entryFeatures.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full rounded-xl py-6 text-sm font-semibold"
              onClick={() => toast.info("Checkout isn't live yet — payments are being set up.")}
            >
              <Sparkles className="h-4 w-4" /> Get Entry access
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Free</p>
            <ul className="mt-4 space-y-2.5">
              {freeFeatures.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Paywall;
