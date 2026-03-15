import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

interface Run { id: string; factors: number[]; response: number; }

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function ResponseSurfaceTool({ toolId = "response-surface", toolName = "Response Surface", phase = 4 }: Props) {
  const [factorNames, setFactorNames] = useState(["Faktor A", "Faktor B"]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [currentFactors, setCurrentFactors] = useState<string[]>(["", ""]);
  const [currentResponse, setCurrentResponse] = useState("");
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const addFactor = () => {
    setFactorNames([...factorNames, `Faktor ${String.fromCharCode(65 + factorNames.length)}`]);
    setCurrentFactors([...currentFactors, ""]);
  };

  const addRun = () => {
    const factors = currentFactors.map(f => parseFloat(f));
    const response = parseFloat(currentResponse);
    if (factors.some(isNaN) || isNaN(response)) return;
    setRuns([...runs, { id: crypto.randomUUID(), factors, response }]);
    setCurrentFactors(currentFactors.map(() => ""));
    setCurrentResponse("");
  };

  const hasResult = runs.length >= 3;
  const responses = runs.map(r => r.response);
  const bestRun = runs.length ? runs.reduce((best, r) => r.response > best.response ? r : best, runs[0]) : null;
  const worstRun = runs.length ? runs.reduce((worst, r) => r.response < worst.response ? r : worst, runs[0]) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 flex-wrap">
        {factorNames.map((name, i) => (
          <div key={i} className="space-y-1 flex-1 min-w-20">
            <Label className="text-xs">{name}</Label>
            <Input value={currentFactors[i]} onChange={e => { const f = [...currentFactors]; f[i] = e.target.value; setCurrentFactors(f); }} placeholder="Nivå" className="text-sm" type="number" />
          </div>
        ))}
        <div className="space-y-1 flex-1 min-w-20">
          <Label className="text-xs">Respons (Y)</Label>
          <Input value={currentResponse} onChange={e => setCurrentResponse(e.target.value)} placeholder="Resultat" className="text-sm" type="number" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={addRun} className="gap-1"><Plus className="h-3 w-3" /> Lägg till körning</Button>
        {factorNames.length < 5 && <Button size="sm" variant="outline" onClick={addFactor}>+ Faktor</Button>}
      </div>

      {runs.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-1.5 text-center">#</th>
                {factorNames.map((n, i) => <th key={i} className="p-1.5 text-center">{n}</th>)}
                <th className="p-1.5 text-center">Y</th>
                <th className="p-1.5 w-6"></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, idx) => (
                <tr key={run.id} className={`border-t ${run === bestRun ? "bg-primary/5" : ""}`}>
                  <td className="p-1.5 text-center text-muted-foreground">{idx + 1}</td>
                  {run.factors.map((f, i) => <td key={i} className="p-1.5 text-center font-mono">{f}</td>)}
                  <td className="p-1.5 text-center font-mono font-medium">{run.response}{run === bestRun && " ⭐"}</td>
                  <td className="p-1.5"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRuns(runs.filter(r => r.id !== run.id))}><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasResult && bestRun && (
        <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
          <div className="font-medium">Bästa inställning (maximerar Y={bestRun.response}):</div>
          <div className="text-muted-foreground">{factorNames.map((n, i) => `${n}=${bestRun.factors[i]}`).join(", ")}</div>
          <div className="text-muted-foreground">Spann: {Math.min(...responses).toFixed(2)} → {Math.max(...responses).toFixed(2)} (Δ={((Math.max(...responses) - Math.min(...responses))).toFixed(2)})</div>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { factorNames, runs }, results: { bestSettings: bestRun ? Object.fromEntries(factorNames.map((n, i) => [n, bestRun.factors[i]])) : {}, bestResponse: bestRun?.response, totalRuns: runs.length } })} />
    </div>
  );
}
