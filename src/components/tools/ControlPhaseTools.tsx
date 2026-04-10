import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";

interface Props { toolId?: string; toolName?: string; phase?: number; }

// SOP Template
export function SOPTool({ toolId = "sop", toolName = "SOP", phase = 5 }: Props) {
  const [steps, setSteps] = useState<{ id: string; step: string; detail: string; caution: string }[]>([]);
  const [meta, setMeta] = useState({ title: "", purpose: "", scope: "", responsible: "" });
  const [form, setForm] = useState({ step: "", detail: "", caution: "" });

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.meta && typeof inputs.meta === "object") {
      const m = inputs.meta as any;
      setMeta({ title: String(m.title || ""), purpose: String(m.purpose || ""), scope: String(m.scope || ""), responsible: String(m.responsible || "") });
    }
    if (Array.isArray(inputs.steps)) setSteps(inputs.steps as any[]);
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const addStep = () => {
    if (!form.step.trim()) return;
    setSteps([...steps, { id: crypto.randomUUID(), ...form }]);
    setForm({ step: "", detail: "", caution: "" });
  };

  const hasResult = !!(meta.title.trim() || steps.length > 0);

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">SOP-titel</Label><Input value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })} placeholder="T.ex. Monteringsinstruktion" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Ansvarig</Label><Input value={meta.responsible} onChange={e => setMeta({ ...meta, responsible: e.target.value })} className="text-sm" placeholder="Processägare" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Syfte</Label><Textarea value={meta.purpose} onChange={e => setMeta({ ...meta, purpose: e.target.value })} className="text-sm h-12 resize-none" placeholder="Varför finns denna SOP?" /></div>
        <div className="space-y-1"><Label className="text-xs">Omfattning</Label><Textarea value={meta.scope} onChange={e => setMeta({ ...meta, scope: e.target.value })} className="text-sm h-12 resize-none" placeholder="Vilka processer/roller?" /></div>
      </div>
      <div className="border-t pt-2 space-y-2">
        <Label className="text-xs font-medium">Processteg</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input value={form.step} onChange={e => setForm({ ...form, step: e.target.value })} placeholder="Steg" className="text-sm" />
          <Input value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} placeholder="Detaljer" className="text-sm" />
          <Input value={form.caution} onChange={e => setForm({ ...form, caution: e.target.value })} placeholder="Varning/OBS" className="text-sm" />
        </div>
        <Button size="sm" onClick={addStep} disabled={!form.step.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till steg</Button>
      </div>
      {steps.length > 0 && (
        <div className="space-y-1">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-start gap-2 text-xs p-2 border rounded">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px]">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{s.step}</div>
                {s.detail && <div className="text-muted-foreground">{s.detail}</div>}
                {s.caution && <div className="text-destructive">⚠️ {s.caution}</div>}
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => setSteps(steps.filter(x => x.id !== s.id))}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}
      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { meta, steps }, results: { totalSteps: steps.length } })} />
    </div>
  );
}

// Training Plan
export function TrainingPlanTool({ toolId = "training-plan", toolName = "Utbildningsplan", phase = 5 }: Props) {
  const [items, setItems] = useState<{ id: string; topic: string; audience: string; method: string; date: string; completed: boolean }[]>([]);
  const [form, setForm] = useState({ topic: "", audience: "", method: "", date: "" });

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (Array.isArray(inputs.items)) setItems(inputs.items as any[]);
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const addItem = () => {
    if (!form.topic.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), ...form, completed: false }]);
    setForm({ topic: "", audience: "", method: "", date: "" });
  };

  const toggleComplete = (id: string) => setItems(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  const hasResult = items.length > 0;

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Utbildningsämne</Label><Input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Ny SOP för montering" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Målgrupp</Label><Input value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} placeholder="Operatörer skift A" className="text-sm" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Metod</Label><Input value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} placeholder="Workshop, e-learning..." className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Datum</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="text-sm" /></div>
      </div>
      <Button size="sm" onClick={addItem} disabled={!form.topic.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {hasResult && (
        <>
          <div className="space-y-1">
            {items.map(i => (
              <div key={i.id} className="flex flex-wrap items-center gap-1.5 text-xs p-2 border rounded">
                <button onClick={() => toggleComplete(i.id)} className="shrink-0">{i.completed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}</button>
                <span className={`flex-1 min-w-0 font-medium ${i.completed ? "line-through text-muted-foreground" : ""}`}>{i.topic}</span>
                <div className="flex items-center gap-1.5 w-full sm:w-auto pl-6 sm:pl-0">
                  {i.audience && <span className="text-muted-foreground truncate">{i.audience}</span>}
                  {i.date && <span className="text-muted-foreground shrink-0">{i.date}</span>}
                  <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 ml-auto" onClick={() => setItems(items.filter(x => x.id !== i.id))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-center text-muted-foreground">{items.filter(i => i.completed).length}/{items.length} utbildningar genomförda</div>
        </>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { total: items.length, completed: items.filter(i => i.completed).length } })} />
    </div>
  );
}

// Response Plan
export function ResponsePlanTool({ toolId = "response-plan", toolName = "Reaktionsplan", phase = 5 }: Props) {
  const [items, setItems] = useState<{ id: string; trigger: string; action: string; responsible: string; escalation: string }[]>([]);
  const [form, setForm] = useState({ trigger: "", action: "", responsible: "", escalation: "" });

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (Array.isArray(inputs.items)) setItems(inputs.items as any[]);
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const addItem = () => {
    if (!form.trigger.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), ...form }]);
    setForm({ trigger: "", action: "", responsible: "", escalation: "" });
  };

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Trigger (när?)</Label><Input value={form.trigger} onChange={e => setForm({ ...form, trigger: e.target.value })} placeholder="Punkt utanför kontrollgräns" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Åtgärd</Label><Input value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} placeholder="Stoppa produktion, kalibrera" className="text-sm" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Ansvarig</Label><Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} placeholder="Operatör" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Eskalering</Label><Input value={form.escalation} onChange={e => setForm({ ...form, escalation: e.target.value })} placeholder="Kontakta produktionschef" className="text-sm" /></div>
      </div>
      <Button size="sm" onClick={addItem} disabled={!form.trigger.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {items.length > 0 && items.map(i => (
        <div key={i.id} className="p-2 border rounded text-xs space-y-1">
          <div className="flex justify-between items-start gap-2"><span className="font-medium text-destructive break-words min-w-0">🚨 {i.trigger}</span><Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => setItems(items.filter(x => x.id !== i.id))}><Trash2 className="h-3 w-3" /></Button></div>
          <div>→ {i.action}</div>
          {i.responsible && <div className="text-muted-foreground">Ansvarig: {i.responsible}</div>}
          {i.escalation && <div className="text-muted-foreground">Eskalering: {i.escalation}</div>}
        </div>
      ))}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={items.length > 0} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { total: items.length } })} />
    </div>
  );
}

// Handover Checklist
export function HandoverChecklistTool({ toolId = "handover-checklist", toolName = "Överlämningschecklista", phase = 5 }: Props) {
  const defaultItems = [
    "Kontrollplan upprättad och godkänd",
    "SOP:er dokumenterade och distribuerade",
    "Utbildning genomförd för alla berörda",
    "Reaktionsplan på plats",
    "Mätsystem validerat (MSA)",
    "Processkapabilitet bekräftad (Cpk)",
    "Styrdiagram implementerade",
    "Processägare identifierad och informerad",
    "Dokumentation arkiverad",
    "Lessons learned genomfört",
  ];

  const [items, setItems] = useState(defaultItems.map((text, i) => ({ id: String(i), text, checked: false, comment: "" })));

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (Array.isArray(inputs.items)) setItems(inputs.items as any[]);
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const toggle = (id: string) => setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  const completed = items.filter(i => i.checked).length;

  return (
    <div className="space-y-2">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-2 text-xs p-2 border rounded">
          <button onClick={() => toggle(item.id)} className="mt-0.5 shrink-0">{item.checked ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}</button>
          <span className={`flex-1 min-w-0 ${item.checked ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
        </div>
      ))}
      <div className="p-2 bg-muted/50 rounded-lg text-xs text-center">
        {completed}/{items.length} punkter avklarade ({(completed / items.length * 100).toFixed(0)}%)
        {completed === items.length && " ✅ Redo för överlämning!"}
      </div>
      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={true} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { completed, total: items.length, readyForHandover: completed === items.length } })} />
    </div>
  );
}

// Lessons Learned
export function LessonsLearnedTool({ toolId = "lessons-learned", toolName = "Lessons Learned", phase = 5 }: Props) {
  const [items, setItems] = useState<{ id: string; category: string; lesson: string; recommendation: string }[]>([]);
  const [form, setForm] = useState({ category: "process", lesson: "", recommendation: "" });

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (Array.isArray(inputs.items)) setItems(inputs.items as any[]);
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const categories: Record<string, string> = { process: "Process", team: "Teamarbete", data: "Data & analys", tools: "Verktyg", management: "Ledarskap" };

  const addItem = () => {
    if (!form.lesson.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), ...form }]);
    setForm({ ...form, lesson: "", recommendation: "" });
  };

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="space-y-1">
        <Label className="text-xs">Kategori</Label>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="space-y-1"><Label className="text-xs">Lärdom</Label><Textarea value={form.lesson} onChange={e => setForm({ ...form, lesson: e.target.value })} placeholder="Vad lärde vi oss?" className="text-sm h-14 resize-none" /></div>
      <div className="space-y-1"><Label className="text-xs">Rekommendation</Label><Textarea value={form.recommendation} onChange={e => setForm({ ...form, recommendation: e.target.value })} placeholder="Vad bör göras annorlunda?" className="text-sm h-14 resize-none" /></div>
      <Button size="sm" onClick={addItem} disabled={!form.lesson.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {items.length > 0 && items.map(i => (
        <div key={i.id} className="p-2 border rounded text-xs space-y-1">
          <div className="flex justify-between items-start gap-2"><Badge variant="secondary" className="text-[10px] shrink-0">{categories[i.category]}</Badge><Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => setItems(items.filter(x => x.id !== i.id))}><Trash2 className="h-3 w-3" /></Button></div>
          <div className="font-medium break-words">{i.lesson}</div>
          {i.recommendation && <div className="text-primary break-words">→ {i.recommendation}</div>}
        </div>
      ))}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={items.length > 0} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { total: items.length } })} />
    </div>
  );
}

// Benefit Validation
export function BenefitValidationTool({ toolId = "benefit-validation", toolName = "Nyttovalidering", phase = 5 }: Props) {
  const [items, setItems] = useState<{ id: string; metric: string; baseline: string; target: string; actual: string; unit: string }[]>([]);
  const [form, setForm] = useState({ metric: "", baseline: "", target: "", actual: "", unit: "" });

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (Array.isArray(inputs.items)) setItems(inputs.items as any[]);
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const addItem = () => {
    if (!form.metric.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), ...form }]);
    setForm({ metric: "", baseline: "", target: "", actual: "", unit: "" });
  };

  const hasResult = items.length > 0;

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">KPI/Mätetal</Label><Input value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value })} placeholder="Cykeltid" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Enhet</Label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="minuter" className="text-sm" /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label className="text-xs">Baseline</Label><Input value={form.baseline} onChange={e => setForm({ ...form, baseline: e.target.value })} placeholder="10.5" className="text-sm" type="number" /></div>
        <div className="space-y-1"><Label className="text-xs">Mål</Label><Input value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="7.0" className="text-sm" type="number" /></div>
        <div className="space-y-1"><Label className="text-xs">Faktiskt</Label><Input value={form.actual} onChange={e => setForm({ ...form, actual: e.target.value })} placeholder="6.8" className="text-sm" type="number" /></div>
      </div>
      <Button size="sm" onClick={addItem} disabled={!form.metric.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {hasResult && (
        <div className="border rounded-lg overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs min-w-[400px]">
            <thead className="bg-muted/50">
              <tr><th className="p-1.5 text-left">KPI</th><th className="p-1.5 text-right">Baseline</th><th className="p-1.5 text-right">Mål</th><th className="p-1.5 text-right">Faktiskt</th><th className="p-1.5">Status</th><th className="p-1.5 w-6"></th></tr>
            </thead>
            <tbody>
              {items.map(i => {
                const b = parseFloat(i.baseline); const t = parseFloat(i.target); const a = parseFloat(i.actual);
                const achieved = !isNaN(a) && !isNaN(t) && !isNaN(b) && ((t < b && a <= t) || (t > b && a >= t));
                return (
                  <tr key={i.id} className="border-t">
                    <td className="p-1.5 font-medium">{i.metric} {i.unit && `(${i.unit})`}</td>
                    <td className="p-1.5 text-right font-mono">{i.baseline || "–"}</td>
                    <td className="p-1.5 text-right font-mono">{i.target || "–"}</td>
                    <td className="p-1.5 text-right font-mono">{i.actual || "–"}</td>
                    <td className="p-1.5 text-center">{!isNaN(a) ? (achieved ? "✅" : "❌") : "–"}</td>
                    <td className="p-1.5"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setItems(items.filter(x => x.id !== i.id))}><Trash2 className="h-3 w-3" /></Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { total: items.length, achieved: items.filter(i => { const b = parseFloat(i.baseline); const t = parseFloat(i.target); const a = parseFloat(i.actual); return !isNaN(a) && !isNaN(t) && !isNaN(b) && ((t < b && a <= t) || (t > b && a >= t)); }).length } })} />
    </div>
  );
}
