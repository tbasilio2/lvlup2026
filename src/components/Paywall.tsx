import { ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PricingPlans from "@/components/PricingPlans";
import RedeemLicenseDialog from "@/components/RedeemLicenseDialog";
import { useSubscription } from "@/hooks/useSubscription";
export default function Paywall({ feature }: { feature?: string }) {
  const navigate = useNavigate(); const sub = useSubscription();
  return <div className="min-h-screen bg-background pb-28"><div className="mx-auto max-w-6xl px-5 py-8"><Button variant="ghost" onClick={() => navigate("/trading")}><ArrowLeft />Back to trading</Button><div className="my-10 max-w-2xl"><Lock className="mb-5 h-6 w-6 text-primary" /><p className="section-label">Your next level</p><h1 className="mt-3 text-3xl">{feature ? `Unlock ${feature}` : "Choose your performance workspace"}</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Free includes goals, habits and 10 manual trades. Go deeper with syncing, full analytics and AI-assisted review.</p>{sub.isTrialing && <p className="mt-3 text-sm text-primary">Your existing trial has {sub.trialDaysLeft} days remaining.</p>}</div><PricingPlans /><div className="mt-8"><RedeemLicenseDialog onRedeemed={sub.refresh} /></div></div></div>;
}
