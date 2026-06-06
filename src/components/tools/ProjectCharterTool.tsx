import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { ExampleDataButton } from "@/components/calculators/ExampleDataButton";

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

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    setData({
      problemStatement: String(inputs.problemStatement || ""),
      businessCase: String(inputs.businessCase || ""),
      goal: String(inputs.goal || ""),
      scope: String(inputs.scope || ""),
      team: String(inputs.team || ""),
      timeline: String(inputs.timeline || ""),
      metrics: String(inputs.metrics || ""),
    });
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const update = (field: string, value: string) => setData(prev => ({ ...prev, [field]: value }));
  const hasResult = Object.values(data).some(v => v.trim());

  const loadExample = () => {
    setData({
      problemStatement: "Andelen sena leveranser har ökat från 5% till 14% under Q1, vilket lett till 32 kundklagomål och 180 000 kr i kreditnotor.",
      businessCase: "Förlorad kundlojalitet och NPS-ras på 12 punkter. Estimerad besparing 600 000 kr/år vid återgång till <5% sena leveranser.",
      goal: "Reducera andelen sena leveranser från 14% till <5% inom 6 månader, mätt som % order levererade efter utlovat datum.",
      scope: "In: Order, plock, pack, transport för B2B-kunder.\nOut: Returflöde, internleveranser.",
      team: "Champion: Logistikchef\nBlack Belt: Anna Lindberg\nGreen Belts: Erik N (lager), Sara P (transport)",
      timeline: "Define v.10 • Measure v.13 • Analyze v.17 • Improve v.22 • Control v.28",
      metrics: "% sena leveranser (primär), cykeltid order→leverans, DPMO plockfel",
    });
  };

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <ExampleDataButton onLoad={loadExample} />

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
