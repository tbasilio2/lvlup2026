import { motion } from "framer-motion";
import { ArrowLeft, Check, ExternalLink, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TIERS, useSubscription, TRIAL_DAYS, type Tier } from "@/hooks/useSubscription";
import { checkoutUrl, isPlaceholderLink, CHECKOUT_LINKS, type PaidTier, type StoreId } from "@/lib/checkoutLinks";
import { useAuth } from "@/contexts/AuthContext";
import RedeemLicenseDialog from "@/components/RedeemLicenseDialog";
import { toast } from "sonner";

const freeFeatures = ["Daily habit tracker", "Streaks and progress rings", "12-week activity heatmap"];

const planFeatures: Record<Exclude<Tier, "free">, string[]> = {
  entry: ["Everything in Free", "Goals with hierarchy and roll-ups", "Goal progress tracking"],
  journal: [
    "Everything in Free",
    "Reflection journal with mood tracking",
    "P&L and fee logging per entry",
    "AI weekly reviews",
  ],
  pro: [
    "Everything in Entry + Journal",
    "Full trading journal and P&L calendar",
    "MT5 auto-sync every 12 hours",
    "Pro analytics: drawdown, expectancy, strategy ranking",
    "AI chart copilot and weekly trade reports",
  ],
};

const planOrder: Exclude<Tier, "free">[] = ["entry", "journal", "pro"];

const Paywall = ({ feature }: { feature?: string }) => {
  const navigate = useNavigate();
  const sub = useSubscription();
  const { user } = useAuth();

  const openStore = (tier: PaidTier, store: StoreId) => {
    const link = CHECKOUT_LINKS[tier][store];
    if (isPlaceholderLink(link)) {
      toast.info("This store link isn't set up yet — add your product link to go live.");
      return;
    }
    window.open(checkoutUrl(tier, store, user?.email), "_blank", "noopener,noreferrer");
  };


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

          <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-primary">Upgrade</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {feature ? `${feature} needs a paid plan` : "Unlock the full system"}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The habit tracker stays free forever. Every account starts with a {TRIAL_DAYS}-day free trial of everything —
            pick the plan that fits how you level up when it ends.
          </p>

          {sub.isTrialing ? (
            <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <p className="font-mono text-xs uppercase tracking-wider text-primary">Free trial active</p>
              <p className="mt-1 text-sm text-foreground">
                {sub.trialDaysLeft} {sub.trialDaysLeft === 1 ? "day" : "days"} left — everything is unlocked until then.
              </p>
            </div>
          ) : sub.trialEndsAt && !sub.isActivePaid ? (
            <div className="mt-5 rounded-2xl border border-border bg-card p-4">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Trial ended</p>
              <p className="mt-1 text-sm text-foreground">Pick a plan below to keep your paid pages.</p>
            </div>
          ) : null}

          <div className="mt-8 space-y-4">
            {planOrder.map((tier) => {
              const plan = TIERS[tier];
              const isPro = tier === "pro";
              return (
                <div
                  key={tier}
                  className={`rounded-2xl border p-5 ${isPro ? "border-primary/40 bg-card" : "border-border bg-card"}`}
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {plan.name}
                      {isPro && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">Best value</span>}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">${plan.price}</span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {planFeatures[tier].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Button
                      variant={isPro ? "default" : "outline"}
                      className="rounded-xl py-5 text-sm font-semibold"
                      onClick={() => openStore(tier, "whop")}
                    >
                      Buy on Whop <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl py-5 text-sm font-semibold"
                      onClick={() => openStore(tier, "gumroad")}
                    >
                      Buy on Gumroad <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl border border-border bg-card p-5">
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

            <RedeemLicenseDialog onRedeemed={() => sub.refresh()} />

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Paywall;
