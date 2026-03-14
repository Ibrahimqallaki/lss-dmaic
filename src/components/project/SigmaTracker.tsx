import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Plus, TrendingUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { phases } from "@/data/dmaic-tools";

interface SigmaEntry {
  id: string;
  phase: number;
  sigma_level: number;
  dpmo: number | null;
  measurement_date: string;
  notes: string | null;
}

interface SigmaTrackerProps {
  projectId: string;
}

export function SigmaTracker({ projectId }: SigmaTrackerProps) {
  const [entries, setEntries] = useState<SigmaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSigma, setNewSigma] = useState("");
  const [newDpmo, setNewDpmo] = useState("");
  const [newPhase, setNewPhase] = useState("1");
  const [newNotes, setNewNotes] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchEntries();
  }, [projectId]);

  const fetchEntries = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("sigma_tracking")
      .select("*")
      .eq("project_id", projectId)
      .order("measurement_date");

    if (!error) setEntries(data || []);
    setIsLoading(false);
  };

  const addEntry = async () => {
    if (!user || !newSigma) return;
    const { data, error } = await supabase
      .from("sigma_tracking")
      .insert({
        project_id: projectId,
        user_id: user.id,
        phase: parseInt(newPhase),
        sigma_level: parseFloat(newSigma),
        dpmo: newDpmo ? parseInt(newDpmo) : null,
        notes: newNotes || null,
      })
      .select()
      .single();

    if (!error && data) {
      setEntries([...entries, data]);
      setNewSigma("");
      setNewDpmo("");
      setNewNotes("");
      setIsDialogOpen(false);
      toast.success("Sigma-mätning sparad!");
    } else {
      toast.error("Kunde inte spara");
    }
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from("sigma_tracking").delete().eq("id", id);
    if (!error) setEntries(entries.filter(e => e.id !== id));
  };

  const chartData = entries.map((e, i) => ({
    name: phases.find(p => p.id === e.phase)?.name || `Fas ${e.phase}`,
    sigma: Number(e.sigma_level),
    date: new Date(e.measurement_date).toLocaleDateString("sv-SE"),
    index: i,
  }));

  const latestSigma = entries.length > 0 ? Number(entries[entries.length - 1].sigma_level) : null;
  const firstSigma = entries.length > 0 ? Number(entries[0].sigma_level) : null;
  const improvement = latestSigma && firstSigma ? (latestSigma - firstSigma).toFixed(2) : null;

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Sigma-benchmark
          </CardTitle>
          <div className="flex items-center gap-2">
            {improvement && (
              <Badge variant={parseFloat(improvement) > 0 ? "default" : "secondary"}>
                {parseFloat(improvement) > 0 ? "+" : ""}{improvement}σ
              </Badge>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-3 w-3" /> Ny mätning
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrera sigma-mätning</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Sigma-nivå</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="t.ex. 3.45"
                        value={newSigma}
                        onChange={(e) => setNewSigma(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>DPMO (valfritt)</Label>
                      <Input
                        type="number"
                        placeholder="t.ex. 6210"
                        value={newDpmo}
                        onChange={(e) => setNewDpmo(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fas</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newPhase}
                      onChange={(e) => setNewPhase(e.target.value)}
                    >
                      {phases.map(p => (
                        <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Anteckning (valfritt)</Label>
                    <Textarea
                      placeholder="Beskriv mätningen..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button onClick={addEntry} className="w-full" disabled={!newSigma}>
                    Spara mätning
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Ingen sigma-data ännu. Registrera din baseline-mätning.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 6]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <ReferenceLine y={6} stroke="hsl(var(--accent))" strokeDasharray="5 5" label="6σ" />
                  <ReferenceLine y={4.5} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="4.5σ" />
                  <Line
                    type="monotone"
                    dataKey="sigma"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    name="Sigma-nivå"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Entries list */}
            <div className="space-y-2">
              {entries.map((entry) => {
                const phaseData = phases.find(p => p.id === entry.phase);
                return (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm group">
                    <div className="flex items-center gap-2">
                      <span>{phaseData?.icon}</span>
                      <span className="font-mono font-bold">{Number(entry.sigma_level).toFixed(2)}σ</span>
                      {entry.dpmo && <span className="text-muted-foreground">({entry.dpmo} DPMO)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.measurement_date).toLocaleDateString("sv-SE")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
