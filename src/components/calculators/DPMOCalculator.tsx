import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { sigmaTable } from "@/data/dmaic-tools";

export function DPMOCalculator() {
  const [defects, setDefects] = useState("");
  const [units, setUnits] = useState("");
  const [opportunities, setOpportunities] = useState("");
  const [result, setResult] = useState<{ dpmo: number; sigma: number; yield: number } | null>(null);

  const calculate = () => {
    const d = parseFloat(defects);
    const u = parseFloat(units);
    const o = parseFloat(opportunities);

    if (isNaN(d) || isNaN(u) || isNaN(o) || u === 0 || o === 0) return;

    const dpmo = (d / (u * o)) * 1000000;
    
    let sigma = 0;
    for (let i = sigmaTable.length - 1; i >= 0; i--) {
      if (dpmo <= sigmaTable[i].dpmo) {
        sigma = sigmaTable[i].sigma;
        break;
      }
    }

    const actualYield = (1 - d / (u * o)) * 100;

    setResult({ dpmo: Math.round(dpmo), sigma, yield: actualYield });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="dpmo-defects" className="text-xs">Defekter</Label>
          <Input
            id="dpmo-defects"
            type="number"
            placeholder="15"
            value={defects}
            onChange={(e) => setDefects(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dpmo-units" className="text-xs">Enheter</Label>
          <Input
            id="dpmo-units"
            type="number"
            placeholder="1000"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dpmo-opp" className="text-xs">Möjligheter</Label>
          <Input
            id="dpmo-opp"
            type="number"
            placeholder="5"
            value={opportunities}
            onChange={(e) => setOpportunities(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna</Button>

      {result && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg text-center">
          <div>
            <div className="text-xs text-muted-foreground">DPMO</div>
            <div className="text-lg font-bold font-mono">{result.dpmo.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Sigma</div>
            <div className="text-lg font-bold">{result.sigma}σ</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Utbyte</div>
            <div className="text-lg font-bold">{result.yield.toFixed(2)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
