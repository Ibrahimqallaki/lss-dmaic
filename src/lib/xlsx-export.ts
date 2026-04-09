import * as XLSX from "xlsx";
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

function flattenObj(obj: unknown, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  if (!obj || typeof obj !== "object") return result;
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (HIDDEN_KEYS.has(key)) continue;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      result[fullKey] = value.length > 0 && typeof value[0] === "object"
        ? JSON.stringify(value)
        : value.join(", ");
    } else if (typeof value === "object") {
      Object.assign(result, flattenObj(value, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

export function exportProjectToXLSX(
  project: Project,
  notes: ProjectNote[],
  calculations: ProjectCalculation[],
  tollgateItems: TollgateItem[] = [],
  sigmaEntries: SigmaEntry[] = []
) {
  const wb = XLSX.utils.book_new();

  // --- Projektöversikt ---
  const overviewData = [
    ["Projektnamn", project.name],
    ["Beskrivning", project.description || ""],
    ["Status", project.status === "active" ? "Aktiv" : project.status === "completed" ? "Klar" : "Arkiverad"],
    ["Nuvarande fas", phases.find(p => p.id === project.current_phase)?.name || `Fas ${project.current_phase}`],
    ["Uppskattad besparing", project.estimated_savings != null ? project.estimated_savings : ""],
    ["Faktisk besparing", project.actual_savings != null ? project.actual_savings : ""],
    ["Exporterad", new Date().toLocaleDateString("sv-SE")],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview["!cols"] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, "Översikt");

  // --- Anteckningar ---
  const notesHeaders = ["Fas", "Rubrik", "Innehåll", "Datum"];
  const notesRows = notes.map(n => [
    phases.find(p => p.id === n.phase)?.name || `Fas ${n.phase}`,
    n.title,
    n.content || "",
    new Date(n.created_at).toLocaleDateString("sv-SE"),
  ]);
  const wsNotes = XLSX.utils.aoa_to_sheet([notesHeaders, ...notesRows]);
  wsNotes["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 60 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, "Anteckningar");

  // --- Beräkningar ---
  const calcHeaders = ["Fas", "Verktyg", "Datum", "Anteckning"];
  // Collect all unique keys from inputs/results
  const allInputKeys = new Set<string>();
  const allResultKeys = new Set<string>();
  calculations.forEach(c => {
    const inp = flattenObj(c.inputs);
    const res = flattenObj(c.results);
    Object.keys(inp).forEach(k => allInputKeys.add(k));
    Object.keys(res).forEach(k => allResultKeys.add(k));
  });
  const inputKeysArr = Array.from(allInputKeys).sort();
  const resultKeysArr = Array.from(allResultKeys).sort();
  const fullCalcHeaders = [...calcHeaders, ...inputKeysArr.map(k => `[Indata] ${k}`), ...resultKeysArr.map(k => `[Resultat] ${k}`)];

  const calcRows = calculations.map(c => {
    const inp = flattenObj(c.inputs);
    const res = flattenObj(c.results);
    return [
      phases.find(p => p.id === c.phase)?.name || `Fas ${c.phase}`,
      c.tool_name,
      new Date(c.created_at).toLocaleDateString("sv-SE"),
      c.notes || "",
      ...inputKeysArr.map(k => inp[k] || ""),
      ...resultKeysArr.map(k => res[k] || ""),
    ];
  });
  const wsCalcs = XLSX.utils.aoa_to_sheet([fullCalcHeaders, ...calcRows]);
  XLSX.utils.book_append_sheet(wb, wsCalcs, "Beräkningar");

  // --- Tollgate ---
  const tollgateHeaders = ["Fas", "Punkt", "Klar"];
  const tollgateRows = tollgateItems.map(t => [
    phases.find(p => p.id === t.phase)?.name || `Fas ${t.phase}`,
    t.title,
    t.is_completed ? "Ja" : "Nej",
  ]);
  const wsTollgate = XLSX.utils.aoa_to_sheet([tollgateHeaders, ...tollgateRows]);
  wsTollgate["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsTollgate, "Tollgate");

  // --- Sigma ---
  const sigmaHeaders = ["Fas", "Sigma-nivå", "DPMO", "Mätdatum"];
  const sigmaRows = sigmaEntries.map(s => [
    phases.find(p => p.id === s.phase)?.name || `Fas ${s.phase}`,
    Number(s.sigma_level).toFixed(2),
    s.dpmo != null ? s.dpmo : "",
    new Date(s.measurement_date).toLocaleDateString("sv-SE"),
  ]);
  const wsSigma = XLSX.utils.aoa_to_sheet([sigmaHeaders, ...sigmaRows]);
  wsSigma["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSigma, "Sigma");

  const fileName = `${project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, "").replace(/\s+/g, "_")}_data.xlsx`;
  XLSX.writeFile(wb, fileName);
}
