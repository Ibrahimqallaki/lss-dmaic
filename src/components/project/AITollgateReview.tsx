import { useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Criterion {
  id: string;
  title: string;
  status: "pass" | "partial" | "fail";
  evidence: string;
}

interface ReviewResult {
  verdict: "approved" | "conditional" | "rejected";
  score: number;
  summary: string;
  criteria: Criterion[];
  missing_artifacts: string[];
  recommendations: string[];
  risks: string[];
}

interface AITollgateReviewProps {
  projectId: string;
  phase: number;
  phaseName: string;
  onItemsAutoChecked?: () => void;
}

const verdictMeta = {
  approved: { label: "Godkänd", color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30", Icon: CheckCircle2 },
  conditional: { label: "Villkorad", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", Icon: AlertTriangle },
  rejected: { label: "Underkänd", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", Icon: XCircle },
} as const;

const statusIcon = (s: Criterion["status"]) =>
  s === "pass" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
  s === "partial" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
  <XCircle className="h-4 w-4 text-red-500" />;

export function AITollgateReview({ projectId, phase, phaseName, onItemsAutoChecked }: AITollgateReviewProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [applying, setApplying] = useState(false);

  const runReview = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Inte inloggad");

      const url = `https://uswqbrghiqhjqwyrclid.supabase.co/functions/v1/ai-tollgate-review`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, phase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tollgate-review misslyckades");
    } finally {
      setIsLoading(false);
    }
  };

  const applyAutoChecks = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const passIds = result.criteria.filter(c => c.status === "pass").map(c => c.id);
      if (passIds.length === 0) {
        toast.info("Inga punkter att auto-bocka av");
        return;
      }
      const { error } = await supabase
        .from("tollgate_items")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .in("id", passIds);
      if (error) throw error;
      toast.success(`${passIds.length} punkter auto-bockade`);
      onItemsAutoChecked?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kunde inte uppdatera");
    } finally {
      setApplying(false);
    }
  };

  const v = result ? verdictMeta[result.verdict] : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          AI Tollgate-review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tollgate-review: {phaseName}
          </DialogTitle>
          <DialogDescription>
            AI granskar fasen mot faktisk projektdata och bedömer om du är redo att gå vidare.
          </DialogDescription>
        </DialogHeader>

        {!result && !isLoading && (
          <div className="py-6 text-center">
            <Button onClick={runReview} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Kör review nu
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Granskar projektdata och bedömer kriterier...</p>
          </div>
        )}

        {result && v && (
          <div className="space-y-4">
            <div className={`rounded-lg border p-4 ${v.color}`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 font-semibold">
                  <v.Icon className="h-5 w-5" />
                  {v.label}
                </div>
                <Badge variant="outline" className="text-sm">Score: {result.score}/100</Badge>
              </div>
              <p className="text-sm">{result.summary}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Kriteriebedömning</h4>
              <div className="space-y-1.5">
                {result.criteria.map((c, i) => (
                  <div key={c.id || i} className="flex items-start gap-2 rounded-md border bg-muted/30 p-2.5">
                    <div className="mt-0.5">{statusIcon(c.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{c.evidence}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.missing_artifacts?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Saknade artefakter</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                  {result.missing_artifacts.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Rekommenderade nästa steg</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {result.risks?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1 text-amber-600 dark:text-amber-400">Risker</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                  {result.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={runReview} disabled={isLoading}>
                Kör om
              </Button>
              <Button onClick={applyAutoChecks} disabled={applying} className="gap-2">
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Auto-bocka godkända punkter
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
