import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Trade } from "@/hooks/useTrades";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trades: Trade[];
}

const DayTradesDialog = ({ open, onOpenChange, title, trades }: Props) => {
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins = trades.filter((t) => (t.pnl ?? 0) > 0).length;
  const losses = trades.filter((t) => (t.pnl ?? 0) < 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wider">{title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Net P&L</p>
            <p className={`text-sm font-bold font-mono mt-0.5 ${totalPnl > 0 ? "text-profit" : totalPnl < 0 ? "text-loss" : "text-foreground"}`}>
              {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Trades</p>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5">{trades.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">W · L</p>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5">
              <span className="text-profit">{wins}</span> · <span className="text-loss">{losses}</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {trades.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No trades.</p>
          ) : (
            trades.map((t) => {
              const isWin = (t.pnl ?? 0) > 0;
              const isLoss = (t.pnl ?? 0) < 0;
              return (
                <div key={t.id} className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${t.direction === "long" ? "bg-profit/10" : "bg-loss/10"}`}>
                    {t.direction === "long" ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-profit" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-loss" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground font-mono">{t.symbol}</span>
                      {t.strategy && <span className="text-[10px] text-primary/70 font-mono">· {t.strategy}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {format(new Date(t.entry_date), "MMM d, HH:mm")}
                      {" → "}
                      {t.exit_date ? format(new Date(t.exit_date), "HH:mm") : "open"}
                      <span className="ml-2">{t.entry_price} → {t.exit_price ?? "—"}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    {t.pnl != null ? (
                      <span className={`text-sm font-bold font-mono ${isWin ? "text-profit" : isLoss ? "text-loss" : "text-muted-foreground"}`}>
                        {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">Open</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DayTradesDialog;
