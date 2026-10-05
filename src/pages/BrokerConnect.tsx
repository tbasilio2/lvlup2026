import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Lock, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface BrokerAccount {
  id: string;
  platform: string;
  label: string;
  server: string | null;
  base_url: string | null;
  email: string | null;
  state: string | null;
  balance: number | null;
  equity: number | null;
  currency: string | null;
  last_synced_at: string | null;
  last_error: string | null;
}

const PLATFORM_LABEL: Record<string, string> = {
  tradelocker: "TradeLocker",
  matchtrader: "Match-Trader",
  ctrader: "cTrader",
};

const money = (v: number | null, ccy: string | null) => {
  if (v === null || v === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency: ccy || "USD" }).format(v);
  } catch {
    return `${ccy || ""} ${Number(v).toFixed(2)}`.trim();
  }
};

export default function BrokerConnect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [tl, setTl] = useState({ label: "", env: "live", server: "", email: "", password: "" });
  const [mt, setMt] = useState({ label: "", baseUrl: "", email: "", password: "", brokerId: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("broker_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    setAccounts((data as BrokerAccount[]) ?? []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const connect = async (body: Record<string, unknown>, reset: () => void) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("broker-connect", { body });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Could not sign in");
      const s = data.sync;
      toast.success(s?.ok ? `Connected · ${s.imported ?? 0} trades imported` : `Connected, but first sync failed: ${s?.message}`);
      reset();
      load();
    } catch (e: any) {
      toast.error(e.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const sync = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.functions.invoke("broker-sync", { body: { accountId: id } });
    setBusyId(null);
    const r = data?.results?.[0];
    if (error || !r?.ok) toast.error(r?.message || "Sync failed");
    else toast.success(`Synced · ${r.imported ?? 0} trades`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this account? Imported trades stay in your journal.")) return;
    await supabase.from("broker_accounts").delete().eq("id", id);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate("/trading")}>
          <ArrowLeft className="h-4 w-4" /> Back to trading
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Connect more platforms</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to TradeLocker or Match-Trader and your trades sync into the journal — automatically every 12 hours.
          </p>
        </div>

        <Tabs defaultValue="tradelocker" className="rounded-xl border border-border bg-card p-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="tradelocker">TradeLocker</TabsTrigger>
            <TabsTrigger value="matchtrader">Match-Trader</TabsTrigger>
            <TabsTrigger value="ctrader">cTrader</TabsTrigger>
          </TabsList>

          <TabsContent value="tradelocker" className="space-y-3 pt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Account name</Label><Input value={tl.label} onChange={(e) => setTl({ ...tl, label: e.target.value })} placeholder="My prop account" /></div>
              <div>
                <Label>Environment</Label>
                <Select value={tl.env} onValueChange={(v) => setTl({ ...tl, env: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="live">Live</SelectItem><SelectItem value="demo">Demo</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Server</Label><Input value={tl.server} onChange={(e) => setTl({ ...tl, server: e.target.value })} placeholder="e.g. OSP-LIVE" /></div>
              <div><Label>Email</Label><Input type="email" value={tl.email} onChange={(e) => setTl({ ...tl, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Password</Label><Input type="password" value={tl.password} onChange={(e) => setTl({ ...tl, password: e.target.value })} /></div>
            </div>
            <Button disabled={busy || !tl.label || !tl.server || !tl.email || !tl.password} className="w-full gap-2"
              onClick={() => connect({ platform: "tradelocker", ...tl }, () => setTl({ label: "", env: "live", server: "", email: "", password: "" }))}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Sign in to TradeLocker
            </Button>
          </TabsContent>

          <TabsContent value="matchtrader" className="space-y-3 pt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Account name</Label><Input value={mt.label} onChange={(e) => setMt({ ...mt, label: e.target.value })} placeholder="My prop account" /></div>
              <div><Label>Broker platform address</Label><Input value={mt.baseUrl} onChange={(e) => setMt({ ...mt, baseUrl: e.target.value })} placeholder="https://platform.yourbroker.com" /></div>
              <div><Label>Email</Label><Input type="email" value={mt.email} onChange={(e) => setMt({ ...mt, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" value={mt.password} onChange={(e) => setMt({ ...mt, password: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Broker ID (optional)</Label><Input value={mt.brokerId} onChange={(e) => setMt({ ...mt, brokerId: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Use the web address you open Match-Trader on in your browser.</p>
            <Button disabled={busy || !mt.label || !mt.baseUrl || !mt.email || !mt.password} className="w-full gap-2"
              onClick={() => connect({ platform: "matchtrader", ...mt, brokerId: mt.brokerId || undefined }, () => setMt({ label: "", baseUrl: "", email: "", password: "", brokerId: "" }))}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Sign in to Match-Trader
            </Button>
          </TabsContent>

          <TabsContent value="ctrader" className="pt-4">
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">cTrader — coming soon</p>
              <p>cTrader sign-in uses Spotware's secure "Log in with cTrader" button. It's being enabled now; your lifetime access includes it automatically.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Connected accounts</h2>
          {accounts.length === 0 && <p className="text-sm text-muted-foreground">No accounts yet.</p>}
          {accounts.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{PLATFORM_LABEL[a.platform]} · {a.server || a.base_url} · {a.email}</div>
                </div>
                <Badge variant={a.state === "ERROR" ? "destructive" : "secondary"}>{a.state}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                <div><span className="text-muted-foreground text-xs">Balance </span>{money(a.balance, a.currency)}</div>
                <div><span className="text-muted-foreground text-xs">Equity </span>{money(a.equity, a.currency)}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {a.last_synced_at ? `Last synced ${formatDistanceToNow(new Date(a.last_synced_at), { addSuffix: true })}` : "Not synced yet"}
              </div>
              {a.last_error && <p className="text-xs text-loss">{a.last_error}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-2" disabled={busyId === a.id} onClick={() => sync(a.id)}>
                  {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync
                </Button>
                <Button size="sm" variant="ghost" className="gap-2" onClick={() => remove(a.id)}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
