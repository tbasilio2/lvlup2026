import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Loader2, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MT5QrScanner, { type ScannedMT5Credentials } from "./MT5QrScanner";

interface Props {
  onConnected?: () => void;
}

export default function MT5ConnectDialog({ onConnected }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [server, setServer] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("new-york");

  const submit = async () => {
    if (!server || !login || !password) {
      toast.error("Server, login, and investor password are required");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("mt5-connect", {
      body: { label, server, login, password, region, platform: "mt5" },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to connect");
      return;
    }
    toast.success("Account linked. Provisioning takes ~30-60s, then hit Sync.");
    setOpen(false);
    setPassword("");
    onConnected?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" />
          Connect MT5
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link MT5 account</DialogTitle>
          <DialogDescription>
            Use your MT5 <strong>investor (read-only) password</strong> — never the master password.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. FTMO Challenge" />
          </div>
          <div>
            <Label>Broker server</Label>
            <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="ICMarkets-Live04" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Login</Label>
              <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="12345678" />
            </div>
            <div>
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new-york">New York</SelectItem>
                  <SelectItem value="london">London</SelectItem>
                  <SelectItem value="singapore">Singapore</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Investor password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Link account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
