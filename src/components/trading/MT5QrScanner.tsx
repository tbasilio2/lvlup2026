import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export interface ScannedMT5Credentials {
  label?: string;
  server?: string;
  login?: string;
  password?: string;
}

/**
 * Parse an MT5 credential QR payload. Supports:
 *  - JSON: {"server":"...","login":"...","password":"...","label":"..."}
 *  - key=value pairs separated by ; , | or newline
 *  - URI style: mt5://account?server=...&login=...&password=...
 *  - Plain "server|login|password"
 */
export function parseMT5Qr(text: string): ScannedMT5Credentials | null {
  const t = text.trim();
  if (!t) return null;

  const pick = (o: Record<string, string>): ScannedMT5Credentials => ({
    label: o.label ?? o.name ?? o.account ?? undefined,
    server: o.server ?? o.broker ?? o.brokerserver ?? o.host ?? undefined,
    login: o.login ?? o.account_number ?? o.accountnumber ?? o.user ?? o.id ?? undefined,
    password: o.password ?? o.investor ?? o.investorpassword ?? o.pass ?? undefined,
  });

  // JSON
  if (t.startsWith("{")) {
    try {
      const raw = JSON.parse(t) as Record<string, unknown>;
      const lower: Record<string, string> = {};
      Object.entries(raw).forEach(([k, v]) => { lower[k.toLowerCase().replace(/[\s_-]/g, "")] = String(v); });
      const out = pick({ ...lower, server: lower.server ?? lower.brokerserver ?? lower.host });
      return out.server || out.login ? out : null;
    } catch { /* fall through */ }
  }

  // URI with query string
  if (/^[a-z0-9+.-]+:\/\//i.test(t) && t.includes("?")) {
    try {
      const url = new URL(t);
      const lower: Record<string, string> = {};
      url.searchParams.forEach((v, k) => { lower[k.toLowerCase().replace(/[\s_-]/g, "")] = v; });
      const out = pick(lower);
      if (out.server || out.login) return out;
    } catch { /* fall through */ }
  }

  // key=value pairs
  if (t.includes("=")) {
    const lower: Record<string, string> = {};
    t.split(/[;,|\n\r]+/).forEach((part) => {
      const idx = part.indexOf("=");
      if (idx > 0) {
        lower[part.slice(0, idx).trim().toLowerCase().replace(/[\s_-]/g, "")] = part.slice(idx + 1).trim();
      }
    });
    const out = pick(lower);
    if (out.server || out.login) return out;
  }

  // Delimited triple
  const parts = t.split(/[|;,\n]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return { server: parts[0], login: parts[1], password: parts[2] };
  }

  return null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (creds: ScannedMT5Credentials) => void;
}

export default function MT5QrScanner({ open, onOpenChange, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResult = (text: string) => {
    const creds = parseMT5Qr(text);
    if (!creds) {
      toast.error("QR code didn't contain MT5 login details");
      return;
    }
    scannerRef.current?.stop();
    onScanned(creds);
    onOpenChange(false);
    toast.success("Credentials scanned");
  };

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    const scanner = new QrScanner(
      videoRef.current,
      (result) => handleResult(result.data),
      { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: "environment" },
    );
    scannerRef.current = scanner;

    scanner
      .start()
      .then(() => { if (!cancelled) setStarting(false); })
      .catch(() => {
        if (cancelled) return;
        setStarting(false);
        setError("Camera unavailable — allow camera access or upload a QR image instead.");
      });

    return () => {
      cancelled = true;
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const scanImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const result = await QrScanner.scanImage(f, { returnDetailedScanResult: true });
      handleResult(result.data);
    } catch {
      toast.error("No QR code found in that image");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="h-4 w-4" /> Scan MT5 QR</DialogTitle>
          <DialogDescription>
            Point the camera at your broker's account QR code. Fields fill in automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="relative rounded-xl overflow-hidden border border-border bg-secondary/30 aspect-square">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs font-mono text-muted-foreground">Starting camera…</span>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={scanImage} />
        <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Upload QR image instead
        </Button>
      </DialogContent>
    </Dialog>
  );
}
