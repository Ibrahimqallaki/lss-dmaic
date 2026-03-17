import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { toast } from "sonner";

interface CTQItem { id: string; customerNeed: string; driver: string; ctq: string; spec: string; }

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function CTQTreeTool({ toolId = "ctq", toolName = "CTQ Tree", phase = 1 }: Props) {
  const [items, setItems] = useState<CTQItem[]>([]);
  const [form, setForm] = useState({ customerNeed: "", driver: "", ctq: "", spec: "" });
  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculations, isLoadingSaved } = useCalculatorSave(toolId);

  const addItem = () => {
    if (!form.customerNeed.trim() || !form.ctq.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), ...form }]);
    setForm({ customerNeed: "", driver: "", ctq: "", spec: "" });
  };

  const handleLoad = (inputs: Record<string, unknown>) => {
    const loaded = inputs.items as any[];
    if (Array.isArray(loaded)) {
      setItems(loaded.map(i => ({ id: crypto.randomUUID(), customerNeed: String(i.customerNeed || ""), driver: String(i.driver || ""), ctq: String(i.ctq || ""), spec: String(i.spec || "") })));
      toast.success("Sparad beräkning laddad!");
    }
  };

  const hasResult = items.length > 0;

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculations={savedCalculations} isLoading={isLoadingSaved} onLoad={handleLoad} />

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Kundbehov</Label><Input value={form.customerNeed} onChange={e => setForm({ ...form, customerNeed: e.target.value })} placeholder="Snabb leverans" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Drivare</Label><Input value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })} placeholder="Orderplock, transport" className="text-sm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">CTQ (Critical to Quality)</Label><Input value={form.ctq} onChange={e => setForm({ ...form, ctq: e.target.value })} placeholder="Leveranstid" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Specifikation</Label><Input value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })} placeholder="≤ 2 arbetsdagar" className="text-sm" /></div>
      </div>
      <Button size="sm" onClick={addItem} disabled={!form.customerNeed.trim() || !form.ctq.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-1 p-2 border rounded-lg text-xs bg-muted/30">
              <span className="font-medium text-primary">{item.customerNeed}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span>{item.driver || "–"}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">{item.ctq}</span>
              {item.spec && <><ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" /><span className="text-muted-foreground">{item.spec}</span></>}
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto flex-shrink-0" onClick={() => setItems(items.filter(i => i.id !== item.id))}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { totalCTQs: items.length, withSpecs: items.filter(i => i.spec).length } })} />
    </div>
  );
}
