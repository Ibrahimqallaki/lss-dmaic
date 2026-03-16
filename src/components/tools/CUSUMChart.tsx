import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function CUSUMChart({ toolId = "cusum", toolName = "CUSUM Chart", phase = 5 }: Props) {
  const [rawData, setRawData] = useState("");
  const [target, setTarget] = useState("");
  const [k, setK] = useState("0.5");
  const [h, setH] = useState("4");
  const [result, setResult] = useState<{ cusumPos: number[]; cusumNeg: number[]; signals: number[]; mean: number; stdDev: number } | null>(null);
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const calculate = () => {
    const values = rawData.split(/[,;\s\n]+/).map(Number).filter(v => !isNaN(v));
    if (values.length < 5) return;

    const mu0 = target ? parseFloat(target) : values.reduce((a, b) => a + b, 0) / values.length;
    const sigma = Math.sqrt(values.reduce((s, v) => s + (v - mu0) ** 2, 0) / (values.length - 1));
    const K = parseFloat(k) * sigma;
    const H = parseFloat(h) * sigma;

    const cusumPos: number[] = [];
    const cusumNeg: number[] = [];
    const signals: number[] = [];

    values.forEach((v, i) => {
      const prev_pos = i > 0 ? cusumPos[i - 1] : 0;
      const prev_neg = i > 0 ? cusumNeg[i - 1] : 0;
      cusumPos.push(Math.max(0, prev_pos + (v - mu0) - K));
      cusumNeg.push(Math.min(0, prev_neg + (v - mu0) + K));
      if (cusumPos[i] > H || cusumNeg[i] < -H) signals.push(i + 1);
    });

    setResult({ cusumPos, cusumNeg, signals, mean: mu0, stdDev: sigma });
  };

  const maxVal = result ? Math.max(...result.cusumPos.map(Math.abs), ...result.cusumNeg.map(Math.abs), parseFloat(h) * result.stdDev) : 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Data (komma- eller mellanslagsseparerad)</Label>
        <textarea value={rawData} onChange={e => setRawData(e.target.value)} placeholder="10.2, 10.5, 10.1, 10.8, 11.2, 10.9..." className="w-full text-sm p-2 border rounded-md h-16 resize-none bg-background" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Målvärde (μ₀)</Label>
          <Input value={target} onChange={e => setTarget(e.target.value)} placeholder="Auto" className="text-sm" type="number" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">k (slack, σ-enheter)</Label>
          <Input value={k} onChange={e => setK(e.target.value)} className="text-sm" type="number" step="0.1" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">h (beslutsgräns, σ-enheter)</Label>
          <Input value={h} onChange={e => setH(e.target.value)} className="text-sm" type="number" step="0.5" />
        </div>
      </div>
      <Button size="sm" onClick={calculate}>Beräkna CUSUM</Button>

      {result && (
        <div className="space-y-2">
          <div className="border rounded-lg p-3 bg-muted/20 h-32 relative">
            <div className="absolute left-8 right-2 top-2 bottom-2">
              <div className="absolute left-0 right-0 border-t border-dashed border-destructive/50" style={{ top: `${50 - (parseFloat(h) * result.stdDev / maxVal) * 45}%` }}>
                <span className="absolute -left-7 -top-2 text-[8px] text-destructive">+H</span>
              </div>
              <div className="absolute left-0 right-0 border-t border-dashed border-destructive/50" style={{ top: `${50 + (parseFloat(h) * result.stdDev / maxVal) * 45}%` }}>
                <span className="absolute -left-7 -top-2 text-[8px] text-destructive">-H</span>
              </div>
              <div className="absolute left-0 right-0 top-1/2 border-t border-muted-foreground/30" />
              {result.cusumPos.map((v, i) => (
                <div key={`p${i}`} className={`absolute w-1.5 h-1.5 rounded-full ${result.signals.includes(i + 1) ? "bg-destructive" : "bg-primary"}`} style={{ left: `${(i / (result.cusumPos.length - 1)) * 100}%`, top: `${50 - (v / maxVal) * 45}%` }} />
              ))}
              {result.cusumNeg.map((v, i) => (
                <div key={`n${i}`} className={`absolute w-1.5 h-1.5 rounded-full ${result.signals.includes(i + 1) ? "bg-destructive" : "bg-blue-500"}`} style={{ left: `${(i / (result.cusumNeg.length - 1)) * 100}%`, top: `${50 - (v / maxVal) * 45}%` }} />
              ))}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-xs grid grid-cols-3 gap-2 text-center">
            <div><div className="font-medium">{result.mean.toFixed(3)}</div><div className="text-muted-foreground">μ₀</div></div>
            <div><div className="font-medium">{result.stdDev.toFixed(3)}</div><div className="text-muted-foreground">σ</div></div>
            <div><div className={`font-medium ${result.signals.length > 0 ? "text-destructive" : "text-primary"}`}>{result.signals.length}</div><div className="text-muted-foreground">Signaler</div></div>
          </div>
          {result.signals.length > 0 && <div className="text-xs text-destructive">⚠️ Signal vid observation: {result.signals.join(", ")}</div>}
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={!!result} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { data: rawData, target, k, h }, results: result || {} })} />
    </div>
  );
}