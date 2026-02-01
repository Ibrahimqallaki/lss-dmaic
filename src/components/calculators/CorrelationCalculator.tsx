import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CorrelationCalculator() {
  const [xValues, setXValues] = useState("");
  const [yValues, setYValues] = useState("");
  const [result, setResult] = useState<{ r: number; r2: number; strength: string } | null>(null);

  const calculate = () => {
    const x = xValues.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
    const y = yValues.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));

    if (x.length < 2 || y.length < 2 || x.length !== y.length) return;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return;

    const r = numerator / denominator;
    const r2 = r * r;

    let strength = "Inget";
    const absR = Math.abs(r);
    if (absR >= 0.9) strength = "Mycket starkt";
    else if (absR >= 0.7) strength = "Starkt";
    else if (absR >= 0.5) strength = "Måttligt";
    else if (absR >= 0.3) strength = "Svagt";

    setResult({ r, r2, strength });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="corr-x" className="text-xs">X-värden (kommaseparerade)</Label>
          <Input
            id="corr-x"
            type="text"
            placeholder="1, 2, 3, 4, 5"
            value={xValues}
            onChange={(e) => setXValues(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="corr-y" className="text-xs">Y-värden (kommaseparerade)</Label>
          <Input
            id="corr-y"
            type="text"
            placeholder="2.1, 4.2, 5.8, 8.1, 9.9"
            value={yValues}
            onChange={(e) => setYValues(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna korrelation</Button>

      {result && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">r (Pearson)</div>
              <div className="text-xl font-bold font-mono">{result.r.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">R²</div>
              <div className="text-xl font-bold font-mono">{result.r2.toFixed(3)}</div>
            </div>
          </div>
          <div className="text-center mt-3 text-sm">
            <span className="text-muted-foreground">Samband: </span>
            <span className="font-medium">{result.strength} {result.r >= 0 ? "positivt" : "negativt"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
