import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "@/components/calculators/CalculatorSaveButton";
import { CalculatorLoadButton } from "@/components/calculators/CalculatorLoadButton";
import { ExampleDataButton } from "@/components/calculators/ExampleDataButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";

interface Props { toolId?: string; toolName?: string; phase?: number; }

interface Dimension { is: string; isNot: string }
type Matrix = Record<DimKey, Dimension>;

const DIMENSIONS = [
  { key: "what",    label: "VAD",        hint: "Symptom/defekt som observeras",         hintNot: "Liknande symptom som INTE observeras" },
  { key: "where",   label: "VAR",        hint: "Plats, linje, geografi där det sker",   hintNot: "Liknande ställen där det INTE sker" },
  { key: "when",    label: "NÄR",        hint: "Tidpunkt, skift, frekvens, sedan när",  hintNot: "Tider då det INTE sker" },
  { key: "who",     label: "VEM",        hint: "Utrustning, produkt, leverantör, grupp", hintNot: "Varianter/leverantörer som är felfria" },
  { key: "why",     label: "VARFÖR",     hint: "Känd trigger eller mekanism",            hintNot: "Hypoteser som uteslutits" },
  { key: "how",     label: "HUR",        hint: "Hur felet manifesteras / mönster",       hintNot: "Andra mönster som inte ses" },
  { key: "howMuch", label: "HUR MYCKET", hint: "Kvantifierat omfång (kr, %, antal)",     hintNot: "Omfång som anses normalt/tolerabelt" },
] as const;
type DimKey = typeof DIMENSIONS[number]["key"];

const empty = (): Matrix => DIMENSIONS.reduce((acc, d) => {
  acc[d.key] = { is: "", isNot: "" };
  return acc;
}, {} as Matrix);

export function FiveW2HTool({ toolId = "5w2h-is-isnot", toolName = "5W2H Is/Is-Not", phase = 1 }: Props) {
  const [matrix, setMatrix] = useState<Matrix>(empty());
  const [aiOut, setAiOut] = useState<{ problemStatement?: string; scope?: string; warning?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    const m = (inputs?.matrix as Matrix) || empty();
    setMatrix({ ...empty(), ...m });
    setAiOut((inputs?.ai as typeof aiOut) || null);
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } =
    useCalculatorSave(toolId, handleLoad);

  const update = (key: DimKey, side: keyof Dimension, value: string) =>
    setMatrix(prev => ({ ...prev, [key]: { ...prev[key], [side]: value } }));

  const filledCount = DIMENSIONS.filter(d => matrix[d.key].is.trim() || matrix[d.key].isNot.trim()).length;
  const hasResult = filledCount > 0;
  const canAI = filledCount >= 4;

  const loadExample = () => {
    setMatrix({
      what:    { is: "Skrapmärken på dörrpaneler",          isNot: "Inga sprickor eller bucklor" },
      where:   { is: "Monteringslinje 2",                    isNot: "Monteringslinje 1 och 3" },
      when:    { is: "Nattskift, sedan 2026-05-10",          isNot: "Dagskift och helger" },
      who:     { is: "Råmaterial från leverantör X",         isNot: "Leverantör Y och Z (felfria)" },
      why:     { is: "Friktion vid robotmatning misstänks",  isNot: "Operatörshandhavande uteslutet" },
      how:     { is: "Slumpmässiga fläckar på ~2 % av ytan", isNot: "Inte jämnt slitage över hela ytan" },
      howMuch: { is: "15 000 kr/vecka, 120 stoppminuter",    isNot: "Småstopp under 5 sekunder ignoreras" },
    });
    setAiOut(null);
  };

  const buildDraft = (): { statement: string; scope: string } => {
    const m = matrix;
    const statement = [
      m.what.is && m.what.is,
      m.where.is && `Det uppstår i ${m.where.is}`,
      m.when.is && `under ${m.when.is}`,
      m.who.is && `och berör ${m.who.is}`,
      m.how.is && `genom ${m.how.is}`,
      m.howMuch.is && `med en omfattning på ${m.howMuch.is}`,
    ].filter(Boolean).join(". ") + ".";

    const inParts = DIMENSIONS.map(d => m[d.key].is && `${d.label}: ${m[d.key].is}`).filter(Boolean).join(" | ");
    const outParts = DIMENSIONS.map(d => m[d.key].isNot && `${d.label}: ${m[d.key].isNot}`).filter(Boolean).join(" | ");
    const scope = `Ingår (In-Scope): ${inParts || "—"}\nIngår inte (Out-of-Scope): ${outParts || "—"}`;
    return { statement, scope };
  };

  const runAI = async () => {
    if (!canAI) {
      toast.error("Fyll i minst 4 dimensioner innan AI-syntes");
      return;
    }
    setLoading(true);
    setAiOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-5w2h-synth", { body: { matrix } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiOut(data);
      toast.success("AI-förslag genererat");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI-syntes misslyckades");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Kopierat");
    setTimeout(() => setCopied(null), 1500);
  };

  const draft = hasResult ? buildDraft() : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
        <ExampleDataButton onLoad={loadExample} />
        <Badge variant="outline" className="ml-auto">{filledCount}/7 dimensioner ifyllda</Badge>
      </div>

      {/* Matrix header (desktop only) */}
      <div className="hidden md:grid grid-cols-[110px_1fr_1fr] gap-2 text-xs font-semibold text-muted-foreground">
        <div />
        <div className="text-emerald-600 dark:text-emerald-400">ÄR (Is)</div>
        <div className="text-rose-600 dark:text-rose-400">ÄR INTE (Is Not)</div>
      </div>

      {DIMENSIONS.map(d => (
        <div key={d.key} className="grid grid-cols-1 md:grid-cols-[110px_1fr_1fr] gap-2 items-start">
          <div className="md:pt-2">
            <Badge variant="secondary" className="font-semibold">{d.label}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="md:hidden text-xs text-emerald-600 dark:text-emerald-400">ÄR — {d.hint}</Label>
            <Textarea
              value={matrix[d.key].is}
              onChange={e => update(d.key, "is", e.target.value)}
              placeholder={d.hint}
              className="text-sm h-16 resize-none border-emerald-200 dark:border-emerald-900/40 focus-visible:ring-emerald-500/30"
            />
          </div>
          <div className="space-y-1">
            <Label className="md:hidden text-xs text-rose-600 dark:text-rose-400">ÄR INTE — {d.hintNot}</Label>
            <Textarea
              value={matrix[d.key].isNot}
              onChange={e => update(d.key, "isNot", e.target.value)}
              placeholder={d.hintNot}
              className="text-sm h-16 resize-none border-rose-200 dark:border-rose-900/40 focus-visible:ring-rose-500/30"
            />
          </div>
        </div>
      ))}

      {draft && (
        <Card className="p-3 space-y-3 bg-muted/40">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold">📝 Problemformulering (utkast)</p>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy("ps", draft.statement)}>
                {copied === "ps" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground italic">{draft.statement}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold">🎯 Omfattning (utkast)</p>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy("sc", draft.scope)}>
                {copied === "sc" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{draft.scope}</p>
          </div>
        </Card>
      )}

      <div>
        <Button onClick={runAI} disabled={loading || !canAI} size="sm" className="w-full" variant="default">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Optimera med AI (Gemini)
        </Button>
        {!canAI && <p className="text-[11px] text-muted-foreground mt-1">Fyll i minst 4 dimensioner för att aktivera AI-syntes.</p>}
      </div>

      {aiOut && (
        <Card className="p-3 space-y-3 border-primary/40 bg-primary/5">
          {aiOut.warning && (
            <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ {aiOut.warning}</p>
          )}
          {aiOut.problemStatement && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-primary">✨ AI-förbättrad problemformulering</p>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy("aips", aiOut.problemStatement!)}>
                  {copied === "aips" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-xs whitespace-pre-line">{aiOut.problemStatement}</p>
            </div>
          )}
          {aiOut.scope && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-primary">✨ AI-förbättrad omfattning</p>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy("aisc", aiOut.scope!)}>
                  {copied === "aisc" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-xs whitespace-pre-line">{aiOut.scope}</p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Granska innan du kopierar in i Project Charter eller Problemformulering.
          </p>
        </Card>
      )}

      <CalculatorSaveButton
        canSave={canSave}
        isSaving={isSaving}
        hasResult={hasResult}
        notes={notes}
        onNotesChange={setNotes}
        onSave={() => saveCalculation({
          toolId, toolName, phase,
          inputs: { matrix, ai: aiOut },
          results: {
            filledDimensions: filledCount,
            problemStatement: aiOut?.problemStatement || (draft?.statement ?? ""),
            scope: aiOut?.scope || (draft?.scope ?? ""),
          },
        })}
      />
    </div>
  );
}
