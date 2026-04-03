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

/** Swedish label map for common tool field keys */
const KEY_LABELS: Record<string, string> = {
  // Project Charter
  projectName: "Projektnamn", problemStatement: "Problembeskrivning",
  goal: "Mål", scope: "Avgränsning", team: "Team",
  sponsor: "Sponsor", timeline: "Tidplan", businessCase: "Affärsnytta",
  // Problem Statement
  what: "Vad", when: "När", where: "Var", who: "Vem",
  howMuch: "Hur mycket", impact: "Påverkan", statement: "Problemformulering",
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
  // Generic
  name: "Namn", value: "Värde", notes: "Anteckningar", title: "Titel",
  result: "Resultat", summary: "Sammanfattning", conclusion: "Slutsats",
  mean: "Medelvärde", stdDev: "Standardavvikelse", cp: "Cp", cpk: "Cpk",
  sigma: "Sigma", dpmo: "DPMO", pValue: "P-värde",
  correlation: "Korrelation", rSquared: "R²",
};

/** Get display label for a key */
function labelFor(key: string): string {
  return KEY_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

/** Check if a value is meaningful (non-empty, non-zero for meta fields) */
function isMeaningful(key: string, value: unknown): boolean {
  if (HIDDEN_KEYS.has(key)) return false;
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "number" && value === 0) return false;
  if (typeof value === "string" && !value.trim()) return false;
  return true;
}

/** Format an unknown value for display in the PDF */
function formatValue(value: unknown, maxLen = 60): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toFixed(4);
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "object" && value[0] !== null) {
      return value
        .map((item) =>
          Object.entries(item as Record<string, unknown>)
            .filter(([k, v]) => isMeaningful(k, v))
            .map(([k, v]) => `${labelFor(k)}: ${String(v).slice(0, 30)}`)
            .join(" | ")
        )
        .filter(Boolean)
        .join("; ");
    }
    return value.filter(Boolean).map((v) => String(v).slice(0, 40)).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => isMeaningful(k, v))
      .map(([k, v]) => `${labelFor(k)}: ${formatValue(v, 30)}`)
      .join(", ");
  }
  const s = String(value);
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

/** Render key-value entries from inputs/results into the PDF */
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
  doc.setTextColor(60);
  entries.forEach(([key, value]) => {
    const displayValue = formatValue(value);
    if (!displayValue) return;
    const line = `${labelFor(key)}: ${displayValue}`;
    const lines = doc.splitTextToSize(line, contentWidth - 20);
    lines.forEach((l: string) => {
      checkPageBreak(5);
      doc.setFontSize(9);
      doc.text(l, marginLeft + 14, yPos);
      yPos += 4.5;
    });
  });
  return yPos;
}

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

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(project.name, marginLeft, yPos);
  yPos += 10;

  // Description
  if (project.description) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(project.description, contentWidth);
    doc.text(descLines, marginLeft, yPos);
    yPos += descLines.length * 5 + 5;
  }

  // Status and date
  doc.setFontSize(10);
  doc.setTextColor(120);
  const statusText = project.status === "active" ? "Aktiv" : project.status === "completed" ? "Klar" : "Arkiverad";
  doc.text(`Status: ${statusText} | Exporterad: ${new Date().toLocaleDateString("sv-SE")}`, marginLeft, yPos);
  yPos += 8;

  // Sigma summary
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

  // Divider
  doc.setDrawColor(200);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 10;

  // Loop through each phase
  phases.forEach((phase) => {
    const phaseNotes = notes.filter((n) => n.phase === phase.id);
    const phaseCalcs = calculations.filter((c) => c.phase === phase.id);
    const phaseTollgate = tollgateItems.filter((t) => t.phase === phase.id);

    if (phaseNotes.length === 0 && phaseCalcs.length === 0 && phaseTollgate.length === 0) return;

    checkPageBreak(30);

    // Phase header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`${phase.icon} ${phase.name}: ${phase.title}`, marginLeft, yPos);
    yPos += 8;

    // Tollgate progress
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

    // Notes section
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

    // Calculations section (with both inputs and results)
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

        // Inputs
        yPos = renderEntries(doc, calc.inputs, "Indata:", marginLeft, contentWidth, yPos, checkPageBreak, [60, 90, 130]);

        // Results
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
