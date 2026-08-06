import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoney } from "@/lib/currency";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarRange, RefreshCw, FileText, ChevronLeft, ChevronRight } from "lucide-react";

interface WeeklyReportRow {
  id: string;
  week_start: string;
  week_end: string;
  stats: any;
  report: {
    headline: string;
    summary: string;
    what_worked: string[];
    what_hurt: string[];
    risk_review: string;
    focus_next_week: string[];
    grade: string;
  };
  created_at: string;
}

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

/** Monday of the week containing `d` (UTC). */
const mondayOf = (d: Date) => {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
};

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

/** Most recent finished trading week (Mon–Fri, closed once Saturday starts). */
const lastCompletedWeekStart = () => {
  const now = new Date();
  const thisMonday = mondayOf(now);
  const day = now.getUTCDay();
  // Sat(6) or Sun(0) → this week's Mon–Fri is done
  return day === 6 || day === 0 ? thisMonday : addDays(thisMonday, -7);
};

const formatRange = (start: string, end: string) =>
  `${new Date(start + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })} – ${new Date(end + "T00:00:00Z").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;

const gradeTone = (g: string) =>
  g?.startsWith("A") ? "text-profit" : g?.startsWith("B") ? "text-primary" : g?.startsWith("C") ? "text-foreground" : "text-loss";

const WeeklyReport = () => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<Date>(() => lastCompletedWeekStart());
  const [reports, setReports] = useState<WeeklyReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart]);
  const startKey = toISODate(weekStart);
  const endKey = toISODate(weekEnd);
  const current = reports.find((r) => r.week_start === startKey) ?? null;

  const fetchReports = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(52);
    setReports((data as unknown as WeeklyReportRow[]) ?? []);
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const generate = useCallback(
    async (silent = false) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("weekly-trade-report", {
          body: { week_start: startKey, week_end: endKey },
        });
        if (error) throw error;
        if (data?.error) {
          if (!silent) toast.error(data.error);
          return;
        }
        setReports((prev) => [data as WeeklyReportRow, ...prev.filter((r) => r.week_start !== startKey)]);
        if (!silent && !data?.cached) toast.success("Weekly report ready");
      } catch (e) {
        if (!silent) toast.error(e instanceof Error ? e.message : "Could not generate report");
      } finally {
        setLoading(false);
      }
    },
    [startKey, endKey]
  );

  // Auto-generate the report for the last completed trading week, once.
  useEffect(() => {
    if (!user || autoTried || loading) return;
    if (startKey !== toISODate(lastCompletedWeekStart())) return;
    if (reports.some((r) => r.week_start === startKey)) {
      setAutoTried(true);
      return;
    }
    setAutoTried(true);
    generate(true);
  }, [user, autoTried, loading, reports, startKey, generate]);

  const s = current?.stats;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <CalendarRange className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Weekly Trade Report</p>
            <p className="text-[11px] font-mono text-muted-foreground">{formatRange(startKey, endKey)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setWeekStart(addDays(weekStart, -7)); }} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={startKey >= toISODate(lastCompletedWeekStart())}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => generate(false)} disabled={loading} className="ml-1 gap-2">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {current ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </div>

      {!current && !loading && (
        <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card/50">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No report for this week yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Reports build automatically once the trading week closes.</p>
        </div>
      )}

      {current && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-foreground leading-snug">{current.report.headline}</p>
              <span className={`text-2xl font-mono font-bold ${gradeTone(current.report.grade)}`}>{current.report.grade}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{current.report.summary}</p>
          </div>

          {s && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Net P&L", value: formatMoney(s.net_pnl ?? 0), tone: (s.net_pnl ?? 0) >= 0 ? "text-profit" : "text-loss" },
                { label: "Trades", value: String(s.total_trades ?? 0) },
                { label: "Win rate", value: `${(s.win_rate ?? 0).toFixed(1)}%` },
                { label: "Profit factor", value: s.profit_factor == null ? "∞" : s.profit_factor.toFixed(2) },
                { label: "Wins / Losses", value: `${s.wins ?? 0} / ${s.losses ?? 0}` },
                { label: "Avg win", value: formatMoney(s.avg_win ?? 0), tone: "text-profit" },
                { label: "Avg loss", value: formatMoney(s.avg_loss ?? 0), tone: "text-loss" },
                { label: "Expectancy", value: formatMoney(s.expectancy ?? 0), tone: (s.expectancy ?? 0) >= 0 ? "text-profit" : "text-loss" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground">{c.label}</p>
                  <p className={`text-sm font-mono font-semibold mt-1 ${c.tone ?? "text-foreground"}`}>{c.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] font-mono text-profit mb-2">What worked</p>
              <ul className="space-y-1.5">
                {current.report.what_worked?.map((x, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {x}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] font-mono text-loss mb-2">What hurt</p>
              <ul className="space-y-1.5">
                {current.report.what_hurt?.map((x, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {x}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] font-mono text-muted-foreground mb-2">Risk review</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.report.risk_review}</p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] font-mono text-primary mb-2">Focus next week</p>
            <ul className="space-y-1.5">
              {current.report.focus_next_week?.map((x, i) => (
                <li key={i} className="text-sm text-foreground">{i + 1}. {x}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {reports.length > 1 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em] font-mono mb-2">Past weeks</h3>
          <div className="space-y-2">
            {reports
              .filter((r) => r.week_start !== startKey)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => setWeekStart(new Date(r.week_start + "T00:00:00Z"))}
                  className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40 transition-colors"
                >
                  <span className="text-xs font-mono text-muted-foreground">{formatRange(r.week_start, r.week_end)}</span>
                  <span className="flex items-center gap-3">
                    <span className={`text-sm font-mono ${(r.stats?.net_pnl ?? 0) >= 0 ? "text-profit" : "text-loss"}`}>
                      {formatMoney(r.stats?.net_pnl ?? 0)}
                    </span>
                    <span className={`text-sm font-mono font-bold ${gradeTone(r.report?.grade)}`}>{r.report?.grade}</span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;
