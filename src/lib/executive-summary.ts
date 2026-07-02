import { phases } from "@/data/dmaic-tools";

interface Project {
  name: string;
  status: string;
  current_phase: number;
  estimated_savings?: number | null;
  actual_savings?: number | null;
}
interface Note { phase: number }
interface Calc {
  phase: number;
  tool_id: string;
  tool_name: string;
  results: unknown;
}
interface Tollgate { phase: number; is_completed: boolean }
interface Sigma { phase: number; sigma_level: number; dpmo: number | null }

export interface HighRiskItem {
  phase: number;
  toolName: string;
  failureMode: string;
  rpn: number;
}

export interface ExecutiveSummary {
  headline: string;
  keyPoints: string[];
  sigmaFirst: number | null;
  sigmaLast: number | null;
  sigmaDelta: number | null;
  dpmoFirst: number | null;
  dpmoLast: number | null;
  tollgatePct: number;
  tollgateCompleted: number;
  tollgateTotal: number;
  calcCount: number;
  notesCount: number;
  highRisks: HighRiskItem[];
  estimatedSavings: number | null;
  actualSavings: number | null;
  healthLabel: "God" | "Behöver uppmärksamhet" | "Kritisk";
  healthColor: string; // hex
}

function extractHighRisks(calcs: Calc[]): HighRiskItem[] {
  const risks: HighRiskItem[] = [];
  for (const c of calcs) {
    const r = c.results as Record<string, unknown> | null;
    if (!r || typeof r !== "object") continue;
    // FMEA saves { items: [{ failureMode, rpn, ... }] } or top-level items
    const items = (r.items || r.rows || r.entries) as unknown;
    if (Array.isArray(items)) {
      for (const it of items) {
        if (it && typeof it === "object") {
          const rec = it as Record<string, unknown>;
          const rpn = Number(rec.rpn ?? rec.RPN ?? 0);
          if (rpn >= 200) {
            risks.push({
              phase: c.phase,
              toolName: c.tool_name,
              failureMode: String(rec.failureMode ?? rec.mode ?? rec.description ?? "Okänt felläge"),
              rpn,
            });
          }
        }
      }
    }
    // Also single top-level rpn
    const topRpn = Number((r.rpn ?? r.RPN) as number);
    if (!isNaN(topRpn) && topRpn >= 200) {
      risks.push({
        phase: c.phase,
        toolName: c.tool_name,
        failureMode: String((r.failureMode ?? r.mode ?? "Okänt felläge")),
        rpn: topRpn,
      });
    }
  }
  return risks.sort((a, b) => b.rpn - a.rpn).slice(0, 8);
}

export function buildExecutiveSummary(
  project: Project,
  notes: Note[],
  calculations: Calc[],
  tollgateItems: Tollgate[],
  sigmaEntries: Sigma[],
): ExecutiveSummary {
  const sorted = [...sigmaEntries].sort((a, b) => a.phase - b.phase);
  const sigmaFirst = sorted.length ? Number(sorted[0].sigma_level) : null;
  const sigmaLast = sorted.length ? Number(sorted[sorted.length - 1].sigma_level) : null;
  const sigmaDelta = sigmaFirst != null && sigmaLast != null ? sigmaLast - sigmaFirst : null;
  const dpmoFirst = sorted.length ? sorted[0].dpmo : null;
  const dpmoLast = sorted.length ? sorted[sorted.length - 1].dpmo : null;

  const tollgateTotal = tollgateItems.length;
  const tollgateCompleted = tollgateItems.filter(t => t.is_completed).length;
  const tollgatePct = tollgateTotal > 0 ? Math.round((tollgateCompleted / tollgateTotal) * 100) : 0;

  const highRisks = extractHighRisks(calculations);

  // Health scoring
  let health: ExecutiveSummary["healthLabel"] = "God";
  let healthColor = "16A34A";
  if (highRisks.length >= 3 || (sigmaDelta != null && sigmaDelta < -0.3)) {
    health = "Kritisk"; healthColor = "DC2626";
  } else if (highRisks.length >= 1 || tollgatePct < 40 || (sigmaLast != null && sigmaLast < 3)) {
    health = "Behöver uppmärksamhet"; healthColor = "D97706";
  }

  const phaseName = phases.find(p => p.id === project.current_phase)?.name || `Fas ${project.current_phase}`;
  const headline = `${project.name} — ${phaseName} • Hälsa: ${health}`;

  const kp: string[] = [];
  if (sigmaFirst != null && sigmaLast != null) {
    const arrow = sigmaDelta && sigmaDelta > 0 ? "↑" : sigmaDelta && sigmaDelta < 0 ? "↓" : "→";
    kp.push(`Sigma-nivå ${sigmaFirst.toFixed(2)} ${arrow} ${sigmaLast.toFixed(2)} (Δ ${sigmaDelta!.toFixed(2)})`);
  }
  if (dpmoLast != null) kp.push(`Aktuell DPMO: ${dpmoLast.toLocaleString("sv-SE")}`);
  if (tollgateTotal > 0) kp.push(`Tollgate-progress: ${tollgateCompleted}/${tollgateTotal} (${tollgatePct}%)`);
  kp.push(`${calculations.length} verktygsresultat, ${notes.length} anteckningar sparade`);
  if (highRisks.length > 0) kp.push(`${highRisks.length} högrisk-FMEA (RPN ≥ 200)`);
  if (project.actual_savings != null) kp.push(`Faktisk besparing: ${(project.actual_savings/1000).toFixed(0)} TSEK`);
  else if (project.estimated_savings != null) kp.push(`Uppskattad besparing: ${(project.estimated_savings/1000).toFixed(0)} TSEK`);

  return {
    headline,
    keyPoints: kp,
    sigmaFirst, sigmaLast, sigmaDelta,
    dpmoFirst, dpmoLast,
    tollgatePct, tollgateCompleted, tollgateTotal,
    calcCount: calculations.length,
    notesCount: notes.length,
    highRisks,
    estimatedSavings: project.estimated_savings ?? null,
    actualSavings: project.actual_savings ?? null,
    healthLabel: health,
    healthColor,
  };
}
