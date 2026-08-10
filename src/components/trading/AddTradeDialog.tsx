import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { TradeInsert } from "@/hooks/useTrades";
import { formatMoney } from "@/lib/currency";

interface Props {
  onAdd: (trade: TradeInsert) => Promise<void>;
}

const AddTradeDialog = ({ onAdd }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    symbol: "",
    direction: "long" as "long" | "short",
    entry_price: "",
    exit_price: "",
    stop_loss: "",
    take_profit: "",
    quantity: "1",
    entry_date: new Date().toISOString().slice(0, 16),
    exit_date: "",
    fees: "0",
    pnl: "",
    strategy: "",
    notes: "",
  });

  const autoPnl = (() => {
    const ep = parseFloat(form.entry_price);
    const xp = parseFloat(form.exit_price);
    const q = parseFloat(form.quantity);
    const f = parseFloat(form.fees || "0");
    if (!isFinite(ep) || !isFinite(xp) || !isFinite(q)) return null;
    const gross = form.direction === "long" ? (xp - ep) * q : (ep - xp) * q;
    return gross - (isFinite(f) ? f : 0);
  })();

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Screenshot must be under 5MB");
      return;
    }
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadScreenshot = async (): Promise<string | undefined> => {
    if (!screenshotFile || !user) return undefined;
    const ext = screenshotFile.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("trade-screenshots")
      .upload(path, screenshotFile, { contentType: screenshotFile.type });
    if (error) {
      toast.error("Failed to upload screenshot");
      return undefined;
    }
    // Store the storage path; signed URLs are generated on demand.
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const screenshotUrl = await uploadScreenshot();
    const manualPnl = form.pnl.trim() ? parseFloat(form.pnl) : null;
    await onAdd({
      symbol: form.symbol.toUpperCase(),
      direction: form.direction,
      entry_price: parseFloat(form.entry_price),
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
      take_profit: form.take_profit ? parseFloat(form.take_profit) : null,
      quantity: parseFloat(form.quantity),
      entry_date: new Date(form.entry_date).toISOString(),
      exit_date: form.exit_date ? new Date(form.exit_date).toISOString() : null,
      fees: parseFloat(form.fees || "0"),
      pnl: manualPnl,
      status: manualPnl != null || form.exit_price ? "closed" : "open",
      strategy: form.strategy || undefined,
      notes: form.notes || undefined,
      screenshot_url: screenshotUrl,
    });
    setLoading(false);
    setOpen(false);
    clearScreenshot();
    setForm({
      symbol: "", direction: "long", entry_price: "", exit_price: "",
      stop_loss: "", take_profit: "",
      quantity: "1", entry_date: new Date().toISOString().slice(0, 16),
      exit_date: "", fees: "0", pnl: "", strategy: "", notes: "",
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Stop Loss</label>
              <input type="number" step="any" value={form.stop_loss} onChange={(e) => update("stop_loss", e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Take Profit</label>
              <input type="number" step="any" value={form.take_profit} onChange={(e) => update("take_profit", e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity / Lots</label>
              <input type="number" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fees (R)</label>
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">P&L (R, manual override)</label>
            <input type="number" step="any" value={form.pnl} onChange={(e) => update("pnl", e.target.value)} placeholder="Leave empty to auto-calculate" className={inputCls + " font-mono"} />
            {!form.pnl.trim() && autoPnl != null && (
              <p className={`text-[10px] mt-1 font-mono ${autoPnl >= 0 ? "text-profit" : "text-loss"}`}>
                Auto: {formatMoney(autoPnl, { signed: true })}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Strategy / Setup</label>
            <StrategySelect value={form.strategy} onChange={(v) => update("strategy", v)} className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Trade notes..." rows={2} className={inputCls + " resize-none"} />
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chart Screenshot</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {screenshotPreview ? (
              <div className="relative rounded-xl border border-border overflow-hidden">
                <img src={screenshotPreview} alt="Preview" className="w-full max-h-40 object-contain bg-secondary/30" />
                <button
                  type="button"
                  onClick={clearScreenshot}
                  className="absolute top-2 right-2 p-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive/20 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-foreground" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-border bg-secondary/20 hover:bg-secondary/40 transition-colors py-6 flex flex-col items-center gap-1.5"
              >
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upload chart screenshot</span>
              </button>
            )}
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
