Exit code: 0
Wall time: 1.1 seconds
Output:
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onSynced?: () => void;
  refreshKey?: number;
}

interface Mt5SyncResponse {
  error?: string;
  imported?: number;
}

export default function SyncAllButton({ onSynced, refreshKey }: Props) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("mt5_accounts").select("id").eq("user_id", user.id);
    setIds((data ?? []).map(({ id }) => id));
  }, [user]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (ids.length === 0) return null;

  const syncAll = async () => {
    setBusy(true);
    let imported = 0;
    let failed = 0;
    for (const id of ids) {
      const { data, error } = await supabase.functions.invoke<Mt5SyncResponse>("mt5-sync", {
        body: { accountId: id },
      });
      if (error || data?.error) failed++;
      else imported += data?.imported ?? 0;
    }
    setBusy(false);
    if (failed && !imported) toast.error("Sync failed");
    else if (failed) toast.warning(`Synced ${imported} trades Â· ${failed} account(s) failed`);
    else toast.success(`Synced ${imported} trades`);
    onSynced?.();
  };

  return (
    <Button variant="outline" onClick={syncAll} disabled={busy} className="gap-2">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Sync All
    </Button>
  );
}

