import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { toast } from "sonner";

type KanoCategory = "must-be" | "performance" | "delighter" | "indifferent" | "reverse";

interface KanoItem { id: string; feature: string; functional: string; dysfunctional: string; category: KanoCategory; }

const categoryLabels: Record<KanoCategory, string> = { "must-be": "Bas (Must-be)", "performance": "Prestanda", "delighter": "Attraktiv (Delighter)", "indifferent": "Indifferent", "reverse": "Omvänd" };
const categoryColors: Record<KanoCategory, "destructive" | "default" | "secondary" | "outline"> = { "must-be": "destructive", "performance": "default", "delighter": "secondary", "indifferent": "outline", "reverse": "outline" };

const classifyKano = (functional: string, dysfunctional: string): KanoCategory => {
  const f = parseInt(functional); const d = parseInt(dysfunctional);
  if (f >= 4 && d <= 2) return "delighter";
  if (f >= 4 && d >= 4) return "performance";
  if (f <= 2 && d >= 4) return "must-be";
  if (f <= 2 && d <= 2) return "indifferent";
  return "indifferent";
};

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function KanoModelTool({ toolId = "kano-model", toolName = "Kano-modell", phase = 1 }: Props) {
  const [items, setItems] = useState<KanoItem[]>([]);
  const [feature, setFeature] = useState("");
  const [functional, setFunctional] = useState("3");
  const [dysfunctional, setDysfunctional] = useState("3");
  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId);

  const responses = ["1 – Gillar inte", "2 – Tolererar", "3 – Neutral", "4 – Förväntar", "5 – Gillar"];

  const addItem = () => {
    if (!feature.trim()) return;
    const category = classifyKano(functional, dysfunctional);
    setItems([...items, { id: crypto.randomUUID(), feature, functional, dysfunctional, category }]);
    setFeature("");
  };

  const handleLoad = (inputs: Record<string, unknown>) => {
    const loaded = inputs.items as any[];
    if (Array.isArray(loaded)) {
      setItems(loaded.map(i => ({ id: crypto.randomUUID(), feature: String(i.feature || ""), functional: String(i.functional || "3"), dysfunctional: String(i.dysfunctional || "3"), category: (i.category || "indifferent") as KanoCategory })));
      toast.success("Sparad beräkning laddad!");
    }
  };

  const hasResult = items.length > 0;

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />

      <div className="space-y-1"><Label className="text-xs">Funktion/Egenskap</Label><Input value={feature} onChange={e => setFeature(e.target.value)} placeholder="T.ex. Leveransavisering via SMS" className="text-sm" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Funktionell (om det finns)</Label>
          <Select value={functional} onValueChange={setFunctional}><SelectTrigger className="text-sm"><SelectValue /></SelectTrigger><SelectContent>{responses.map((r, i) => <SelectItem key={i} value={String(i+1)}>{r}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dysfunktionell (om det saknas)</Label>
          <Select value={dysfunctional} onValueChange={setDysfunctional}><SelectTrigger className="text-sm"><SelectValue /></SelectTrigger><SelectContent>{responses.map((r, i) => <SelectItem key={i} value={String(i+1)}>{r}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div className="text-xs">Klassificering: <Badge variant={categoryColors[classifyKano(functional, dysfunctional)]}>{categoryLabels[classifyKano(functional, dysfunctional)]}</Badge></div>
      <Button size="sm" onClick={addItem} disabled={!feature.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {hasResult && (
        <div className="space-y-1">
          {(["must-be", "performance", "delighter", "indifferent"] as KanoCategory[]).map(cat => {
            const catItems = items.filter(i => i.category === cat);
            if (!catItems.length) return null;
            return (
              <div key={cat} className="text-xs">
                <Badge variant={categoryColors[cat]} className="text-[10px] mb-1">{categoryLabels[cat]} ({catItems.length})</Badge>
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 p-1.5 border rounded ml-2 mb-1">
                    <span className="min-w-0 truncate">{item.feature}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => setItems(items.filter(x => x.id !== item.id))}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { total: items.length, mustBe: items.filter(i => i.category === "must-be").length, performance: items.filter(i => i.category === "performance").length, delighters: items.filter(i => i.category === "delighter").length } })} />
    </div>
  );
}
