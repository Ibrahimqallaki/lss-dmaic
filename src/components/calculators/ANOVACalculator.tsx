import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";

// F critical values (α=0.05) approximate
const getFCritical = (df1: number, df2: number): number => {
  if (df1 === 1) return df2 < 10 ? 5.12 : df2 < 20 ? 4.35 : df2 < 40 ? 4.08 : 3.84;
  if (df1 === 2) return df2 < 10 ? 4.26 : df2 < 20 ? 3.49 : df2 < 40 ? 3.23 : 3.00;
  if (df1 === 3) return df2 < 10 ? 3.86 : df2 < 20 ? 3.10 : df2 < 40 ? 2.84 : 2.60;
  if (df1 === 4) return df2 < 10 ? 3.63 : df2 < 20 ? 2.87 : df2 < 40 ? 2.61 : 2.37;
  return df2 < 10 ? 3.48 : df2 < 20 ? 2.71 : df2 < 40 ? 2.45 : 2.21;
};

export function ANOVACalculator() {
  const [groupData, setGroupData] = useState("");
  const [result, setResult] = useState<{
    groups: number; totalN: number; grandMean: number;
    SSB: number; SSW: number; SST: number;
    dfB: number; dfW: number; MSB: number; MSW: number;
    F: number; FCrit: number; significant: boolean;
    groupMeans: number[];
  } | null>(null);
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const loadExample = () => {
    setGroupData("23 25 27 24 26\n30 32 28 31 29\n20 22 21 23 19");
    setResult(null);
  };

  const calculate = () => {
    const rows = groupData.trim().split("\n").filter(r => r.trim());
    if (rows.length < 2) return;

    const groups = rows.map(r => r.split(/[,;\s\t]+/).map(Number).filter(v => !isNaN(v)));
    if (groups.some(g => g.length < 2)) return;

    const k = groups.length;
    const allValues = groups.flat();
    const N = allValues.length;
    const grandMean = allValues.reduce((a, b) => a + b, 0) / N;
    const groupMeans = groups.map(g => g.reduce((a, b) => a + b, 0) / g.length);

    // SSB (between groups)
    let SSB = 0;
    groups.forEach((g, i) => { SSB += g.length * Math.pow(groupMeans[i] - grandMean, 2); });

    // SSW (within groups)
    let SSW = 0;
    groups.forEach((g, i) => { g.forEach(v => { SSW += Math.pow(v - groupMeans[i], 2); }); });

    const SST = SSB + SSW;
    const dfB = k - 1;
    const dfW = N - k;
    const MSB = SSB / dfB;
    const MSW = SSW / dfW;
    const F = MSB / MSW;
    const FCrit = getFCritical(dfB, dfW);
    const significant = F > FCrit;

    setResult({ groups: k, totalN: N, grandMean, SSB, SSW, SST, dfB, dfW, MSB, MSW, F, FCrit, significant, groupMeans });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "anova", toolName: "ANOVA", phase: 3,
      inputs: { groupData },
      results: { F: result.F, FCrit: result.FCrit, significant: result.significant, groups: result.groups, dfB: result.dfB, dfW: result.dfW },
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
        <Label className="text-xs">Gruppdata (en grupp per rad, värden separerade med mellanslag)</Label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring h-24"
          placeholder="Grupp 1: 23 25 27 24 26&#10;Grupp 2: 30 32 28 31 29&#10;Grupp 3: 20 22 21 23 19"
          value={groupData}
          onChange={(e) => setGroupData(e.target.value)}
        />
      </div>

      <Button onClick={calculate} size="sm" className="w-full">Beräkna ANOVA</Button>

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">F-värde</div>
            <div className="text-3xl font-bold font-mono">{result.F.toFixed(3)}</div>
            <Badge variant={result.significant ? "destructive" : "default"} className="mt-2">
              {result.significant ? "✗ Signifikant skillnad mellan grupper" : "✓ Ingen signifikant skillnad"}
            </Badge>
          </div>

          {/* ANOVA Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-1 text-left">Källa</th>
                  <th className="p-1 text-right">SS</th>
                  <th className="p-1 text-right">df</th>
                  <th className="p-1 text-right">MS</th>
                  <th className="p-1 text-right">F</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b">
                  <td className="p-1">Mellan</td>
                  <td className="p-1 text-right">{result.SSB.toFixed(2)}</td>
                  <td className="p-1 text-right">{result.dfB}</td>
                  <td className="p-1 text-right">{result.MSB.toFixed(3)}</td>
                  <td className="p-1 text-right font-bold">{result.F.toFixed(3)}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-1">Inom</td>
                  <td className="p-1 text-right">{result.SSW.toFixed(2)}</td>
                  <td className="p-1 text-right">{result.dfW}</td>
                  <td className="p-1 text-right">{result.MSW.toFixed(3)}</td>
                  <td className="p-1"></td>
                </tr>
                <tr>
                  <td className="p-1 font-bold">Total</td>
                  <td className="p-1 text-right">{result.SST.toFixed(2)}</td>
                  <td className="p-1 text-right">{result.dfB + result.dfW}</td>
                  <td className="p-1"></td>
                  <td className="p-1"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm text-center">
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">F-krit (α=0.05)</div><div className="font-mono">{result.FCrit.toFixed(3)}</div></div>
            <div className="p-2 bg-muted/30 rounded"><div className="text-xs text-muted-foreground">Antal grupper</div><div className="font-mono">{result.groups}</div></div>
          </div>

          <div className="p-2 bg-muted/30 rounded text-xs">
            <p className="font-medium mb-1">Gruppmedelvärden:</p>
            {result.groupMeans.map((m, i) => (
              <span key={i} className="inline-block mr-3 font-mono">Grupp {i + 1}: {m.toFixed(2)}</span>
            ))}
          </div>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={!!result} notes={notes} onNotesChange={setNotes} onSave={handleSave} />
    </div>
  );
}
