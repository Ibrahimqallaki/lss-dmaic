import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { toast } from "sonner";

interface DataItem { id: string; measure: string; dataType: string; opDef: string; source: string; sampleSize: string; frequency: string; who: string; }

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function DataCollectionPlanTool({ toolId = "data-collection-plan", toolName = "Datainsamlingsplan", phase = 2 }: Props) {
  const [items, setItems] = useState<DataItem[]>([]);
  const [form, setForm] = useState({ measure: "", dataType: "kontinuerlig", opDef: "", source: "", sampleSize: "", frequency: "", who: "" });

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    const loaded = inputs.items as any[];
    if (Array.isArray(loaded)) {
      setItems(loaded.map(i => ({ id: crypto.randomUUID(), measure: String(i.measure || ""), dataType: String(i.dataType || "kontinuerlig"), opDef: String(i.opDef || ""), source: String(i.source || ""), sampleSize: String(i.sampleSize || ""), frequency: String(i.frequency || ""), who: String(i.who || "") })));
    }
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } = useCalculatorSave(toolId, handleLoad);

  const addItem = () => {
    if (!form.measure.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), ...form }]);
    setForm({ ...form, measure: "", opDef: "", source: "", sampleSize: "", frequency: "", who: "" });
  };


  const hasResult = items.length > 0;

  return (
    <div className="space-y-3">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Vad mäts?</Label><Input value={form.measure} onChange={e => setForm({ ...form, measure: e.target.value })} placeholder="T.ex. Cykeltid" className="text-sm" /></div>
        <div className="space-y-1">
          <Label className="text-xs">Datatyp</Label>
          <Select value={form.dataType} onValueChange={v => setForm({ ...form, dataType: v })}><SelectTrigger className="text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="kontinuerlig">Kontinuerlig</SelectItem><SelectItem value="diskret">Diskret</SelectItem><SelectItem value="attribut">Attribut</SelectItem></SelectContent></Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Operationell definition</Label><Input value={form.opDef} onChange={e => setForm({ ...form, opDef: e.target.value })} placeholder="Exakt hur mäts det?" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Datakälla</Label><Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="System, manuell mätning..." className="text-sm" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1"><Label className="text-xs">Stickprovsstorlek</Label><Input value={form.sampleSize} onChange={e => setForm({ ...form, sampleSize: e.target.value })} placeholder="30" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Frekvens</Label><Input value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} placeholder="Dagligen" className="text-sm" /></div>
        <div className="space-y-1"><Label className="text-xs">Ansvarig</Label><Input value={form.who} onChange={e => setForm({ ...form, who: e.target.value })} placeholder="Vem samlar?" className="text-sm" /></div>
      </div>
      <Button size="sm" onClick={addItem} disabled={!form.measure.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {hasResult && (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="p-2 border rounded text-xs space-y-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{item.measure}</span>
                <div className="flex gap-1 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">{item.dataType}</Badge>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setItems(items.filter(x => x.id !== item.id))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              {item.opDef && <div className="text-muted-foreground">Def: {item.opDef}</div>}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                {item.source && <span>Källa: {item.source}</span>}
                {item.sampleSize && <span>n={item.sampleSize}</span>}
                {item.frequency && <span>{item.frequency}</span>}
                {item.who && <span>→ {item.who}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { totalMeasures: items.length, continuous: items.filter(i => i.dataType === "kontinuerlig").length, discrete: items.filter(i => i.dataType === "diskret").length } })} />
    </div>
  );
}
