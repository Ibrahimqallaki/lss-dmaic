import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { CalculatorLoadButton } from "./CalculatorLoadButton";

const EXAMPLES = {
  critical: { severity: "9", occurrence: "6", detection: "7", label: "Kritisk" },
  moderate: { severity: "5", occurrence: "4", detection: "4", label: "Moderat" },
  minor: { severity: "3", occurrence: "2", detection: "3", label: "Mindre" },
};

const SEVERITY_GUIDE = [
  { range: "9-10", desc: "Farligt - påverkar säkerhet utan förvarning" },
  { range: "7-8", desc: "Högt - betydande kundpåverkan" },
  { range: "4-6", desc: "Måttligt - märkbar kundpåverkan" },
  { range: "1-3", desc: "Lågt - minimal eller ingen påverkan" },
];

const OCCURRENCE_GUIDE = [
  { range: "9-10", desc: "Mycket hög - fel inträffar nästan alltid" },
  { range: "7-8", desc: "Hög - upprepade fel" },
  { range: "4-6", desc: "Måttlig - enstaka fel" },
  { range: "1-3", desc: "Låg - fel är osannolika" },
];

const DETECTION_GUIDE = [
  { range: "9-10", desc: "Nästan omöjligt att upptäcka" },
  { range: "7-8", desc: "Låg sannolikhet att upptäcka" },
  { range: "4-6", desc: "Måttlig sannolikhet att upptäcka" },
  { range: "1-3", desc: "Hög sannolikhet att upptäcka" },
];

export function FMEACalculator({ toolId = "fmea" }: { toolId?: string; toolName?: string; phase?: number }) {
  const [severity, setSeverity] = useState("");
  const [occurrence, setOccurrence] = useState("");
  const [detection, setDetection] = useState("");
  const [failureMode, setFailureMode] = useState("");
  const [result, setResult] = useState<{ rpn: number; risk: string; action: string } | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.severity !== undefined) setSeverity(String(inputs.severity));
    if (inputs.occurrence !== undefined) setOccurrence(String(inputs.occurrence));
    if (inputs.detection !== undefined) setDetection(String(inputs.detection));
    if (inputs.failureMode !== undefined) setFailureMode(String(inputs.failureMode));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const loadExample = (example: keyof typeof EXAMPLES) => {
    const data = EXAMPLES[example];
    setSeverity(data.severity);
    setOccurrence(data.occurrence);
    setDetection(data.detection);
    setResult(null);
  };

  const calculate = () => {
    const s = parseInt(severity);
    const o = parseInt(occurrence);
    const d = parseInt(detection);

    if (isNaN(s) || isNaN(o) || isNaN(d)) return;
    if (s < 1 || s > 10 || o < 1 || o > 10 || d < 1 || d > 10) return;

    const rpn = s * o * d;
    
    let risk = "Låg";
    let action = "Övervaka vid behov";
    
    if (rpn > 200 || s >= 9) {
      risk = "Kritisk";
      action = "Omedelbara åtgärder krävs";
    } else if (rpn > 100) {
      risk = "Hög";
      action = "Åtgärdsplan inom 1 vecka";
    } else if (rpn > 50) {
      risk = "Medium";
      action = "Planera förebyggande åtgärder";
    }

    setResult({ rpn, risk, action });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "fmea",
      toolName: "FMEA Riskanalys",
      phase: 3,
      inputs: { 
        failureMode,
        severity: parseInt(severity), 
        occurrence: parseInt(occurrence), 
        detection: parseInt(detection) 
      },
      results: result,
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Kritisk": return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      case "Hög": return "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30";
      case "Medium": return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30";
      default: return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
    }
  };

  const GuideTooltip = ({ guide, children }: { guide: typeof SEVERITY_GUIDE; children: React.ReactNode }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {children}
            <Info className="h-3 w-3 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            {guide.map((item) => (
              <div key={item.range}>
                <span className="font-bold">{item.range}:</span> {item.desc}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

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

      <div className="space-y-1.5">
        <Label htmlFor="fmea-failure" className="text-xs">Feltyp (valfritt)</Label>
        <Input
          id="fmea-failure"
          type="text"
          placeholder="t.ex. Monteringsfel, Materialspricka..."
          value={failureMode}
          onChange={(e) => setFailureMode(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="fmea-s" className="text-xs">
            <GuideTooltip guide={SEVERITY_GUIDE}>Allvarlighet (S)</GuideTooltip>
          </Label>
          <Input
            id="fmea-s"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fmea-o" className="text-xs">
            <GuideTooltip guide={OCCURRENCE_GUIDE}>Sannolikhet (O)</GuideTooltip>
          </Label>
          <Input
            id="fmea-o"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={occurrence}
            onChange={(e) => setOccurrence(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fmea-d" className="text-xs">
            <GuideTooltip guide={DETECTION_GUIDE}>Upptäckbarhet (D)</GuideTooltip>
          </Label>
          <Input
            id="fmea-d"
            type="number"
            min="1"
            max="10"
            placeholder="1-10"
            value={detection}
            onChange={(e) => setDetection(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button onClick={calculate} size="sm" className="w-full">Beräkna RPN</Button>

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-xs text-muted-foreground mb-1">Risk Priority Number</div>
            <div className="text-4xl font-bold tabular-nums">{result.rpn}</div>
            <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(result.risk)}`}>
              {result.risk} risk
            </div>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Rekommenderad åtgärd</div>
            <div className="text-sm font-medium">{result.action}</div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-muted/20 rounded">
              <div className="text-muted-foreground">S × O × D</div>
              <div className="font-mono">{severity} × {occurrence} × {detection}</div>
            </div>
            <div className="p-2 bg-muted/20 rounded">
              <div className="text-muted-foreground">Max RPN</div>
              <div className="font-mono">1000</div>
            </div>
            <div className="p-2 bg-muted/20 rounded">
              <div className="text-muted-foreground">Risk %</div>
              <div className="font-mono">{(result.rpn / 10).toFixed(1)}%</div>
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
