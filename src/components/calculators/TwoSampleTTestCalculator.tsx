import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { CalculatorLoadButton } from "./CalculatorLoadButton";

const getTCritical = (df: number): number => {
  if (df >= 100) return 1.96;
  const table: Record<number, number> = {
    2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.000,
  };
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (const key of keys) { if (df <= key) return table[key]; }
  return 1.96;
};

export function TwoSampleTTestCalculator({ toolId = "t-test-2sample" }: { toolId?: string; toolName?: string; phase?: number }) {
  const [mean1, setMean1] = useState("");
  const [std1, setStd1] = useState("");
  const [n1, setN1] = useState("");
  const [mean2, setMean2] = useState("");
  const [std2, setStd2] = useState("");
  const [n2, setN2] = useState("");
  const [result, setResult] = useState<{
    t: number; df: number; tCrit: number; significant: boolean; pApprox: string;
    ci: { lower: number; upper: number }; diff: number;
  } | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.mean1 !== undefined) setMean1(String(inputs.mean1));
    if (inputs.std1 !== undefined) setStd1(String(inputs.std1));
    if (inputs.n1 !== undefined) setN1(String(inputs.n1));
    if (inputs.mean2 !== undefined) setMean2(String(inputs.mean2));
    if (inputs.std2 !== undefined) setStd2(String(inputs.std2));
    if (inputs.n2 !== undefined) setN2(String(inputs.n2));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const loadExample = () => {
    setMean1("50.3"); setStd1("2.1"); setN1("25");
    setMean2("48.7"); setStd2("2.5"); setN2("30");
    setResult(null);
  };

  const calculate = () => {
    const m1 = parseFloat(mean1), s1 = parseFloat(std1), nn1 = parseInt(n1);
    const m2 = parseFloat(mean2), s2 = parseFloat(std2), nn2 = parseInt(n2);
    if ([m1, s1, nn1, m2, s2, nn2].some(isNaN) || nn1 < 2 || nn2 < 2 || s1 === 0 || s2 === 0) return;

    const diff = m1 - m2;
    const se = Math.sqrt((s1 * s1) / nn1 + (s2 * s2) / nn2);
    const t = diff / se;

    // Welch's df
    const num = Math.pow((s1 * s1) / nn1 + (s2 * s2) / nn2, 2);
    const den = Math.pow((s1 * s1) / nn1, 2) / (nn1 - 1) + Math.pow((s2 * s2) / nn2, 2) / (nn2 - 1);
    const df = Math.floor(num / den);

    const tCrit = getTCritical(df);
    const significant = Math.abs(t) > tCrit;
    const absT = Math.abs(t);
    let pApprox = "p > 0.10";
    if (absT > 3.5) pApprox = "p < 0.001";
    else if (absT > 2.8) pApprox = "p < 0.01";
    else if (absT > tCrit) pApprox = "p < 0.05";
    else if (absT > 1.7) pApprox = "p < 0.10";

    const margin = tCrit * se;
    setResult({ t, df, tCrit, significant, pApprox, ci: { lower: diff - margin, upper: diff + margin }, diff });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "t-test-2sample", toolName: "2-sample t-test", phase: 3,
      inputs: { mean1: parseFloat(mean1), std1: parseFloat(std1), n1: parseInt(n1), mean2: parseFloat(mean2), std2: parseFloat(std2), n2: parseInt(n2) },
      results: result,
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadExample}>
          <Sparkles className="h-3 w-3" /> Exempeldata
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">Grupp 1</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1"><Label className="text-xs">Medelvärde</Label><Input type="number" step="0.01" value={mean1} onChange={(e) => setMean1(e.target.value)} className="h-8 text-sm" placeholder="X̄₁" /></div>
          <div className="space-y-1"><Label className="text-xs">Std.avv.</Label><Input type="number" step="0.01" value={std1} onChange={(e) => setStd1(e.target.value)} className="h-8 text-sm" placeholder="s₁" /></div>
          <div className="space-y-1"><Label className="text-xs">n</Label><Input type="number" min="2" value={n1} onChange={(e) => setN1(e.target.value)} className="h-8 text-sm" /></div>
        </div>
        <p className="text-xs font-semibold text-muted-foreground">Grupp 2</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1"><Label className="text-xs">Medelvärde</Label><Input type="number" step="0.01" value={mean2} onChange={(e) => setMean2(e.target.value)} className="h-8 text-sm" placeholder="X̄₂" /></div>
          <div className="space-y-1"><Label className="text-xs">Std.avv.</Label><Input type="number" step="0.01" value={std2} onChange={(e) => setStd2(e.target.value)} className="h-8 text-sm" placeholder="s₂" /></div>
          <div className="space-y-1"><Label className="text-xs">n</Label><Input type="number" min="2" value={n2} onChange={(e) => setN2(e.target.value)} className="h-8 text-sm" /></div>
        </div>
      </div>

      <Button onClick={calculate} size="sm" className="w-full">Beräkna 2-sample t-test</Button>

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">t-värde (Welch)</div>
            <div className="text-3xl font-bold font-mono">{result.t.toFixed(3)}</div>
            <Badge variant={result.significant ? "destructive" : "default"} className="mt-2">
              {result.significant ? "✗ Signifikant skillnad" : "✓ Ingen signifikant skillnad"}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">df</div><div className="font-mono">{result.df}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">t-krit</div><div className="font-mono">±{result.tCrit.toFixed(3)}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">p-värde</div><div className="font-mono">{result.pApprox}</div></div>
          </div>
          <div className="p-3 bg-muted/30 rounded">
            <div className="text-xs text-muted-foreground">95% KI för skillnaden (μ₁ - μ₂)</div>
            <div className="font-mono text-sm">[{result.ci.lower.toFixed(3)}, {result.ci.upper.toFixed(3)}]</div>
          </div>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={!!result} notes={notes} onNotesChange={setNotes} onSave={handleSave} />
    </div>
  );
}
