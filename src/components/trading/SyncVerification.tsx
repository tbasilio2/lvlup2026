import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, PlugZap, RefreshCw, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Account {
  id: string;
  label: string;
  broker_server: string;
  login: string;
  state: string | null;
  last_synced_at: string | null;
  last_error: string | null;
}

type Result = { ok: boolean; message: string };

interface Props {
  compact?: boolean;
  onSynced?: () => void;
}

export default function SyncVerification({ compact, onSynced }: Props) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("mt5_accounts")
      .select("id,label,broker_server,login,state,last_synced_at,last_error")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAccounts((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const testAll = async () => {
    setTesting(true);
    const next: Record<string, Result> = {};
    let synced = false;
    for (const a of accounts) {
      const { data, error } = await supabase.functions.invoke("mt5-sync", { body: { accountId: a.id } });
      const payload = data as any;
      if (error || payload?.error) {
        next[a.id] = { ok: false, message: payload?.error || error?.message || "Connection failed" };
      } else if (payload?.ok === false) {
        next[a.id] = { ok: false, message: payload?.message || "Account not ready" };
      } else {
        synced = true;
        next[a.id] = { ok: true, message: `Connected · imported ${payload?.imported ?? 0} trades` };
      }
    }
    setResults(next);
    setTesting(false);
    await load();
    if (synced) onSynced?.();
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking connections…</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <PlugZap className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">
          No MT5 account linked yet. Connect one on the Trading page — then come back here to verify auto-sync.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {accounts.map((a) => {
        const r = results[a.id];
        return (
          <div key={a.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{a.label}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{a.broker_server} · {a.login}</div>
              </div>
              <Badge
                variant={a.state === "DEPLOYED" ? "default" : a.state === "MISSING" || a.state === "ERROR" ? "destructive" : "secondary"}
                className="shrink-0 font-mono text-[10px]"
              >
                {a.state || "UNKNOWN"}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              Last sync: {a.last_synced_at ? formatDistanceToNow(new Date(a.last_synced_at), { addSuffix: true }) : "never"}
            </div>
            {r ? (
              <div className={`mt-2 flex items-start gap-1.5 text-[11px] ${r.ok ? "text-profit" : "text-destructive"}`}>
                {r.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <span>{r.message}</span>
              </div>
            ) : a.last_error ? (
              <div className="mt-2 text-[11px] text-destructive">{a.last_error}</div>
            ) : null}
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-muted-foreground">Auto-syncs every 12 hours (00:00 &amp; 12:00 UTC)</p>
        <Button size="sm" variant="outline" className="gap-2" onClick={testAll} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Test connection
        </Button>
      </div>
    </div>
  );
}
