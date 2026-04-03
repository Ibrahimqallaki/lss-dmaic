import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RotateCcw, ArrowDown } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { toast } from "sonner";

interface WhyChain {
  id: string;
  problem: string;
  whys: string[];
  rootCause: string;
  countermeasure: string;
}

interface FiveWhysAnalysisProps {
  toolId?: string;
  toolName?: string;
  phase?: number;
}

export function FiveWhysAnalysis({ toolId = "5-whys", toolName = "5 Varför", phase = 2 }: FiveWhysAnalysisProps) {
  const [chains, setChains] = useState<WhyChain[]>([
    { id: crypto.randomUUID(), problem: "", whys: [""], rootCause: "", countermeasure: "" },
  ]);
  const [activeChain, setActiveChain] = useState(0);
  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId);

  const chain = chains[activeChain];

  const updateChain = (updates: Partial<WhyChain>) => {
    setChains((prev) =>
      prev.map((c, i) => (i === activeChain ? { ...c, ...updates } : c))
    );
  };

  const addWhy = () => {
    if (chain.whys.length < 7) {
      updateChain({ whys: [...chain.whys, ""] });
    }
  };

  const updateWhy = (index: number, value: string) => {
    const newWhys = [...chain.whys];
    newWhys[index] = value;
    updateChain({ whys: newWhys });
  };

  const removeWhy = (index: number) => {
    if (chain.whys.length > 1) {
      updateChain({ whys: chain.whys.filter((_, i) => i !== index) });
    }
  };

  const addChain = () => {
    setChains((prev) => [
      ...prev,
      { id: crypto.randomUUID(), problem: "", whys: [""], rootCause: "", countermeasure: "" },
    ]);
    setActiveChain(chains.length);
  };

  const resetChain = () => {
    updateChain({ problem: "", whys: [""], rootCause: "", countermeasure: "" });
  };

  const handleLoad = (inputs: Record<string, unknown>) => {
    const loaded = inputs.chains as any[];
    if (Array.isArray(loaded)) {
      setChains(loaded.map(c => ({
        id: crypto.randomUUID(),
        problem: String(c.problem || ""),
        whys: Array.isArray(c.whys) ? c.whys.map(String) : [""],
        rootCause: String(c.rootCause || ""),
        countermeasure: String(c.countermeasure || ""),
      })));
      setActiveChain(0);
      toast.success("Sparad beräkning laddad!");
    }
  };

  const filledWhys = chain.whys.filter((w) => w.trim()).length;
  const hasResult = !!chain.rootCause.trim();

  const handleSave = () => {
    saveCalculation({
      toolId,
      toolName,
      phase,
      inputs: { chains: chains.map(c => ({ problem: c.problem, whys: c.whys, rootCause: c.rootCause, countermeasure: c.countermeasure })) },
      results: { chains: chains.map(c => ({ rootCause: c.rootCause, countermeasure: c.countermeasure, whyCount: c.whys.filter(w => w.trim()).length })) },
    });
  };

  return (
    <div className="space-y-4">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />

      {chains.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {chains.map((c, i) => (
            <Button key={c.id} size="sm" variant={i === activeChain ? "default" : "outline"} onClick={() => setActiveChain(i)}>
              Kedja {i + 1}
            </Button>
          ))}
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground">Problemformulering</label>
        <Input placeholder="Beskriv problemet som observerats..." value={chain.problem} onChange={(e) => updateChain({ problem: e.target.value })} className="mt-1" />
      </div>

      <div className="space-y-2">
        {chain.whys.map((why, index) => (
          <div key={index}>
            {index > 0 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex gap-2 items-start">
              <Badge variant="secondary" className="mt-2 shrink-0 min-w-[70px] justify-center">
                Varför {index + 1}
              </Badge>
              <Input
                placeholder={index === 0 ? "Varför uppstod problemet?" : `Varför ${chain.whys[index - 1] ? `"${chain.whys[index - 1].slice(0, 30)}..."` : "det"}?`}
                value={why}
                onChange={(e) => updateWhy(index, e.target.value)}
                className="flex-1"
              />
              {chain.whys.length > 1 && (
                <Button size="icon" variant="ghost" onClick={() => removeWhy(index)} className="shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addWhy} disabled={chain.whys.length >= 7}>
          <Plus className="h-3 w-3 mr-1" /> Lägg till Varför
        </Button>
      </div>

      {filledWhys >= 2 && (
        <div className="border-t pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">Rotorsak (slutsats)</label>
            <Textarea placeholder="Sammanfatta den identifierade rotorsaken..." value={chain.rootCause} onChange={(e) => updateChain({ rootCause: e.target.value })} className="mt-1" rows={2} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Föreslagen motåtgärd</label>
            <Textarea placeholder="Beskriv åtgärden för att eliminera rotorsaken..." value={chain.countermeasure} onChange={(e) => updateChain({ countermeasure: e.target.value })} className="mt-1" rows={2} />
          </div>
        </div>
      )}

      {chain.rootCause && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
          <p className="font-medium">Sammanfattning</p>
          <p><span className="text-muted-foreground">Problem:</span> {chain.problem}</p>
          <p><span className="text-muted-foreground">Antal varför:</span> {filledWhys}</p>
          <p><span className="text-muted-foreground">Rotorsak:</span> {chain.rootCause}</p>
          <p><span className="text-muted-foreground">Åtgärd:</span> {chain.countermeasure}</p>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={handleSave} />

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={resetChain}>
          <RotateCcw className="h-3 w-3 mr-1" /> Återställ
        </Button>
        <Button size="sm" variant="outline" onClick={addChain}>
          <Plus className="h-3 w-3 mr-1" /> Ny kedja
        </Button>
      </div>
    </div>
  );
}
