import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, Loader2, Server } from "lucide-react";
import { toast } from "sonner";
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

interface Props {
  onSynced?: () => void;
  refreshKey?: number;
}

export default function ConnectedAccountsList({ onSynced, refreshKey }: Props) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("mt5_accounts")
      .select("id,label,broker_server,login,state,last_synced_at,last_error")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAccounts((data as any) || []);
  }, [user]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const sync = async (id: string) => {
    setBusyId(id);
    const { data, error } = await supabase.functions.invoke("mt5-sync", { body: { accountId: id } });
    setBusyId(null);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Sync failed");
    } else if ((data as any)?.ok === false) {
      toast.message((data as any).message || "Account still provisioning");
    } else {
      toast.success(`Synced ${(data as any)?.imported ?? 0} trades`);
      onSynced?.();
    }
    load();
  };

  const disconnect = async (id: string) => {
    if (!confirm("Unlink this MT5 account? Imported trades stay.")) return;
    setBusyId(id);
    const { error } = await supabase.functions.invoke("mt5-disconnect", { body: { accountId: id } });
    setBusyId(null);
    if (error) toast.error("Failed to disconnect");
    else toast.success("Disconnected");
    load();
  };

  if (accounts.length === 0) return null;

  return (
    <div className="space-y-2">
      {accounts.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
              <Server className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{a.label}</div>
              <div className="text-[11px] text-muted-foreground font-mono truncate">
                {a.broker_server} · {a.login}
              </div>
              {a.last_error ? (
                <div className="text-[10px] text-destructive truncate max-w-xs">{a.last_error}</div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={a.state === "DEPLOYED" ? "default" : "secondary"} className="text-[10px] font-mono">
              {a.state || "UNKNOWN"}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
              {a.last_synced_at ? formatDistanceToNow(new Date(a.last_synced_at), { addSuffix: true }) : "never"}
            </span>
            <Button size="sm" variant="ghost" onClick={() => sync(a.id)} disabled={busyId === a.id}>
              {busyId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => disconnect(a.id)} disabled={busyId === a.id}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground font-mono pl-1">
        Auto-syncs every 12 hours (00:00 &amp; 12:00 UTC)
      </p>
    </div>

  );
}
