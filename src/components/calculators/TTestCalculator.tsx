import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function TTestCalculator() {
  const [sampleMean, setSampleMean] = useState("");
  const [targetMean, setTargetMean] = useState("");
  const [stdDev, setStdDev] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [result, setResult] = useState<{ t: number; significant: boolean } | null>(null);

  const calculate = () => {
    const xbar = parseFloat(sampleMean);
    const mu0 = parseFloat(targetMean);
    const s = parseFloat(stdDev);
    const n = parseInt(sampleSize);

    if (isNaN(xbar) || isNaN(mu0) || isNaN(s) || isNaN(n) || n < 2 || s === 0) return;

    const t = (xbar - mu0) / (s / Math.sqrt(n));
    
    // Simplified: compare against t-critical for α=0.05, df>30 ≈ 1.96
    const significant = Math.abs(t) > 1.96;

    setResult({ t, significant });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="ttest-xbar" className="text-xs">Stickprovsmedel (X̄)</Label>
          <Input
            id="ttest-xbar"
            type="number"
            placeholder="10.2"
            value={sampleMean}
            onChange={(e) => setSampleMean(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ttest-mu" className="text-xs">Målvärde (μ₀)</Label>
          <Input
            id="ttest-mu"
            type="number"
            placeholder="10.0"
            value={targetMean}
            onChange={(e) => setTargetMean(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ttest-s" className="text-xs">Standardavvikelse</Label>
          <Input
            id="ttest-s"
            type="number"
            placeholder="0.5"
            value={stdDev}
            onChange={(e) => setStdDev(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ttest-n" className="text-xs">Stickprovsstorlek</Label>
          <Input
            id="ttest-n"
            type="number"
            placeholder="30"
            value={sampleSize}
            onChange={(e) => setSampleSize(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna t-värde</Button>

      {result && (
        <div className="p-4 bg-muted/50 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">t-värde</div>
          <div className="text-2xl font-bold font-mono">{result.t.toFixed(3)}</div>
          <div className={`mt-2 text-sm font-medium ${result.significant ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {result.significant 
              ? "⚠ Signifikant skillnad (α = 0.05)" 
              : "✓ Ingen signifikant skillnad"}
          </div>
        </div>
      )}
    </div>
  );
}
