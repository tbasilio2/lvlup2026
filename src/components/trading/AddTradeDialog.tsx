import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import type { TradeInsert } from "@/hooks/useTrades";

interface Props {
  onAdd: (trade: TradeInsert) => Promise<void>;
}

const AddTradeDialog = ({ onAdd }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    direction: "long" as "long" | "short",
    entry_price: "",
    exit_price: "",
    quantity: "1",
    entry_date: new Date().toISOString().slice(0, 16),
    exit_date: "",
    fees: "0",
    strategy: "",
    notes: "",
  });

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onAdd({
      symbol: form.symbol.toUpperCase(),
      direction: form.direction,
      entry_price: parseFloat(form.entry_price),
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      quantity: parseFloat(form.quantity),
      entry_date: new Date(form.entry_date).toISOString(),
      exit_date: form.exit_date ? new Date(form.exit_date).toISOString() : null,
      fees: parseFloat(form.fees || "0"),
      strategy: form.strategy || undefined,
      notes: form.notes || undefined,
    });
    setLoading(false);
    setOpen(false);
    setForm({
      symbol: "", direction: "long", entry_price: "", exit_price: "",
      quantity: "1", entry_date: new Date().toISOString().slice(0, 16),
      exit_date: "", fees: "0", strategy: "", notes: "",
    });
  };

  const inputCls = "w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 rounded-xl">
          <Plus className="h-4 w-4" /> Add Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log a Trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Symbol</label>
              <input value={form.symbol} onChange={(e) => update("symbol", e.target.value)} placeholder="EURUSD" required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Direction</label>
              <Select value={form.direction} onValueChange={(v) => update("direction", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Entry Price</label>
              <input type="number" step="any" value={form.entry_price} onChange={(e) => update("entry_price", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Exit Price</label>
              <input type="number" step="any" value={form.exit_price} onChange={(e) => update("exit_price", e.target.value)} placeholder="Leave empty if open" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity / Lots</label>
              <input type="number" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fees</label>
              <input type="number" step="any" value={form.fees} onChange={(e) => update("fees", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Entry Date</label>
              <input type="datetime-local" value={form.entry_date} onChange={(e) => update("entry_date", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Exit Date</label>
              <input type="datetime-local" value={form.exit_date} onChange={(e) => update("exit_date", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Strategy / Setup</label>
            <input value={form.strategy} onChange={(e) => update("strategy", e.target.value)} placeholder="e.g. Break & Retest" className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Trade notes..." rows={2} className={inputCls + " resize-none"} />
          </div>

          <Button type="submit" disabled={loading} className="w-full rounded-xl gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Trade"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTradeDialog;
