import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings2, RotateCcw } from "lucide-react";
import {
  ExportOptions,
  DEFAULT_EXPORT_OPTIONS,
  loadExportOptions,
  saveExportOptions,
} from "@/lib/export-settings";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onChange?: (opts: ExportOptions) => void;
  triggerClassName?: string;
}

export function ExportSettingsDialog({ onChange, triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ExportOptions>(() => loadExportOptions());
  const { toast } = useToast();

  useEffect(() => {
    if (open) setOpts(loadExportOptions());
  }, [open]);

  const set = <K extends keyof ExportOptions>(k: K, v: ExportOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  const save = () => {
    saveExportOptions(opts);
    onChange?.(opts);
    toast({ title: "Exportinställningar sparade" });
    setOpen(false);
  };

  const reset = () => setOpts({ ...DEFAULT_EXPORT_OPTIONS });

  const row = (key: keyof ExportOptions, label: string, hint?: string, disabled = false) => (
    <div className={`flex items-start justify-between gap-4 py-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="space-y-0.5">
        <Label htmlFor={key} className="text-sm">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch
        id={key}
        checked={opts[key]}
        onCheckedChange={(v) => set(key, v)}
        disabled={disabled}
      />
    </div>
  );

  const execDisabled = !opts.executiveSummary;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={triggerClassName || "bg-white/20 border-white/40 text-white hover:bg-white/30"}
        >
          <Settings2 className="h-4 w-4 mr-2" />
          Exportinställningar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportinställningar</DialogTitle>
          <DialogDescription>
            Välj vilka sektioner som ska ingå i PDF- och PPTX-exporten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {row("executiveSummary", "Executive summary", "Slå på/av hela sammanfattningsblocket")}

          <div className="pl-4 border-l-2 border-muted space-y-1">
            {row("execKeyPoints", "Nyckelpunkter", undefined, execDisabled)}
            {row("execTopRisks", "Topp-risker (RPN ≥ 200)", undefined, execDisabled)}
            {row("execKpiCards", "KPI-kort (PPTX)", undefined, execDisabled)}
            {row("execSigmaChart", "Sigma-diagram (PPTX)", "Faller tillbaka till risklista om för lite data", execDisabled)}
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="pdf">
          <TabsList className="w-full">
            <TabsTrigger value="pdf" className="flex-1">PDF</TabsTrigger>
            <TabsTrigger value="pptx" className="flex-1">PPTX</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="space-y-1 mt-3">
            {row("pdfSigmaHeader", "Sigma-utveckling i sidhuvud")}
            {row("pdfTollgate", "Tollgate per fas")}
            {row("pdfNotes", "Anteckningar per fas")}
            {row("pdfToolResults", "Verktygsresultat per fas")}
          </TabsContent>

          <TabsContent value="pptx" className="space-y-1 mt-3">
            {row("pptxOverviewSlide", "Projektöversikt-slide")}
            {row("pptxPhaseSlides", "En slide per DMAIC-fas")}
            <div className="pl-4 border-l-2 border-muted space-y-1">
              {row("pptxPhaseTollgate", "Tollgate på fas-slides", undefined, !opts.pptxPhaseSlides)}
              {row("pptxPhaseTools", "Verktygsresultat på fas-slides", undefined, !opts.pptxPhaseSlides)}
              {row("pptxPhaseNotes", "Anteckningar på fas-slides", undefined, !opts.pptxPhaseSlides)}
            </div>
            {row("pptxClosingSlide", "Avslutningsslide")}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={reset} className="mr-auto">
            <RotateCcw className="h-4 w-4 mr-2" /> Återställ
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button onClick={save}>Spara</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
