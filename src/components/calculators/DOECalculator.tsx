import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Info, Plus, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { CalculatorLoadButton } from "./CalculatorLoadButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Factor {
  name: string;
  lowLevel: string;
  highLevel: string;
}

const DEFAULT_FACTORS: Factor[] = [
  { name: "Temperatur", lowLevel: "20°C", highLevel: "30°C" },
  { name: "Tryck", lowLevel: "1 bar", highLevel: "2 bar" },
  { name: "Tid", lowLevel: "5 min", highLevel: "10 min" },
];

export function DOECalculator({ toolId = "doe-basics" }: { toolId?: string; toolName?: string; phase?: number }) {
  const [factors, setFactors] = useState<Factor[]>([
    { name: "", lowLevel: "", highLevel: "" },
    { name: "", lowLevel: "", highLevel: "" },
  ]);
  const [levels, setLevels] = useState("2");
  const [result, setResult] = useState<{ 
    fullRuns: number; 
    halfRuns: number; 
    quarterRuns: number;
    resolution: string;
  } | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (Array.isArray(inputs.factors)) setFactors(inputs.factors as Factor[]);
    if (inputs.levels) setLevels(String(inputs.levels));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const loadExample = () => {
    setFactors(DEFAULT_FACTORS);
    setResult(null);
  };

  const addFactor = () => {
    if (factors.length < 8) {
      setFactors([...factors, { name: "", lowLevel: "", highLevel: "" }]);
    }
  };

  const removeFactor = (index: number) => {
    if (factors.length > 2) {
      setFactors(factors.filter((_, i) => i !== index));
    }
  };

  const updateFactor = (index: number, field: keyof Factor, value: string) => {
    const updated = [...factors];
    updated[index][field] = value;
    setFactors(updated);
  };

  const k = factors.filter(f => f.name.trim()).length || factors.length;

  const calculate = () => {
    const l = parseInt(levels);

    if (isNaN(k) || isNaN(l) || k < 2 || l < 2) return;

    const fullRuns = Math.pow(l, k);
    const halfRuns = Math.pow(l, k - 1);
    const quarterRuns = k > 2 ? Math.pow(l, k - 2) : 0;

    // Determine resolution for fractional designs
    let resolution = "";
    if (k <= 3) resolution = "Full (alla interaktioner studerbara)";
    else if (k <= 5) resolution = "IV (tvåfaktorsinteraktioner konfunderas)";
    else resolution = "III (huvudeffekter konfunderas med interaktioner)";

    setResult({ fullRuns, halfRuns, quarterRuns, resolution });
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "doe-basics",
      toolName: "DOE Experimentplanering",
      phase: 4,
      inputs: { 
        factors: factors.filter(f => f.name.trim()),
        levels: parseInt(levels),
      },
      results: { ...result },
    });
  };

  // Generate design matrix preview
  const designMatrix = useMemo(() => {
    if (!result || k > 5) return null;
    const runs: string[][] = [];
    const numRuns = Math.min(result.fullRuns, 16); // Limit preview to 16 rows
    
    for (let i = 0; i < numRuns; i++) {
      const row: string[] = [];
      for (let j = 0; j < k; j++) {
        const bit = (i >> (k - 1 - j)) & 1;
        row.push(bit === 0 ? "-" : "+");
      }
      runs.push(row);
    }
    return runs;
  }, [result, k]);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadExample}>
          <Sparkles className="h-3 w-3" />
          Exempeldata
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-xs gap-1" 
          onClick={addFactor}
          disabled={factors.length >= 8}
        >
          <Plus className="h-3 w-3" />
          Lägg till faktor
        </Button>
      </div>

      <div className="space-y-2">
        {factors.map((factor, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Faktor {index + 1}</Label>
              <Input
                placeholder={`Faktor ${index + 1}`}
                value={factor.name}
                onChange={(e) => updateFactor(index, "name", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="w-20 space-y-1">
              <Label className="text-xs">Låg (-)</Label>
              <Input
                placeholder="-"
                value={factor.lowLevel}
                onChange={(e) => updateFactor(index, "lowLevel", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="w-20 space-y-1">
              <Label className="text-xs">Hög (+)</Label>
              <Input
                placeholder="+"
                value={factor.highLevel}
                onChange={(e) => updateFactor(index, "highLevel", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            {factors.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => removeFactor(index)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="doe-levels" className="text-xs flex items-center gap-1">
            Nivåer per faktor
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">2 nivåer: screening, 3 nivåer: optimering</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <select
            id="doe-levels"
            value={levels}
            onChange={(e) => setLevels(e.target.value)}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="2">2 nivåer (screening)</option>
            <option value="3">3 nivåer (optimering)</option>
          </select>
        </div>
        <div className="text-sm text-muted-foreground">
          {k} faktorer
        </div>
      </div>

      <Button onClick={calculate} size="sm" className="w-full">Beräkna designalternativ</Button>

      {result && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex justify-between items-center p-2 bg-background rounded border-2 border-primary/30">
              <div>
                <span className="text-sm font-medium">Full faktoriell</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground ml-1 inline" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Alla kombinationer testas - bäst precision</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-bold text-lg">{result.fullRuns} körningar</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
              <div>
                <span className="text-sm">Halv fraktionell (2^{k-1})</span>
              </div>
              <span className="font-bold">{result.halfRuns} körningar</span>
            </div>
            
            {result.quarterRuns > 0 && (
              <div className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <div>
                  <span className="text-sm">Kvarts fraktionell (2^{k-2})</span>
                </div>
                <span className="font-bold">{result.quarterRuns} körningar</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Resolution (fraktionell)</div>
            <div className="text-sm">{result.resolution}</div>
          </div>

          {designMatrix && designMatrix.length <= 16 && (
            <div className="overflow-x-auto">
              <div className="text-xs text-muted-foreground mb-2">Designmatris (förhandsvisning)</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-xs">Kör</TableHead>
                    {factors.slice(0, k).map((f, i) => (
                      <TableHead key={i} className="text-xs text-center">
                        {f.name || `F${i + 1}`}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {designMatrix.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-mono">{i + 1}</TableCell>
                      {row.map((cell, j) => (
                        <TableCell key={j} className={`text-center font-mono ${
                          cell === "+" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
