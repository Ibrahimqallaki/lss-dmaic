import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { toast } from "sonner";

interface DataPoint { id: string; withinUnit: string; betweenUnit: string; temporal: string; value: number; }

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function MultiVariAnalysis({ toolId = "multi-vari", toolName = "Multi-Vari-analys", phase = 3 }: Props) {
  const [points, setPoints] = useState<DataPoint[]>([]);
  const [form, setForm] = useState({ withinUnit: "", betweenUnit: "", temporal: "", value: "" });
  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculations, isLoadingSaved } = useCalculatorSave(toolId);

  const addPoint = () => {
    const val = parseFloat(form.value);
    if (isNaN(val)) return;
    setPoints([...points, { id: crypto.randomUUID(), ...form, value: val }]);
    setForm({ ...form, value: "" });
  };

  const handleLoad = (inputs: Record<string, unknown>) => {
    const loaded = inputs.points as any[];
    if (Array.isArray(loaded)) {
      setPoints(loaded.map(p => ({ id: crypto.randomUUID(), withinUnit: String(p.withinUnit || ""), betweenUnit: String(p.betweenUnit || ""), temporal: String(p.temporal || ""), value: Number(p.value) || 0 })));
      toast.success("Sparad beräkning laddad!");
    }
  };

  const hasResult = points.length >= 3;
  const values = points.map(p => p.value);
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const stdDev = values.length > 1 ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)) : 0;

  const withinGroups = [...new Set(points.map(p => p.withinUnit))];
  const betweenGroups = [...new Set(points.map(p => p.betweenUnit))];
  const temporalGroups = [...new Set(points.map(p => p.temporal))];

  const groupVariance = (groups: string[], getGroup: (p: DataPoint) => string) => {
    if (groups.length <= 1) return 0;
    const groupMeans = groups.map(g => { const gv = points.filter(p => getGroup(p) === g).map(p => p.value); return gv.length ? gv.reduce((a, b) => a + b, 0) / gv.length : 0; });
    return groupMeans.reduce((s, m) => s + (m - mean) ** 2, 0) / groups.length;
  };

  const withinVar = groupVariance(withinGroups, p => p.withinUnit);
  const betweenVar = groupVariance(betweenGroups, p => p.betweenUnit);
  const temporalVar = groupVariance(temporalGroups, p => p.temporal);
  const totalVar = withinVar + betweenVar + temporalVar || 1;

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculations={savedCalculations} isLoading={isLoadingSaved} onLoad={handleLoad} />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Inom enhet (position/mätpunkt)</Label><Input value={form.withinUnit} onChange={e => setForm({ ...form, withinUnit: e.target.value })} placeholder="T.ex. Topp, Mitten, Botten" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Mellan enheter (enhet/batch)</Label><Input value={form.betweenUnit} onChange={e => setForm({ ...form, betweenUnit: e.target.value })} placeholder="T.ex. Enhet 1, Enhet 2" className="text-sm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Temporal (tidpunkt)</Label><Input value={form.temporal} onChange={e => setForm({ ...form, temporal: e.target.value })} placeholder="T.ex. FM, EM" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Mätvärde</Label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="10.5" className="text-sm" /></div>
      </div>
      <Button size="sm" onClick={addPoint} disabled={!form.value} className="gap-1"><Plus className="h-3 w-3" /> Lägg till mätpunkt</Button>

      {points.length > 0 && (
        <div className="border rounded-lg overflow-x-auto max-h-40 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0"><tr><th className="p-1.5 text-left">Inom</th><th className="p-1.5 text-left">Mellan</th><th className="p-1.5 text-left">Tid</th><th className="p-1.5 text-right">Värde</th><th className="p-1.5 w-6"></th></tr></thead>
            <tbody>
              {points.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-1.5">{p.withinUnit || "–"}</td><td className="p-1.5">{p.betweenUnit || "–"}</td><td className="p-1.5">{p.temporal || "–"}</td><td className="p-1.5 text-right font-mono">{p.value}</td>
                  <td className="p-1.5"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPoints(points.filter(x => x.id !== p.id))}><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasResult && (
        <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><div className="font-medium">{mean.toFixed(3)}</div><div className="text-muted-foreground">Medelvärde</div></div>
            <div><div className="font-medium">{stdDev.toFixed(3)}</div><div className="text-muted-foreground">Std.avvikelse</div></div>
            <div><div className="font-medium">{points.length}</div><div className="text-muted-foreground">Mätpunkter</div></div>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Variationsfördelning:</p>
            {[{ label: "Inom enhet", val: withinVar }, { label: "Mellan enheter", val: betweenVar }, { label: "Temporal", val: temporalVar }].map(v => (
              <div key={v.label} className="flex items-center gap-2">
                <span className="w-28">{v.label}</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(v.val / totalVar * 100).toFixed(0)}%` }} /></div>
                <span className="w-12 text-right">{(v.val / totalVar * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { points }, results: { mean, stdDev, n: points.length, withinPct: (withinVar / totalVar * 100), betweenPct: (betweenVar / totalVar * 100), temporalPct: (temporalVar / totalVar * 100) } })} />
    </div>
  );
}
