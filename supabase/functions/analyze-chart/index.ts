import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { screenshot_url, trade_context, is_setup_advice, setup_details } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!screenshot_url || screenshot_url === "none") {
      // Allow text-only setup advice
      if (!is_setup_advice || !setup_details?.symbol) {
        return new Response(
          JSON.stringify({ error: "No screenshot URL or setup details provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const systemPrompt = `You are an expert technical analyst and trading coach. You are reviewing a chart screenshot from a trader. Analyze the chart and provide structured feedback. Consider:
- Price action patterns (support/resistance, trend lines, chart patterns)
- Key levels visible on the chart
- Entry/exit quality if trade context is provided
- Risk management observations
- What the trader did well and what could improve

Structure your response EXACTLY as JSON with these fields:
- "chart_analysis": 2-3 sentences describing what you see on the chart (price action, timeframe, patterns).
- "setup_quality": A rating from 1-10 with a brief justification (1 sentence).
- "key_observations": An array of 3-5 specific observations about the chart (short phrases about patterns, levels, indicators visible).
- "entry_feedback": 1-2 sentences evaluating the entry if trade context is given, or general entry suggestions based on the chart.
- "risk_management": 1-2 sentences on stop loss placement, risk-reward, and position management based on what you see.
- "suggestions": An array of 2-3 actionable tips for this specific setup.

Be specific about what you see. Reference visible patterns, candle formations, and levels.`;

    const userContent: any[] = [];

    if (screenshot_url && screenshot_url !== "none") {
      userContent.push({ type: "image_url", image_url: { url: screenshot_url } });
    }

    if (is_setup_advice && setup_details) {
      const parts = [
        `FUTURE TRADE SETUP ADVICE REQUEST`,
        setup_details.symbol ? `Symbol: ${setup_details.symbol}` : null,
        setup_details.direction ? `Planned direction: ${setup_details.direction}` : null,
        setup_details.entry_price ? `Planned entry: ${setup_details.entry_price}` : null,
        setup_details.stop_loss ? `Stop loss: ${setup_details.stop_loss}` : null,
        setup_details.take_profit ? `Take profit: ${setup_details.take_profit}` : null,
        setup_details.strategy ? `Strategy: ${setup_details.strategy}` : null,
        setup_details.notes ? `Reasoning: ${setup_details.notes}` : null,
      ].filter(Boolean).join(" | ");
      userContent.push({ type: "text", text: parts });
    } else if (trade_context) {
      userContent.push({
        type: "text",
        text: `Trade context: ${trade_context.symbol} ${trade_context.direction} | Entry: ${trade_context.entry_price} | Exit: ${trade_context.exit_price ?? "still open"} | P&L: ${trade_context.pnl ?? "n/a"} | Strategy: ${trade_context.strategy ?? "not specified"} | Notes: ${trade_context.notes ?? "none"}`,
      });
    } else {
      userContent.push({ type: "text", text: "No specific trade context provided. Analyze the chart setup generally." });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "chart_analysis",
              description: "Return a structured chart analysis",
              parameters: {
                type: "object",
                properties: {
                  chart_analysis: { type: "string" },
                  setup_quality: { type: "number" },
                  setup_quality_reason: { type: "string" },
                  key_observations: { type: "array", items: { type: "string" } },
                  entry_feedback: { type: "string" },
                  risk_management: { type: "string" },
                  suggestions: { type: "array", items: { type: "string" } },
                },
                required: ["chart_analysis", "setup_quality", "setup_quality_reason", "key_observations", "entry_feedback", "risk_management", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "chart_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
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

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-chart error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
