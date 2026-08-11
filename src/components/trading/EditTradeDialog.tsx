import StrategySelect from "@/components/trading/StrategySelect";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ImagePlus, X, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Trade, TradeInsert } from "@/hooks/useTrades";
import { useSignedTradeScreenshot } from "@/lib/tradeScreenshot";
import { formatMoney } from "@/lib/currency";

interface Props {
  trade: Trade;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<TradeInsert>) => Promise<void>;
}

type TradeUpdates = Partial<TradeInsert> & { screenshot_url?: string | null };

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

const EditTradeDialog = ({ trade, open, onOpenChange, onSave }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(trade.screenshot_url);
  const [removeScreenshot, setRemoveScreenshot] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    symbol: trade.symbol,
    direction: trade.direction,
    entry_price: String(trade.entry_price),
    exit_price: trade.exit_price != null ? String(trade.exit_price) : "",
    stop_loss: trade.stop_loss != null ? String(trade.stop_loss) : "",
    take_profit: trade.take_profit != null ? String(trade.take_profit) : "",
    quantity: String(trade.quantity),
    entry_date: toLocal(trade.entry_date),
    exit_date: toLocal(trade.exit_date),
    fees: String(trade.fees ?? 0),
    pnl: trade.pnl != null ? String(trade.pnl) : "",
    strategy: trade.strategy ?? "",
    notes: trade.notes ?? "",
    tags: (trade.tags ?? []).join(", "),
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

  useEffect(() => {
    if (open) {
      setForm({
        symbol: trade.symbol,
        direction: trade.direction,
        entry_price: String(trade.entry_price),
        exit_price: trade.exit_price != null ? String(trade.exit_price) : "",
        stop_loss: trade.stop_loss != null ? String(trade.stop_loss) : "",
        take_profit: trade.take_profit != null ? String(trade.take_profit) : "",
        quantity: String(trade.quantity),
        entry_date: toLocal(trade.entry_date),
        exit_date: toLocal(trade.exit_date),
        fees: String(trade.fees ?? 0),
        pnl: trade.pnl != null ? String(trade.pnl) : "",
        strategy: trade.strategy ?? "",
        notes: trade.notes ?? "",
        tags: (trade.tags ?? []).join(", "),
      });
      setScreenshotPreview(trade.screenshot_url);
      setScreenshotFile(null);
      setRemoveScreenshot(false);
    }
  }, [open, trade]);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setRemoveScreenshot(false);
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setRemoveScreenshot(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadScreenshot = async (): Promise<string | undefined> => {
    if (!screenshotFile || !user) return undefined;
    const ext = screenshotFile.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("trade-screenshots")
      .upload(path, screenshotFile, { contentType: screenshotFile.type });
    if (error) { toast.error("Upload failed"); return undefined; }
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let screenshot_url: string | null | undefined = undefined;
    if (screenshotFile) screenshot_url = await uploadScreenshot();
    else if (removeScreenshot) screenshot_url = null;

    const updates: TradeUpdates = {
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
      strategy: form.strategy || undefined,
      notes: form.notes || undefined,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    const manualPnl = form.pnl.trim() ? parseFloat(form.pnl) : null;
    if (manualPnl != null) {
      updates.pnl = manualPnl;
      updates.status = "closed";
    } else if (updates.exit_price != null) {
      const pnl =
        updates.direction === "long"
          ? (updates.exit_price - (updates.entry_price as number)) * (updates.quantity as number)
          : ((updates.entry_price as number) - updates.exit_price) * (updates.quantity as number);
      updates.pnl = pnl - (updates.fees ?? 0);
      updates.status = "closed";
    } else {
      updates.pnl = null;
      updates.status = "open";
    }

    if (screenshot_url !== undefined) updates.screenshot_url = screenshot_url;

    await onSave(trade.id, updates);
    setLoading(false);
    onOpenChange(false);
  };

  const inputCls = "w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/60";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Edit Trade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Symbol</label>
              <input value={form.symbol} onChange={(e) => update("symbol", e.target.value)} required className={inputCls} />
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags (comma-separated)</label>
            <input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="scalp, london" className={inputCls} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} className={inputCls + " resize-none"} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chart Screenshot</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {screenshotPreview ? (
              <ScreenshotPreview src={screenshotPreview} onClear={clearScreenshot} />
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-dashed border-border bg-secondary/20 hover:bg-secondary/40 transition-colors py-6 flex flex-col items-center gap-1.5">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upload chart screenshot</span>
              </button>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full rounded-xl gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ScreenshotPreview = ({ src, onClear }: { src: string; onClear: () => void }) => {
  const signed = useSignedTradeScreenshot(src);
  return (
    <div className="relative rounded-xl border border-border overflow-hidden">
      <img src={signed ?? src} alt="Preview" className="w-full max-h-40 object-contain bg-secondary/30" />
      <button type="button" onClick={onClear} className="absolute top-2 right-2 p-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive/20 transition-colors">
        <X className="h-3.5 w-3.5 text-foreground" />
      </button>
    </div>
  );
};

export default EditTradeDialog;
