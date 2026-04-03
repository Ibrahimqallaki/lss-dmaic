import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const fishboneData = body.fishboneData;
    const fiveWhysData = body.fiveWhysData;
    const problemStatement = typeof body.problemStatement === "string"
      ? body.problemStatement.slice(0, 5000)
      : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let context = "";
    if (problemStatement) {
      context += `Problem: ${problemStatement}\n\n`;
    }

    if (fishboneData && typeof fishboneData === "object") {
      context += "Fiskbensdiagram (6M-analys):\n";
      for (const [category, causes] of Object.entries(fishboneData)) {
        if (Array.isArray(causes) && causes.length > 0) {
          context += `  ${String(category).slice(0, 100)}: ${(causes as string[]).map(c => String(c).slice(0, 200)).join(", ")}\n`;
        }
      }
      context += "\n";
    }

    if (Array.isArray(fiveWhysData)) {
      context += "5 Varför-analys:\n";
      fiveWhysData.slice(0, 20).forEach((chain: any, i: number) => {
        context += `  Kedja ${i + 1}:\n`;
        if (chain.problem) context += `    Problem: ${String(chain.problem).slice(0, 500)}\n`;
        if (Array.isArray(chain.whys)) {
          chain.whys.slice(0, 10).forEach((why: string, j: number) => {
            if (why) context += `    Varför ${j + 1}: ${String(why).slice(0, 500)}\n`;
          });
        }
        if (chain.rootCause) context += `    Rotorsak: ${String(chain.rootCause).slice(0, 500)}\n`;
      });
    }

    // Limit total context size
    context = context.slice(0, 15000);

    const systemPrompt = `Du är en erfaren Lean Six Sigma Black Belt-konsult. Baserat på data från rotorsaksanalyser (fiskbensdiagram och 5 Varför), ge konkreta förslag på:

1. **Potentiella rotorsaker** som teamet kan ha missat
2. **Verifieringsmetoder** för att testa de identifierade orsakerna
3. **Snabba åtgärder** (quick wins) som kan implementeras direkt
4. **Långsiktiga förbättringar** som kräver djupare analys

Svara på svenska. Var specifik och handlingsorienterad. Referera till konkreta Six Sigma-verktyg och metoder.`;

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
          { role: "user", content: `Analysera följande rotorsaksdata och ge förslag:\n\n${context}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit nådd, försök igen om en stund." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Krediter slut, lägg till mer i Lovable-inställningar." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-analys misslyckades" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-root-cause error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Okänt fel" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
