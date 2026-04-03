import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { toast } from "sonner";

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function PughMatrixTool({ toolId = "pugh-matrix", toolName = "Pugh-matris", phase = 4 }: Props) {
  const [criteria, setCriteria] = useState<{ id: string; name: string; weight: number }[]>([]);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [criterionName, setCriterionName] = useState("");
  const [criterionWeight, setCriterionWeight] = useState("1");
  const [altName, setAltName] = useState("");
  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId);

  const addCriterion = () => {
    if (!criterionName.trim()) return;
    setCriteria([...criteria, { id: crypto.randomUUID(), name: criterionName, weight: parseFloat(criterionWeight) || 1 }]);
    setCriterionName("");
  };

  const addAlternative = () => {
    if (!altName.trim() || alternatives.includes(altName)) return;
    setAlternatives([...alternatives, altName]);
    setAltName("");
  };

  const setScore = (criterionId: string, alt: string, score: number) => {
    setScores(prev => ({ ...prev, [criterionId]: { ...prev[criterionId], [alt]: score } }));
  };

  const handleLoad = (inputs: Record<string, unknown>) => {
    const c = inputs.criteria as any[];
    const a = inputs.alternatives as any[];
    const s = inputs.scores as any;
    if (Array.isArray(c)) {
      const newCriteria = c.map(cr => ({ id: crypto.randomUUID(), name: String(cr.name || ""), weight: Number(cr.weight) || 1 }));
      setCriteria(newCriteria);
      if (Array.isArray(a)) setAlternatives(a.map(String));
      // Remap scores from old criterion IDs to new ones by index
      if (s && Array.isArray(c)) {
        const oldIds = c.map(cr => cr.id);
        const newScores: Record<string, Record<string, number>> = {};
        oldIds.forEach((oldId, idx) => {
          if (s[oldId]) newScores[newCriteria[idx].id] = s[oldId];
        });
        setScores(newScores);
      }
      toast.success("Sparad beräkning laddad!");
    }
  };

  const getTotal = (alt: string) => criteria.reduce((sum, c) => sum + (scores[c.id]?.[alt] || 0) * c.weight, 0);
  const hasResult = criteria.length > 0 && alternatives.length > 0;
  const winner = alternatives.length > 0 ? alternatives.reduce((best, alt) => getTotal(alt) > getTotal(best) ? alt : best, alternatives[0]) : "";

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Kriterier</Label>
          <div className="flex gap-1">
            <Input value={criterionName} onChange={e => setCriterionName(e.target.value)} placeholder="Kriterium" className="text-sm flex-1 min-w-0" />
            <Input type="number" value={criterionWeight} onChange={e => setCriterionWeight(e.target.value)} placeholder="Vikt" className="text-sm w-14" />
            <Button size="sm" onClick={addCriterion} disabled={!criterionName.trim()} className="shrink-0"><Plus className="h-3 w-3" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Alternativ</Label>
          <div className="flex gap-1">
            <Input value={altName} onChange={e => setAltName(e.target.value)} placeholder="Lösning A" className="text-sm flex-1 min-w-0" />
            <Button size="sm" onClick={addAlternative} disabled={!altName.trim()} className="shrink-0"><Plus className="h-3 w-3" /></Button>
          </div>
        </div>
      </div>

      {hasResult && (
        <>
          <div className="border rounded-lg overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs min-w-[360px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-1.5 text-left">Kriterium</th>
                  <th className="p-1.5 text-center w-10">Vikt</th>
                  {alternatives.map(alt => (
                    <th key={alt} className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="truncate max-w-[60px]">{alt}</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0" onClick={() => setAlternatives(alternatives.filter(a => a !== alt))}><Trash2 className="h-2.5 w-2.5" /></Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.map(c => (
                  <tr key={c.id} className="border-t">
                    <td className="p-1.5">
                      <div className="flex items-center gap-0.5">
                        <span className="truncate">{c.name}</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0" onClick={() => setCriteria(criteria.filter(x => x.id !== c.id))}><Trash2 className="h-2.5 w-2.5" /></Button>
                      </div>
                    </td>
                    <td className="p-1.5 text-center text-muted-foreground">{c.weight}</td>
                    {alternatives.map(alt => (
                      <td key={alt} className="p-1.5 text-center">
                        <div className="flex justify-center gap-0.5">
                          {[-1, 0, 1].map(s => (
                            <button key={s} onClick={() => setScore(c.id, alt, s)} className={`w-6 h-6 rounded text-[10px] border transition-colors ${(scores[c.id]?.[alt] ?? 0) === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                              {s > 0 ? "+" : s < 0 ? "−" : "S"}
                            </button>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-medium">
                  <td className="p-1.5">Totalpoäng</td>
                  <td className="p-1.5"></td>
                  {alternatives.map(alt => (
                    <td key={alt} className={`p-1.5 text-center text-sm ${alt === winner ? "text-primary font-bold" : ""}`}>
                      {getTotal(alt).toFixed(1)}{alt === winner && " 🏆"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted-foreground">+ = Bättre än referens, S = Samma, − = Sämre. Poäng multipliceras med vikt.</div>
        </>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { criteria, alternatives, scores }, results: { winner, scores: Object.fromEntries(alternatives.map(a => [a, getTotal(a)])) } })} />
    </div>
  );
}
