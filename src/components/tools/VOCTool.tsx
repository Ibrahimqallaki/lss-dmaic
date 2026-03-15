import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VOCItem {
  id: string;
  source: string;
  need: string;
  priority: "hög" | "medel" | "låg";
  requirement: string;
}

interface Props { toolId?: string; toolName?: string; phase?: number; }

export function VOCTool({ toolId = "voc", toolName = "Voice of Customer", phase = 1 }: Props) {
  const [items, setItems] = useState<VOCItem[]>([]);
  const [source, setSource] = useState("");
  const [need, setNeed] = useState("");
  const [priority, setPriority] = useState<"hög" | "medel" | "låg">("medel");
  const [requirement, setRequirement] = useState("");
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const addItem = () => {
    if (!need.trim()) return;
    setItems([...items, { id: crypto.randomUUID(), source, need, priority, requirement }]);
    setSource(""); setNeed(""); setRequirement("");
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));
  const hasResult = items.length > 0;

  const priorityColor = (p: string) => p === "hög" ? "destructive" : p === "medel" ? "default" : "secondary";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Källa</Label>
          <Input value={source} onChange={e => setSource(e.target.value)} placeholder="Intervju, enkät, klagomål..." className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Kundbehov</Label>
          <Input value={need} onChange={e => setNeed(e.target.value)} placeholder="Vad vill kunden?" className="text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Mätbart krav</Label>
          <Input value={requirement} onChange={e => setRequirement(e.target.value)} placeholder="Leveranstid ≤ 2 dagar" className="text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Prioritet</Label>
          <Select value={priority} onValueChange={v => setPriority(v as any)}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hög">Hög</SelectItem>
              <SelectItem value="medel">Medel</SelectItem>
              <SelectItem value="låg">Låg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button size="sm" onClick={addItem} disabled={!need.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Källa</th>
                <th className="text-left p-2">Behov</th>
                <th className="text-left p-2">Krav</th>
                <th className="p-2">Prio</th>
                <th className="p-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.source || "–"}</td>
                  <td className="p-2 font-medium">{item.need}</td>
                  <td className="p-2">{item.requirement || "–"}</td>
                  <td className="p-2 text-center"><Badge variant={priorityColor(item.priority)} className="text-[10px]">{item.priority}</Badge></td>
                  <td className="p-2"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.id)}><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasResult && (
        <div className="p-3 bg-muted/50 rounded-lg text-xs">
          <span className="font-medium">{items.length} kundbehov</span> identifierade • {items.filter(i => i.priority === "hög").length} höga • {items.filter(i => i.requirement).length} med mätbart krav
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { items }, results: { totalNeeds: items.length, highPriority: items.filter(i => i.priority === "hög").length, withRequirements: items.filter(i => i.requirement).length } })} />
    </div>
  );
}
