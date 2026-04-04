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
  /** Which fields to highlight from inputs/results (if empty, show all meaningful) */
  focusFields?: string[];
}

const A3_PHASE_SECTIONS: Record<number, A3Section[]> = {
  // Define
  1: [
    { heading: "Problembeskrivning & Mål", toolIds: ["problem-statement", "project-charter"], focusFields: ["problemStatement", "what", "where", "when", "extent", "impact", "statement", "goal", "businessCase", "scope", "timeline"] },
    { heading: "Kundbehov & Krav", toolIds: ["voc", "ctq", "kano"], focusFields: ["customerSegment", "needs", "requirements", "need", "driver", "ctq", "measure", "target", "feature", "category"] },
    { heading: "Processöversikt", toolIds: ["sipoc", "process-mapping", "stakeholder-analysis"], focusFields: ["suppliers", "inputs", "process", "outputs", "customers", "steps", "stakeholder", "influence", "interest", "strategy"] },
  ],
  // Measure
  2: [
    { heading: "Datainsamlingsplan", toolIds: ["data-collection-plan"], focusFields: ["dataType", "source", "method", "frequency", "responsible", "sampleSize"] },
    { heading: "Mätsystemanalys (MSA)", toolIds: ["gage-rr"], focusFields: ["repeatability", "reproducibility", "grr", "ndc", "partVariation", "totalVariation"] },
    { heading: "Baseline & Kapabilitet", toolIds: ["dpmo-calculator", "cp-cpk-calculator", "control-limits", "normality-test"], focusFields: ["dpmo", "sigma", "cp", "cpk", "mean", "stdDev", "pValue", "usl", "lsl", "ucl", "lcl", "centerLine"] },
  ],
  // Analyze
  3: [
    { heading: "Rotorsaksanalys", toolIds: ["fishbone", "five-whys", "ai-root-cause"], focusFields: ["effect", "categories", "causes", "problem", "why1", "why2", "why3", "why4", "why5", "rootCause", "countermeasure"] },
    { heading: "Statistisk analys", toolIds: ["t-test", "two-sample-t-test", "anova", "chi-square", "correlation", "multi-vari"], focusFields: ["pValue", "tStatistic", "fStatistic", "chiSquare", "correlation", "rSquared", "mean", "stdDev", "conclusion", "significant"] },
    { heading: "Prioritering", toolIds: ["pareto", "doe"], focusFields: ["defects", "counts", "cumulative", "factors", "response", "effects"] },
  ],
  // Improve
  4: [
    { heading: "Lösningsval", toolIds: ["pugh-matrix", "response-surface"], focusFields: ["criteria", "alternatives", "scores", "winner", "baseline", "optimal"] },
    { heading: "Pilotstudie", toolIds: ["pilot-study"], focusFields: ["objective", "duration", "successCriteria", "pilotResults", "risks", "decision"] },
    { heading: "Implementeringsplan", toolIds: ["implementation-plan"], focusFields: ["actions", "owner", "deadline", "status", "priority"] },
  ],
  // Control
  5: [
    { heading: "Styrplan & Kontrolldiagram", toolIds: ["control-plan", "control-charts", "cusum", "ewma"], focusFields: ["controlMethod", "reactionPlan", "ucl", "lcl", "centerLine", "specification", "frequency", "responsible"] },
    { heading: "Lean & Standardisering", toolIds: ["lean-tools", "fmea"], focusFields: ["severity", "occurrence", "detection", "rpn", "action", "wasteType"] },
  ],
};

/** Swedish label map for common tool field keys */
const KEY_LABELS: Record<string, string> = {
  // Project Charter
  projectName: "Projektnamn", problemStatement: "Problembeskrivning",
  goal: "Mål", scope: "Avgränsning", team: "Team",
  sponsor: "Sponsor", timeline: "Tidplan", businessCase: "Affärsnytta",
  // Problem Statement
  what: "Vad", when: "När", where: "Var", who: "Vem",
  howMuch: "Hur mycket", impact: "Påverkan", statement: "Problemformulering",
  extent: "Omfattning",
  // SIPOC
  suppliers: "Leverantörer", inputs: "Input", process: "Process",
  outputs: "Output", customers: "Kunder", rows: "Rader",
  // VOC
  customerSegment: "Kundsegment", needs: "Behov", requirements: "Krav",
  entries: "Poster", voices: "Röster",
  // CTQ
  need: "Behov", driver: "Drivare", ctq: "CTQ", measure: "Mått",
  target: "Målvärde", specification: "Specifikation",
  // Fishbone
  categories: "Kategorier", causes: "Orsaker", effect: "Effekt",
  // Five Whys
  problem: "Problem", why1: "Varför 1", why2: "Varför 2",
  why3: "Varför 3", why4: "Varför 4", why5: "Varför 5",
  rootCause: "Rotorsak", countermeasure: "Motåtgärd",
  // Kano
  feature: "Funktion", category: "Kategori", features: "Funktioner",
  // Pugh
  criteria: "Kriterier", alternatives: "Alternativ", scores: "Poäng",
  winner: "Vinnare", baseline: "Baseline",
  // Data Collection Plan
  dataType: "Datatyp", source: "Källa", method: "Metod",
  frequency: "Frekvens", responsible: "Ansvarig", sampleSize: "Stickprov",
  // Process Mapping
  steps: "Steg", description: "Beskrivning", type: "Typ",
  // Multi-Vari
  factor1: "Faktor 1", factor2: "Faktor 2", factor3: "Faktor 3",
  response: "Respons", observations: "Observationer",
  // Pareto
  defects: "Defekter", counts: "Antal", cumulative: "Kumulativ",
  // MSA / Gage R&R
  repeatability: "Repeterbarhet", reproducibility: "Reproducerbarhet",
  grr: "GRR", ndc: "NDC", partVariation: "Delvariation", totalVariation: "Total variation",
  // Capability
  usl: "Övre specgräns", lsl: "Nedre specgräns", ucl: "UCL", lcl: "LCL",
  centerLine: "Centerlinje",
  // Statistics
  tStatistic: "T-statistik", fStatistic: "F-statistik", chiSquare: "Chi-kvadrat",
  significant: "Signifikant", conclusion: "Slutsats",
  // Pilot Study
  objective: "Mål", duration: "Varaktighet",
  successCriteria: "Framgångskriterier", pilotResults: "Pilotresultat",
  risks: "Risker", decision: "Beslut",
  // Implementation Plan
  actions: "Åtgärder", owner: "Ägare", deadline: "Deadline",
  status: "Status", priority: "Prioritet",
  // Stakeholder
  stakeholder: "Intressent", influence: "Inflytande", interest: "Intresse",
  strategy: "Strategi",
  // Control
  controlMethod: "Kontrollmetod", reactionPlan: "Reaktionsplan",
  // FMEA
  severity: "Allvarlighet", occurrence: "Frekvens", detection: "Upptäckbarhet",
  rpn: "RPN", action: "Åtgärd",
  // Lean
  wasteType: "Slöseri",
  // Generic
  name: "Namn", value: "Värde", notes: "Anteckningar", title: "Titel",
  result: "Resultat", summary: "Sammanfattning",
  mean: "Medelvärde", stdDev: "Standardavvikelse", cp: "Cp", cpk: "Cpk",
  sigma: "Sigma", dpmo: "DPMO", pValue: "P-värde",
  correlation: "Korrelation", rSquared: "R²", optimal: "Optimalt",
};
  // Footer on last page
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

/**
 * Export A3 report - landscape format with DMAIC storyboard layout
 */
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

  // Description
  if (project.description) {
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(doc.splitTextToSize(project.description, pageWidth - margin * 2), margin, 33);
  }

  const topY = 42;

  // Draw 5 DMAIC columns
  phases.forEach((phase, index) => {
    const x = margin + index * (colWidth + 10);
    let y = topY;

    const colors: [number, number, number][] = [
      [59, 130, 246],
      [34, 197, 94],
      [234, 179, 8],
      [168, 85, 247],
      [239, 68, 68],
    ];
    const [r, g, b] = colors[index];

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

    // Phase notes
    const phaseNotes = notes.filter((n) => n.phase === phase.id);
    if (phaseNotes.length > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40);
      doc.text("Anteckningar:", x + 2, y);
      y += 4;

      phaseNotes.forEach((note) => {
        if (y > pageHeight - 30) return;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60);
        const titleLines = doc.splitTextToSize(`• ${note.title}`, colWidth - 6);
        doc.text(titleLines, x + 3, y);
        y += titleLines.length * 3.5;

        if (note.content) {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          const contentLines = doc.splitTextToSize(note.content, colWidth - 8);
          const maxLines = Math.min(contentLines.length, 4);
          doc.text(contentLines.slice(0, maxLines), x + 5, y);
          y += maxLines * 3.5;
        }
        y += 2;
      });
    }

    // Phase calculations — show both inputs and results
    const phaseCalcs = calculations.filter((c) => c.phase === phase.id);
    if (phaseCalcs.length > 0) {
      y += 2;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40);
      doc.text("Verktygsdata:", x + 2, y);
      y += 4;

      phaseCalcs.forEach((calc) => {
        if (y > pageHeight - 30) return;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(r, g, b);
        doc.text(calc.tool_name, x + 3, y);
        y += 3.5;

        // Inputs
        if (calc.inputs && typeof calc.inputs === "object") {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60);
          const inputEntries = Object.entries(calc.inputs as Record<string, unknown>)
            .filter(([k, v]) => isMeaningful(k, v))
            .slice(0, 5);
          inputEntries.forEach(([key, value]) => {
            if (y > pageHeight - 30) return;
            const display = formatValue(value, 25);
            if (!display) return;
            const lines = doc.splitTextToSize(`${labelFor(key)}: ${display}`, colWidth - 10);
            doc.text(lines.slice(0, 2), x + 5, y);
            y += lines.slice(0, 2).length * 3;
          });
        }

        // Results
        if (calc.results && typeof calc.results === "object") {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(40);
          const entries = Object.entries(calc.results as Record<string, unknown>)
            .filter(([k, v]) => isMeaningful(k, v))
            .slice(0, 4);
          entries.forEach(([key, value]) => {
            if (y > pageHeight - 30) return;
            const display = typeof value === "number" ? value.toFixed(3) : String(value).slice(0, 25);
            doc.text(`${labelFor(key)}: ${display}`, x + 5, y);
            y += 3;
          });
          doc.setFont("helvetica", "normal");
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

  // Sigma tracking section at bottom
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

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("Six Sigma DMAIC A3 Report", pageWidth / 2, pageHeight - 8, { align: "center" });

  const fileName = `${project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, "").replace(/\s+/g, "_")}_A3.pdf`;
  doc.save(fileName);
}
