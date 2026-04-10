import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function EWMAChart({ toolId = "ewma", toolName = "EWMA Chart", phase = 5 }: Props) {
  const [rawData, setRawData] = useState("");
  const [lambda, setLambda] = useState("0.2");
  const [lFactor, setLFactor] = useState("3");
  const [result, setResult] = useState<{ ewma: number[]; ucl: number[]; lcl: number[]; mean: number; stdDev: number; signals: number[] } | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.data) setRawData(String(inputs.data));
    if (inputs.lambda) setLambda(String(inputs.lambda));
    if (inputs.lFactor) setLFactor(String(inputs.lFactor));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const calculate = () => {
    const values = rawData.split(/[,;\s\n]+/).map(Number).filter(v => !isNaN(v));
    if (values.length < 5) return;

    const mu = values.reduce((a, b) => a + b, 0) / values.length;
    const sigma = Math.sqrt(values.reduce((s, v) => s + (v - mu) ** 2, 0) / (values.length - 1));
    const lam = parseFloat(lambda);
    const L = parseFloat(lFactor);

    const ewma: number[] = [];
    const ucl: number[] = [];
    const lcl: number[] = [];
    const signals: number[] = [];

    values.forEach((v, i) => {
      const prev = i > 0 ? ewma[i - 1] : mu;
      ewma.push(lam * v + (1 - lam) * prev);
      const factor = sigma * L * Math.sqrt((lam / (2 - lam)) * (1 - Math.pow(1 - lam, 2 * (i + 1))));
      ucl.push(mu + factor);
      lcl.push(mu - factor);
      if (ewma[i] > ucl[i] || ewma[i] < lcl[i]) signals.push(i + 1);
    });

    setResult({ ewma, ucl, lcl, mean: mu, stdDev: sigma, signals });
  };

  const allVals = result ? [...result.ewma, ...result.ucl, ...result.lcl] : [];
  const minVal = allVals.length ? Math.min(...allVals) : 0;
  const maxVal = allVals.length ? Math.max(...allVals) : 1;
  const range = maxVal - minVal || 1;

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="space-y-1">
        <Label className="text-xs">Data (komma- eller mellanslagsseparerad)</Label>
        <textarea value={rawData} onChange={e => setRawData(e.target.value)} placeholder="10.2, 10.5, 10.1, 10.8, 11.2..." className="w-full text-sm p-2 border rounded-md h-16 resize-none bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">λ (vikningsfaktor, 0.05-0.3)</Label>
          <Input value={lambda} onChange={e => setLambda(e.target.value)} className="text-sm" type="number" step="0.05" min="0.05" max="1" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">L (kontrollgränser, σ-enheter)</Label>
          <Input value={lFactor} onChange={e => setLFactor(e.target.value)} className="text-sm" type="number" step="0.5" />
        </div>
      </div>
      <Button size="sm" onClick={calculate}>Beräkna EWMA</Button>

      {result && (
        <div className="space-y-2">
          <div className="border rounded-lg p-3 bg-muted/20 h-32 relative">
            <div className="absolute left-2 right-2 top-2 bottom-2">
              {result.ucl.map((v, i) => (
                <div key={`u${i}`} className="absolute w-1 h-1 rounded-full bg-destructive/40" style={{ left: `${(i / (result.ewma.length - 1)) * 100}%`, top: `${(1 - (v - minVal) / range) * 100}%` }} />
              ))}
              {result.lcl.map((v, i) => (
                <div key={`l${i}`} className="absolute w-1 h-1 rounded-full bg-destructive/40" style={{ left: `${(i / (result.ewma.length - 1)) * 100}%`, top: `${(1 - (v - minVal) / range) * 100}%` }} />
              ))}
              <div className="absolute left-0 right-0 border-t border-muted-foreground/30" style={{ top: `${(1 - (result.mean - minVal) / range) * 100}%` }} />
              {result.ewma.map((v, i) => (
                <div key={`e${i}`} className={`absolute w-1.5 h-1.5 rounded-full ${result.signals.includes(i + 1) ? "bg-destructive" : "bg-primary"}`} style={{ left: `${(i / (result.ewma.length - 1)) * 100}%`, top: `${(1 - (v - minVal) / range) * 100}%` }} />
              ))}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-xs grid grid-cols-3 gap-2 text-center">
            <div><div className="font-medium">{result.mean.toFixed(3)}</div><div className="text-muted-foreground">μ</div></div>
            <div><div className="font-medium">{result.stdDev.toFixed(3)}</div><div className="text-muted-foreground">σ</div></div>
            <div><div className={`font-medium ${result.signals.length > 0 ? "text-destructive" : "text-primary"}`}>{result.signals.length}</div><div className="text-muted-foreground">Signaler</div></div>
          </div>
          {result.signals.length > 0 && <div className="text-xs text-destructive">⚠️ Signal vid observation: {result.signals.join(", ")}</div>}
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={!!result} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { data: rawData, lambda, lFactor }, results: result || {} })} />
    </div>
  );
}
