import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

const DEFAULT_CATEGORIES = [
  { key: "manniska", label: "Människa", emoji: "👤" },
  { key: "maskin", label: "Maskin", emoji: "⚙️" },
  { key: "material", label: "Material", emoji: "📦" },
  { key: "metod", label: "Metod", emoji: "📋" },
  { key: "miljo", label: "Miljö", emoji: "🌍" },
  { key: "matning", label: "Mätning", emoji: "📏" },
];

type CausesMap = Record<string, string[]>;

interface FishboneDiagramProps {
  toolId?: string;
  toolName?: string;
  phase?: number;
}

export function FishboneDiagram({ toolId = "fishbone", toolName = "Fiskbensdiagram", phase = 2 }: FishboneDiagramProps) {
  const [effect, setEffect] = useState("");
  const [causes, setCauses] = useState<CausesMap>(
    Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.key, [""]]))
  );
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const updateCause = (category: string, index: number, value: string) => {
    setCauses((prev) => ({
      ...prev,
      [category]: prev[category].map((c, i) => (i === index ? value : c)),
    }));
  };

  const addCause = (category: string) => {
    setCauses((prev) => ({ ...prev, [category]: [...prev[category], ""] }));
  };

  const removeCause = (category: string, index: number) => {
    if (causes[category].length > 1) {
      setCauses((prev) => ({
        ...prev,
        [category]: prev[category].filter((_, i) => i !== index),
      }));
    }
  };

  const reset = () => {
    setEffect("");
    setCauses(Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.key, [""]])));
  };

  const totalCauses = Object.values(causes)
    .flat()
    .filter((c) => c.trim()).length;

  const hasResult = totalCauses > 0 && !!effect.trim();

  const handleSave = () => {
    const filledCauses: Record<string, string[]> = {};
    for (const cat of DEFAULT_CATEGORIES) {
      const filled = causes[cat.key].filter(c => c.trim());
      if (filled.length > 0) filledCauses[cat.label] = filled;
    }
    saveCalculation({
      toolId,
      toolName,
      phase,
      inputs: { effect, causes: filledCauses },
      results: { totalCauses, categoriesUsed: Object.keys(filledCauses).length },
    });
  };

  return (
    <div className="space-y-4">
      {/* Effect */}
      <div>
        <label className="text-sm font-medium text-foreground">Effekt / Problem</label>
        <Input
          placeholder="Beskriv den observerade effekten eller problemet..."
          value={effect}
          onChange={(e) => setEffect(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Visual fishbone representation */}
      {effect && (
        <div className="border rounded-lg p-4 bg-background overflow-x-auto">
          {/* Effect box */}
          <div className="flex items-center justify-center mb-4">
            <div className="bg-destructive/10 border-2 border-destructive rounded-lg px-4 py-2 text-center">
              <p className="text-sm font-bold text-destructive">{effect}</p>
            </div>
          </div>

          {/* Spine line */}
          <div className="h-0.5 bg-foreground/30 mx-8 mb-4" />

          {/* 6M Categories in 2 rows */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEFAULT_CATEGORIES.map((cat) => {
              const filled = causes[cat.key].filter((c) => c.trim()).length;
              return (
                <div key={cat.key} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="gap-1">
                      {cat.emoji} {cat.label}
                    </Badge>
                    {filled > 0 && (
                      <span className="text-xs text-muted-foreground">{filled} orsak{filled !== 1 ? "er" : ""}</span>
                    )}
                  </div>
                  {causes[cat.key].map((cause, i) => (
                    <div key={i} className="flex gap-1">
                      <Input
                        value={cause}
                        onChange={(e) => updateCause(cat.key, i, e.target.value)}
                        placeholder={`Orsak inom ${cat.label.toLowerCase()}...`}
                        className="text-sm"
                      />
                      {causes[cat.key].length > 1 && (
                        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => removeCause(cat.key, i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => addCause(cat.key)}>
                    <Plus className="h-3 w-3 mr-1" /> Lägg till
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Non-visual input when no effect */}
      {!effect && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEFAULT_CATEGORIES.map((cat) => (
            <div key={cat.key} className="border rounded-lg p-3 space-y-2">
              <Badge variant="outline" className="gap-1">
                {cat.emoji} {cat.label}
              </Badge>
              {causes[cat.key].map((cause, i) => (
                <div key={i} className="flex gap-1">
                  <Input
                    value={cause}
                    onChange={(e) => updateCause(cat.key, i, e.target.value)}
                    placeholder={`Orsak...`}
                    className="text-sm"
                  />
                  {causes[cat.key].length > 1 && (
                    <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => removeCause(cat.key, i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => addCause(cat.key)}>
                <Plus className="h-3 w-3 mr-1" /> Lägg till
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {totalCauses > 0 && (
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium">Sammanfattning</p>
          <p className="text-muted-foreground">
            {totalCauses} identifierade orsaker fördelade på{" "}
            {DEFAULT_CATEGORIES.filter((c) => causes[c.key].some((v) => v.trim())).length} av 6 kategorier
          </p>
          {DEFAULT_CATEGORIES.filter((c) => causes[c.key].some((v) => v.trim())).map((cat) => (
            <p key={cat.key} className="text-muted-foreground">
              {cat.emoji} {cat.label}: {causes[cat.key].filter((v) => v.trim()).join(", ")}
            </p>
          ))}
        </div>
      )}

      {/* Save button */}
      <CalculatorSaveButton
        canSave={canSave}
        isSaving={isSaving}
        hasResult={hasResult}
        notes={notes}
        onNotesChange={setNotes}
        onSave={handleSave}
      />

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="h-3 w-3 mr-1" /> Återställ
        </Button>
      </div>
    </div>
  );
}
