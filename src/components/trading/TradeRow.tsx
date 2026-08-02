import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, ArrowUpRight, ArrowDownRight, Image as ImageIcon, ChevronDown, ChevronUp, Pencil, CandlestickChart } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import ChartAnalysis from "./ChartAnalysis";
import TradeChart from "./TradeChart";
import TradingViewWidget from "./TradingViewWidget";
import EditTradeDialog from "./EditTradeDialog";
import type { Trade, TradeInsert } from "@/hooks/useTrades";
import { useSignedTradeScreenshot } from "@/lib/tradeScreenshot";
import { formatMoney } from "@/lib/currency";
import { toTradingViewSymbol } from "@/lib/tvSymbol";

const SignedScreenshot = ({ value }: { value: string }) => {
  const url = useSignedTradeScreenshot(value);
  if (!url) return null;
  return <img src={url} alt="Trade chart" className="rounded-lg border border-border max-h-48 object-contain" />;
};

interface Props {
  trade: Trade;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<TradeInsert>) => Promise<void>;
}

const TradeRow = ({ trade, onDelete, onUpdate }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [liveChart, setLiveChart] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isWin = (trade.pnl ?? 0) > 0;
  const isLoss = (trade.pnl ?? 0) < 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
      >
        <div className={`p-1.5 rounded-lg ${trade.direction === "long" ? "bg-profit/10" : "bg-loss/10"}`}>
          {trade.direction === "long" ? (
            <ArrowUpRight className="h-4 w-4 text-profit" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-loss" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground font-mono">{trade.symbol}</span>
            <Badge variant={trade.status === "open" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0 font-mono">
              {trade.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(trade.entry_date), "MMM d, yyyy HH:mm")}
            {trade.strategy && <span className="ml-2 text-primary/70">· {trade.strategy}</span>}
          </p>
        </div>

        <div className="text-right">
          {trade.pnl != null ? (
            <span className={`text-sm font-bold font-mono ${isWin ? "text-profit" : isLoss ? "text-loss" : "text-muted-foreground"}`}>
              {formatMoney(trade.pnl, { signed: true })}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground font-mono">Open</span>
          )}
        </div>

        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border px-4 py-3 space-y-3 bg-secondary/20"
        >
          <TradeChart trade={trade} />

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Stop Loss</span>
              <p className="font-medium text-loss font-mono">{(trade as any).stop_loss ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Take Profit</span>
              <p className="font-medium text-profit font-mono">{(trade as any).take_profit ?? "—"}</p>
            </div>
            <div />
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Entry</span>
              <p className="font-medium text-foreground font-mono">{trade.entry_price}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Exit</span>
              <p className="font-medium text-foreground font-mono">{trade.exit_price ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Qty</span>
              <p className="font-medium text-foreground font-mono">{trade.quantity}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Fees</span>
              <p className="font-medium text-foreground font-mono">{formatMoney(trade.fees ?? 0)}</p>
            </div>
            {trade.exit_date && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Exit Date</span>
                <p className="font-medium text-foreground">{format(new Date(trade.exit_date), "MMM d, yyyy HH:mm")}</p>
              </div>
            )}
          </div>

          {trade.notes && (
            <div>
              <span className="text-xs text-muted-foreground">Notes</span>
              <p className="text-sm text-foreground mt-0.5">{trade.notes}</p>
            </div>
          )}

          {trade.screenshot_url && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Screenshot</span>
              <SignedScreenshot value={trade.screenshot_url} />
              <ChartAnalysis trade={trade} />
            </div>
          )}

          <div className="flex justify-end gap-3">
            {onUpdate && (
              <button
                onClick={() => setEditOpen(true)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
            <button
              onClick={() => onDelete(trade.id)}
              className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </motion.div>
      )}
      {onUpdate && (
        <EditTradeDialog trade={trade} open={editOpen} onOpenChange={setEditOpen} onSave={onUpdate} />
      )}
    </motion.div>
  );
};

export default TradeRow;
