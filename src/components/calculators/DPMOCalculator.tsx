import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { sigmaTable } from "@/data/dmaic-tools";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { CalculatorLoadButton } from "./CalculatorLoadButton";

const EXAMPLES = {
  manufacturing: { defects: "42", units: "1000", opportunities: "5", label: "Tillverkning" },
  service: { defects: "15", units: "500", opportunities: "8", label: "Tjänsteprocess" },
  assembly: { defects: "8", units: "2000", opportunities: "3", label: "Montering" },
};

export function DPMOCalculator({ toolId = "dpmo" }: { toolId?: string; toolName?: string; phase?: number }) {
  const [defects, setDefects] = useState("");
  const [units, setUnits] = useState("");
  const [opportunities, setOpportunities] = useState("");
  const [result, setResult] = useState<{ dpmo: number; sigma: number; yield: number; dpu: number } | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.defects !== undefined) setDefects(String(inputs.defects));
    if (inputs.units !== undefined) setUnits(String(inputs.units));
    if (inputs.opportunities !== undefined) setOpportunities(String(inputs.opportunities));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const loadExample = (example: keyof typeof EXAMPLES) => {
    const data = EXAMPLES[example];
    setDefects(data.defects);
    setUnits(data.units);
    setOpportunities(data.opportunities);
    setResult(null);
  };

  const calculate = () => {
    const d = parseFloat(defects);
    const u = parseFloat(units);
    const o = parseFloat(opportunities);

    if (isNaN(d) || isNaN(u) || isNaN(o) || u === 0 || o === 0) return;

    const dpmo = (d / (u * o)) * 1000000;
    const dpu = d / u;
    
    let sigma = 0;
    for (let i = sigmaTable.length - 1; i >= 0; i--) {
      if (dpmo <= sigmaTable[i].dpmo) {
        sigma = sigmaTable[i].sigma;
        break;
      }
    }

    const actualYield = (1 - d / (u * o)) * 100;

    setResult({ dpmo: Math.round(dpmo), sigma, yield: actualYield, dpu });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "dpmo",
      toolName: "DPMO & Sigma-nivå",
      phase: 2,
      inputs: { defects: parseFloat(defects), units: parseFloat(units), opportunities: parseFloat(opportunities) },
      results: result,
    });
  };

  const getSigmaColor = (sigma: number) => {
    if (sigma >= 5) return "text-green-600 dark:text-green-400";
    if (sigma >= 4) return "text-emerald-600 dark:text-emerald-400";
    if (sigma >= 3) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getSigmaDescription = (sigma: number) => {
    if (sigma >= 6) return "World Class kvalitet";
    if (sigma >= 5) return "Utmärkt kvalitet";
    if (sigma >= 4) return "Bra kvalitet";
    if (sigma >= 3) return "Acceptabel kvalitet";
    if (sigma >= 2) return "Behöver förbättring";
    return "Kritisk nivå";
  };

  return (
    <div className="space-y-4 pt-2">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="flex justify-end gap-1">
        {Object.entries(EXAMPLES).map(([key, data]) => (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => loadExample(key as keyof typeof EXAMPLES)}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {data.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="dpmo-defects" className="text-xs">Antal defekter</Label>
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
          <Label htmlFor="dpmo-units" className="text-xs">Antal enheter</Label>
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
          <Label htmlFor="dpmo-opp" className="text-xs">Möjligheter/enhet</Label>
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
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Sigma-nivå</div>
            <div className={`text-4xl font-bold ${getSigmaColor(result.sigma)}`}>
              {result.sigma}σ
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {getSigmaDescription(result.sigma)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-xs text-muted-foreground">DPMO</div>
              <div className="text-lg font-bold font-mono">{result.dpmo.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-xs text-muted-foreground">Utbyte</div>
              <div className="text-lg font-bold">{result.yield.toFixed(2)}%</div>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-xs text-muted-foreground">DPU</div>
              <div className="text-lg font-bold font-mono">{result.dpu.toFixed(4)}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <strong>Tolkning:</strong> Med {result.dpmo.toLocaleString()} defekter per miljon möjligheter 
            producerar processen {result.yield.toFixed(2)}% felfria möjligheter.
          </div>
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
