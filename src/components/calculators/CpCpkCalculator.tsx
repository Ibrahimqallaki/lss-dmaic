import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CpCpkCalculator() {
  const [usl, setUsl] = useState("");
  const [lsl, setLsl] = useState("");
  const [mean, setMean] = useState("");
  const [stdDev, setStdDev] = useState("");
  const [result, setResult] = useState<{ cp: number; cpk: number; cpu: number; cpl: number } | null>(null);

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

  const getStatusBadge = (value: number) => {
    if (value >= 1.33) return <span className="text-green-600 dark:text-green-400">✓ Kapabel</span>;
    if (value >= 1) return <span className="text-yellow-600 dark:text-yellow-400">⚠ Marginal</span>;
    return <span className="text-red-600 dark:text-red-400">✗ Ej kapabel</span>;
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cp-usl" className="text-xs">USL</Label>
          <Input
            id="cp-usl"
            type="number"
            placeholder="10.5"
            value={usl}
            onChange={(e) => setUsl(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-lsl" className="text-xs">LSL</Label>
          <Input
            id="cp-lsl"
            type="number"
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
            placeholder="10.0"
            value={mean}
            onChange={(e) => setMean(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-stddev" className="text-xs">Std.avv (σ)</Label>
          <Input
            id="cp-stddev"
            type="number"
            placeholder="0.15"
            value={stdDev}
            onChange={(e) => setStdDev(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna</Button>

      {result && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="text-center p-2 bg-background rounded">
            <div className="text-xs text-muted-foreground">Cp</div>
            <div className="text-xl font-bold">{result.cp.toFixed(2)}</div>
            <div className="text-xs">{getStatusBadge(result.cp)}</div>
          </div>
          <div className="text-center p-2 bg-background rounded">
            <div className="text-xs text-muted-foreground">Cpk</div>
            <div className="text-xl font-bold">{result.cpk.toFixed(2)}</div>
            <div className="text-xs">{getStatusBadge(result.cpk)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
