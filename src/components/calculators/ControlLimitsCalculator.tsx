import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ControlLimitsCalculator() {
  const [mean, setMean] = useState("");
  const [stdDev, setStdDev] = useState("");
  const [result, setResult] = useState<{ ucl: number; lcl: number; cl: number } | null>(null);

  const calculate = () => {
    const xbar = parseFloat(mean);
    const sigma = parseFloat(stdDev);

    if (isNaN(xbar) || isNaN(sigma) || sigma <= 0) return;

    const ucl = xbar + 3 * sigma;
    const lcl = xbar - 3 * sigma;

    setResult({ ucl, lcl, cl: xbar });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cl-mean" className="text-xs">Medelvärde (X̄)</Label>
          <Input
            id="cl-mean"
            type="number"
            placeholder="50.0"
            value={mean}
            onChange={(e) => setMean(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cl-sigma" className="text-xs">Standardavvikelse (σ)</Label>
          <Input
            id="cl-sigma"
            type="number"
            placeholder="2.5"
            value={stdDev}
            onChange={(e) => setStdDev(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna gränser</Button>

      {result && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between items-center text-red-600 dark:text-red-400">
            <span className="text-sm">UCL (övre):</span>
            <span className="font-bold font-mono">{result.ucl.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">CL (medel):</span>
            <span className="font-bold font-mono">{result.cl.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
            <span className="text-sm">LCL (nedre):</span>
            <span className="font-bold font-mono">{result.lcl.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
