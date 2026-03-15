import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

interface Props { toolId?: string; toolName?: string; phase?: number; }

// 5S Audit Tool
export function FiveSAuditTool({ toolId = "5s", toolName = "5S", phase = 4 }: Props) {
  const categories = [
    { key: "sortera", label: "Sortera (Seiri)", items: ["Onödiga föremål borttagna", "Rödmärkning genomförd", "Tydliga kriterier för behov"] },
    { key: "strukturera", label: "Strukturera (Seiton)", items: ["Allt har en bestämd plats", "Märkning och skyltning", "Ergonomisk placering"] },
    { key: "stada", label: "Städa (Seiso)", items: ["Arbetsytan ren", "Utrustning underhållen", "Inspektionsrutin etablerad"] },
    { key: "standardisera", label: "Standardisera (Seiketsu)", items: ["Visuella standarder finns", "Checklista för underhåll", "Ansvariga tilldelade"] },
    { key: "sjalvdisciplin", label: "Självdisciplin (Shitsuke)", items: ["Regelbundna audits", "Utbildning genomförd", "Förbättringskultur"] },
  ];

  const [scores, setScores] = useState<Record<string, number[]>>(
    Object.fromEntries(categories.map(c => [c.key, c.items.map(() => 3)]))
  );
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const setScore = (catKey: string, idx: number, val: number[]) => {
    setScores(prev => ({ ...prev, [catKey]: prev[catKey].map((s, i) => i === idx ? val[0] : s) }));
  };

  const catAvg = (key: string) => { const s = scores[key]; return s.reduce((a, b) => a + b, 0) / s.length; };
  const totalAvg = categories.reduce((sum, c) => sum + catAvg(c.key), 0) / categories.length;

  return (
    <div className="space-y-3">
      {categories.map(cat => (
        <div key={cat.key} className="space-y-1">
          <Label className="text-xs font-medium">{cat.label} — snitt: {catAvg(cat.key).toFixed(1)}/5</Label>
          {cat.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span className="flex-1">{item}</span>
              <span className="w-6 text-center">{scores[cat.key][idx]}</span>
              <Slider value={[scores[cat.key][idx]]} onValueChange={v => setScore(cat.key, idx, v)} min={1} max={5} step={1} className="w-24" />
            </div>
          ))}
        </div>
      ))}
      <div className="p-3 bg-muted/50 rounded-lg text-xs text-center">
        <span className="font-medium text-lg">{totalAvg.toFixed(1)}</span>/5 Total 5S-poäng
        <div className="text-muted-foreground mt-1">{totalAvg >= 4 ? "✅ Utmärkt" : totalAvg >= 3 ? "⚠️ Godkänt" : "❌ Behöver förbättras"}</div>
      </div>
      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={true} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { scores }, results: { totalAvg, categoryScores: Object.fromEntries(categories.map(c => [c.key, catAvg(c.key)])) } })} />
    </div>
  );
}

// Kaizen Event Tool
export function KaizenEventTool({ toolId = "kaizen", toolName = "Kaizen Event", phase = 4 }: Props) {
  const [data, setData] = useState({ theme: "", scope: "", team: "", currentState: "", targetState: "", actions: "", results: "", standardization: "" });
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();
  const update = (f: string, v: string) => setData(prev => ({ ...prev, [f]: v }));
  const hasResult = Object.values(data).some(v => v.trim());
  const fields = [
    { key: "theme", label: "Tema/Fokusområde", placeholder: "Vad ska förbättras?" },
    { key: "scope", label: "Avgränsning", placeholder: "Start- och slutpunkt i processen" },
    { key: "team", label: "Team (3-7 personer)", placeholder: "Namn och roller" },
    { key: "currentState", label: "Nuläge (dag 1-2)", placeholder: "Observationer, mätningar, slöserier..." },
    { key: "targetState", label: "Målbild", placeholder: "Hur ska processen se ut efter?" },
    { key: "actions", label: "Åtgärder (dag 3-4)", placeholder: "Genomförda förändringar..." },
    { key: "results", label: "Resultat (dag 5)", placeholder: "Mätbara förbättringar..." },
    { key: "standardization", label: "Standardisering", placeholder: "SOP, utbildning, uppföljning..." },
  ];

  return (
    <div className="space-y-2">
      {fields.map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-medium">{f.label}</Label>
          <Textarea value={(data as any)[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} className="text-sm h-12 resize-none" />
        </div>
      ))}
      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: data, results: { completedSections: Object.values(data).filter(v => v.trim()).length } })} />
    </div>
  );
}

// Poka-Yoke Tool
export function PokaYokeTool({ toolId = "mistake-proofing", toolName = "Poka-Yoke", phase = 4 }: Props) {
  const [items, setItems] = useState<{ id: string; error: string; cause: string; type: string; solution: string; level: string }[]>([]);
  const [form, setForm] = useState({ error: "", cause: "", type: "kontakt", solution: "", level: "prevention" });
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const typeLabels: Record<string, string> = { kontakt: "Kontaktmetod", fastAntal: "Fast antal", sekvens: "Sekvensmetod" };
  const levelLabels: Record<string, string> = { prevention: "Förebyggande (bäst)", detection: "Detektering", mitigation: "Begränsning" };

  const addItem = () => {
    if (!form.error.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), ...form }]);
    setForm({ ...form, error: "", cause: "", solution: "" });
  };

  const hasResult = items.length > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Potentiellt fel</Label>
          <Input value={form.error} onChange={e => setForm({ ...form, error: e.target.value })} placeholder="Felmontering av komponent" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Orsak</Label>
          <Input value={form.cause} onChange={e => setForm({ ...form, cause: e.target.value })} placeholder="Symmetrisk design" className="text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Poka-Yoke-lösning</Label>
          <Input value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} placeholder="Asymmetrisk utformning" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nivå</Label>
          <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
            {Object.entries(levelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <Button size="sm" onClick={addItem} disabled={!form.error.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {hasResult && (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="p-2 border rounded text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">❌ {item.error}</span>
                <div className="flex gap-1">
                  <Badge variant={item.level === "prevention" ? "default" : "secondary"} className="text-[10px]">{levelLabels[item.level]}</Badge>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setItems(items.filter(x => x.id !== item.id))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              {item.cause && <div className="text-muted-foreground">Orsak: {item.cause}</div>}
              {item.solution && <div className="text-primary">✅ Lösning: {item.solution}</div>}
            </div>
          ))}
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { total: items.length, preventive: items.filter(i => i.level === "prevention").length } })} />
    </div>
  );
}
