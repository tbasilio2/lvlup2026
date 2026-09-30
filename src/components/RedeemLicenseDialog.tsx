import { useState } from "react";
import { KeyRound, Loader2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type Tier } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface Props {
  onRedeemed?: () => void;
  trigger?: React.ReactNode;
}

const RedeemLicenseDialog = ({ onRedeemed, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState<Tier | null>(null);

  const submit = async () => {
    const licenseKey = key.trim();
    if (licenseKey.length < 6) {
      toast.error("Paste the full key from your purchase receipt.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-license", {
        body: { licenseKey },
      });
      const payload = data as { success?: boolean; tier?: Tier; error?: string } | null;
      if (error || !payload?.success) {
        toast.error(payload?.error ?? "We couldn't verify that key. Check it and try again.");
        return;
      }
      setUnlocked(payload.tier ?? null);
      toast.success("Membership activated.");
      onRedeemed?.();
    } finally {
      setLoading(false);
    }
  };

  const close = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setKey("");
      setUnlocked(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" className="w-full rounded-xl text-sm text-muted-foreground">
            <KeyRound className="h-4 w-4" /> Already purchased? Redeem your key
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        {unlocked ? (
          <div className="py-4 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              {TIERS[unlocked].name} unlocked
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{TIERS[unlocked].tagline}</p>
            <Button className="mt-5 w-full rounded-xl" onClick={() => close(false)}>
              Start using it
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Redeem your key</DialogTitle>
              <DialogDescription>
                Paste the license key from your Gumroad receipt, or your Whop membership key.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX"
              className="font-mono"
            />
            <Button className="w-full rounded-xl" onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Unlock access"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RedeemLicenseDialog;
