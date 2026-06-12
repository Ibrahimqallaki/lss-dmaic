import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHASE_NAMES: Record<number, string> = {
  1: "Define", 2: "Measure", 3: "Analyze", 4: "Improve", 5: "Control",
};

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
    const projectId = typeof body.projectId === "string" ? body.projectId : null;
    const phase = typeof body.phase === "number" ? body.phase : null;
    if (!projectId || !phase) {
      return new Response(JSON.stringify({ error: "projectId och phase krävs" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const [{ data: project }, { data: notes }, { data: calcs }, { data: sigma }, { data: tollgate }] = await Promise.all([
      supabase.from("projects").select("name,description,current_phase,status,estimated_savings").eq("id", projectId).maybeSingle(),
      supabase.from("project_notes").select("phase,title,content").eq("project_id", projectId).eq("phase", phase).limit(30),
      supabase.from("project_calculations").select("tool_id,tool_name,results,notes").eq("project_id", projectId).eq("phase", phase).limit(40),
      supabase.from("sigma_tracking").select("sigma_level,dpmo,measurement_date").eq("project_id", projectId).order("measurement_date", { ascending: false }).limit(5),
      supabase.from("tollgate_items").select("id,title,is_completed").eq("project_id", projectId).eq("phase", phase).order("sort_order"),
    ]);

    if (!project) {
      return new Response(JSON.stringify({ error: "Projekt hittades inte" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let ctx = `# Projekt: ${project.name}\nFas under granskning: ${PHASE_NAMES[phase]}\n`;
    if (project.description) ctx += `Beskrivning: ${String(project.description).slice(0, 400)}\n`;

    if (sigma?.length) {
      ctx += `\n## Sigma\n` + sigma.map((s: any) => `σ=${s.sigma_level}, DPMO=${s.dpmo ?? "-"}`).join("; ") + "\n";
    }
    if (calcs?.length) {
      ctx += `\n## Beräkningar/Verktyg (${calcs.length})\n`;
      calcs.forEach((c: any) => {
        const r = c.results && typeof c.results === "object"
          ? Object.entries(c.results).slice(0, 6).map(([k, v]) => `${k}=${typeof v === "number" ? (v as number).toFixed(2) : String(v).slice(0, 30)}`).join(", ")
          : "";
        ctx += `- ${c.tool_name} (${c.tool_id}): ${r}\n`;
      });
    }
    if (notes?.length) {
      ctx += `\n## Anteckningar\n`;
      notes.forEach((n: any) => {
        ctx += `- ${n.title}: ${String(n.content || "").slice(0, 200)}\n`;
      });
    }
    ctx += `\n## Tollgate-checklista\n`;
    (tollgate || []).forEach((t: any) => {
      ctx += `- [${t.is_completed ? "X" : " "}] (id=${t.id}) ${t.title}\n`;
    });

    ctx = ctx.slice(0, 16000);

    const systemPrompt = `Du är en strikt men rättvis Lean Six Sigma Master Black Belt som genomför en formell Tollgate-review (fasgrindsgranskning) för ${PHASE_NAMES[phase]}-fasen.

Du MÅSTE svara med ENBART giltig JSON enligt schemat (ingen markdown, inga \`\`\`-block):
{
  "verdict": "approved" | "conditional" | "rejected",
  "score": 0-100,
  "summary": "1-2 meningar sammanfattning",
  "criteria": [
    { "id": "<tollgate-item-id>", "title": "<titel>", "status": "pass" | "partial" | "fail", "evidence": "kort motivering baserad på faktisk data" }
  ],
  "missing_artifacts": ["lista över saknade artefakter/data"],
  "recommendations": ["konkreta nästa steg, referera specifika verktyg"],
  "risks": ["risker om vi går vidare nu"]
}

Regler:
- "pass" KRÄVER objektiv evidens i datan (ex: Cpk-värde, slutförd beräkning, dokumenterad anteckning). Annars "partial" eller "fail".
- Score >= 85 = approved; 60-84 = conditional; <60 = rejected.
- criteria.id MÅSTE matcha id från checklistan exakt.
- Svara på svenska.`;

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
          { role: "user", content: ctx },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit – försök igen om en stund." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI-krediter slut." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Tollgate-review misslyckades" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { error: "Kunde inte parsa AI-svar" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-tollgate-review error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Okänt fel" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
