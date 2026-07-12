import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText } from "lucide-react";
import type { TradeInsert } from "@/hooks/useTrades";
import { formatMoney } from "@/lib/currency";

interface Props {
  onImport: (trades: TradeInsert[]) => Promise<void>;
}

const CSVImport = ({ onImport }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<TradeInsert[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): TradeInsert[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));

    const get = (row: string[], name: string) => {
      const idx = headers.findIndex((h) =>
        h.includes(name) || h === name
      );
      return idx >= 0 ? row[idx]?.trim().replace(/"/g, "") : "";
    };

    return lines.slice(1).filter(l => l.trim()).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const symbol = get(cols, "symbol") || get(cols, "ticker") || get(cols, "instrument") || "UNKNOWN";
      const dir = get(cols, "direction") || get(cols, "side") || get(cols, "type") || "long";
      const entry = parseFloat(get(cols, "entry") || get(cols, "open") || "0");
      const exit = parseFloat(get(cols, "exit") || get(cols, "close") || "");
      const qty = parseFloat(get(cols, "quantity") || get(cols, "lots") || get(cols, "size") || get(cols, "volume") || "1");
      const entryDate = get(cols, "entry_date") || get(cols, "open_time") || get(cols, "date") || new Date().toISOString();
      const exitDate = get(cols, "exit_date") || get(cols, "close_time") || "";
      const pnl = parseFloat(get(cols, "pnl") || get(cols, "profit") || get(cols, "net") || "");
      const fees = parseFloat(get(cols, "fees") || get(cols, "commission") || "0");

      return {
        symbol: symbol.toUpperCase(),
        direction: dir.toLowerCase().includes("short") || dir.toLowerCase().includes("sell") ? "short" as const : "long" as const,
        entry_price: entry,
        exit_price: isNaN(exit) ? null : exit,
        quantity: isNaN(qty) ? 1 : qty,
        entry_date: new Date(entryDate).toISOString(),
        exit_date: exitDate ? new Date(exitDate).toISOString() : null,
        pnl: isNaN(pnl) ? undefined : pnl,
        fees: isNaN(fees) ? 0 : fees,
      };
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string);
      setPreview(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setLoading(true);
    await onImport(preview);
    setLoading(false);
    setOpen(false);
    setPreview([]);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPreview([]); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 rounded-xl">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Trades from CSV</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground mb-3">
          Supports exports from MetaTrader 5, TradingView, and most brokers. Expected columns: symbol, direction/side, entry_price/open, exit_price/close, quantity/lots, entry_date/open_time, exit_date/close_time, pnl/profit, fees/commission.
        </p>

        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>

        {preview.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-foreground">{preview.length} trades found</p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-muted-foreground">Symbol</th>
                    <th className="px-2 py-1.5 text-left text-muted-foreground">Dir</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground">Entry</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground">Exit</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((t, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5 font-medium">{t.symbol}</td>
                      <td className="px-2 py-1.5">{t.direction}</td>
                      <td className="px-2 py-1.5 text-right">{t.entry_price}</td>
                      <td className="px-2 py-1.5 text-right">{t.exit_price ?? "—"}</td>
                      <td className={`px-2 py-1.5 text-right ${(t.pnl ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {t.pnl != null ? formatMoney(t.pnl) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-1">...and {preview.length - 20} more</p>
              )}
            </div>
            <Button onClick={handleImport} disabled={loading} className="w-full rounded-xl gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Import ${preview.length} Trades`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CSVImport;
