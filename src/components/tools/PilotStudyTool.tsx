import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function PilotStudyTool({ toolId = "pilot-study", toolName = "Pilotstudie", phase = 4 }: Props) {
  const [data, setData] = useState({ objective: "", scope: "", duration: "", sampleSize: "", successCriteria: "", baseline: "", pilotResults: "", risks: "", decision: "" });
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();
  const update = (f: string, v: string) => setData(prev => ({ ...prev, [f]: v }));
  const hasResult = Object.values(data).some(v => v.trim());

  const fields = [
    { key: "objective", label: "Mål med piloten", placeholder: "Vad ska valideras?" },
    { key: "scope", label: "Avgränsning", placeholder: "Vilken del av processen, vilka enheter?" },
    { key: "duration", label: "Varaktighet", placeholder: "T.ex. 2 veckor" },
    { key: "sampleSize", label: "Stickprovsstorlek", placeholder: "Antal enheter/mätningar" },
    { key: "successCriteria", label: "Framgångskriterier", placeholder: "T.ex. Cpk > 1.33, cykeltid < 5 min" },
    { key: "baseline", label: "Baseline (före)", placeholder: "Nuvarande prestanda" },
    { key: "pilotResults", label: "Pilotresultat (efter)", placeholder: "Uppmätta resultat" },
    { key: "risks", label: "Risker och mitigation", placeholder: "Identifierade risker och åtgärder" },
    { key: "decision", label: "Beslut", placeholder: "Go / No-Go / Modifiera" },
  ];

  return (
    <div className="space-y-2">
      {fields.map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-medium">{f.label}</Label>
          {f.key === "duration" || f.key === "sampleSize" || f.key === "decision" ? (
            <Input value={(data as any)[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} className="text-sm" />
          ) : (
            <Textarea value={(data as any)[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} className="text-sm h-12 resize-none" />
          )}
        </div>
      ))}
      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: data, results: { completedSections: Object.values(data).filter(v => v.trim()).length, decision: data.decision } })} />
    </div>
  );
}
