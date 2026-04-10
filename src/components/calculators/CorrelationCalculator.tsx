import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { DataInput } from "./DataInput";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { CalculatorLoadButton } from "./CalculatorLoadButton";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const EXAMPLE_X = "10, 15, 20, 25, 30, 35, 40, 45, 50, 55";
const EXAMPLE_Y = "12.3, 18.1, 22.5, 27.8, 31.2, 38.5, 42.1, 48.9, 51.3, 58.2";

interface CorrelationResult {
  r: number;
  r2: number;
  strength: string;
  slope: number;
  intercept: number;
  n: number;
}

export function CorrelationCalculator({ toolId = "correlation" }: { toolId?: string; toolName?: string; phase?: number }) {
  const [xValues, setXValues] = useState("");
  const [yValues, setYValues] = useState("");
  const [result, setResult] = useState<CorrelationResult | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.xValues) setXValues(Array.isArray(inputs.xValues) ? (inputs.xValues as number[]).join(", ") : String(inputs.xValues));
    if (inputs.yValues) setYValues(Array.isArray(inputs.yValues) ? (inputs.yValues as number[]).join(", ") : String(inputs.yValues));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const loadExample = () => {
    setXValues(EXAMPLE_X);
    setYValues(EXAMPLE_Y);
    setResult(null);
  };

  const scatterData = useMemo(() => {
    const x = xValues.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
    const y = yValues.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
    const len = Math.min(x.length, y.length);
    return Array.from({ length: len }, (_, i) => ({ x: x[i], y: y[i] }));
  }, [xValues, yValues]);

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

    // Linear regression coefficients
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    let strength = "Inget";
    const absR = Math.abs(r);
    if (absR >= 0.9) strength = "Mycket starkt";
    else if (absR >= 0.7) strength = "Starkt";
    else if (absR >= 0.5) strength = "Måttligt";
    else if (absR >= 0.3) strength = "Svagt";

    setResult({ r, r2, strength, slope, intercept, n });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "correlation",
      toolName: "Korrelationsanalys",
      phase: 3,
      inputs: { 
        xValues: xValues.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v)),
        yValues: yValues.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v)),
      },
      results: { ...result },
    });
  };

  const getStrengthColor = (strength: string) => {
    if (strength === "Mycket starkt") return "text-green-600 dark:text-green-400";
    if (strength === "Starkt") return "text-emerald-600 dark:text-emerald-400";
    if (strength === "Måttligt") return "text-yellow-600 dark:text-yellow-400";
    if (strength === "Svagt") return "text-orange-600 dark:text-orange-400";
    return "text-muted-foreground";
  };

  // Calculate trend line points for chart
  const trendLine = useMemo(() => {
    if (!result || scatterData.length < 2) return null;
    const xMin = Math.min(...scatterData.map(d => d.x));
    const xMax = Math.max(...scatterData.map(d => d.x));
    return {
      y1: result.slope * xMin + result.intercept,
      y2: result.slope * xMax + result.intercept,
      xMin,
      xMax,
    };
  }, [result, scatterData]);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadExample}>
          <Sparkles className="h-3 w-3" />
          Exempeldata
        </Button>
      </div>

      <div className="space-y-3">
        <DataInput
          label="X-värden"
          value={xValues}
          onChange={setXValues}
          placeholder="1, 2, 3, 4, 5..."
          exampleData={EXAMPLE_X}
          helpText="Separera värden med komma eller klistra in från Excel"
        />
        <DataInput
          label="Y-värden"
          value={yValues}
          onChange={setYValues}
          placeholder="2.1, 4.2, 5.8, 8.1, 9.9..."
          exampleData={EXAMPLE_Y}
          helpText="Samma antal värden som X"
        />
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna korrelation</Button>

      {scatterData.length >= 2 && (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="x" 
                type="number" 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <YAxis 
                dataKey="y" 
                type="number" 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => value.toFixed(2)}
                labelFormatter={(label) => `X: ${label}`}
              />
              <Scatter data={scatterData} fill="hsl(var(--primary))" />
              {trendLine && (
                <ReferenceLine
                  segment={[
                    { x: trendLine.xMin, y: trendLine.y1 },
                    { x: trendLine.xMax, y: trendLine.y2 },
                  ]}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">Pearson r</div>
              <div className="text-2xl font-bold font-mono">{result.r.toFixed(3)}</div>
              <div className={`text-xs ${getStrengthColor(result.strength)}`}>
                {result.strength} {result.r >= 0 ? "positivt" : "negativt"}
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="text-xs text-muted-foreground">R² (förklaringsgrad)</div>
              <div className="text-2xl font-bold font-mono">{(result.r2 * 100).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">av variationen förklaras</div>
            </div>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Regressionslinje</div>
            <div className="font-mono text-sm">
              Y = {result.slope.toFixed(4)}X {result.intercept >= 0 ? "+" : ""} {result.intercept.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Baserat på {result.n} datapunkter
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
