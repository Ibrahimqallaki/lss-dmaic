import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataInput } from "./DataInput";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";

type ChartType = "imr" | "xbar-r" | "xbar-s" | "p" | "c";

interface ChartConfig {
  label: string;
  description: string;
  inputs: string[];
}

const CHART_CONFIGS: Record<ChartType, ChartConfig> = {
  "imr": { 
    label: "I-MR", 
    description: "Individuella mätvärden",
    inputs: ["values"]
  },
  "xbar-r": { 
    label: "X̄-R", 
    description: "Undergruppsmedelv. & range",
    inputs: ["subgroups"]
  },
  "xbar-s": { 
    label: "X̄-S", 
    description: "Undergruppsmedelv. & std.avv.",
    inputs: ["subgroups"]
  },
  "p": { 
    label: "p-diagram", 
    description: "Andel defekta",
    inputs: ["defects", "sampleSize"]
  },
  "c": { 
    label: "c-diagram", 
    description: "Antal defekter/enhet",
    inputs: ["defects"]
  },
};

// SPC constants
const A2: Record<number, number> = { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 };
const D3: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223 };
const D4: Record<number, number> = { 2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777 };
const d2: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 };

const EXAMPLE_VALUES = "49.8, 50.2, 50.1, 49.9, 50.3, 49.7, 50.0, 50.4, 49.6, 50.1, 50.2, 49.8, 50.0, 49.9, 50.3";

interface ControlLimitResult {
  ucl: number;
  lcl: number;
  cl: number;
  uclR?: number;
  lclR?: number;
  clR?: number;
  sigma?: number;
  n?: number;
}

export function ControlLimitsCalculator() {
  const [chartType, setChartType] = useState<ChartType>("imr");
  const [values, setValues] = useState("");
  const [defects, setDefects] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [subgroupSize, setSubgroupSize] = useState("5");
  const [result, setResult] = useState<ControlLimitResult | null>(null);

  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const loadExample = () => {
    setValues(EXAMPLE_VALUES);
    setDefects("3, 5, 2, 4, 6, 3, 4, 2, 5, 3");
    setSampleSize("100");
    setResult(null);
  };

  const calculate = () => {
    const vals = values.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));

    if (chartType === "imr") {
      if (vals.length < 3) return;
      
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const movingRanges: number[] = [];
      for (let i = 1; i < vals.length; i++) {
        movingRanges.push(Math.abs(vals[i] - vals[i - 1]));
      }
      const mrBar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;
      const sigma = mrBar / d2[2];
      
      setResult({
        ucl: mean + 3 * sigma,
        lcl: mean - 3 * sigma,
        cl: mean,
        uclR: 3.267 * mrBar,
        lclR: 0,
        clR: mrBar,
        sigma,
        n: vals.length,
      });
    } else if (chartType === "xbar-r" || chartType === "xbar-s") {
      const n = parseInt(subgroupSize);
      if (isNaN(n) || n < 2 || n > 10 || vals.length < n) return;
      
      // Split values into subgroups
      const subgroups: number[][] = [];
      for (let i = 0; i < vals.length; i += n) {
        const group = vals.slice(i, i + n);
        if (group.length === n) subgroups.push(group);
      }
      
      if (subgroups.length < 2) return;
      
      const subgroupMeans = subgroups.map(g => g.reduce((a, b) => a + b, 0) / g.length);
      const subgroupRanges = subgroups.map(g => Math.max(...g) - Math.min(...g));
      
      const xDoublebar = subgroupMeans.reduce((a, b) => a + b, 0) / subgroupMeans.length;
      const rBar = subgroupRanges.reduce((a, b) => a + b, 0) / subgroupRanges.length;
      
      setResult({
        ucl: xDoublebar + A2[n] * rBar,
        lcl: xDoublebar - A2[n] * rBar,
        cl: xDoublebar,
        uclR: D4[n] * rBar,
        lclR: D3[n] * rBar,
        clR: rBar,
        sigma: rBar / d2[n],
        n: subgroups.length,
      });
    } else if (chartType === "p") {
      const defectVals = defects.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
      const n = parseFloat(sampleSize);
      
      if (defectVals.length < 3 || isNaN(n) || n <= 0) return;
      
      const proportions = defectVals.map(d => d / n);
      const pBar = proportions.reduce((a, b) => a + b, 0) / proportions.length;
      const sigma = Math.sqrt(pBar * (1 - pBar) / n);
      
      setResult({
        ucl: Math.min(1, pBar + 3 * sigma),
        lcl: Math.max(0, pBar - 3 * sigma),
        cl: pBar,
        sigma,
        n: defectVals.length,
      });
    } else if (chartType === "c") {
      const defectVals = defects.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
      
      if (defectVals.length < 3) return;
      
      const cBar = defectVals.reduce((a, b) => a + b, 0) / defectVals.length;
      const sigma = Math.sqrt(cBar);
      
      setResult({
        ucl: cBar + 3 * sigma,
        lcl: Math.max(0, cBar - 3 * sigma),
        cl: cBar,
        sigma,
        n: defectVals.length,
      });
    }
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: `spc-${chartType}`,
      toolName: `Styrgränser (${CHART_CONFIGS[chartType].label})`,
      phase: 5,
      inputs: { 
        chartType,
        values: values.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v)),
        subgroupSize: chartType.startsWith("xbar") ? parseInt(subgroupSize) : undefined,
      },
      results: { ...result },
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadExample}>
          <Sparkles className="h-3 w-3" />
          Exempeldata
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Diagramtyp</Label>
          <Select value={chartType} onValueChange={(v) => { setChartType(v as ChartType); setResult(null); }}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHART_CONFIGS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className="font-medium">{config.label}</span>
                  <span className="text-muted-foreground ml-2">- {config.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(chartType === "imr" || chartType === "xbar-r" || chartType === "xbar-s") && (
          <>
            <DataInput
              label="Mätvärden"
              value={values}
              onChange={setValues}
              placeholder="49.8, 50.2, 50.1, 49.9..."
              exampleData={EXAMPLE_VALUES}
              helpText="Separera värden med komma"
            />
            {(chartType === "xbar-r" || chartType === "xbar-s") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Undergruppsstorlek</Label>
                <Input
                  type="number"
                  min="2"
                  max="10"
                  value={subgroupSize}
                  onChange={(e) => setSubgroupSize(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </>
        )}

        {(chartType === "p" || chartType === "c") && (
          <>
            <DataInput
              label="Antal defekter per prov"
              value={defects}
              onChange={setDefects}
              placeholder="3, 5, 2, 4, 6..."
              exampleData="3, 5, 2, 4, 6, 3, 4, 2, 5, 3"
            />
            {chartType === "p" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Stickprovsstorlek (n)</Label>
                <Input
                  type="number"
                  min="1"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="100"
                />
              </div>
            )}
          </>
        )}
      </div>

      <Button onClick={calculate} size="sm" className="w-full">Beräkna styrgränser</Button>

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-destructive">
              <span className="text-sm font-medium">UCL (övre gräns)</span>
              <span className="font-bold font-mono text-lg">{result.ucl.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">CL (centrallinje)</span>
              <span className="font-bold font-mono text-lg">{result.cl.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
              <span className="text-sm font-medium">LCL (nedre gräns)</span>
              <span className="font-bold font-mono text-lg">{result.lcl.toFixed(4)}</span>
            </div>
          </div>

          {result.uclR !== undefined && (
            <div className="p-3 bg-muted/30 rounded-lg space-y-1">
              <div className="text-xs text-muted-foreground mb-2">Range/MR-diagram</div>
              <div className="flex justify-between text-sm">
                <span>UCL_R:</span>
                <span className="font-mono">{result.uclR.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>CL_R:</span>
                <span className="font-mono">{result.clR?.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>LCL_R:</span>
                <span className="font-mono">{result.lclR?.toFixed(4)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-xs text-muted-foreground">σ (estimerad)</div>
              <div className="font-mono">{result.sigma?.toFixed(4) || "N/A"}</div>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-xs text-muted-foreground">Datapunkter</div>
              <div className="font-mono">{result.n}</div>
            </div>
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
