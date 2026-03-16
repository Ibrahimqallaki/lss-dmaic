import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function ProjectCharterTool({ toolId = "project-charter", toolName = "Project Charter", phase = 1 }: Props) {
  const [data, setData] = useState({
    problemStatement: "",
    businessCase: "",
    goal: "",
    scope: "",
    team: "",
    timeline: "",
    metrics: "",
  });
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const update = (field: string, value: string) => setData(prev => ({ ...prev, [field]: value }));
  const hasResult = Object.values(data).some(v => v.trim());

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-medium">Problemformulering</Label>
        <Textarea value={data.problemStatement} onChange={e => update("problemStatement", e.target.value)} placeholder="Beskriv problemet tydligt: vad, var, när, omfattning..." className="text-sm h-20 resize-none" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Affärsnytta (Business Case)</Label>
        <Textarea value={data.businessCase} onChange={e => update("businessCase", e.target.value)} placeholder="Varför är detta viktigt? Kostnader, kundpåverkan..." className="text-sm h-16 resize-none" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Mål (SMART)</Label>
          <Textarea value={data.goal} onChange={e => update("goal", e.target.value)} placeholder="Specifikt, mätbart mål..." className="text-sm h-16 resize-none" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Omfattning (Scope)</Label>
          <Textarea value={data.scope} onChange={e => update("scope", e.target.value)} placeholder="In scope / Out of scope..." className="text-sm h-16 resize-none" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Projektteam</Label>
          <Textarea value={data.team} onChange={e => update("team", e.target.value)} placeholder="Champion, Black Belt, Green Belts..." className="text-sm h-16 resize-none" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Tidsplan</Label>
          <Textarea value={data.timeline} onChange={e => update("timeline", e.target.value)} placeholder="Milstolpar och datum..." className="text-sm h-16 resize-none" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Primära mätetal (KPI:er)</Label>
        <Input value={data.metrics} onChange={e => update("metrics", e.target.value)} placeholder="T.ex. Cykeltid, DPMO, Cp/Cpk..." className="text-sm" />
      </div>

      {hasResult && (
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium mb-1">📋 Charter-sammanfattning</p>
          <p className="text-muted-foreground text-xs">
            {[data.problemStatement && "Problem definierat", data.goal && "Mål satt", data.scope && "Scope definierat", data.team && "Team tillsatt", data.timeline && "Tidsplan angiven", data.metrics && "KPI:er identifierade"].filter(Boolean).join(" • ")}
          </p>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: data, results: { completedFields: Object.entries(data).filter(([,v]) => v.trim()).length, totalFields: 7 } })} />
    </div>
  );
}