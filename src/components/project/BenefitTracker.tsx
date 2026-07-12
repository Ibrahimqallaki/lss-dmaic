import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, ComposedChart, Legend } from "recharts";

interface Props {
  projectId: string;
  estimatedTotal?: number | null;
}

interface BenefitEntry {
  id: string;
  period_month: string; // ISO date
  amount: number;
  category: "realized" | "forecast" | "avoidance";
  notes: string | null;
}

const CATEGORY_LABEL: Record<BenefitEntry["category"], string> = {
  realized: "Realiserad",
  forecast: "Prognos",
  avoidance: "Kostn.undvikande",
};

function monthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", { year: "numeric", month: "short" });
}

function todayFirstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function BenefitTracker({ projectId, estimatedTotal }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<BenefitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>(todayFirstOfMonth());
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<BenefitEntry["category"]>("realized");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("benefit_entries")
      .select("id, period_month, amount, category, notes")
      .eq("project_id", projectId)
      .order("period_month", { ascending: true });
    if (!error && data) setEntries(data as BenefitEntry[]);
    setLoading(false);
  };

  const totals = useMemo(() => {
    const realized = entries.filter(e => e.category === "realized").reduce((s, e) => s + Number(e.amount), 0);
    const forecast = entries.filter(e => e.category === "forecast").reduce((s, e) => s + Number(e.amount), 0);
    const avoidance = entries.filter(e => e.category === "avoidance").reduce((s, e) => s + Number(e.amount), 0);
    const total = realized + forecast + avoidance;
    return { realized, forecast, avoidance, total };
  }, [entries]);

  const chartData = useMemo(() => {
    const byMonth = new Map<string, { month: string; realized: number; forecast: number; avoidance: number; cum: number }>();
    for (const e of entries) {
      const key = e.period_month.slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, { month: monthLabel(e.period_month), realized: 0, forecast: 0, avoidance: 0, cum: 0 });
      const row = byMonth.get(key)!;
      row[e.category] += Number(e.amount);
    }
    const sorted = [...byMonth.values()];
    let cum = 0;
    for (const r of sorted) { cum += r.realized + r.avoidance; r.cum = cum; }
    return sorted;
  }, [entries]);

  const attainment = estimatedTotal && estimatedTotal > 0 ? (totals.realized / estimatedTotal) * 100 : null;

  const addEntry = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!amt || Number.isNaN(amt)) {
      toast({ title: "Ange ett belopp", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("benefit_entries")
      .insert({
        project_id: projectId,
        user_id: user.id,
        period_month: period,
        amount: amt,
        category,
        notes: notes.trim() || null,
      })
      .select("id, period_month, amount, category, notes")
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Kunde inte spara", description: error.message, variant: "destructive" });
      return;
    }
    setEntries(e => [...e, data as BenefitEntry].sort((a, b) => a.period_month.localeCompare(b.period_month)));
    setAmount(""); setNotes("");
    toast({ title: "Post tillagd" });
  };

  const removeEntry = async (id: string) => {
    const { error } = await supabase.from("benefit_entries").delete().eq("id", id);
    if (error) { toast({ title: "Kunde inte ta bort", variant: "destructive" }); return; }
    setEntries(e => e.filter(x => x.id !== id));
  };

  const fmt = (v: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Realiserat</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{fmt(totals.realized)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Prognos</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-sky-600">{fmt(totals.forecast)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Kostn.undvikande</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-violet-600">{fmt(totals.avoidance)}</div></CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardDescription>Måluppfyllelse mot estimat</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attainment != null ? `${attainment.toFixed(0)}%` : "–"}
            </div>
            <p className="text-xs text-muted-foreground">Estimat: {estimatedTotal ? fmt(estimatedTotal) : "ej satt"}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Benefit Realization</CardTitle>
            <CardDescription>Månadsvis intäkt samt kumulerat realiserat + kostnadsundvikande</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="realized" name="Realiserat" fill="hsl(142 71% 45%)" stackId="a" />
                  <Bar dataKey="avoidance" name="Undvikande" fill="hsl(262 83% 58%)" stackId="a" />
                  <Bar dataKey="forecast" name="Prognos" fill="hsl(199 89% 48%)" stackId="a" />
                  <Line type="monotone" dataKey="cum" name="Kumulerat (real+undv)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Lägg till post</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[140px,140px,160px,1fr,auto] items-end">
            <div className="space-y-1"><Label className="text-xs">Månad</Label><Input type="month" value={period.slice(0, 7)} onChange={(e) => setPeriod(`${e.target.value}-01`)} /></div>
            <div className="space-y-1"><Label className="text-xs">Belopp (SEK)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
            <div className="space-y-1">
              <Label className="text-xs">Typ</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as BenefitEntry["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="realized">Realiserad</SelectItem>
                  <SelectItem value="forecast">Prognos</SelectItem>
                  <SelectItem value="avoidance">Kostn.undvikande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Kommentar</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Källa, mätperiod, KPI …" /></div>
            <Button onClick={addEntry} disabled={saving} className="gap-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Lägg till</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Alla poster</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Inga poster ännu – logga månadsvis realiserad besparing efter Control-fasen.</p>
          ) : (
            <div className="divide-y">
              {entries.map(e => (
                <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-24 text-muted-foreground">{monthLabel(e.period_month)}</span>
                  <Badge variant="outline">{CATEGORY_LABEL[e.category]}</Badge>
                  <span className="font-medium w-32">{fmt(Number(e.amount))}</span>
                  <span className="flex-1 text-muted-foreground truncate">{e.notes}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeEntry(e.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
