import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Sparkles, Rocket, ArrowRight, Save, GaugeCircle, AlertTriangle } from "lucide-react";

/** TIMWOODS – de 8 klassiska slöserierna */
const WASTES = [
  { key: "T", label: "Transport", color: "bg-red-100 text-red-700 border-red-200" },
  { key: "I", label: "Inventory", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "M", label: "Motion", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "W", label: "Waiting", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { key: "O", label: "Overproduction", color: "bg-lime-100 text-lime-700 border-lime-200" },
  { key: "P", label: "Overprocessing", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "D", label: "Defects", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { key: "S", label: "Skills", color: "bg-violet-100 text-violet-700 border-violet-200" },
] as const;
type WasteKey = typeof WASTES[number]["key"];

interface VSMStep {
  id: string;
  name: string;
  vaTime: number;   // Value-Added time (min)
  nvaTime: number;  // Non-Value-Added / waiting time (min)
  wastes: WasteKey[];
  kaizen?: string;  // förbättringsidé
  estSavings?: number; // SEK/år vid åtgärd
}

interface VSMState {
  processName: string;
  demand: number;    // enheter/dag
  workday: number;   // min/dag
  steps: VSMStep[];
}

const STORAGE_KEY = "sixsigma:vsm-state";

const DEFAULT_STATE: VSMState = {
  processName: "Ny process",
  demand: 480,
  workday: 480,
  steps: [
    { id: crypto.randomUUID(), name: "Order mottagning", vaTime: 5, nvaTime: 60, wastes: ["W"], kaizen: "" },
    { id: crypto.randomUUID(), name: "Beredning", vaTime: 15, nvaTime: 120, wastes: ["W","I"], kaizen: "" },
    { id: crypto.randomUUID(), name: "Produktion", vaTime: 30, nvaTime: 45, wastes: ["M","D"], kaizen: "" },
    { id: crypto.randomUUID(), name: "Kvalitetskontroll", vaTime: 8, nvaTime: 30, wastes: ["P"], kaizen: "" },
    { id: crypto.randomUUID(), name: "Leverans", vaTime: 10, nvaTime: 240, wastes: ["T","W"], kaizen: "" },
  ],
};

function loadState(): VSMState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* empty */ }
  return DEFAULT_STATE;
}

export default function Lean() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [state, setState] = useState<VSMState>(() => loadState());
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [seedStep, setSeedStep] = useState<VSMStep | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* empty */ }
  }, [state]);

  const totals = useMemo(() => {
    const va = state.steps.reduce((s, x) => s + (x.vaTime || 0), 0);
    const nva = state.steps.reduce((s, x) => s + (x.nvaTime || 0), 0);
    const lead = va + nva;
    const pce = lead > 0 ? (va / lead) * 100 : 0;
    const takt = state.demand > 0 ? state.workday / state.demand : 0;
    const wasteCounts: Record<WasteKey, number> = { T:0,I:0,M:0,W:0,O:0,P:0,D:0,S:0 };
    for (const s of state.steps) for (const w of s.wastes) wasteCounts[w]++;
    const totalSavings = state.steps.reduce((s, x) => s + (x.estSavings || 0), 0);
    return { va, nva, lead, pce, takt, wasteCounts, totalSavings };
  }, [state]);

  const addStep = () => setState(s => ({
    ...s,
    steps: [...s.steps, { id: crypto.randomUUID(), name: "Nytt steg", vaTime: 0, nvaTime: 0, wastes: [] }],
  }));
  const removeStep = (id: string) => setState(s => ({ ...s, steps: s.steps.filter(x => x.id !== id) }));
  const updateStep = (id: string, patch: Partial<VSMStep>) =>
    setState(s => ({ ...s, steps: s.steps.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const toggleWaste = (id: string, w: WasteKey) => setState(s => ({
    ...s,
    steps: s.steps.map(x => x.id === id
      ? { ...x, wastes: x.wastes.includes(w) ? x.wastes.filter(k => k !== w) : [...x.wastes, w] }
      : x),
  }));

  const openCreateProject = (step: VSMStep) => {
    setSeedStep(step);
    setProjectDialogOpen(true);
  };

  const createProjectFromStep = async () => {
    if (!user || !seedStep) return;
    setCreating(true);
    const wasteLabels = seedStep.wastes.map(k => WASTES.find(w => w.key === k)?.label).filter(Boolean).join(", ");
    const name = `${state.processName} – ${seedStep.name}`;
    const description = [
      `Identifierat via Value Stream Map (${state.processName}).`,
      `Slöseri: ${wasteLabels || "–"}.`,
      `Ledtid för steget: VA ${seedStep.vaTime} min, NVA ${seedStep.nvaTime} min.`,
      seedStep.kaizen ? `Kaizen-idé: ${seedStep.kaizen}` : "",
    ].filter(Boolean).join("\n");

    const { data, error } = await supabase.from("projects").insert({
      name,
      description,
      user_id: user.id,
      current_phase: 1,
      status: "active",
      estimated_savings: seedStep.estSavings || null,
    }).select().single();

    setCreating(false);
    if (error) {
      toast({ title: "Kunde inte skapa projekt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "DMAIC-projekt skapat", description: "Öppnar Define-fasen…" });
    setProjectDialogOpen(false);
    navigate(`/project/${data.id}`);
  };

  return (
    <Layout>
      <section className="bg-gradient-to-br from-primary/10 via-transparent to-accent/10 border-b">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Lean · Value Stream Mapping
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Hitta nästa DMAIC-projekt</h1>
            <p className="text-muted-foreground max-w-2xl">
              Kartlägg processen, tagga slöserier (TIMWOODS), räkna PCE och Takt-tid, och skapa ett DMAIC-projekt direkt från det steg med störst potential.
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 space-y-6">
        {/* Process-info + KPI:er */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Processnamn</Label>
                <Input value={state.processName} onChange={(e) => setState(s => ({ ...s, processName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kundefterfrågan (enheter/dag)</Label>
                  <Input type="number" value={state.demand} onChange={(e) => setState(s => ({ ...s, demand: Number(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Arbetsdag (min)</Label>
                  <Input type="number" value={state.workday} onChange={(e) => setState(s => ({ ...s, workday: Number(e.target.value) || 0 }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardDescription>Process Cycle Efficiency</CardDescription></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <GaugeCircle className="h-6 w-6 text-primary" />
                {totals.pce.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                VA {totals.va} / Lead {totals.lead} min · World-class &gt; 25%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardDescription>Takt-tid</CardDescription></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.takt.toFixed(1)} <span className="text-base font-normal text-muted-foreground">min/enhet</span></div>
              <p className="text-xs text-muted-foreground mt-1">Cykeltid ska ligga under takt-tid</p>
            </CardContent>
          </Card>
        </div>

        {/* Waste-summering */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Slöseri (TIMWOODS) – förekomst i värdeflödet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {WASTES.map(w => (
                <div key={w.key} className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${w.color}`}>
                  <span className="font-bold mr-1">{w.key}</span>{w.label}: {totals.wasteCounts[w.key]}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Steg */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Värdeflöde – steg</CardTitle>
              <CardDescription>Klicka på slöseri-taggarna för att markera. Skapa DMAIC-projekt från steget med högst potential.</CardDescription>
            </div>
            <Button size="sm" onClick={addStep} className="gap-1"><Plus className="h-4 w-4" /> Lägg till steg</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.steps.map((step, i) => {
              const lead = (step.vaTime || 0) + (step.nvaTime || 0);
              const pce = lead > 0 ? ((step.vaTime || 0) / lead) * 100 : 0;
              const isHotspot = pce < 20 && lead > 0;
              return (
                <div key={step.id} className={`rounded-lg border p-3 space-y-3 ${isHotspot ? "border-amber-300 bg-amber-50/40 dark:bg-amber-950/10" : ""}`}>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-1">{i + 1}</Badge>
                    <div className="flex-1 grid gap-2 md:grid-cols-[1fr,110px,110px,120px] items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Steg</Label>
                        <Input value={step.name} onChange={(e) => updateStep(step.id, { name: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">VA (min)</Label>
                        <Input type="number" value={step.vaTime} onChange={(e) => updateStep(step.id, { vaTime: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">NVA (min)</Label>
                        <Input type="number" value={step.nvaTime} onChange={(e) => updateStep(step.id, { nvaTime: Number(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Est. besparing SEK/år</Label>
                        <Input type="number" placeholder="0" value={step.estSavings ?? ""} onChange={(e) => updateStep(step.id, { estSavings: e.target.value === "" ? undefined : Number(e.target.value) })} />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeStep(step.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground mr-1">Slöseri:</span>
                    {WASTES.map(w => {
                      const active = step.wastes.includes(w.key);
                      return (
                        <button
                          key={w.key}
                          type="button"
                          onClick={() => toggleWaste(step.id, w.key)}
                          className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${active ? w.color : "bg-muted/40 text-muted-foreground border-transparent hover:border-muted"}`}
                          title={w.label}
                        >
                          {w.key}
                        </button>
                      );
                    })}
                    <span className="ml-auto text-xs text-muted-foreground">
                      Steg-PCE: <span className={isHotspot ? "text-amber-600 font-medium" : ""}>{pce.toFixed(0)}%</span>
                    </span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[1fr,auto]">
                    <Textarea
                      rows={2}
                      placeholder="Kaizen-idé / förbättringsförslag"
                      value={step.kaizen || ""}
                      onChange={(e) => updateStep(step.id, { kaizen: e.target.value })}
                    />
                    <Button
                      onClick={() => openCreateProject(step)}
                      disabled={!user}
                      className="gap-2 self-end"
                      variant={isHotspot ? "default" : "outline"}
                    >
                      <Rocket className="h-4 w-4" />
                      Skapa DMAIC-projekt
                    </Button>
                  </div>
                </div>
              );
            })}
            {state.steps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Inga steg – klicka "Lägg till steg" för att börja.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-medium">Total potential från identifierade steg</div>
              <div className="text-2xl font-bold">{totals.totalSavings.toLocaleString("sv-SE")} SEK/år</div>
            </div>
            <div className="text-xs text-muted-foreground max-w-md">
              💡 Steg med Steg-PCE &lt; 20% markeras automatiskt som förbättringskandidater (gulmarkerade).
            </div>
          </CardContent>
        </Card>
      </section>

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skapa DMAIC-projekt från VSM-steg</DialogTitle>
            <DialogDescription>
              Ett nytt projekt skapas i Define-fasen med förifylld problemformulering.
            </DialogDescription>
          </DialogHeader>
          {seedStep && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Process:</span> <b>{state.processName}</b></div>
              <div><span className="text-muted-foreground">Steg:</span> <b>{seedStep.name}</b></div>
              <div><span className="text-muted-foreground">Slöseri:</span> {seedStep.wastes.map(k => WASTES.find(w => w.key === k)?.label).join(", ") || "–"}</div>
              <div><span className="text-muted-foreground">Est. besparing:</span> {seedStep.estSavings ? `${seedStep.estSavings.toLocaleString("sv-SE")} SEK/år` : "–"}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>Avbryt</Button>
            <Button onClick={createProjectFromStep} disabled={creating || !user} className="gap-2">
              {creating ? <Save className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />}
              Skapa & öppna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
