import { motion } from "framer-motion";
import {
  ArrowRight, BarChart3, BookOpen, CalendarDays, Check, ExternalLink,
  Flame, KeyRound, LineChart, Lock, Sparkles, Target, TrendingUp, Zap,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TIERS, TRIAL_DAYS, type Tier } from "@/hooks/useSubscription";
import { checkoutUrl, isPlaceholderLink, CHECKOUT_LINKS, type PaidTier, type StoreId } from "@/lib/checkoutLinks";
import RedeemLicenseDialog from "@/components/RedeemLicenseDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const features = [
  { icon: Flame, title: "Habit tracker", body: "Daily check-ins, streaks, progress rings and a 12-week heatmap that shows your consistency at a glance." },
  { icon: Target, title: "Goals with hierarchy", body: "Break big goals into nested sub-goals with progress that rolls up automatically as you complete habits." },
  { icon: BookOpen, title: "Reflection journal", body: "Daily journaling with mood tracking, P&L and fee logging, and AI-generated weekly reviews of your patterns." },
  { icon: TrendingUp, title: "Trading journal", body: "Every trade logged with entry, stop-loss, take-profit and live charts. Import from MT5, CSV or a chart screenshot." },
  { icon: Zap, title: "MT5 auto-sync", body: "Link your MetaTrader 5 account once — balances, equity and trades sync automatically every 12 hours." },
  { icon: Sparkles, title: "AI chart copilot", body: "Upload a TradingView screenshot and get direction, entry, stop-loss, take-profit and a full trade plan in seconds." },
  { icon: BarChart3, title: "Pro analytics", body: "Win rate, expectancy, drawdown, profit factor, time-of-day and strategy ranking — all computed from your own data." },
  { icon: CalendarDays, title: "Weekly reports", body: "Every trading week ends with a graded AI report: what worked, what didn't, and what to fix next week." },
];

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
  lifetime: [
    "Everything in Pro, forever",
    "One payment — no monthly fees",
    "cTrader, Match-Trader & TradeLocker sync",
    "All future platforms and features included",
  ],
};

const planOrder: Exclude<Tier, "free">[] = ["entry", "journal", "pro", "lifetime"];

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const openStore = (tier: PaidTier, store: StoreId) => {
    const link = CHECKOUT_LINKS[tier][store];
    if (isPlaceholderLink(link)) {
      toast.info("This store link isn't set up yet — add your product link to go live.");
      return;
    }
    window.open(checkoutUrl(tier, store), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* grid backdrop */}
      <div className="fixed inset-0 bg-[linear-gradient(hsl(220,15%,12%)_1px,transparent_1px),linear-gradient(90deg,hsl(220,15%,12%)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">LvLUp</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="rounded-xl text-sm" onClick={() => navigate("/auth")}>Sign in</Button>
            <Button className="rounded-xl text-sm font-semibold" onClick={() => navigate("/auth")}>
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pt-20 pb-24 text-center md:pt-28">
        <motion.p
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          {TRIAL_DAYS}-day free trial on every plan
        </motion.p>
        <motion.h1
          className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        >
          Build discipline. Trade your plan. <span className="text-primary">LvL Up.</span>
        </motion.h1>
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          One system for your habits, goals, journal and trades. Track what you do, review what you traded,
          and let AI find the patterns you'd miss on your own.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        >
          <Button size="lg" className="glow-primary rounded-xl px-7 py-6 text-sm font-semibold" onClick={() => navigate("/auth")}>
            Start your {TRIAL_DAYS}-day free trial <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl px-7 py-6 text-sm font-semibold" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
            See plans
          </Button>
        </motion.div>

        {/* terminal strip */}
        <motion.div
          className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-2xl border border-border bg-card text-left font-mono text-xs md:text-sm"
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-loss/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(45_93%_58%)]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
            <span className="ml-3 text-muted-foreground">lvlup — daily review</span>
          </div>
          <div className="space-y-1.5 px-5 py-5 leading-6">
            <p><span className="text-primary">$</span> <span className="text-muted-foreground">habits --today</span> <span className="text-profit">6/6 complete</span> <span className="text-muted-foreground">streak 34d</span></p>
            <p><span className="text-primary">$</span> <span className="text-muted-foreground">trades --week</span> <span className="text-foreground">win rate 61%</span> <span className="text-profit">+R 4.2</span> <span className="text-muted-foreground">expectancy 0.38R</span></p>
            <p><span className="text-primary">$</span> <span className="text-muted-foreground">copilot --chart XAUUSD.png</span> <span className="text-foreground">long @ 2,412</span> <span className="text-loss">sl 2,396</span> <span className="text-profit">tp 2,452</span></p>
            <p><span className="text-primary">$</span> <span className="text-muted-foreground">report --weekly</span> <span className="text-foreground">grade A-</span> <span className="text-muted-foreground">"best sessions: london open"</span><span className="animate-pulse text-primary">▌</span></p>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <div className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Everything in one place</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            Most traders juggle a habit app, a spreadsheet and a notes file. LvLUp replaces all three.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 4) * 0.06 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <div className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Simple monthly plans</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
            The habit tracker is free forever. Every plan starts with a {TRIAL_DAYS}-day free trial of everything — no card needed to try.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {planOrder.map((tier) => {
            const plan = TIERS[tier];
            const isPro = tier === "pro";
            return (
              <motion.div
                key={tier}
                className={`relative rounded-2xl border p-6 ${isPro ? "border-primary/40 bg-card glow-primary" : "border-border bg-card"}`}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              >
                {isPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Best value
                  </span>
                )}
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{plan.name}</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl font-semibold tabular-nums">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.oneTime ? "once" : "/ month"}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-5 space-y-2.5">
                  {planFeatures[tier].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-2">
                  <Button
                    className={`w-full rounded-xl py-5 text-sm font-semibold ${isPro ? "glow-primary" : ""}`}
                    variant={isPro ? "default" : "outline"}
                    onClick={() => openStore(tier, "whop")}
                  >
                    Buy now on Whop <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl py-5 text-sm font-semibold"
                    onClick={() => openStore(tier, "gumroad")}
                  >
                    Buy now on Gumroad <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-3 text-center text-[11px] text-muted-foreground">{TRIAL_DAYS}-day free trial included</p>
              </motion.div>
            );
          })}
        </div>

        {/* Free + redeem */}
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Free</p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-semibold">$0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </div>
            <ul className="mt-5 space-y-2.5">
              {["Daily habit tracker", "Streaks and progress rings", "12-week activity heatmap"].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <Button variant="ghost" className="mt-5 w-full rounded-xl text-sm" onClick={() => navigate("/auth")}>
              Start free <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">Already purchased?</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Bought on Whop or Gumroad? Redeem the key from your receipt and your plan unlocks instantly.
            </p>
            <div className="mt-4">
              <RedeemLicenseDialog
                trigger={
                  <Button variant="outline" className="w-full rounded-xl text-sm font-semibold">
                    <KeyRound className="h-4 w-4" /> Redeem your key
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-5 py-20">
        <div className="mb-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Questions, answered</h2>
        </div>
        <div className="space-y-3">
          {[
            { q: "How does the free trial work?", a: `Create an account and every paid feature is unlocked for ${TRIAL_DAYS} days — goals, journal, trading journal, MT5 sync and AI tools. No card required. When it ends, the habit tracker stays free and you can pick a plan anytime.` },
            { q: "How do I pay?", a: "Checkout runs through Whop or Gumroad — pick your plan, pay there, then redeem the license key from your receipt inside the app. Your membership activates instantly." },
            { q: "Is my MT5 account safe?", a: "We connect with read-only (investor) credentials, so LvLUp can never place or modify trades. It can only read balance, equity and closed deals to sync into your journal." },
            { q: "Where does the AI fit in?", a: "Upload a chart screenshot and the copilot extracts direction, entry, stop-loss and take-profit with reasoning. Weekly reviews and trade reports analyse your own logged data — nothing else." },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-3xl border border-primary/25 bg-primary/5 p-10 text-center md:p-14">
          <LineChart className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">Your next level starts today</h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Start with the free habit tracker, or unlock everything for {TRIAL_DAYS} days and see what a real system feels like.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="glow-primary rounded-xl px-7 py-6 text-sm font-semibold" onClick={() => navigate("/auth")}>
              Start your free trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl px-7 py-6 text-sm font-semibold" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
              Buy a plan
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            <span>Read-only broker access. Your data stays yours.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/auth" className="transition-colors hover:text-foreground">Sign in</Link>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <span>© {new Date().getFullYear()} LvLUp</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
