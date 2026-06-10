import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Dimension { is: string; isNot: string }
type Matrix = Record<string, Dimension>;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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
    const matrix = (body?.matrix ?? {}) as Matrix;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const labels: Record<string, string> = {
      what: "VAD", where: "VAR", when: "NÄR", who: "VEM",
      why: "VARFÖR", how: "HUR", howMuch: "HUR MYCKET",
    };

    let context = "5W2H Is / Is-Not matris:\n\n";
    for (const key of Object.keys(labels)) {
      const dim = matrix[key];
      if (!dim) continue;
      const isV = String(dim.is || "").slice(0, 600).trim();
      const isNotV = String(dim.isNot || "").slice(0, 600).trim();
      if (!isV && !isNotV) continue;
      context += `${labels[key]}\n  ÄR: ${isV || "(ej angivet)"}\n  ÄR INTE: ${isNotV || "(ej angivet)"}\n\n`;
    }
    context = context.slice(0, 8000);

    const systemPrompt = `Du är en erfaren Lean Six Sigma Black Belt-konsult. Du får en 5W2H Is/Is-Not-matris från Define-fasen.

Skriv exakt ett JSON-objekt (inget annat, ingen markdown, inga kodblock) med två fält:
{
  "problemStatement": "En knivskarp, professionell svensk problemformulering på 2-4 meningar baserad endast på ÄR-kolumnerna. Kvantifiera där möjligt. Inkludera inte hypoteser om orsak.",
  "scope": "En tydlig svensk avgränsningsparagraf med två tydliga delar: 'Ingår (In-Scope): ...' och 'Ingår inte (Out-of-Scope): ...' baserat på ÄR vs ÄR INTE."
}

Om matrisen är för tunn för en seriös formulering, returnera samma JSON men med fältet "warning" som förklarar vad som saknas.`;

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
          { role: "user", content: context },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit nådd, försök igen om en stund." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-krediter slut. Lägg till krediter i Lovable Cloud." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-syntes misslyckades" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { problemStatement?: string; scope?: string; warning?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { problemStatement: String(raw).slice(0, 2000), scope: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-5w2h-synth error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Okänt fel" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
