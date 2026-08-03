import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, QrCode, Loader2, Upload } from "lucide-react";
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
  const [cameraActive, setCameraActive] = useState(false);
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
    if (open) return;
    setCameraActive(false);
    setStarting(false);
    setError(null);
    return () => {
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [open]);

  const startCamera = async () => {
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable in this preview. Open the published app in a browser tab, or upload a QR image below.");
      return;
    }
    if (!videoRef.current) {
      setError("Camera view is not ready. Close this window and try again.");
      return;
    }

    scannerRef.current?.destroy();
    const scanner = new QrScanner(
      videoRef.current,
      (result) => handleResult(result.data),
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: "environment",
        maxScansPerSecond: 10,
        returnDetailedScanResult: true,
      },
    );
    scannerRef.current = scanner;
    setStarting(true);
    try {
      await scanner.start();
      setCameraActive(true);
    } catch (err) {
      scanner.destroy();
      scannerRef.current = null;
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Camera permission was blocked. Allow Camera in this site's browser permissions, then tap Try camera again.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No usable camera was found. Upload a QR image instead.");
      } else {
        setError("The camera could not start. Open the app directly in Safari or Chrome, or upload a QR image instead.");
      }
    } finally {
      setStarting(false);
    }
  };

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

        <div className="relative overflow-hidden rounded-lg border border-border bg-secondary/30 aspect-square">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60">
              {starting ? (
                <><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-xs font-mono text-muted-foreground">Starting camera…</span></>
              ) : (
                <Button type="button" size="sm" className="gap-2" onClick={startCamera}>
                  <Camera className="h-4 w-4" /> Allow camera
                </Button>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={scanImage} />
        {error && (
          <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={startCamera} disabled={starting}>
            <Camera className="h-3.5 w-3.5" /> Try camera again
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Upload QR image instead
        </Button>
      </DialogContent>
    </Dialog>
  );
}
