import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { CalculatorLoadButton } from "./CalculatorLoadButton";

const EXAMPLE_DATA = {
  usl: "10.5",
  lsl: "9.5",
  mean: "10.05",
  stdDev: "0.12",
};

export function CpCpkCalculator({ toolId = "capability-cpk" }: { toolId?: string; toolName?: string; phase?: number }) {
  const [usl, setUsl] = useState("");
  const [lsl, setLsl] = useState("");
  const [mean, setMean] = useState("");
  const [stdDev, setStdDev] = useState("");
  const [result, setResult] = useState<{ cp: number; cpk: number; cpu: number; cpl: number } | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.usl !== undefined) setUsl(String(inputs.usl));
    if (inputs.lsl !== undefined) setLsl(String(inputs.lsl));
    if (inputs.mean !== undefined) setMean(String(inputs.mean));
    if (inputs.stdDev !== undefined) setStdDev(String(inputs.stdDev));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const loadExample = () => {
    setUsl(EXAMPLE_DATA.usl);
    setLsl(EXAMPLE_DATA.lsl);
    setMean(EXAMPLE_DATA.mean);
    setStdDev(EXAMPLE_DATA.stdDev);
    setResult(null);
  };

  const calculate = () => {
    const USL = parseFloat(usl);
    const LSL = parseFloat(lsl);
    const μ = parseFloat(mean);
    const σ = parseFloat(stdDev);

    if (isNaN(USL) || isNaN(LSL) || isNaN(μ) || isNaN(σ) || σ === 0) return;

    const cp = (USL - LSL) / (6 * σ);
    const cpu = (USL - μ) / (3 * σ);
    const cpl = (μ - LSL) / (3 * σ);
    const cpk = Math.min(cpu, cpl);

    setResult({ cp, cpk, cpu, cpl });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "capability-cpk",
      toolName: "Processduglighet (Cp/Cpk)",
      phase: 2,
      inputs: { usl: parseFloat(usl), lsl: parseFloat(lsl), mean: parseFloat(mean), stdDev: parseFloat(stdDev) },
      results: result,
    });
  };

  const getStatusBadge = (value: number) => {
    if (value >= 1.33) return <span className="text-green-600 dark:text-green-400 font-medium">✓ Kapabel</span>;
    if (value >= 1) return <span className="text-yellow-600 dark:text-yellow-400 font-medium">⚠ Marginal</span>;
    return <span className="text-red-600 dark:text-red-400 font-medium">✗ Ej kapabel</span>;
  };

  const getInterpretation = () => {
    if (!result) return null;
    const issues = [];
    if (result.cpk < 1.33) {
      if (result.cp >= 1.33 && result.cpk < result.cp - 0.1) {
        issues.push("Processen har potential men är inte centrerad korrekt.");
      } else {
        issues.push("Processen har för stor variation i förhållande till toleransgränserna.");
      }
    }
    if (result.cpu < result.cpl) {
      issues.push("Processen tenderar mot övre gränsen (USL).");
    } else if (result.cpl < result.cpu) {
      issues.push("Processen tenderar mot nedre gränsen (LSL).");
    }
    return issues;
  };

  return (
    <div className="space-y-4 pt-2">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadExample}>
          <Sparkles className="h-3 w-3" />
          Exempeldata
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cp-usl" className="text-xs">USL (Övre gräns)</Label>
          <Input
            id="cp-usl"
            type="number"
            step="0.01"
            placeholder="10.5"
            value={usl}
            onChange={(e) => setUsl(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-lsl" className="text-xs">LSL (Nedre gräns)</Label>
          <Input
            id="cp-lsl"
            type="number"
            step="0.01"
            placeholder="9.5"
            value={lsl}
            onChange={(e) => setLsl(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-mean" className="text-xs">Medelvärde (μ)</Label>
          <Input
            id="cp-mean"
            type="number"
            step="0.01"
            placeholder="10.0"
            value={mean}
            onChange={(e) => setMean(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-stddev" className="text-xs">Standardavvikelse (σ)</Label>
          <Input
            id="cp-stddev"
            type="number"
            step="0.001"
            placeholder="0.15"
            value={stdDev}
            onChange={(e) => setStdDev(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna</Button>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
            <div className="text-center p-2 bg-background rounded border">
              <div className="text-xs text-muted-foreground">Cp (Potential)</div>
              <div className="text-2xl font-bold tabular-nums">{result.cp.toFixed(2)}</div>
              <div className="text-xs">{getStatusBadge(result.cp)}</div>
            </div>
            <div className="text-center p-2 bg-background rounded border">
              <div className="text-xs text-muted-foreground">Cpk (Faktisk)</div>
              <div className="text-2xl font-bold tabular-nums">{result.cpk.toFixed(2)}</div>
              <div className="text-xs">{getStatusBadge(result.cpk)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">Cpu: </span>
              <span className="font-mono font-medium">{result.cpu.toFixed(3)}</span>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">Cpl: </span>
              <span className="font-mono font-medium">{result.cpl.toFixed(3)}</span>
            </div>
          </div>

          {getInterpretation()?.map((issue, i) => (
            <p key={i} className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              💡 {issue}
            </p>
          ))}
        </div>
      )}

      <CalculatorSaveButton
        canSave={canSave}
        isSaving={isSaving}
        hasResult={!!result}
        notes={notes}
        onNotesChange={setNotes}
        onSave={handleSave}
      />
    </div>
  );
}
