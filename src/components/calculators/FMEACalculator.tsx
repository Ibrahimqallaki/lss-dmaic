import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function FMEACalculator() {
  const [severity, setSeverity] = useState("");
  const [occurrence, setOccurrence] = useState("");
  const [detection, setDetection] = useState("");
  const [result, setResult] = useState<{ rpn: number; risk: string } | null>(null);

  const calculate = () => {
    const s = parseInt(severity);
    const o = parseInt(occurrence);
    const d = parseInt(detection);

    if (isNaN(s) || isNaN(o) || isNaN(d)) return;
    if (s < 1 || s > 10 || o < 1 || o > 10 || d < 1 || d > 10) return;

    const rpn = s * o * d;
    
    let risk = "Låg";
    if (rpn > 200) risk = "Kritisk";
    else if (rpn > 100) risk = "Hög";
    else if (rpn > 50) risk = "Medium";

    setResult({ rpn, risk });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Kritisk": return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      case "Hög": return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30";
      case "Medium": return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30";
      default: return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="fmea-s" className="text-xs">Allvarlighet (1-10)</Label>
          <Input
            id="fmea-s"
            type="number"
            min="1"
            max="10"
            placeholder="8"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fmea-o" className="text-xs">Sannolikhet (1-10)</Label>
          <Input
            id="fmea-o"
            type="number"
            min="1"
            max="10"
            placeholder="5"
            value={occurrence}
            onChange={(e) => setOccurrence(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fmea-d" className="text-xs">Upptäckbarhet (1-10)</Label>
          <Input
            id="fmea-d"
            type="number"
            min="1"
            max="10"
            placeholder="6"
            value={detection}
            onChange={(e) => setDetection(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna RPN</Button>

      {result && (
        <div className="p-4 bg-muted/50 rounded-lg text-center">
          <div className="text-xs text-muted-foreground mb-1">Risk Priority Number</div>
          <div className="text-3xl font-bold">{result.rpn}</div>
          <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risk)}`}>
            {result.risk} risk
          </div>
        </div>
      )}
    </div>
  );
}
