import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trades } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!trades || trades.length === 0) {
      return new Response(
        JSON.stringify({ error: "No trades provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tradeSummary = trades
      .map(
        (t: any) =>
          `${t.entry_date} | ${t.symbol} ${t.direction} | Entry: ${t.entry_price} Exit: ${t.exit_price ?? "open"} | Qty: ${t.quantity} | P&L: ${t.pnl ?? "n/a"} | Strategy: ${t.strategy ?? "none"} | Notes: ${t.notes ?? ""}`
      )
      .join("\n");

    const systemPrompt = `You are an elite trading coach and analyst reviewing a trader's recent trade log. Provide a thorough, actionable analysis. Structure your response EXACTLY as JSON with these fields:
- "performance_summary": 2-3 sentences on overall performance, net P&L trend, and consistency.
- "patterns": An array of 2-4 patterns you noticed (e.g. time-of-day bias, overtrading, position sizing issues, winning streaks). Each is an object with "title" (short) and "description" (1-2 sentences).
- "strengths": An array of 2-3 things the trader is doing well (short phrases).
- "improvements": An array of 2-3 specific, actionable improvements with reasoning (short phrases).
- "risk_assessment": 1-2 sentences on their risk management based on position sizes, win/loss ratios, and P&L distribution.
- "next_steps": An array of 2-3 concrete action items for the next trading session.

Be specific to their actual trades. Reference symbols, dates, and patterns. Be direct but constructive.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are my recent trades:\n\n${tradeSummary}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "trade_analysis",
              description: "Return a structured trading analysis",
              parameters: {
                type: "object",
                properties: {
                  performance_summary: { type: "string" },
                  patterns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["title", "description"],
                      additionalProperties: false,
                    },
                  },
                  strengths: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } },
                  risk_assessment: { type: "string" },
                  next_steps: { type: "array", items: { type: "string" } },
                },
                required: ["performance_summary", "patterns", "strengths", "improvements", "risk_assessment", "next_steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "trade_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trade-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
