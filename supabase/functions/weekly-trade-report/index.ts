import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const unauthorized = () => json({ error: "Unauthorized" }, 401);

const isDate = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return unauthorized();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (authErr || !userId) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const { week_start, week_end, force } = body ?? {};
    if (!isDate(week_start) || !isDate(week_end)) {
      return json({ error: "week_start and week_end must be YYYY-MM-DD" }, 400);
    }

    // Return cached report unless forced
    if (!force) {
      const { data: existing } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", week_start)
        .maybeSingle();
      if (existing) return json({ cached: true, ...existing });
    }

    const startIso = new Date(`${week_start}T00:00:00.000Z`).toISOString();
    const endIso = new Date(`${week_end}T23:59:59.999Z`).toISOString();

    const { data: trades, error: tradesErr } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .gte("entry_date", startIso)
      .lte("entry_date", endIso)
      .order("entry_date", { ascending: true });

    if (tradesErr) throw tradesErr;
    if (!trades || trades.length === 0) {
      return json({ error: "No trades in this week" }, 400);
    }

    const closed = trades.filter((t: any) => t.pnl != null);
    const wins = closed.filter((t: any) => Number(t.pnl) > 0);
    const losses = closed.filter((t: any) => Number(t.pnl) < 0);
    const netPnl = closed.reduce((s: number, t: any) => s + Number(t.pnl), 0);
    const grossProfit = wins.reduce((s: number, t: any) => s + Number(t.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((s: number, t: any) => s + Number(t.pnl), 0));
    const avgWin = wins.length ? grossProfit / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;
    const bestTrade = closed.reduce(
      (b: any, t: any) => (b == null || Number(t.pnl) > Number(b.pnl) ? t : b),
      null as any
    );
    const worstTrade = closed.reduce(
      (b: any, t: any) => (b == null || Number(t.pnl) < Number(b.pnl) ? t : b),
      null as any
    );
    const symbolMap = new Map<string, { trades: number; pnl: number }>();
    closed.forEach((t: any) => {
      const cur = symbolMap.get(t.symbol) ?? { trades: 0, pnl: 0 };
      cur.trades += 1;
      cur.pnl += Number(t.pnl);
      symbolMap.set(t.symbol, cur);
    });

    const stats = {
      total_trades: trades.length,
      closed_trades: closed.length,
      open_trades: trades.length - closed.length,
      wins: wins.length,
      losses: losses.length,
      win_rate: closed.length ? (wins.length / closed.length) * 100 : 0,
      net_pnl: netPnl,
      gross_profit: grossProfit,
      gross_loss: grossLoss,
      profit_factor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
      avg_win: avgWin,
      avg_loss: avgLoss,
      expectancy: closed.length ? netPnl / closed.length : 0,
      best_trade: bestTrade ? { symbol: bestTrade.symbol, pnl: Number(bestTrade.pnl) } : null,
      worst_trade: worstTrade ? { symbol: worstTrade.symbol, pnl: Number(worstTrade.pnl) } : null,
      by_symbol: Array.from(symbolMap.entries())
        .map(([symbol, v]) => ({ symbol, ...v }))
        .sort((a, b) => b.pnl - a.pnl),
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const tradeLines = trades
      .slice(0, 100)
      .map(
        (t: any) =>
          `${t.entry_date} | ${t.symbol} ${t.direction} | entry ${t.entry_price} exit ${t.exit_price ?? "open"} | qty ${t.quantity} | P&L ${t.pnl ?? "n/a"} | SL ${t.stop_loss ?? "-"} TP ${t.take_profit ?? "-"} | strategy ${t.strategy ?? "none"} | notes ${t.notes ?? ""}`
      )
      .join("\n");

    const systemPrompt = `You are an elite trading performance coach writing a END-OF-WEEK trading report. Be specific, reference the actual numbers and symbols. Return JSON with:
- "headline": one punchy sentence summarising the week.
- "summary": 3-4 sentences on results, consistency and execution quality.
- "what_worked": array of 2-4 short phrases.
- "what_hurt": array of 2-4 short phrases.
- "risk_review": 1-2 sentences on risk management (position sizing, stop usage, loss size vs win size).
- "focus_next_week": array of 3 concrete, measurable action items.
- "grade": a letter grade for the week (A+, A, B, C, D or F).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Trading week ${week_start} to ${week_end}.\n\nStats: ${JSON.stringify(stats)}\n\nTrades:\n${tradeLines}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "weekly_trade_report",
              description: "Return a structured weekly trading report",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  summary: { type: "string" },
                  what_worked: { type: "array", items: { type: "string" } },
                  what_hurt: { type: "array", items: { type: "string" } },
                  risk_review: { type: "string" },
                  focus_next_week: { type: "array", items: { type: "string" } },
                  grade: { type: "string" },
                },
                required: [
                  "headline",
                  "summary",
                  "what_worked",
                  "what_hurt",
                  "risk_review",
                  "focus_next_week",
                  "grade",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "weekly_trade_report" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded. Try again later." }, 429);
      if (response.status === 402) return json({ error: "AI credits depleted." }, 402);
      console.error("AI gateway error:", response.status, await response.text());
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");
    const report = JSON.parse(toolCall.function.arguments);

    const { data: saved, error: saveErr } = await supabase
      .from("weekly_reports")
      .upsert(
        { user_id: userId, week_start, week_end, stats, report },
        { onConflict: "user_id,week_start" }
      )
      .select()
      .single();
    if (saveErr) throw saveErr;

    return json({ cached: false, ...saved });
  } catch (e) {
    console.error("weekly-trade-report error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
