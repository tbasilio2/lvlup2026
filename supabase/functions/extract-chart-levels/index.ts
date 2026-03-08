import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { screenshot_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!screenshot_url) {
      return new Response(JSON.stringify({ error: "No screenshot URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          {
            role: "system",
            content: `You are an expert at reading trading chart screenshots. Extract any visible price levels from the chart. Look for:
- Entry price: marked lines, arrows, or labels indicating entry
- Stop loss (SL): red lines, labels, or markers below/above entry
- Take profit (TP): green lines, labels, or markers at target levels
- Symbol/pair name visible on the chart
- Trade direction (long/short) based on entry vs SL/TP placement

Also try to identify the symbol from the chart title, watermark, or labels.
If a value is not visible or unclear, return null for that field. Only return values you can clearly read from the chart.`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: screenshot_url } },
              { type: "text", text: "Extract all visible price levels, symbol, and direction from this trading chart." },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_levels",
              description: "Extract price levels from a trading chart screenshot",
              parameters: {
                type: "object",
                properties: {
                  symbol: { type: "string", description: "Trading pair/symbol visible on chart, or null" },
                  direction: { type: "string", enum: ["long", "short"], description: "Inferred trade direction, or null" },
                  entry_price: { type: "string", description: "Entry price as string number, or null" },
                  stop_loss: { type: "string", description: "Stop loss price as string number, or null" },
                  take_profit: { type: "string", description: "Take profit price as string number, or null" },
                  confidence: { type: "string", enum: ["high", "medium", "low"], description: "How confident you are in the extracted values" },
                  notes: { type: "string", description: "Brief note about what you could/couldn't read" },
                },
                required: ["confidence", "notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_levels" } },
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

    const extracted = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-chart-levels error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
