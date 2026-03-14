import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";

// Chi-square critical values (α=0.05)
const CHI2_CRITICAL: Record<number, number> = {
  1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488, 5: 11.070,
  6: 12.592, 7: 14.067, 8: 15.507, 9: 16.919, 10: 18.307,
  15: 24.996, 20: 31.410, 25: 37.652, 30: 43.773,
};

const getChi2Critical = (df: number): number => {
  if (CHI2_CRITICAL[df]) return CHI2_CRITICAL[df];
  const keys = Object.keys(CHI2_CRITICAL).map(Number).sort((a, b) => a - b);
  for (const key of keys) { if (df <= key) return CHI2_CRITICAL[key]; }
  return df + Math.sqrt(2 * df); // rough approximation
};

export function ChiSquareCalculator() {
  const [tableData, setTableData] = useState("");
  const [result, setResult] = useState<{
    chi2: number; df: number; chi2Crit: number; significant: boolean;
    observed: number[][]; expected: number[][];
    rows: number; cols: number;
  } | null>(null);
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const loadExample = () => {
    setTableData("50 30 20\n35 45 20\n15 25 60");
    setResult(null);
  };

  const calculate = () => {
    const rows = tableData.trim().split("\n").filter(r => r.trim());
    if (rows.length < 2) return;

    const observed = rows.map(r => r.split(/[,;\s\t]+/).map(Number).filter(v => !isNaN(v)));
    const nCols = observed[0].length;
    if (observed.some(r => r.length !== nCols) || nCols < 2) return;

    const nRows = observed.length;
    const rowTotals = observed.map(r => r.reduce((a, b) => a + b, 0));
    const colTotals: number[] = [];
    for (let j = 0; j < nCols; j++) {
      colTotals[j] = observed.reduce((sum, row) => sum + row[j], 0);
    }
    const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

    // Expected frequencies
    const expected = observed.map((row, i) =>
      row.map((_, j) => (rowTotals[i] * colTotals[j]) / grandTotal)
    );

    // Chi-square statistic
    let chi2 = 0;
    observed.forEach((row, i) => {
      row.forEach((o, j) => {
        const e = expected[i][j];
        chi2 += Math.pow(o - e, 2) / e;
      });
    });

    const df = (nRows - 1) * (nCols - 1);
    const chi2Crit = getChi2Critical(df);
    const significant = chi2 > chi2Crit;

    setResult({ chi2, df, chi2Crit, significant, observed, expected, rows: nRows, cols: nCols });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "chi-square", toolName: "Chi-två-test", phase: 3,
      inputs: { tableData },
      results: { chi2: result.chi2, df: result.df, significant: result.significant },
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
        <Label className="text-xs">Observerade frekvenser (en rad per kategori, kolumner separerade med mellanslag)</Label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-20"
          placeholder="50 30 20&#10;35 45 20&#10;15 25 60"
          value={tableData}
          onChange={(e) => setTableData(e.target.value)}
        />
      </div>

      <Button onClick={calculate} size="sm" className="w-full">Beräkna χ²</Button>

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">χ²-värde</div>
            <div className="text-3xl font-bold font-mono">{result.chi2.toFixed(3)}</div>
            <Badge variant={result.significant ? "destructive" : "default"} className="mt-2">
              {result.significant ? "✗ Signifikant samband" : "✓ Inget signifikant samband"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">df</div><div className="font-mono">{result.df}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">χ²-krit</div><div className="font-mono">{result.chi2Crit.toFixed(3)}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Tabell</div><div className="font-mono">{result.rows}×{result.cols}</div></div>
          </div>

          <div className="overflow-x-auto">
            <p className="text-xs font-medium mb-1">Förväntade frekvenser:</p>
            <table className="w-full text-xs font-mono">
              <tbody>
                {result.expected.map((row, i) => (
                  <tr key={i} className="border-b">
                    {row.map((e, j) => (
                      <td key={j} className="p-1 text-center">{e.toFixed(1)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={!!result} notes={notes} onNotesChange={setNotes} onSave={handleSave} />
    </div>
  );
}
