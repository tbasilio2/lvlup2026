import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2, FileText, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import type { TradeInsert } from "@/hooks/useTrades";
import { toast } from "sonner";

interface Props {
  onImport: (trades: TradeInsert[]) => Promise<void>;
}

type Step = 1 | 2 | 3 | 4;

const parseNum = (v: string) => {
  const n = parseFloat((v || "").replace(/\s/g, "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const parseMT5Date = (s: string) => {
  // MT5 format: "2024.03.15 14:22:30"
  const norm = s.trim().replace(/\./g, "-").replace(" ", "T");
  const d = new Date(norm);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const parseMT5Html = (html: string): TradeInsert[] => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(doc.querySelectorAll("tr"));
  const trades: TradeInsert[] = [];

  // Group deals by position_id: entry (in) + exit (out)
  const positions = new Map<string, { in?: string[]; out?: string[] }>();

  for (const tr of rows) {
    const cells = Array.from(tr.querySelectorAll("td")).map((td) => (td.textContent || "").trim());
    if (cells.length < 10) continue;
    // Typical MT5 Deals row: Time, Deal, Symbol, Type, Direction, Volume, Price, Order, Commission, Swap, Profit
    const type = (cells[3] || "").toLowerCase();
    const direction = (cells[4] || "").toLowerCase();
    if (!/^(buy|sell)$/.test(type)) continue;
    const positionId = cells[7] || cells[1];
    if (!positions.has(positionId)) positions.set(positionId, {});
    const bucket = positions.get(positionId)!;
    if (direction.includes("in")) bucket.in = cells;
    else if (direction.includes("out")) bucket.out = cells;
  }

  for (const [, { in: entryRow, out: exitRow }] of positions) {
    if (!entryRow) continue;
    const symbol = (entryRow[2] || "UNKNOWN").toUpperCase();
    const isLong = (entryRow[3] || "").toLowerCase() === "buy";
    const qty = parseNum(entryRow[5]);
    const entryPrice = parseNum(entryRow[6]);
    const entryDate = parseMT5Date(entryRow[0]);
    const commission = parseNum(entryRow[8]) + parseNum(exitRow?.[8] || "0");
    const swap = parseNum(entryRow[9]) + parseNum(exitRow?.[9] || "0");
    const fees = Math.abs(commission) + Math.abs(swap);

    trades.push({
      symbol,
      direction: isLong ? "long" : "short",
      entry_price: entryPrice,
      exit_price: exitRow ? parseNum(exitRow[6]) : null,
      quantity: qty,
      entry_date: entryDate,
      exit_date: exitRow ? parseMT5Date(exitRow[0]) : null,
      pnl: exitRow ? parseNum(exitRow[10]) : undefined,
      fees,
      status: exitRow ? "closed" : "open",
    });
  }

  return trades;
};

const parseMT5Csv = (text: string): TradeInsert[] => {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map((h) => h.toLowerCase().trim().replace(/"/g, ""));
  const col = (name: string) => headers.findIndex((h) => h.includes(name));

  const iTime = col("time");
  const iSymbol = col("symbol");
  const iType = col("type");
  const iVolume = col("volume");
  const iPrice = col("price");
  const iProfit = col("profit");
  const iComm = col("commission");
  const iSwap = col("swap");

  return lines.slice(1).map((line) => {
    const cells = line.split(sep).map((c) => c.trim().replace(/"/g, ""));
    const type = (cells[iType] || "").toLowerCase();
    return {
      symbol: (cells[iSymbol] || "UNKNOWN").toUpperCase(),
      direction: type.includes("sell") || type.includes("short") ? ("short" as const) : ("long" as const),
      entry_price: parseNum(cells[iPrice]),
      exit_price: null,
      quantity: parseNum(cells[iVolume]) || 1,
      entry_date: parseMT5Date(cells[iTime]),
      exit_date: null,
      pnl: iProfit >= 0 ? parseNum(cells[iProfit]) : undefined,
      fees: Math.abs(parseNum(cells[iComm])) + Math.abs(parseNum(cells[iSwap])),
    };
  });
};

const MT5ImportWizard = ({ onImport }: Props) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<TradeInsert[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1);
    setPreview([]);
    setFileName("");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const isHtml = /\.html?$/i.test(file.name) || /<html|<table/i.test(text.slice(0, 500));
      try {
        const parsed = isHtml ? parseMT5Html(text) : parseMT5Csv(text);
        if (parsed.length === 0) {
          toast.error("No trades found. Make sure you exported the History tab from MT5.");
          return;
        }
        setPreview(parsed);
        setStep(3);
      } catch (err) {
        toast.error("Could not parse file. Try re-exporting from MT5.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      await onImport(preview);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(reset, 200);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 rounded-xl">
          <Download className="h-4 w-4" /> MT5 Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            MT5 Import Wizard
            <span className="text-xs font-mono text-muted-foreground">Step {step} of 4</span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-foreground">Export your trade history from MT5</p>
            <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
              <li>Open MetaTrader 5 on desktop</li>
              <li>Go to the <span className="text-foreground font-medium">Toolbox</span> panel at the bottom</li>
              <li>Click the <span className="text-foreground font-medium">History</span> tab</li>
              <li>Right-click anywhere in the history table</li>
              <li>Choose a date range (e.g. <span className="text-foreground font-medium">Last 3 months</span> or <span className="text-foreground font-medium">Custom Period</span>)</li>
              <li>Right-click again → <span className="text-foreground font-medium">Report → HTML</span> (recommended) or <span className="text-foreground font-medium">Report → XLSX</span></li>
              <li>Save the file somewhere you can find it</li>
            </ol>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Tip:</span> HTML reports preserve entry & exit for each position. If you only have CSV/TSV, we'll import each deal individually.
            </div>
            <Button onClick={() => setStep(2)} className="w-full rounded-xl gap-2">
              I've exported the file <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Upload your MT5 report</p>
            <p className="text-xs text-muted-foreground">Supports <span className="font-mono">.html</span>, <span className="font-mono">.htm</span>, and <span className="font-mono">.csv</span> exports from MT5.</p>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click to select your MT5 report</p>
              {fileName && <p className="text-xs text-primary font-mono mt-2">{fileName}</p>}
              <input ref={fileRef} type="file" accept=".html,.htm,.csv,.tsv,.txt" className="hidden" onChange={handleFile} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Found {preview.length} trades — review before importing
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-muted-foreground">Symbol</th>
                    <th className="px-2 py-1.5 text-left text-muted-foreground">Dir</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground">Qty</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground">Entry</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground">Exit</th>
                    <th className="px-2 py-1.5 text-right text-muted-foreground">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 30).map((t, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5 font-medium">{t.symbol}</td>
                      <td className="px-2 py-1.5 font-mono">{t.direction}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{t.quantity}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{t.entry_price}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{t.exit_price ?? "—"}</td>
                      <td className={`px-2 py-1.5 text-right font-mono ${(t.pnl ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {t.pnl != null ? t.pnl.toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 30 && (
                <p className="text-xs text-muted-foreground text-center py-1">…and {preview.length - 30} more</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={handleImport} disabled={loading} className="flex-1 rounded-xl gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Import {preview.length} trades</>}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Import complete</p>
              <p className="text-xs text-muted-foreground mt-1">
                {preview.length} trades added to your journal.
              </p>
            </div>
            <Button onClick={() => setOpen(false)} className="w-full rounded-xl">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MT5ImportWizard;
