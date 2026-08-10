import { useState } from "react";
import { Check, FlaskConical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PracticeTradeDialog = () => {
  const [symbol, setSymbol] = useState("EURUSD");
  const [direction, setDirection] = useState<"Long" | "Short">("Long");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [completed, setCompleted] = useState(false);

  const reset = () => {
    setCompleted(false);
    setSymbol("EURUSD");
    setDirection("Long");
    setEntry("");
    setStop("");
    setTarget("");
  };

  const finish = () => setCompleted(true);

  return (
    <Dialog onOpenChange={(open) => { if (!open) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2"><FlaskConical className="h-4 w-4" /> Practice trade</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Practice a trade</DialogTitle>
          <DialogDescription>This is a safe rehearsal. Nothing here is saved to your real trading performance.</DialogDescription>
        </DialogHeader>
        {completed ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Check className="h-6 w-6 text-primary" /></div>
            <h3 className="mt-4 font-semibold">Process complete</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">You defined an entry, invalidation and target before thinking about the outcome. That is the habit we want to reinforce.</p>
            <Button className="mt-5 rounded-xl" onClick={reset}>Practice again</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />Practice data is intentionally ephemeral and never enters your real trade history.</div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="practice-symbol">Symbol</Label><Input id="practice-symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></div><div className="space-y-2"><Label>Direction</Label><div className="grid grid-cols-2 gap-1">{(["Long", "Short"] as const).map((value) => <button type="button" key={value} onClick={() => setDirection(value)} className={`rounded-lg border px-2 py-2 text-sm ${direction === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>{value}</button>)}</div></div></div>
            <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label htmlFor="practice-entry">Entry</Label><Input id="practice-entry" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="1.0850" /></div><div className="space-y-2"><Label htmlFor="practice-stop">Invalidation</Label><Input id="practice-stop" inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="1.0800" /></div><div className="space-y-2"><Label htmlFor="practice-target">Target</Label><Input id="practice-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="1.0950" /></div></div>
            <Button className="w-full rounded-xl" disabled={!symbol || !entry || !stop || !target} onClick={finish}>Complete practice</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PracticeTradeDialog;
