import { TrendingUp, Check, ShieldCheck } from "lucide-react";
import TradeHeroStats from "@/components/trading/TradeHeroStats";
import PnLCalendar from "@/components/trading/PnLCalendar";
import EquityCurve from "@/components/trading/EquityCurve";
import { demoTrades } from "@/lib/demoTrades";
export default function ProductPreview({ view = "journal" }: { view?: "journal" | "analytics" | "review" | "process" }) {
  return <div className="overflow-hidden rounded-lg border border-border bg-background text-left shadow-xl">
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><span className="flex items-center gap-2 text-xs font-semibold"><TrendingUp className="h-4 w-4 text-primary" />LVL UP <span className="hidden text-muted-foreground sm:inline">/ Performance workspace</span></span><span className="font-mono text-[10px] text-muted-foreground">ILLUSTRATIVE DATA</span></div>
    <div className="space-y-4 p-3 sm:p-5"><div className="flex items-center justify-between"><h3 className="text-sm">{view === "review" ? "AI-assisted trade review" : view === "process" ? "Today's trading process" : "Trading Journal"}</h3><span className="text-[10px] text-primary">Review, not prediction</span></div>
      {(view === "journal" || view === "analytics") && <><TradeHeroStats trades={demoTrades} /><div className={`grid gap-3 ${view === "journal" ? "lg:grid-cols-2" : ""}`}>{view === "journal" && <PnLCalendar trades={demoTrades} />}<EquityCurve trades={demoTrades} /></div></>}
      {view === "review" && <div className="space-y-5 py-3"><p className="section-label">EURUSD · Structure retest</p><div><h4 className="text-sm">Execution review</h4><p className="mt-2 text-sm leading-6 text-muted-foreground">Entry followed the retest. Check whether your stop allowed for normal volatility, and compare execution with your written plan.</p></div><div className="flex gap-3 border-t border-border pt-4"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">Keep risk consistent. One trade is not enough to judge an edge.</p></div><p className="text-xs text-muted-foreground">Sample review · educational, not financial advice.</p></div>}
      {view === "process" && <div className="space-y-4 py-3">{["Define risk before entry", "Wait for my setup", "Journal the decision", "Review without changing the rules"].map((text, index) => <div key={text} className="flex items-center gap-3 border-b border-border pb-3"><Check className={`h-5 w-5 ${index < 2 ? "text-primary" : "text-muted-foreground"}`} /><span className="text-sm">{text}</span></div>)}</div>}
    </div>
  </div>;
}
