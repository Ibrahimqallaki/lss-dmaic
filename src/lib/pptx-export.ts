import pptxgen from "pptxgenjs";
import { phases } from "@/data/dmaic-tools";

interface Project {
  id: string;
  name: string;
  description: string | null;
  current_phase: number;
  status: string;
  estimated_savings?: number | null;
  actual_savings?: number | null;
}

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

const HIDDEN_KEYS = new Set([
  "completedSections", "totalSections", "completedFields", "totalFields",
  "filledCount", "totalCount", "isComplete", "lastSaved", "version",
]);

const PHASE_COLORS: Record<number, string> = {
  1: "1E40AF", 2: "047857", 3: "B45309", 4: "7C3AED", 5: "DC2626",
};

function isMeaningful(key: string, value: unknown): boolean {
  if (HIDDEN_KEYS.has(key)) return false;
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "number" && value === 0) return false;
  return true;
}

function formatVal(value: unknown, max = 80): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toFixed(2);
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "object") {
      return value.slice(0, 5).map(item =>
        Object.entries(item as Record<string, unknown>)
          .filter(([k, v]) => isMeaningful(k, v))
          .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
          .join(", ")
      ).join("; ");
    }
    return value.slice(0, 10).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k, v]) => isMeaningful(k, v))
      .map(([k, v]) => `${k}: ${formatVal(v, 30)}`)
      .join(", ");
  }
  const s = String(value);
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function exportProjectToPPTX(
  project: Project,
  notes: ProjectNote[],
  calculations: ProjectCalculation[],
  tollgateItems: TollgateItem[] = [],
  sigmaEntries: SigmaEntry[] = []
) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Six Sigma Platform";
  pptx.title = `${project.name} – Styrgruppspresentation`;

  // --- Title Slide ---
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "1E293B" };
  titleSlide.addText(project.name, {
    x: 0.8, y: 1.5, w: 11.5, h: 1.5,
    fontSize: 40, fontFace: "Arial", color: "FFFFFF", bold: true,
  });
  titleSlide.addText("Styrgruppspresentation", {
    x: 0.8, y: 3.0, w: 11.5, h: 0.6,
    fontSize: 20, fontFace: "Arial", color: "94A3B8",
  });
  if (project.description) {
    titleSlide.addText(project.description, {
      x: 0.8, y: 3.8, w: 11.5, h: 0.8,
      fontSize: 14, fontFace: "Arial", color: "CBD5E1",
    });
  }
  const statusLabel = project.status === "active" ? "Aktiv" : project.status === "completed" ? "Klar" : "Arkiverad";
  const phaseLabel = phases.find(p => p.id === project.current_phase)?.name || `Fas ${project.current_phase}`;
  titleSlide.addText(`Status: ${statusLabel}  |  Fas: ${phaseLabel}  |  ${new Date().toLocaleDateString("sv-SE")}`, {
    x: 0.8, y: 5.0, w: 11.5, h: 0.5,
    fontSize: 12, fontFace: "Arial", color: "64748B",
  });

  // --- Overview Slide ---
  const overviewSlide = pptx.addSlide();
  overviewSlide.addText("Projektöversikt", {
    x: 0.5, y: 0.3, w: 12, h: 0.7,
    fontSize: 28, fontFace: "Arial", bold: true, color: "1E293B",
  });

  const kpis: { label: string; value: string; color: string }[] = [];
  if (sigmaEntries.length > 0) {
    const latest = sigmaEntries[sigmaEntries.length - 1];
    kpis.push({ label: "Sigma-nivå", value: `${Number(latest.sigma_level).toFixed(2)}σ`, color: "047857" });
    if (latest.dpmo != null) kpis.push({ label: "DPMO", value: String(latest.dpmo), color: "B45309" });
  }
  if (project.estimated_savings != null) {
    kpis.push({ label: "Uppskattad besparing", value: `${(project.estimated_savings / 1000).toFixed(0)} TSEK`, color: "1E40AF" });
  }
  if (project.actual_savings != null) {
    kpis.push({ label: "Faktisk besparing", value: `${(project.actual_savings / 1000).toFixed(0)} TSEK`, color: "059669" });
  }

  const totalTollgate = tollgateItems.length;
  const completedTollgate = tollgateItems.filter(t => t.is_completed).length;
  if (totalTollgate > 0) {
    kpis.push({ label: "Tollgate", value: `${completedTollgate}/${totalTollgate}`, color: "7C3AED" });
  }

  kpis.forEach((kpi, i) => {
    const colX = 0.5 + i * 2.6;
    overviewSlide.addShape(pptx.ShapeType.roundRect, {
      x: colX, y: 1.3, w: 2.4, h: 1.4, fill: { color: "F8FAFC" },
      line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1,
    });
    overviewSlide.addText(kpi.value, {
      x: colX, y: 1.4, w: 2.4, h: 0.8,
      fontSize: 28, fontFace: "Arial", bold: true, color: kpi.color, align: "center",
    });
    overviewSlide.addText(kpi.label, {
      x: colX, y: 2.1, w: 2.4, h: 0.5,
      fontSize: 11, fontFace: "Arial", color: "64748B", align: "center",
    });
  });

  // Sigma trend
  if (sigmaEntries.length > 1) {
    const trendText = sigmaEntries
      .map(e => `${phases.find(p => p.id === e.phase)?.name || `Fas ${e.phase}`}: ${Number(e.sigma_level).toFixed(2)}σ`)
      .join("  →  ");
    overviewSlide.addText(`Sigma-utveckling: ${trendText}`, {
      x: 0.5, y: 3.0, w: 12, h: 0.5,
      fontSize: 13, fontFace: "Arial", color: "334155",
    });
  }

  // --- Phase Slides ---
  phases.forEach((phase) => {
    const phaseNotes = notes.filter(n => n.phase === phase.id);
    const phaseCalcs = calculations.filter(c => c.phase === phase.id);
    const phaseTollgate = tollgateItems.filter(t => t.phase === phase.id);

    if (phaseNotes.length === 0 && phaseCalcs.length === 0 && phaseTollgate.length === 0) return;

    const color = PHASE_COLORS[phase.id] || "334155";
    const slide = pptx.addSlide();

    // Phase header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.33, h: 1.0, fill: { color },
    });
    slide.addText(`${phase.name}: ${phase.title}`, {
      x: 0.5, y: 0.15, w: 12, h: 0.7,
      fontSize: 26, fontFace: "Arial", bold: true, color: "FFFFFF",
    });

    let yPos = 1.3;

    // Tollgate status
    if (phaseTollgate.length > 0) {
      const completed = phaseTollgate.filter(t => t.is_completed).length;
      slide.addText(`Tollgate: ${completed}/${phaseTollgate.length} klara`, {
        x: 0.5, y: yPos, w: 5, h: 0.4,
        fontSize: 12, fontFace: "Arial", bold: true, color: "334155",
      });
      yPos += 0.5;
      const tollgateText = phaseTollgate.map(t => `${t.is_completed ? "✓" : "○"} ${t.title}`).join("\n");
      slide.addText(tollgateText, {
        x: 0.7, y: yPos, w: 5, h: Math.min(phaseTollgate.length * 0.25 + 0.2, 2),
        fontSize: 10, fontFace: "Arial", color: "475569", lineSpacingMultiple: 1.3,
      });
      yPos += Math.min(phaseTollgate.length * 0.25 + 0.3, 2.1);
    }

    // Tools/calculations
    if (phaseCalcs.length > 0) {
      slide.addText("Verktygsresultat", {
        x: 0.5, y: yPos, w: 5, h: 0.4,
        fontSize: 14, fontFace: "Arial", bold: true, color: "1E293B",
      });
      yPos += 0.5;

      phaseCalcs.forEach((calc) => {
        if (yPos > 6.5) return; // avoid overflow

        slide.addText(calc.tool_name, {
          x: 0.7, y: yPos, w: 11.5, h: 0.35,
          fontSize: 12, fontFace: "Arial", bold: true, color: color,
        });
        yPos += 0.35;

        // Show key results
        const results = calc.results as Record<string, unknown> | null;
        if (results && typeof results === "object") {
          const entries = Object.entries(results)
            .filter(([k, v]) => isMeaningful(k, v))
            .slice(0, 6);
          if (entries.length > 0) {
            const resultText = entries.map(([k, v]) => `${k}: ${formatVal(v, 40)}`).join("  |  ");
            slide.addText(resultText, {
              x: 0.9, y: yPos, w: 11.3, h: 0.3,
              fontSize: 10, fontFace: "Arial", color: "475569",
            });
            yPos += 0.35;
          }
        }
        yPos += 0.1;
      });
    }

    // Notes summary
    if (phaseNotes.length > 0 && yPos < 6.0) {
      slide.addText("Anteckningar", {
        x: 0.5, y: yPos, w: 5, h: 0.4,
        fontSize: 14, fontFace: "Arial", bold: true, color: "1E293B",
      });
      yPos += 0.5;
      phaseNotes.slice(0, 4).forEach((note) => {
        if (yPos > 6.8) return;
        const noteText = note.content ? `${note.title}: ${note.content.slice(0, 120)}` : note.title;
        slide.addText(`• ${noteText}`, {
          x: 0.7, y: yPos, w: 11.5, h: 0.3,
          fontSize: 10, fontFace: "Arial", color: "475569",
        });
        yPos += 0.35;
      });
    }
  });

  // --- Closing Slide ---
  const closingSlide = pptx.addSlide();
  closingSlide.background = { color: "1E293B" };
  closingSlide.addText("Tack!", {
    x: 0.5, y: 2.5, w: 12, h: 1.2,
    fontSize: 48, fontFace: "Arial", bold: true, color: "FFFFFF", align: "center",
  });
  closingSlide.addText(`${project.name} – ${new Date().toLocaleDateString("sv-SE")}`, {
    x: 0.5, y: 4.0, w: 12, h: 0.5,
    fontSize: 16, fontFace: "Arial", color: "94A3B8", align: "center",
  });

  const fileName = `${project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, "").replace(/\s+/g, "_")}_presentation.pptx`;
  pptx.writeFile({ fileName });
}
