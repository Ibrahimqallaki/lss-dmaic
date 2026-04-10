import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { CalculatorLoadButton } from "./CalculatorLoadButton";

const EXAMPLE = {
  operators: "3",
  parts: "10",
  trials: "3",
  data: `5.12 5.13 5.14
5.10 5.11 5.10
5.15 5.16 5.14
5.08 5.09 5.08
5.20 5.19 5.21
5.11 5.12 5.11
5.14 5.13 5.15
5.09 5.10 5.09
5.17 5.18 5.17
5.13 5.14 5.13
5.13 5.14 5.15
5.11 5.10 5.11
5.14 5.15 5.14
5.09 5.08 5.09
5.21 5.20 5.22
5.12 5.11 5.12
5.15 5.14 5.16
5.10 5.09 5.10
5.18 5.17 5.18
5.14 5.13 5.14
5.14 5.15 5.13
5.12 5.11 5.12
5.16 5.15 5.16
5.10 5.09 5.10
5.22 5.21 5.23
5.13 5.12 5.13
5.16 5.15 5.17
5.11 5.10 5.11
5.19 5.18 5.19
5.15 5.14 5.15`,
};

interface GageRRResult {
  repeatability: number;
  reproducibility: number;
  gageRR: number;
  partVariation: number;
  totalVariation: number;
  percentRR: number;
  percentPart: number;
  ndc: number;
  verdict: string;
}

export function GageRRCalculator({ toolId = "gage-rr" }: { toolId?: string; toolName?: string; phase?: number }) {
  const [operators, setOperators] = useState("");
  const [parts, setParts] = useState("");
  const [trials, setTrials] = useState("");
  const [data, setData] = useState("");
  const [result, setResult] = useState<GageRRResult | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.operators !== undefined) setOperators(String(inputs.operators));
    if (inputs.parts !== undefined) setParts(String(inputs.parts));
    if (inputs.trials !== undefined) setTrials(String(inputs.trials));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const loadExample = () => {
    setOperators(EXAMPLE.operators);
    setParts(EXAMPLE.parts);
    setTrials(EXAMPLE.trials);
    setData(EXAMPLE.data);
    setResult(null);
  };

  const calculate = () => {
    const nOps = parseInt(operators);
    const nParts = parseInt(parts);
    const nTrials = parseInt(trials);

    if (isNaN(nOps) || isNaN(nParts) || isNaN(nTrials) || nOps < 2 || nParts < 2 || nTrials < 2) return;

    const rows = data.trim().split("\n").filter(r => r.trim());
    const values = rows.map(r => r.split(/[,;\s\t]+/).map(Number).filter(v => !isNaN(v)));

    const expectedRows = nOps * nParts;
    if (values.length < expectedRows) return;

    // Organize data: measurements[operator][part][trial]
    const measurements: number[][][] = [];
    for (let op = 0; op < nOps; op++) {
      measurements[op] = [];
      for (let p = 0; p < nParts; p++) {
        const rowIdx = op * nParts + p;
        measurements[op][p] = values[rowIdx] || [];
      }
    }

    // Calculate averages
    const grandMean = values.flat().reduce((a, b) => a + b, 0) / values.flat().length;

    // Part averages
    const partMeans: number[] = [];
    for (let p = 0; p < nParts; p++) {
      const partValues: number[] = [];
      for (let op = 0; op < nOps; op++) {
        partValues.push(...measurements[op][p]);
      }
      partMeans[p] = partValues.reduce((a, b) => a + b, 0) / partValues.length;
    }

    // Operator averages
    const opMeans: number[] = [];
    for (let op = 0; op < nOps; op++) {
      const opValues = measurements[op].flat();
      opMeans[op] = opValues.reduce((a, b) => a + b, 0) / opValues.length;
    }

    // Within-part ranges per operator (repeatability)
    const ranges: number[] = [];
    for (let op = 0; op < nOps; op++) {
      for (let p = 0; p < nParts; p++) {
        const vals = measurements[op][p];
        if (vals.length > 1) {
          ranges.push(Math.max(...vals) - Math.min(...vals));
        }
      }
    }
    const rBar = ranges.reduce((a, b) => a + b, 0) / ranges.length;

    // d2 constant (approximation for trials)
    const d2Map: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326 };
    const d2 = d2Map[nTrials] || 1.693;

    // Repeatability (Equipment Variation)
    const EV = rBar / d2;

    // Reproducibility (Appraiser Variation)
    const xDiff = Math.max(...opMeans) - Math.min(...opMeans);
    const d2Ops: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059 };
    const d2op = d2Ops[nOps] || 1.693;
    const AVraw = (xDiff / d2op);
    const AVsq = Math.max(0, AVraw * AVraw - (EV * EV) / (nParts * nTrials));
    const AV = Math.sqrt(AVsq);

    // Gage R&R
    const GRR = Math.sqrt(EV * EV + AV * AV);

    // Part variation
    const Rp = Math.max(...partMeans) - Math.min(...partMeans);
    const d2Parts: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 };
    const d2p = d2Parts[nParts] || 3.078;
    const PV = Rp / d2p;

    // Total variation
    const TV = Math.sqrt(GRR * GRR + PV * PV);

    const percentRR = (GRR / TV) * 100;
    const percentPart = (PV / TV) * 100;
    const ndc = Math.floor(1.41 * (PV / GRR));

    let verdict = "Oacceptabelt (>30%)";
    if (percentRR <= 10) verdict = "Acceptabelt (<10%)";
    else if (percentRR <= 30) verdict = "Marginellt (10-30%)";

    setResult({
      repeatability: EV,
      reproducibility: AV,
      gageRR: GRR,
      partVariation: PV,
      totalVariation: TV,
      percentRR,
      percentPart,
      ndc,
      verdict,
    });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "gage-rr",
      toolName: "Gage R&R",
      phase: 2,
      inputs: { operators: parseInt(operators), parts: parseInt(parts), trials: parseInt(trials) },
      results: { ...result } as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadExample}>
          <Sparkles className="h-3 w-3" /> Exempeldata
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Antal operatörer</Label>
          <Input type="number" min="2" value={operators} onChange={(e) => setOperators(e.target.value)} className="h-8 text-sm" placeholder="3" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Antal delar</Label>
          <Input type="number" min="2" value={parts} onChange={(e) => setParts(e.target.value)} className="h-8 text-sm" placeholder="10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Antal mätningar/del</Label>
          <Input type="number" min="2" value={trials} onChange={(e) => setTrials(e.target.value)} className="h-8 text-sm" placeholder="3" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Mätdata (en rad per operatör+del, värden separerade med mellanslag)</Label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-32"
          placeholder="Op1/Del1: 5.12 5.13 5.14&#10;Op1/Del2: 5.10 5.11 5.10&#10;..."
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      <Button onClick={calculate} size="sm" className="w-full">Beräkna Gage R&R</Button>

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">%R&R (Gage R&R / Total Variation)</div>
            <div className="text-3xl font-bold font-mono">{result.percentRR.toFixed(1)}%</div>
            <Badge variant={result.percentRR <= 10 ? "default" : result.percentRR <= 30 ? "secondary" : "destructive"} className="mt-2">
              {result.verdict}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-muted/30 rounded text-center">
              <div className="text-xs text-muted-foreground">Repeterbarhet (EV)</div>
              <div className="font-mono font-medium">{result.repeatability.toFixed(4)}</div>
            </div>
            <div className="p-2 bg-muted/30 rounded text-center">
              <div className="text-xs text-muted-foreground">Reproducerbarhet (AV)</div>
              <div className="font-mono font-medium">{result.reproducibility.toFixed(4)}</div>
            </div>
            <div className="p-2 bg-muted/30 rounded text-center">
              <div className="text-xs text-muted-foreground">Gage R&R</div>
              <div className="font-mono font-medium">{result.gageRR.toFixed(4)}</div>
            </div>
            <div className="p-2 bg-muted/30 rounded text-center">
              <div className="text-xs text-muted-foreground">Delvariation (PV)</div>
              <div className="font-mono font-medium">{result.partVariation.toFixed(4)}</div>
            </div>
          </div>

          <div className="p-3 bg-muted/30 rounded text-center">
            <div className="text-xs text-muted-foreground">Number of Distinct Categories (ndc)</div>
            <div className="font-mono text-xl font-bold">{result.ndc}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {result.ndc >= 5 ? "✓ Acceptabelt (≥5)" : "✗ Otillräckligt (<5)"}
            </div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            💡 {result.percentRR <= 10 
              ? "Mätsystemet har utmärkt precision och kan användas för processtyrning." 
              : result.percentRR <= 30 
              ? "Mätsystemet kan förbättras. Överväg kalibrering eller operatörsutbildning."
              : "Mätsystemet behöver åtgärdas innan processdata kan anses tillförlitlig."}
          </p>
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
