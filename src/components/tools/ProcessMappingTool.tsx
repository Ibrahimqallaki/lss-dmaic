import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowDown, MoveUp, MoveDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

type StepType = "operation" | "transport" | "inspection" | "delay" | "storage";

interface ProcessStep { id: string; name: string; type: StepType; time: number; valueAdd: boolean; responsible: string; }

const typeLabels: Record<StepType, string> = { operation: "⚙️ Operation", transport: "🚚 Transport", inspection: "🔍 Inspektion", delay: "⏳ Väntan", storage: "📦 Lagring" };

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function ProcessMappingTool({ toolId = "process-mapping", toolName = "Processkartläggning", phase = 2 }: Props) {
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [form, setForm] = useState({ name: "", type: "operation" as StepType, time: "", valueAdd: true, responsible: "" });
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const addStep = () => {
    if (!form.name.trim()) return;
    setSteps([...steps, { id: crypto.randomUUID(), name: form.name, type: form.type, time: parseFloat(form.time) || 0, valueAdd: form.valueAdd, responsible: form.responsible }]);
    setForm({ ...form, name: "", time: "", responsible: "" });
  };

  const moveStep = (idx: number, dir: number) => {
    const newSteps = [...steps];
    const [item] = newSteps.splice(idx, 1);
    newSteps.splice(idx + dir, 0, item);
    setSteps(newSteps);
  };

  const hasResult = steps.length > 0;
  const totalTime = steps.reduce((s, step) => s + step.time, 0);
  const vaTime = steps.filter(s => s.valueAdd).reduce((s, step) => s + step.time, 0);
  const pceRatio = totalTime > 0 ? (vaTime / totalTime * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Stegnamn</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="T.ex. Montering" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Typ</Label>
          <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as StepType })}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Tid (min)</Label>
          <Input type="number" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="5" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ansvarig</Label>
          <Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} placeholder="Operatör" className="text-sm" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <input type="checkbox" checked={form.valueAdd} onChange={e => setForm({ ...form, valueAdd: e.target.checked })} className="rounded" />
            Värdeskapande
          </label>
        </div>
      </div>
      <Button size="sm" onClick={addStep} disabled={!form.name.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till steg</Button>

      {hasResult && (
        <>
          <div className="space-y-1">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-1 text-xs p-2 border rounded">
                <span className="w-5 text-center text-muted-foreground">{idx + 1}</span>
                <Badge variant={step.valueAdd ? "default" : "secondary"} className="text-[10px] shrink-0">{typeLabels[step.type]}</Badge>
                <span className="font-medium flex-1">{step.name}</span>
                {step.time > 0 && <span className="text-muted-foreground">{step.time}m</span>}
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onClick={() => moveStep(idx, -1)}><MoveUp className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === steps.length - 1} onClick={() => moveStep(idx, 1)}><MoveDown className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setSteps(steps.filter(s => s.id !== step.id))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-xs grid grid-cols-3 gap-2 text-center">
            <div><div className="font-medium">{steps.length}</div><div className="text-muted-foreground">Steg</div></div>
            <div><div className="font-medium">{totalTime}m</div><div className="text-muted-foreground">Total tid</div></div>
            <div><div className="font-medium">{pceRatio.toFixed(0)}%</div><div className="text-muted-foreground">PCE</div></div>
          </div>
        </>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { steps }, results: { totalSteps: steps.length, totalTime, valueAddTime: vaTime, pce: pceRatio, nonValueAddSteps: steps.filter(s => !s.valueAdd).length } })} />
    </div>
  );
}
