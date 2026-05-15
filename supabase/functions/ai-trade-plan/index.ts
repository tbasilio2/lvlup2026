import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const unauthorized = () =>
  new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    if (authErr || !claims?.claims) return unauthorized();

    const { screenshot_url, direction, symbol } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!screenshot_url || screenshot_url === "none") {
      return new Response(JSON.stringify({ error: "Please upload a chart screenshot" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dirLabel = direction === "long"
      ? "LONG (BUY)"
      : direction === "short"
        ? "SHORT (SELL)"
        : "the BEST direction (you decide LONG or SHORT based on price action, structure, momentum, and any visible bias such as red/green markers, arrows, or zones)";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an elite technical analyst and trade planner. The trader wants to go ${dirLabel} on this chart. Your job is to:

1. Analyze the chart thoroughly (price action, structure, key levels, patterns, indicators visible)
2. ${direction ? `Determine the BEST entry price for a ${dirLabel} position based on current structure` : "Pick the optimal direction (long or short) based on the chart, then determine the BEST entry price"}
3. Set an optimal stop loss based on structure (below/above key support/resistance, recent swing)
4. Set a realistic take profit target based on the next key level, measured move, or structure target
5. Calculate the risk:reward ratio
6. Rate the trade quality and explain whether this is a good setup or not

Be specific with exact price numbers you can read from the chart. Reference visible levels, candles, and patterns.
If the symbol is not provided, try to read it from the chart.
Always return a definitive direction ("long" or "short") in your output.`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: screenshot_url } },
              { type: "text", text: `Analyze this chart${symbol ? ` for ${symbol}` : ""} and give me ${direction ? `the optimal entry, stop loss, and take profit levels for a ${dirLabel} trade` : "the best trade plan: pick the optimal direction (long or short), then provide entry, stop loss, and take profit levels"}.` },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "trade_plan",
              description: "Return a complete trade plan with levels and analysis",
              parameters: {
                type: "object",
                properties: {
                  symbol: { type: "string", description: "Symbol/pair identified from chart" },
                  direction: { type: "string", enum: ["long", "short"] },
                  entry_price: { type: "string", description: "Recommended entry price" },
                  stop_loss: { type: "string", description: "Recommended stop loss price" },
                  take_profit: { type: "string", description: "Recommended take profit price" },
                  risk_reward: { type: "string", description: "Risk:reward ratio e.g. 1:2.5" },
                  trade_quality: { type: "number", description: "Trade quality rating 1-10" },
                  trade_quality_reason: { type: "string", description: "One sentence justifying the quality rating" },
                  chart_analysis: { type: "string", description: "2-3 sentence analysis of current price action and structure" },
                  entry_reasoning: { type: "string", description: "Why this entry level is optimal" },
                  sl_reasoning: { type: "string", description: "Why stop loss is placed here" },
                  tp_reasoning: { type: "string", description: "Why take profit target is here" },
                  key_levels: { type: "array", items: { type: "string" }, description: "3-5 key price levels visible on chart" },
                  warnings: { type: "array", items: { type: "string" }, description: "1-3 risks or things to watch out for" },
                },
                required: ["symbol", "direction", "entry_price", "stop_loss", "take_profit", "risk_reward", "trade_quality", "trade_quality_reason", "chart_analysis", "entry_reasoning", "sl_reasoning", "tp_reasoning", "key_levels", "warnings"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "trade_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const plan = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-trade-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
