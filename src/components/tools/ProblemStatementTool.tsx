import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { toast } from "sonner";

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function ProblemStatementTool({ toolId = "problem-statement", toolName = "Problemformulering", phase = 1 }: Props) {
  const [data, setData] = useState({ what: "", where: "", when: "", extent: "", impact: "" });

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    setData({
      what: String(inputs.what || ""),
      where: String(inputs.where || ""),
      when: String(inputs.when || ""),
      extent: String(inputs.extent || ""),
      impact: String(inputs.impact || ""),
    });
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const update = (field: string, value: string) => setData(prev => ({ ...prev, [field]: value }));
  const hasResult = Object.values(data).some(v => v.trim());


  const fields = [
    { key: "what", label: "VAD är problemet?", placeholder: "Beskriv defekten/avvikelsen objektivt..." },
    { key: "where", label: "VAR uppstår det?", placeholder: "Plats, process, avdelning..." },
    { key: "when", label: "NÄR uppstår det?", placeholder: "Tidpunkt, frekvens, sedan när..." },
    { key: "extent", label: "Hur STORT är det?", placeholder: "Antal, procent, kostnad..." },
    { key: "impact", label: "Vilken PÅVERKAN har det?", placeholder: "Effekt på kund, verksamhet..." },
  ];

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />

      {fields.map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-medium">{f.label}</Label>
          <Textarea value={(data as any)[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder} className="text-sm h-14 resize-none" />
        </div>
      ))}

      {hasResult && (
        <div className="p-3 bg-muted/50 rounded-lg text-xs">
          <p className="font-medium mb-1">📝 Problemformulering:</p>
          <p className="text-muted-foreground italic">
            {[data.what && data.what, data.where && `Det uppstår i ${data.where}.`, data.when && `Problemet har observerats ${data.when}.`, data.extent && `Omfattningen är ${data.extent}.`, data.impact && `Påverkan: ${data.impact}.`].filter(Boolean).join(" ")}
          </p>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: data, results: { completedSections: Object.values(data).filter(v => v.trim()).length, statement: Object.values(data).filter(v => v.trim()).join(" ") } })} />
    </div>
  );
}
