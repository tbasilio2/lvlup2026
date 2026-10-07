import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PUBLIC_PLANS, type BillingInterval } from "@/lib/plans";
import { publicCheckoutUrl, isPlaceholderLink, type PublicPaidTier, type StoreId } from "@/lib/checkoutLinks";
import { trackEvent } from "@/lib/analytics";
export default function PricingPlans() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => { const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { trackEvent("pricing_view"); observer.disconnect(); } }, { threshold: .15 }); if (root.current) observer.observe(root.current); return () => observer.disconnect(); }, []);
  const checkout = (tier: PublicPaidTier, store: StoreId) => { const url = publicCheckoutUrl(tier, interval, store); if (isPlaceholderLink(url)) return; trackEvent("checkout_clicked"); window.open(url, "_blank", "noopener,noreferrer"); };
  return <div ref={root}>
    <div className="mb-8 flex justify-center"><div className="inline-flex gap-1 rounded-lg border border-border p-1" role="group" aria-label="Billing interval">{(["monthly", "yearly"] as const).map(value => <Button key={value} size="sm" variant={interval === value ? "secondary" : "ghost"} aria-pressed={interval === value} onClick={() => setInterval(value)}>{value === "monthly" ? "Monthly" : "Yearly · save more"}</Button>)}</div></div>
    <div className="grid gap-5 md:grid-cols-3">{(["free", "pro", "elite"] as const).map(tier => { const plan = PUBLIC_PLANS[tier]; const ready = tier !== "free" && !isPlaceholderLink(publicCheckoutUrl(tier, interval, "whop")); return <article key={tier} className={`relative flex flex-col rounded-lg border bg-card p-6 ${tier === "pro" ? "border-primary" : "border-border"}`}>
      <div className="mb-3 flex min-h-6 items-center justify-between"><h3 className="text-lg">{plan.name}</h3>{tier === "pro" && <span className="text-xs text-primary">Most Popular</span>}</div>
      <p className="text-sm text-muted-foreground">{plan.tagline}</p><div className="my-6"><span className="font-mono text-4xl font-semibold">${interval === "monthly" ? plan.monthly : plan.yearly}</span><span className="ml-2 text-sm text-muted-foreground">{tier === "free" ? "forever" : interval === "monthly" ? "/ month" : "/ year"}</span></div>
      <ul className="mb-8 flex-1 space-y-3">{plan.features.map(feature => <li key={feature} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{feature}</li>)}</ul>
      {tier === "free" ? <Button variant="outline" onClick={() => { trackEvent("start_free_clicked"); navigate("/auth?signup=1"); }}>Start Free<ArrowRight /></Button> : <><Button disabled={!ready} variant={tier === "pro" ? "default" : "outline"} onClick={() => checkout(tier, "whop")}>{ready ? `Get ${plan.name}` : "Checkout coming soon"}<ExternalLink /></Button><Button variant="link" size="sm" className="mt-2" disabled={isPlaceholderLink(publicCheckoutUrl(tier, interval, "gumroad"))} onClick={() => checkout(tier, "gumroad")}>Prefer Gumroad?</Button></>}
    </article>; })}</div><p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Prices in USD. Paid checkout opens when store products are configured. AI review is paid; no unlimited usage promise.</p>
  </div>;
}
