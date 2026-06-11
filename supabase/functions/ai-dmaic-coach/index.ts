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
    const userQuestion = typeof body.question === "string" ? body.question.slice(0, 2000) : "";
    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId krävs" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch project context (RLS scoped by user token)
    const [{ data: project }, { data: notes }, { data: calcs }, { data: sigma }, { data: tollgate }] = await Promise.all([
      supabase.from("projects").select("name,description,current_phase,status,estimated_savings,actual_savings").eq("id", projectId).maybeSingle(),
      supabase.from("project_notes").select("phase,title,content,created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(30),
      supabase.from("project_calculations").select("phase,tool_id,tool_name,results,notes,created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(40),
      supabase.from("sigma_tracking").select("phase,sigma_level,dpmo,measurement_date").eq("project_id", projectId).order("measurement_date", { ascending: false }).limit(10),
      supabase.from("tollgate_items").select("phase,title,is_completed").eq("project_id", projectId).limit(50),
    ]);

    if (!project) {
      return new Response(JSON.stringify({ error: "Projekt hittades inte eller saknar behörighet" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build compact context
    let ctx = `# Projekt: ${project.name}\n`;
    if (project.description) ctx += `Beskrivning: ${String(project.description).slice(0, 500)}\n`;
    ctx += `Nuvarande fas: ${PHASE_NAMES[project.current_phase] ?? project.current_phase}\n`;
    ctx += `Status: ${project.status}\n`;
    if (project.estimated_savings) ctx += `Uppskattad besparing: ${project.estimated_savings} kr\n`;
    if (project.actual_savings) ctx += `Faktisk besparing: ${project.actual_savings} kr\n`;

    if (sigma?.length) {
      ctx += `\n## Sigma-nivåer (senaste)\n`;
      sigma.forEach((s: any) => {
        ctx += `- Fas ${PHASE_NAMES[s.phase] ?? s.phase}: σ=${s.sigma_level}${s.dpmo ? `, DPMO=${s.dpmo}` : ""} (${s.measurement_date})\n`;
      });
    }

    if (tollgate?.length) {
      const byPhase: Record<number, { done: number; total: number }> = {};
      tollgate.forEach((t: any) => {
        byPhase[t.phase] = byPhase[t.phase] || { done: 0, total: 0 };
        byPhase[t.phase].total++;
        if (t.is_completed) byPhase[t.phase].done++;
      });
      ctx += `\n## Tollgate-progress\n`;
      Object.entries(byPhase).forEach(([p, v]) => {
        ctx += `- ${PHASE_NAMES[+p] ?? p}: ${v.done}/${v.total}\n`;
      });
    }

    if (calcs?.length) {
      ctx += `\n## Beräkningar (${calcs.length} st)\n`;
      calcs.slice(0, 15).forEach((c: any) => {
        const r = c.results && typeof c.results === "object"
          ? Object.entries(c.results).slice(0, 5).map(([k, v]) => `${k}=${typeof v === "number" ? (v as number).toFixed(2) : String(v).slice(0, 30)}`).join(", ")
          : "";
        ctx += `- [${PHASE_NAMES[c.phase] ?? c.phase}] ${c.tool_name}: ${r}\n`;
      });
    }

    if (notes?.length) {
      ctx += `\n## Anteckningar (senaste)\n`;
      notes.slice(0, 12).forEach((n: any) => {
        ctx += `- [${PHASE_NAMES[n.phase] ?? n.phase}] ${n.title}: ${String(n.content || "").slice(0, 200)}\n`;
      });
    }

    ctx = ctx.slice(0, 18000);

    const systemPrompt = `Du är en erfaren Lean Six Sigma Master Black Belt-coach som hjälper en Black Belt-projektledare. Du har full insyn i deras projekts data.

Ditt jobb:
1. **Diagnostisera nuläget** baserat på faktisk data (Sigma-nivå, beräkningar, tollgate-progress, anteckningar)
2. **Identifiera luckor** – vad saknas för att kunna gå vidare till nästa fas?
3. **Föreslå konkreta nästa steg** – referera till specifika DMAIC-verktyg som finns i appen (Cp/Cpk, Gage R&R, Pareto, Fiskben, 5 Varför, FMEA, DOE, SPC etc.)
4. **Varna för risker** – om data visar svaga punkter (låg Cpk, otestat mätsystem, ofullständig charter)

Format ditt svar med tydliga rubriker (## Diagnos, ## Luckor, ## Rekommenderade nästa steg, ## Risker). Använd punktlistor. Var konkret med siffror och verktygsnamn. Max 600 ord. Svara på svenska.`;

    const userPrompt = userQuestion
      ? `Projektdata:\n\n${ctx}\n\n---\n\nAnvändarens fråga: ${userQuestion}`
      : `Analysera projektet och ge en coachande genomgång:\n\n${ctx}`;

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
          { role: "user", content: userPrompt },
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
        return new Response(JSON.stringify({ error: "AI-krediter slut – lägg till krediter i Lovable-inställningar." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI-coach misslyckades" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-dmaic-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Okänt fel" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
