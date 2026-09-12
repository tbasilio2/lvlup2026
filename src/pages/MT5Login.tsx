import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Lock, QrCode, RefreshCw, Server, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import MT5QrScanner, { type ScannedMT5Credentials } from "@/components/trading/MT5QrScanner";

interface Account {
  id: string;
  label: string;
  broker_server: string;
  login: string;
  state: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  balance: number | null;
  equity: number | null;
  currency: string | null;
  leverage: number | null;
}

const money = (v: number | null, ccy: string | null) => {
  if (v === null || v === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency: ccy || "USD" }).format(v);
  } catch {
    return `${ccy || ""} ${v.toFixed(2)}`.trim();
  }
};

export default function MT5Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const [label, setLabel] = useState("");
  const [server, setServer] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("new-york");

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("mt5_accounts")
      .select("id,label,broker_server,login,state,last_synced_at,last_error,balance,equity,currency,leverage")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAccounts((data as unknown as Account[]) || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const applyScan = (creds: ScannedMT5Credentials) => {
    if (creds.label) setLabel(creds.label);
    if (creds.server) setServer(creds.server);
    if (creds.login) setLogin(creds.login);
    if (creds.password) setPassword(creds.password);
  };

  const connect = async () => {
    if (!server || !login || !password) {
      toast.error("Server, login and password are required");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("mt5-connect", {
      body: { label, server, login, password, region, platform: "mt5" },
    });
    setBusy(false);
    const errMsg = (data as { error?: string } | null)?.error;
    if (error || errMsg) {
      toast.error(errMsg || error?.message || "Login failed");
      return;
    }
    toast.success("Signed in. Connecting to your broker takes ~30-60s, then hit Sync.");
    setPassword("");
    load();
  };

  const sync = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.functions.invoke("mt5-sync", { body: { accountId: id } });
    setBusyId(null);
    const res = data as { error?: string; ok?: boolean; message?: string; imported?: number } | null;
    if (error || res?.error) toast.error(res?.error || error?.message || "Sync failed");
    else if (res?.ok === false) toast.message(res.message || "Account still connecting");
    else toast.success(`Synced ${res?.imported ?? 0} trades`);
    load();
  };

  const disconnect = async (id: string) => {
    if (!confirm("Sign out of this MT5 account? Imported trades stay.")) return;
    setBusyId(id);
    const { error } = await supabase.functions.invoke("mt5-disconnect", { body: { accountId: id } });
    setBusyId(null);
    if (error) toast.error("Failed to sign out");
    else toast.success("Signed out");
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-8 pb-24 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate("/trading")}>
            <ArrowLeft className="h-4 w-4" /> Back to journal
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">MT5 sign in</h1>
              <p className="text-xs text-muted-foreground font-mono">Trades &amp; balances sync into your journal</p>
            </div>
          </div>
        </motion.div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <Button variant="secondary" className="w-full gap-2" onClick={() => setScanOpen(true)}>
            <QrCode className="h-4 w-4" /> Scan QR to fill details
          </Button>
          <div className="text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">or enter manually</span>
          </div>

          <div>
            <Label>Account name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. FTMO Challenge" />
          </div>
          <div>
            <Label>Broker server</Label>
            <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="ICMarkets-Live04" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Username (login)</Label>
              <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="12345678" inputMode="numeric" />
            </div>
            <div>
              <Label>Server region</Label>
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
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Lock className="h-3 w-3" /> Use your investor (read-only) password — it can never place trades.
            </p>
          </div>
          <Button className="w-full" onClick={connect} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Sign in to MT5
          </Button>
        </div>

        {accounts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em] font-mono">Signed-in accounts</h2>
            {accounts.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">{a.broker_server} · {a.login}</div>
                    {a.last_error ? <div className="text-[10px] text-destructive mt-1">{a.last_error}</div> : null}
                  </div>
                  <Badge
                    variant={a.state === "DEPLOYED" ? "default" : a.state === "MISSING" || a.state === "ERROR" ? "destructive" : "secondary"}
                    className="text-[10px] font-mono shrink-0"
                  >
                    {a.state || "UNKNOWN"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: "Balance", v: money(a.balance, a.currency) },
                    { k: "Equity", v: money(a.equity, a.currency) },
                    { k: "Leverage", v: a.leverage ? `1:${a.leverage}` : "—" },
                  ].map((s) => (
                    <div key={s.k} className="rounded-lg bg-secondary px-3 py-2">
                      <div className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">{s.k}</div>
                      <div className="text-sm font-mono">{s.v}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {a.last_synced_at ? `synced ${formatDistanceToNow(new Date(a.last_synced_at), { addSuffix: true })}` : "never synced"}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => sync(a.id)} disabled={busyId === a.id}>
                      {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Sync
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => disconnect(a.id)} disabled={busyId === a.id}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground font-mono pl-1">Auto-syncs every 12 hours (00:00 &amp; 12:00 UTC)</p>
          </div>
        )}
      </div>

      <MT5QrScanner open={scanOpen} onOpenChange={setScanOpen} onScanned={applyScan} />
    </div>
  );
}
