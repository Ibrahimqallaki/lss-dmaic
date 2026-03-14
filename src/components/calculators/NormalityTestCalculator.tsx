import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";

// Anderson-Darling critical values (α=0.05) approximation
const getADCritical = (n: number): number => {
  // Adjusted critical value for AD test at α=0.05
  return 0.752; // Standard critical value
};

export function NormalityTestCalculator() {
  const [data, setData] = useState("");
  const [result, setResult] = useState<{
    n: number; mean: number; stdDev: number; skewness: number; kurtosis: number;
    adStatistic: number; adCritical: number; isNormal: boolean;
    min: number; max: number; median: number;
  } | null>(null);
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const loadExample = () => {
    setData("10.2 10.5 9.8 10.1 10.3 9.9 10.0 10.4 10.2 10.1 9.7 10.3 10.0 10.2 10.1 9.8 10.5 10.3 10.0 10.4");
    setResult(null);
  };

  const calculate = () => {
    const values = data.split(/[,;\s\n\t]+/).map(Number).filter(v => !isNaN(v));
    if (values.length < 8) return;

    const n = values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    // Skewness
    const m3 = values.reduce((sum, v) => sum + Math.pow(v - mean, 3), 0) / n;
    const skewness = m3 / Math.pow(stdDev, 3);

    // Kurtosis (excess)
    const m4 = values.reduce((sum, v) => sum + Math.pow(v - mean, 4), 0) / n;
    const kurtosis = m4 / Math.pow(variance, 2) - 3;

    // Anderson-Darling test
    const standardized = sorted.map(v => (v - mean) / stdDev);

    // Normal CDF approximation
    const normalCDF = (z: number): number => {
      const t = 1 / (1 + 0.2316419 * Math.abs(z));
      const d = 0.3989422804014327;
      const p = d * Math.exp(-z * z / 2) * (t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))));
      return z > 0 ? 1 - p : p;
    };

    let S = 0;
    for (let i = 0; i < n; i++) {
      const Fi = normalCDF(standardized[i]);
      const FiClamped = Math.max(0.0001, Math.min(0.9999, Fi));
      const FnminusiClamped = Math.max(0.0001, Math.min(0.9999, normalCDF(standardized[n - 1 - i])));
      S += (2 * (i + 1) - 1) * (Math.log(FiClamped) + Math.log(1 - FnminusiClamped));
    }

    let AD = -n - S / n;
    // Adjusted AD*
    AD = AD * (1 + 0.75 / n + 2.25 / (n * n));

    const adCritical = getADCritical(n);
    const isNormal = AD < adCritical;

    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    setResult({
      n, mean, stdDev, skewness, kurtosis,
      adStatistic: AD, adCritical, isNormal,
      min: sorted[0], max: sorted[n - 1], median,
    });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "normality-test", toolName: "Normalitetstest (Anderson-Darling)", phase: 3,
      inputs: { n: result.n },
      results: { AD: result.adStatistic, isNormal: result.isNormal, skewness: result.skewness, kurtosis: result.kurtosis },
    });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadExample}>
          <Sparkles className="h-3 w-3" /> Exempeldata
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Data (minst 8 värden, separerade med mellanslag, komma eller ny rad)</Label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-20"
          placeholder="10.2 10.5 9.8 10.1 10.3 ..."
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      <Button onClick={calculate} size="sm" className="w-full">Kör normalitetstest</Button>

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Anderson-Darling A²*</div>
            <div className="text-3xl font-bold font-mono">{result.adStatistic.toFixed(4)}</div>
            <Badge variant={result.isNormal ? "default" : "destructive"} className="mt-2">
              {result.isNormal ? "✓ Normalfördelad (p > 0.05)" : "✗ Ej normalfördelad (p < 0.05)"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">n</div><div className="font-mono">{result.n}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Medel</div><div className="font-mono">{result.mean.toFixed(3)}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Std.avv</div><div className="font-mono">{result.stdDev.toFixed(3)}</div></div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Skevhet</div><div className="font-mono">{result.skewness.toFixed(3)}</div><div className="text-xs text-muted-foreground">{Math.abs(result.skewness) < 0.5 ? "Symmetrisk" : result.skewness > 0 ? "Höger-skev" : "Vänster-skev"}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Kurtosis (excess)</div><div className="font-mono">{result.kurtosis.toFixed(3)}</div><div className="text-xs text-muted-foreground">{Math.abs(result.kurtosis) < 1 ? "Normal" : result.kurtosis > 0 ? "Leptokurtisk" : "Platykurtisk"}</div></div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Min</div><div className="font-mono">{result.min.toFixed(3)}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Median</div><div className="font-mono">{result.median.toFixed(3)}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Max</div><div className="font-mono">{result.max.toFixed(3)}</div></div>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            💡 {result.isNormal
              ? "Data kan anses normalfördelad. Parametriska tester (t-test, ANOVA) är lämpliga."
              : "Data verkar ej normalfördelad. Överväg icke-parametriska tester eller datatransformering."}
          </p>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={!!result} notes={notes} onNotesChange={setNotes} onSave={handleSave} />
    </div>
  );
}
