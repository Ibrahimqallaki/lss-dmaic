import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

interface Task { id: string; task: string; responsible: string; deadline: string; status: "ej påbörjad" | "pågår" | "klar"; priority: "hög" | "medel" | "låg"; }

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function ImplementationPlanTool({ toolId = "implementation-plan", toolName = "Implementeringsplan", phase = 4 }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState({ task: "", responsible: "", deadline: "", priority: "medel" as Task["priority"] });
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const addTask = () => {
    if (!form.task.trim()) return;
    setTasks([...tasks, { id: crypto.randomUUID(), ...form, status: "ej påbörjad" }]);
    setForm({ ...form, task: "", responsible: "", deadline: "" });
  };

  const toggleStatus = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === "klar" ? "ej påbörjad" : t.status === "ej påbörjad" ? "pågår" : "klar" } : t));
  };

  const hasResult = tasks.length > 0;
  const completed = tasks.filter(t => t.status === "klar").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Aktivitet</Label>
          <Input value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} placeholder="T.ex. Installera ny utrustning" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ansvarig</Label>
          <Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} placeholder="Namn" className="text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Deadline</Label>
          <Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prioritet</Label>
          <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as Task["priority"] })}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hög">Hög</SelectItem>
              <SelectItem value="medel">Medel</SelectItem>
              <SelectItem value="låg">Låg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button size="sm" onClick={addTask} disabled={!form.task.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {hasResult && (
        <>
          <div className="space-y-1">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs p-2 border rounded">
                <button onClick={() => toggleStatus(t.id)}>
                  {t.status === "klar" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className={`h-4 w-4 ${t.status === "pågår" ? "text-yellow-500" : "text-muted-foreground"}`} />}
                </button>
                <span className={`flex-1 font-medium ${t.status === "klar" ? "line-through text-muted-foreground" : ""}`}>{t.task}</span>
                {t.responsible && <span className="text-muted-foreground">{t.responsible}</span>}
                {t.deadline && <span className="text-muted-foreground">{t.deadline}</span>}
                <Badge variant={t.priority === "hög" ? "destructive" : t.priority === "medel" ? "default" : "secondary"} className="text-[10px]">{t.priority}</Badge>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setTasks(tasks.filter(x => x.id !== t.id))}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
          <div className="p-2 bg-muted/50 rounded-lg text-xs text-center">
            {completed}/{tasks.length} aktiviteter klara ({tasks.length > 0 ? (completed / tasks.length * 100).toFixed(0) : 0}%)
          </div>
        </>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { tasks }, results: { total: tasks.length, completed, inProgress: tasks.filter(t => t.status === "pågår").length, completionRate: tasks.length > 0 ? (completed / tasks.length * 100) : 0 } })} />
    </div>
  );
}
