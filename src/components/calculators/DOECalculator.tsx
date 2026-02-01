import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function DOECalculator() {
  const [factors, setFactors] = useState("");
  const [levels, setLevels] = useState("2");
  const [result, setResult] = useState<{ fullRuns: number; halfRuns: number; quarterRuns: number } | null>(null);

  const calculate = () => {
    const k = parseInt(factors);
    const l = parseInt(levels);

    if (isNaN(k) || isNaN(l) || k < 2 || l < 2) return;

    const fullRuns = Math.pow(l, k);
    const halfRuns = Math.pow(l, k - 1);
    const quarterRuns = Math.pow(l, k - 2);

    setResult({ fullRuns, halfRuns, quarterRuns: k > 2 ? quarterRuns : 0 });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="doe-factors" className="text-xs">Antal faktorer (k)</Label>
          <Input
            id="doe-factors"
            type="number"
            min="2"
            max="10"
            placeholder="3"
            value={factors}
            onChange={(e) => setFactors(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doe-levels" className="text-xs">Nivåer per faktor</Label>
          <select
            id="doe-levels"
            value={levels}
            onChange={(e) => setLevels(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="2">2 nivåer</option>
            <option value="3">3 nivåer</option>
          </select>
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna körningar</Button>

      {result && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Full faktoriell:</span>
            <span className="font-bold">{result.fullRuns} körningar</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Halv fraktionell (2^(k-1)):</span>
            <span className="font-bold">{result.halfRuns} körningar</span>
          </div>
          {result.quarterRuns > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Kvart fraktionell (2^(k-2)):</span>
              <span className="font-bold">{result.quarterRuns} körningar</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
