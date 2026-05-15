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

    const { entries } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "No entries provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const entrySummary = entries
      .map(
        (e: any) =>
          `Date: ${e.date}, Mood: ${e.mood}${e.gratitude ? `, Gratitude: ${e.gratitude}` : ""}${e.intention ? `, Intention: ${e.intention}` : ""}${e.reflection ? `, Reflection: ${e.reflection}` : ""}${e.wins ? `, Wins: ${e.wins}` : ""}`
      )
      .join("\n");

    const systemPrompt = `You are a thoughtful wellness coach reviewing someone's journal entries from the past week. Provide a warm, insightful weekly reflection. Structure your response EXACTLY as JSON with these fields:
- "summary": A 2-3 sentence overview of how their week went emotionally and mentally.
- "moodPattern": A brief observation about their mood trends (1-2 sentences).
- "strengths": An array of 2-3 things they did well this week (short phrases).
- "improvements": An array of 2-3 actionable, kind suggestions for next week (short phrases).
- "affirmation": A single encouraging sentence to carry into next week.

Be specific to their actual entries, not generic. Be warm but honest.`;

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
          { role: "user", content: `Here are my journal entries from this week:\n\n${entrySummary}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "weekly_reflection",
              description: "Return a structured weekly reflection",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  moodPattern: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  improvements: { type: "array", items: { type: "string" } },
                  affirmation: { type: "string" },
                },
                required: ["summary", "moodPattern", "strengths", "improvements", "affirmation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "weekly_reflection" } },
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

    const reflection = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(reflection), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-reflection error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
