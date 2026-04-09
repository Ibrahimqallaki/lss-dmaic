import jsPDF from "jspdf";
import { phases } from "@/data/dmaic-tools";

interface ProjectNote {
  id: string;
  phase: number;
  title: string;
  content: string | null;
  created_at: string;
}

interface ProjectCalculation {
  id: string;
  phase: number;
  tool_id: string;
  tool_name: string;
  inputs: unknown;
  results: unknown;
  notes: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  current_phase: number;
  status: string;
}

interface TollgateItem {
  phase: number;
  title: string;
  is_completed: boolean;
}

interface SigmaEntry {
  phase: number;
  sigma_level: number;
  dpmo: number | null;
  measurement_date: string;
}

/** Internal/meta keys that should never appear in reports */
const HIDDEN_KEYS = new Set([
  "completedSections", "totalSections", "completedFields", "totalFields",
  "filledCount", "totalCount", "isComplete", "lastSaved", "version",
]);

/**
 * A3 semantic sections – each DMAIC phase is divided into meaningful blocks
 * that group related tools under a descriptive heading.
 */
interface A3Section {
  heading: string;
  toolIds: string[];
  focusFields?: string[];
}

const A3_PHASE_SECTIONS: Record<number, A3Section[]> = {
  1: [
    { heading: "Problembeskrivning & Mål", toolIds: ["problem-statement", "project-charter"], focusFields: ["problemStatement", "what", "where", "when", "extent", "impact", "statement", "goal", "businessCase", "scope", "timeline", "sponsor", "team"] },
    { heading: "Kundbehov & Krav", toolIds: ["voc", "ctq", "kano"], focusFields: ["customerSegment", "needs", "requirements", "need", "driver", "ctq", "measure", "target", "feature", "category", "voices", "entries"] },
    { heading: "Processöversikt", toolIds: ["sipoc", "process-mapping", "stakeholder-analysis"], focusFields: ["suppliers", "inputs", "process", "outputs", "customers", "steps", "stakeholder", "influence", "interest", "strategy", "rows"] },
  ],
  2: [
    { heading: "Datainsamlingsplan", toolIds: ["data-collection-plan"], focusFields: ["dataType", "source", "method", "frequency", "responsible", "sampleSize"] },
    { heading: "Mätsystemanalys (MSA)", toolIds: ["gage-rr"], focusFields: ["repeatability", "reproducibility", "grr", "ndc", "partVariation", "totalVariation"] },
    { heading: "Baseline & Kapabilitet", toolIds: ["dpmo-calculator", "cp-cpk-calculator", "control-limits", "normality-test"], focusFields: ["dpmo", "sigma", "cp", "cpk", "mean", "stdDev", "pValue", "usl", "lsl", "ucl", "lcl", "centerLine"] },
  ],
  3: [
    { heading: "Rotorsaksanalys", toolIds: ["fishbone", "five-whys", "ai-root-cause"], focusFields: ["effect", "categories", "causes", "problem", "why1", "why2", "why3", "why4", "why5", "rootCause", "countermeasure"] },
    { heading: "Statistisk analys", toolIds: ["t-test", "two-sample-t-test", "anova", "chi-square", "correlation", "multi-vari"], focusFields: ["pValue", "tStatistic", "fStatistic", "chiSquare", "correlation", "rSquared", "mean", "stdDev", "conclusion", "significant"] },
    { heading: "Prioritering", toolIds: ["pareto", "doe"], focusFields: ["defects", "counts", "cumulative", "factors", "response", "effects"] },
  ],
  4: [
    { heading: "Lösningsval", toolIds: ["pugh-matrix", "response-surface"], focusFields: ["criteria", "alternatives", "scores", "winner", "baseline", "optimal"] },
    { heading: "Pilotstudie", toolIds: ["pilot-study"], focusFields: ["objective", "duration", "successCriteria", "pilotResults", "risks", "decision"] },
    { heading: "Implementeringsplan", toolIds: ["implementation-plan"], focusFields: ["actions", "owner", "deadline", "status", "priority"] },
  ],
  5: [
    { heading: "Styrplan & Kontrolldiagram", toolIds: ["control-plan", "control-charts", "cusum", "ewma"], focusFields: ["controlMethod", "reactionPlan", "ucl", "lcl", "centerLine", "specification", "frequency", "responsible"] },
    { heading: "Lean & Standardisering", toolIds: ["lean-tools", "fmea"], focusFields: ["severity", "occurrence", "detection", "rpn", "action", "wasteType"] },
  ],
};

/** Swedish label map for common tool field keys */
const KEY_LABELS: Record<string, string> = {
  projectName: "Projektnamn", problemStatement: "Problembeskrivning",
  goal: "Mål", scope: "Avgränsning", team: "Team",
  sponsor: "Sponsor", timeline: "Tidplan", businessCase: "Affärsnytta",
  what: "Vad", when: "När", where: "Var", who: "Vem",
  howMuch: "Hur mycket", impact: "Påverkan", statement: "Problemformulering",
  extent: "Omfattning",
  suppliers: "Leverantörer", inputs: "Input", process: "Process",
  outputs: "Output", customers: "Kunder", rows: "Rader",
  customerSegment: "Kundsegment", needs: "Behov", requirements: "Krav",
  entries: "Poster", voices: "Röster",
  need: "Behov", driver: "Drivare", ctq: "CTQ", measure: "Mått",
  target: "Målvärde", specification: "Specifikation",
  categories: "Kategorier", causes: "Orsaker", effect: "Effekt",
  problem: "Problem", why1: "Varför 1", why2: "Varför 2",
  why3: "Varför 3", why4: "Varför 4", why5: "Varför 5",
  rootCause: "Rotorsak", countermeasure: "Motåtgärd",
  feature: "Funktion", category: "Kategori", features: "Funktioner",
  criteria: "Kriterier", alternatives: "Alternativ", scores: "Poäng",
  winner: "Vinnare", baseline: "Baseline",
  dataType: "Datatyp", source: "Källa", method: "Metod",
  frequency: "Frekvens", responsible: "Ansvarig", sampleSize: "Stickprov",
  steps: "Steg", description: "Beskrivning", type: "Typ",
  factor1: "Faktor 1", factor2: "Faktor 2", factor3: "Faktor 3",
  response: "Respons", observations: "Observationer",
  defects: "Defekter", counts: "Antal", cumulative: "Kumulativ",
  repeatability: "Repeterbarhet", reproducibility: "Reproducerbarhet",
  grr: "GRR", ndc: "NDC", partVariation: "Delvariation", totalVariation: "Total variation",
  usl: "Övre specgräns", lsl: "Nedre specgräns", ucl: "UCL", lcl: "LCL",
  centerLine: "Centerlinje",
  tStatistic: "T-statistik", fStatistic: "F-statistik", chiSquare: "Chi-kvadrat",
  significant: "Signifikant", conclusion: "Slutsats",
  objective: "Mål", duration: "Varaktighet",
  successCriteria: "Framgångskriterier", pilotResults: "Pilotresultat",
  risks: "Risker", decision: "Beslut",
  actions: "Åtgärder", owner: "Ägare", deadline: "Deadline",
  status: "Status", priority: "Prioritet",
  stakeholder: "Intressent", influence: "Inflytande", interest: "Intresse",
  strategy: "Strategi",
  controlMethod: "Kontrollmetod", reactionPlan: "Reaktionsplan",
  severity: "Allvarlighet", occurrence: "Frekvens (FMEA)", detection: "Upptäckbarhet",
  rpn: "RPN", action: "Åtgärd", wasteType: "Slöseri",
  name: "Namn", value: "Värde", notes: "Anteckningar", title: "Titel",
  result: "Resultat", summary: "Sammanfattning",
  mean: "Medelvärde", stdDev: "Standardavvikelse", cp: "Cp", cpk: "Cpk",
  sigma: "Sigma", dpmo: "DPMO", pValue: "P-värde",
  correlation: "Korrelation", rSquared: "R²", optimal: "Optimalt",
  // Additional keys previously missing
  failureMode: "Felläge", chartType: "Diagramtyp", values: "Datavärden",
  cl: "Centerlinje (CL)", clR: "Centerlinje R", lclR: "LCL (R)", uclR: "UCL (R)",
  n: "Antal observationer", cpl: "Cpk (nedre)", cpu: "Cpk (övre)",
  dpu: "Defekter per enhet", yield: "Utbyte (%)",
  units: "Enheter", opportunities: "Möjligheter",
  risk: "Risknivå", failureEffect: "Feleffekt", currentControl: "Nuvarande kontroll",
  recommendedAction: "Rekommenderad åtgärd", processStep: "Processteg",
  characteristic: "Karaktäristik", measurementMethod: "Mätmetod",
  reactionPlanDetail: "Reaktionsplan (detalj)", sampleFrequency: "Provtagningsfrekvens",
  confidenceLevel: "Konfidensnivå", degreesOfFreedom: "Frihetsgrader",
  testType: "Testtyp", hypothesisResult: "Hypotesresultat",
  totalDefects: "Totalt antal defekter", totalOpportunities: "Totalt antal möjligheter",
  data: "Data", groups: "Grupper", effect2: "Effekt",
};

function labelFor(key: string): string {
  return KEY_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function isMeaningful(key: string, value: unknown): boolean {
  if (HIDDEN_KEYS.has(key)) return false;
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  // Don't filter out zero — LCL=0, lclR=0 etc. are meaningful
  if (typeof value === "string" && !value.trim()) return false;
  return true;
}

/** Smart number formatting: integers stay clean, decimals get 2-4 places */
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function formatValue(value: unknown, maxLen = 120): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    // Numeric arrays (e.g. data points): show compact summary
    if (typeof value[0] === "number") {
      if (value.length <= 8) return value.map((v: number) => formatNumber(v)).join(", ");
      const first3 = value.slice(0, 3).map((v: number) => formatNumber(v)).join(", ");
      const last2 = value.slice(-2).map((v: number) => formatNumber(v)).join(", ");
      return `${first3}, … , ${last2} (${value.length} st)`;
    }
    // Object arrays (e.g. FMEA rows, SIPOC rows): render each as a line
    if (typeof value[0] === "object" && value[0] !== null) {
      return value
        .map((item) =>
          Object.entries(item as Record<string, unknown>)
            .filter(([k, v]) => isMeaningful(k, v))
            .map(([k, v]) => `${labelFor(k)}: ${typeof v === "number" ? formatNumber(v) : String(v).slice(0, 50)}`)
            .join(" | ")
        )
        .filter(Boolean)
        .join("\n");
    }
    return value.filter(Boolean).map((v) => String(v).slice(0, 50)).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => isMeaningful(k, v))
      .map(([k, v]) => `${labelFor(k)}: ${formatValue(v, 50)}`)
      .join(", ");
  }
  const s = String(value);
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

/** Check if a key+value should be highlighted as a risk indicator */
function isRiskHighlight(key: string, value: unknown): boolean {
  if (key === "rpn" && typeof value === "number" && value >= 200) return true;
  if (key === "risk" && typeof value === "string" && /kritisk|hög/i.test(value)) return true;
  return false;
}

function renderEntries(
  doc: jsPDF,
  data: unknown,
  label: string,
  marginLeft: number,
  contentWidth: number,
  yPos: number,
  checkPageBreak: (n: number) => void,
  color: [number, number, number] = [80, 80, 80]
): number {
  if (!data || typeof data !== "object") return yPos;
  const entries = Object.entries(data as Record<string, unknown>).filter(
    ([k, v]) => isMeaningful(k, v)
  );
  if (entries.length === 0) return yPos;

  checkPageBreak(10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(label, marginLeft + 10, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  entries.forEach(([key, value]) => {
    const displayValue = formatValue(value);
    if (!displayValue) return;

    // Risk highlighting: red text for high-risk values
    const highlight = isRiskHighlight(key, value);
    if (highlight) {
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(60);
      doc.setFont("helvetica", "normal");
    }

    // Multi-line values (e.g. array items separated by \n)
    const valueLines = displayValue.split("\n");
    if (valueLines.length > 1) {
      // Render label on its own line, then each item indented
      checkPageBreak(5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(`${labelFor(key)}:`, marginLeft + 14, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      valueLines.forEach((vl) => {
        const subLines = doc.splitTextToSize(`  ${vl}`, contentWidth - 24);
        subLines.forEach((sl: string) => {
          checkPageBreak(5);
          doc.setFontSize(8);
          doc.text(sl, marginLeft + 16, yPos);
          yPos += 4;
        });
      });
      yPos += 1;
    } else {
      const line = `${labelFor(key)}: ${displayValue}`;
      const lines = doc.splitTextToSize(line, contentWidth - 20);
      lines.forEach((l: string) => {
        checkPageBreak(5);
        doc.setFontSize(9);
        doc.text(l, marginLeft + 14, yPos);
        yPos += 4.5;
      });
    }

    if (highlight) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
    }
  });
  return yPos;
}

// ─── Standard PDF Export ────────────────────────────────────────────

export function exportProjectToPDF(
  project: Project,
  notes: ProjectNote[],
  calculations: ProjectCalculation[],
  tollgateItems: TollgateItem[] = [],
  sigmaEntries: SigmaEntry[] = []
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let yPos = 20;

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(project.name, marginLeft, yPos);
  yPos += 10;

  if (project.description) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(project.description, contentWidth);
    doc.text(descLines, marginLeft, yPos);
    yPos += descLines.length * 5 + 5;
  }

  doc.setFontSize(10);
  doc.setTextColor(120);
  const statusText = project.status === "active" ? "Aktiv" : project.status === "completed" ? "Klar" : "Arkiverad";
  doc.text(`Status: ${statusText} | Exporterad: ${new Date().toLocaleDateString("sv-SE")}`, marginLeft, yPos);
  yPos += 8;

  if (sigmaEntries.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    const sigmaText = sigmaEntries
      .map((e) => `${phases.find((p) => p.id === e.phase)?.name || `Fas ${e.phase}`}: ${Number(e.sigma_level).toFixed(2)}σ`)
      .join("  →  ");
    doc.text(`Sigma-utveckling: ${sigmaText}`, marginLeft, yPos);
    yPos += 7;
  }

  yPos += 3;
  doc.setDrawColor(200);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 10;

  phases.forEach((phase) => {
    const phaseNotes = notes.filter((n) => n.phase === phase.id);
    const phaseCalcs = calculations.filter((c) => c.phase === phase.id);
    const phaseTollgate = tollgateItems.filter((t) => t.phase === phase.id);

    if (phaseNotes.length === 0 && phaseCalcs.length === 0 && phaseTollgate.length === 0) return;

    checkPageBreak(30);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`${phase.icon} ${phase.name}: ${phase.title}`, marginLeft, yPos);
    yPos += 8;

    if (phaseTollgate.length > 0) {
      const completed = phaseTollgate.filter((t) => t.is_completed).length;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Tollgate: ${completed}/${phaseTollgate.length} klara`, marginLeft + 5, yPos);
      yPos += 5;
      phaseTollgate.forEach((item) => {
        checkPageBreak(5);
        doc.setFontSize(8);
        doc.setTextColor(item.is_completed ? 34 : 150, item.is_completed ? 150 : 150, item.is_completed ? 34 : 150);
        doc.text(`${item.is_completed ? "✓" : "○"} ${item.title}`, marginLeft + 10, yPos);
        yPos += 4;
      });
      yPos += 3;
    }

    if (phaseNotes.length > 0) {
      checkPageBreak(15);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Anteckningar", marginLeft, yPos);
      yPos += 7;

      phaseNotes.forEach((note) => {
        checkPageBreak(25);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40);
        doc.text(`• ${note.title}`, marginLeft + 5, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(new Date(note.created_at).toLocaleDateString("sv-SE"), marginLeft + 10, yPos);
        yPos += 5;

        if (note.content) {
          doc.setFontSize(10);
          doc.setTextColor(60);
          const contentLines = doc.splitTextToSize(note.content, contentWidth - 15);
          contentLines.forEach((line: string) => {
            checkPageBreak(6);
            doc.text(line, marginLeft + 10, yPos);
            yPos += 5;
          });
        }
        yPos += 3;
      });
    }

    if (phaseCalcs.length > 0) {
      checkPageBreak(15);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Verktygsresultat", marginLeft, yPos);
      yPos += 7;

      phaseCalcs.forEach((calc) => {
        checkPageBreak(30);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40);
        doc.text(`• ${calc.tool_name}`, marginLeft + 5, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(new Date(calc.created_at).toLocaleDateString("sv-SE"), marginLeft + 10, yPos);
        yPos += 6;

        yPos = renderEntries(doc, calc.inputs, "Indata:", marginLeft, contentWidth, yPos, checkPageBreak, [60, 90, 130]);
        yPos = renderEntries(doc, calc.results, "Resultat:", marginLeft, contentWidth, yPos, checkPageBreak, [40, 40, 40]);

        if (calc.notes) {
          checkPageBreak(10);
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.setFont("helvetica", "italic");
          const noteLines = doc.splitTextToSize(`Anteckning: ${calc.notes}`, contentWidth - 15);
          noteLines.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, marginLeft + 10, yPos);
            yPos += 5;
          });
          doc.setFont("helvetica", "normal");
        }
        yPos += 5;
      });
    }

    yPos += 8;
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Sida ${i} av ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  const fileName = `${project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, "").replace(/\s+/g, "_")}_rapport.pdf`;
  doc.save(fileName);
}

// ─── A3 Report Export ───────────────────────────────────────────────

/** Collect all meaningful fields from inputs+results, optionally filtered by focusFields */
function collectFields(
  calcs: ProjectCalculation[],
  focusFields?: string[]
): Array<{ label: string; value: string }> {
  const result: Array<{ label: string; value: string }> = [];
  const seen = new Set<string>();

  for (const calc of calcs) {
    const allData: Record<string, unknown> = {
      ...(calc.inputs && typeof calc.inputs === "object" ? (calc.inputs as Record<string, unknown>) : {}),
      ...(calc.results && typeof calc.results === "object" ? (calc.results as Record<string, unknown>) : {}),
    };

    const entries = Object.entries(allData).filter(([k, v]) => isMeaningful(k, v));

    for (const [key, value] of entries) {
      if (focusFields && focusFields.length > 0 && !focusFields.includes(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      const display = formatValue(value, 40);
      if (display) {
        result.push({ label: labelFor(key), value: display });
      }
    }
  }

  return result;
}

export function exportA3Report(
  project: Project,
  notes: ProjectNote[],
  calculations: ProjectCalculation[],
  tollgateItems: TollgateItem[] = [],
  sigmaEntries: SigmaEntry[] = []
) {
  const doc = new jsPDF({ orientation: "landscape", format: "a3" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const colWidth = (pageWidth - margin * 2 - 40) / 5;

  // Title bar
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text(`A3 RAPPORT: ${project.name}`, margin, 17);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Exporterad: ${new Date().toLocaleDateString("sv-SE")} | Status: ${project.status === "active" ? "Aktiv" : "Klar"}`, pageWidth - margin, 17, { align: "right" });

  if (project.description) {
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(doc.splitTextToSize(project.description, pageWidth - margin * 2), margin, 33);
  }

  const topY = 42;
  const colors: [number, number, number][] = [
    [59, 130, 246], [34, 197, 94], [234, 179, 8], [168, 85, 247], [239, 68, 68],
  ];

  phases.forEach((phase, index) => {
    const x = margin + index * (colWidth + 10);
    let y = topY;
    const [r, g, b] = colors[index];

    // Phase header
    doc.setFillColor(r, g, b);
    doc.roundedRect(x, y, colWidth, 14, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255);
    doc.text(`${phase.icon} ${phase.name}`, x + 4, y + 10);
    y += 18;

    // Tollgate progress
    const phaseTollgate = tollgateItems.filter((t) => t.phase === phase.id);
    if (phaseTollgate.length > 0) {
      const completed = phaseTollgate.filter((t) => t.is_completed).length;
      const pct = Math.round((completed / phaseTollgate.length) * 100);
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`Tollgate: ${completed}/${phaseTollgate.length} (${pct}%)`, x + 2, y);
      doc.setFillColor(230, 230, 230);
      doc.rect(x + 2, y + 1, colWidth - 4, 2, "F");
      doc.setFillColor(r, g, b);
      doc.rect(x + 2, y + 1, (colWidth - 4) * (pct / 100), 2, "F");
      y += 7;
    }

    // Semantic sections for this phase
    const sections = A3_PHASE_SECTIONS[phase.id] || [];
    const phaseCalcs = calculations.filter((c) => c.phase === phase.id);
    const assignedToolIds = new Set(sections.flatMap((s) => s.toolIds));

    for (const section of sections) {
      const sectionCalcs = phaseCalcs.filter((c) => section.toolIds.includes(c.tool_id));
      if (sectionCalcs.length === 0) continue;
      if (y > pageHeight - 30) break;

      // Section heading with subtle background (light tint of phase color)
      const tintR = Math.round(255 - (255 - r) * 0.12);
      const tintG = Math.round(255 - (255 - g) * 0.12);
      const tintB = Math.round(255 - (255 - b) * 0.12);
      doc.setFillColor(tintR, tintG, tintB);
      doc.roundedRect(x + 1, y - 1, colWidth - 2, 5, 1, 1, "F");

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(r, g, b);
      doc.text(section.heading, x + 3, y + 3);
      y += 7;

      // Collect and render fields
      const fields = collectFields(sectionCalcs, section.focusFields);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(50);

      for (const field of fields) {
        if (y > pageHeight - 30) break;
        const text = `${field.label}: ${field.value}`;
        const lines = doc.splitTextToSize(text, colWidth - 8);
        const maxLines = Math.min(lines.length, 3);
        doc.text(lines.slice(0, maxLines), x + 3, y);
        y += maxLines * 3;
      }

      y += 2;
    }

    // Remaining tools not in any section
    const unassignedCalcs = phaseCalcs.filter((c) => !assignedToolIds.has(c.tool_id));
    if (unassignedCalcs.length > 0 && y < pageHeight - 30) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40);
      doc.text("Övrigt:", x + 2, y);
      y += 4;

      for (const calc of unassignedCalcs) {
        if (y > pageHeight - 30) break;
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(r, g, b);
        doc.text(calc.tool_name, x + 3, y);
        y += 3.5;

        const fields = collectFields([calc]);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        for (const field of fields.slice(0, 4)) {
          if (y > pageHeight - 30) break;
          const lines = doc.splitTextToSize(`${field.label}: ${field.value}`, colWidth - 10);
          doc.text(lines.slice(0, 2), x + 5, y);
          y += lines.slice(0, 2).length * 3;
        }
        y += 2;
      }
    }

    // Phase notes
    const phaseNotes = notes.filter((n) => n.phase === phase.id);
    if (phaseNotes.length > 0 && y < pageHeight - 30) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40);
      doc.text("Anteckningar:", x + 2, y);
      y += 4;

      phaseNotes.forEach((note) => {
        if (y > pageHeight - 30) return;
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60);
        const titleLines = doc.splitTextToSize(`• ${note.title}`, colWidth - 6);
        doc.text(titleLines, x + 3, y);
        y += titleLines.length * 3.5;

        if (note.content) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          const contentLines = doc.splitTextToSize(note.content, colWidth - 8);
          const maxLines = Math.min(contentLines.length, 3);
          doc.text(contentLines.slice(0, maxLines), x + 5, y);
          y += maxLines * 3.5;
        }
        y += 2;
      });
    }

    // Column border
    doc.setDrawColor(220);
    doc.setLineWidth(0.3);
    doc.line(x, topY, x, pageHeight - 25);
    doc.line(x + colWidth, topY, x + colWidth, pageHeight - 25);
  });

  // Sigma tracking at bottom
  if (sigmaEntries.length > 0) {
    const bottomY = pageHeight - 22;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("Sigma-utveckling: ", margin, bottomY);

    doc.setFont("helvetica", "normal");
    const sigmaText = sigmaEntries
      .map((e) => `${phases.find((p) => p.id === e.phase)?.name || `Fas ${e.phase}`}: ${Number(e.sigma_level).toFixed(2)}σ`)
      .join("  →  ");
    doc.text(sigmaText, margin + 30, bottomY);

    const first = Number(sigmaEntries[0].sigma_level);
    const last = Number(sigmaEntries[sigmaEntries.length - 1].sigma_level);
    const improvement = last - first;
    if (improvement !== 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(improvement > 0 ? 34 : 239, improvement > 0 ? 197 : 68, improvement > 0 ? 94 : 68);
      doc.text(`(${improvement > 0 ? "+" : ""}${improvement.toFixed(2)}σ)`, margin + 30 + doc.getTextWidth(sigmaText) + 5, bottomY);
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("Six Sigma DMAIC A3 Report", pageWidth / 2, pageHeight - 8, { align: "center" });

  const fileName = `${project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, "").replace(/\s+/g, "_")}_A3.pdf`;
  doc.save(fileName);
}
