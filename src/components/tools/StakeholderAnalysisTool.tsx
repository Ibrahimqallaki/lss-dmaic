import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";

interface Stakeholder { id: string; name: string; power: number; interest: number; strategy: string; }

interface Props { toolId?: string; toolName?: string; phase?: number; }

const getStrategy = (power: number, interest: number) => {
  if (power >= 5 && interest >= 5) return "Hantera nära";
  if (power >= 5 && interest < 5) return "Håll nöjda";
  if (power < 5 && interest >= 5) return "Håll informerade";
  return "Övervaka";
};

const strategyColor = (s: string) => {
  if (s === "Hantera nära") return "destructive";
  if (s === "Håll nöjda") return "default";
  if (s === "Håll informerade") return "secondary";
  return "outline";
};

export function StakeholderAnalysisTool({ toolId = "stakeholder-analysis", toolName = "Intressentanalys", phase = 1 }: Props) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [name, setName] = useState("");
  const [power, setPower] = useState([5]);
  const [interest, setInterest] = useState([5]);
  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave();

  const addStakeholder = () => {
    if (!name.trim()) return;
    const strategy = getStrategy(power[0], interest[0]);
    setStakeholders([...stakeholders, { id: crypto.randomUUID(), name, power: power[0], interest: interest[0], strategy }]);
    setName("");
  };

  const hasResult = stakeholders.length > 0;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Intressentens namn</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="T.ex. Produktionschef" className="text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Inflytande: {power[0]}/10</Label>
          <Slider value={power} onValueChange={setPower} min={1} max={10} step={1} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Intresse: {interest[0]}/10</Label>
          <Slider value={interest} onValueChange={setInterest} min={1} max={10} step={1} />
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Strategi: <Badge variant={strategyColor(getStrategy(power[0], interest[0]))} className="text-[10px]">{getStrategy(power[0], interest[0])}</Badge></div>
      <Button size="sm" onClick={addStakeholder} disabled={!name.trim()} className="gap-1"><Plus className="h-3 w-3" /> Lägg till</Button>

      {hasResult && (
        <>
          {/* Power/Interest Grid */}
          <div className="relative border rounded-lg p-4 h-48 bg-muted/20">
            <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-muted-foreground/30" />
            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-muted-foreground/30" />
            <div className="absolute top-1 left-1 text-[9px] text-muted-foreground">Håll nöjda</div>
            <div className="absolute top-1 right-1 text-[9px] text-muted-foreground">Hantera nära</div>
            <div className="absolute bottom-1 left-1 text-[9px] text-muted-foreground">Övervaka</div>
            <div className="absolute bottom-1 right-1 text-[9px] text-muted-foreground">Håll informerade</div>
            {stakeholders.map(s => (
              <div key={s.id} className="absolute w-2 h-2 rounded-full bg-primary" style={{ left: `${(s.interest / 10) * 90 + 5}%`, bottom: `${(s.power / 10) * 85 + 5}%` }} title={s.name}>
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap font-medium">{s.name}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {stakeholders.map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs p-1.5 border rounded">
                <span className="font-medium">{s.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">P:{s.power} I:{s.interest}</span>
                  <Badge variant={strategyColor(s.strategy)} className="text-[10px]">{s.strategy}</Badge>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setStakeholders(stakeholders.filter(x => x.id !== s.id))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={hasResult} notes={notes} onNotesChange={setNotes} onSave={() => saveCalculation({ toolId, toolName, phase, inputs: { stakeholders }, results: { total: stakeholders.length, manageClosely: stakeholders.filter(s => s.strategy === "Hantera nära").length } })} />
    </div>
  );
}
