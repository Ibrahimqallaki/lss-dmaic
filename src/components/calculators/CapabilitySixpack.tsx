import { useState, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileDown, Sparkles } from "lucide-react";
import {
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  CartesianGrid,
  Cell,
} from "recharts";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { CalculatorLoadButton } from "./CalculatorLoadButton";
import { DataInput } from "./DataInput";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const EXAMPLE_DATA = {
  values:
    "10.02, 9.98, 10.05, 10.11, 9.95, 10.07, 9.99, 10.03, 10.01, 9.97, 10.04, 10.09, 9.94, 10.02, 10.06, 9.96, 10.00, 10.08, 9.93, 10.05, 10.01, 9.99, 10.07, 9.98, 10.03, 10.10, 9.96, 10.04, 10.02, 9.95",
  usl: "10.3",
  lsl: "9.7",
  target: "10.0",
};

/* -------- Statistical helpers -------- */
function parseValues(raw: string): number[] {
  return raw
    .split(/[\s,;\t\n]+/)
    .map((v) => parseFloat(v))
    .filter((v) => !isNaN(v));
}

function mean(x: number[]) {
  return x.reduce((a, b) => a + b, 0) / x.length;
}
function stdev(x: number[]) {
  const m = mean(x);
  return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1));
}
// Normal PDF / CDF (Abramowitz approx)
function normPdf(x: number, mu = 0, sd = 1) {
  const z = (x - mu) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}
function erf(x: number) {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}
function normCdf(x: number, mu = 0, sd = 1) {
  return 0.5 * (1 + erf((x - mu) / (sd * Math.sqrt(2))));
}
// Acklam inverse normal
function normInv(p: number): number {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= phigh) {
    q = p - 0.5;
    r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// Anderson-Darling test for normality
function andersonDarling(data: number[]) {
  const n = data.length;
  const m = mean(data);
  const s = stdev(data);
  const sorted = [...data].sort((a, b) => a - b);
  let A2 = 0;
  for (let i = 0; i < n; i++) {
    const zi = (sorted[i] - m) / s;
    const Fi = Math.max(1e-12, Math.min(1 - 1e-12, normCdf(zi)));
    const Fn = Math.max(1e-12, Math.min(1 - 1e-12, normCdf((sorted[n - 1 - i] - m) / s)));
    A2 += (2 * (i + 1) - 1) * (Math.log(Fi) + Math.log(1 - Fn));
  }
  A2 = -n - A2 / n;
  const A2s = A2 * (1 + 0.75 / n + 2.25 / (n * n));
  // p-value approx (D'Agostino & Stephens 1986)
  let p: number;
  if (A2s >= 0.6) p = Math.exp(1.2937 - 5.709 * A2s + 0.0186 * A2s * A2s);
  else if (A2s >= 0.34) p = Math.exp(0.9177 - 4.279 * A2s - 1.38 * A2s * A2s);
  else if (A2s >= 0.2) p = 1 - Math.exp(-8.318 + 42.796 * A2s - 59.938 * A2s * A2s);
  else p = 1 - Math.exp(-13.436 + 101.14 * A2s - 223.73 * A2s * A2s);
  return { A2: A2s, p: Math.max(0, Math.min(1, p)) };
}

interface CapabilityResults {
  n: number;
  mu: number;
  sOverall: number;
  sWithin: number;
  mrBar: number;
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  zBench: number;
  obsPctBelow: number;
  obsPctAbove: number;
  expPctBelowOverall: number;
  expPctAboveOverall: number;
  expPctBelowWithin: number;
  expPctAboveWithin: number;
  ad: number;
  adP: number;
  histData: { bin: string; count: number; binMid: number; pdfWithin: number; pdfOverall: number }[];
  qqData: { theoretical: number; sample: number }[];
  iChart: { idx: number; v: number }[];
  mrChart: { idx: number; mr: number }[];
  last25: { idx: number; v: number }[];
  iUCL: number;
  iLCL: number;
  iCL: number;
  mrUCL: number;
  mrCL: number;
}

function computeCapability(values: number[], USL: number, LSL: number): CapabilityResults {
  const n = values.length;
  const mu = mean(values);
  const sOverall = stdev(values);
  const mrs: number[] = [];
  for (let i = 1; i < n; i++) mrs.push(Math.abs(values[i] - values[i - 1]));
  const mrBar = mean(mrs);
  const sWithin = mrBar / 1.128; // d2 for n=2
  const cp = (USL - LSL) / (6 * sWithin);
  const cpu = (USL - mu) / (3 * sWithin);
  const cpl = (mu - LSL) / (3 * sWithin);
  const cpk = Math.min(cpu, cpl);
  const pp = (USL - LSL) / (6 * sOverall);
  const ppu = (USL - mu) / (3 * sOverall);
  const ppl = (mu - LSL) / (3 * sOverall);
  const ppk = Math.min(ppu, ppl);

  const obsBelow = values.filter((v) => v < LSL).length;
  const obsAbove = values.filter((v) => v > USL).length;
  const obsPctBelow = (obsBelow / n) * 100;
  const obsPctAbove = (obsAbove / n) * 100;

  const expPctBelowOverall = normCdf(LSL, mu, sOverall) * 100;
  const expPctAboveOverall = (1 - normCdf(USL, mu, sOverall)) * 100;
  const expPctBelowWithin = normCdf(LSL, mu, sWithin) * 100;
  const expPctAboveWithin = (1 - normCdf(USL, mu, sWithin)) * 100;

  const pTotalOverall = (expPctBelowOverall + expPctAboveOverall) / 100;
  const zBench = pTotalOverall > 0 && pTotalOverall < 1 ? normInv(1 - pTotalOverall) : 6;

  // Histogram
  const min = Math.min(...values, LSL);
  const max = Math.max(...values, USL);
  const bins = Math.max(6, Math.ceil(Math.sqrt(n)));
  const binW = (max - min) / bins;
  const histData = Array.from({ length: bins }, (_, i) => {
    const lo = min + i * binW;
    const hi = lo + binW;
    const mid = (lo + hi) / 2;
    const count = values.filter((v) => v >= lo && (i === bins - 1 ? v <= hi : v < hi)).length;
    return {
      bin: mid.toFixed(2),
      binMid: mid,
      count,
      pdfWithin: normPdf(mid, mu, sWithin) * n * binW,
      pdfOverall: normPdf(mid, mu, sOverall) * n * binW,
    };
  });

  // Q-Q plot
  const sorted = [...values].sort((a, b) => a - b);
  const qqData = sorted.map((v, i) => ({
    theoretical: normInv((i + 0.5) / n) * sOverall + mu,
    sample: v,
  }));

  // I-chart
  const iCL = mu;
  const iUCL = mu + 2.66 * mrBar;
  const iLCL = mu - 2.66 * mrBar;
  const iChart = values.map((v, i) => ({ idx: i + 1, v }));

  // MR chart
  const mrUCL = 3.267 * mrBar;
  const mrCL = mrBar;
  const mrChart = mrs.map((mr, i) => ({ idx: i + 2, mr }));

  const last25 = values.slice(-25).map((v, i) => ({ idx: values.length - Math.min(25, values.length) + i + 1, v }));

  const { A2, p } = andersonDarling(values);

  return {
    n,
    mu,
    sOverall,
    sWithin,
    mrBar,
    cp,
    cpk,
    pp,
    ppk,
    zBench,
    obsPctBelow,
    obsPctAbove,
    expPctBelowOverall,
    expPctAboveOverall,
    expPctBelowWithin,
    expPctAboveWithin,
    ad: A2,
    adP: p,
    histData,
    qqData,
    iChart,
    mrChart,
    last25,
    iUCL,
    iLCL,
    iCL,
    mrUCL,
    mrCL,
  };
}

/* -------- Component -------- */
export function CapabilitySixpack({
  toolId = "capability-sixpack",
  toolName = "Capability Sixpack",
  phase = 3,
}: {
  toolId?: string;
  toolName?: string;
  phase?: number;
}) {
  const [valuesRaw, setValuesRaw] = useState("");
  const [usl, setUsl] = useState("");
  const [lsl, setLsl] = useState("");
  const [target, setTarget] = useState("");
  const [result, setResult] = useState<CapabilityResults | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (inputs.values !== undefined) setValuesRaw(String(inputs.values));
    if (inputs.usl !== undefined) setUsl(String(inputs.usl));
    if (inputs.lsl !== undefined) setLsl(String(inputs.lsl));
    if (inputs.target !== undefined) setTarget(String(inputs.target));
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation, savedCalculation, isLoadingSaved } =
    useCalculatorSave(toolId, handleLoad);

  const loadExample = () => {
    setValuesRaw(EXAMPLE_DATA.values);
    setUsl(EXAMPLE_DATA.usl);
    setLsl(EXAMPLE_DATA.lsl);
    setTarget(EXAMPLE_DATA.target);
    setResult(null);
  };

  const calculate = () => {
    const values = parseValues(valuesRaw);
    const USL = parseFloat(usl);
    const LSL = parseFloat(lsl);
    if (values.length < 10) {
      toast.error("Minst 10 mätvärden krävs för meningsfull analys");
      return;
    }
    if (isNaN(USL) || isNaN(LSL) || USL <= LSL) {
      toast.error("USL och LSL måste vara giltiga, USL > LSL");
      return;
    }
    setResult(computeCapability(values, USL, LSL));
  };

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId,
      toolName,
      phase,
      inputs: { values: valuesRaw, usl: parseFloat(usl), lsl: parseFloat(lsl), target: parseFloat(target) || null },
      results: {
        cp: result.cp,
        cpk: result.cpk,
        pp: result.pp,
        ppk: result.ppk,
        zBench: result.zBench,
        mean: result.mu,
        sOverall: result.sOverall,
        sWithin: result.sWithin,
        adP: result.adP,
      },
    });
  };

  const exportPDF = async () => {
    if (!reportRef.current || !result) return;
    toast.loading("Genererar PDF...", { id: "pdf-export" });
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.text(`Capability Sixpack - ${new Date().toLocaleDateString("sv-SE")}`, 10, 10);
      pdf.addImage(imgData, "PNG", (pdfW - w) / 2, 15, w, h - 15);
      pdf.save(`capability-sixpack-${Date.now()}.pdf`);
      toast.success("PDF exporterad", { id: "pdf-export" });
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte exportera PDF", { id: "pdf-export" });
    }
  };

  const verdict = useMemo(() => {
    if (!result) return null;
    if (result.cpk >= 1.33 && result.ppk >= 1.33) return { text: "Kapabel process", color: "text-green-600 dark:text-green-400" };
    if (result.cpk >= 1.0) return { text: "Marginellt kapabel", color: "text-yellow-600 dark:text-yellow-400" };
    return { text: "Ej kapabel", color: "text-red-600 dark:text-red-400" };
  }, [result]);

  const USLn = parseFloat(usl);
  const LSLn = parseFloat(lsl);

  return (
    <div className="space-y-4 pt-2">
      <CalculatorLoadButton savedCalculation={savedCalculation} isLoading={isLoadingSaved} onLoad={handleLoad} />
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={loadExample}>
          <Sparkles className="h-3 w-3" />
          Exempeldata
        </Button>
      </div>

      <DataInput
        label="Mätvärden (minst 10, ordnade i tid)"
        value={valuesRaw}
        onChange={setValuesRaw}
        placeholder="10.02, 9.98, 10.05, ..."
        exampleData={EXAMPLE_DATA.values}
        helpText="Klistra in, ladda CSV eller skriv kommaseparerat"
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sp-lsl" className="text-xs">LSL</Label>
          <Input id="sp-lsl" type="number" step="0.01" placeholder="9.7" value={lsl} onChange={(e) => setLsl(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-target" className="text-xs">Target (valfritt)</Label>
          <Input id="sp-target" type="number" step="0.01" placeholder="10.0" value={target} onChange={(e) => setTarget(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sp-usl" className="text-xs">USL</Label>
          <Input id="sp-usl" type="number" step="0.01" placeholder="10.3" value={usl} onChange={(e) => setUsl(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={calculate} size="sm" className="flex-1">Generera Sixpack</Button>
        {result && (
          <Button onClick={exportPDF} size="sm" variant="outline" className="gap-1">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
        )}
      </div>

      {result && (
        <div ref={reportRef} className="space-y-3 bg-background p-3 rounded-lg">
          {/* Summary */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Sammanfattning (n={result.n})</h3>
              {verdict && <span className={`text-sm font-semibold ${verdict.color}`}>{verdict.text}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
              <Stat label="Cp" value={result.cp.toFixed(2)} />
              <Stat label="Cpk" value={result.cpk.toFixed(2)} highlight={result.cpk < 1.33} />
              <Stat label="Pp" value={result.pp.toFixed(2)} />
              <Stat label="Ppk" value={result.ppk.toFixed(2)} highlight={result.ppk < 1.33} />
              <Stat label="Z.bench" value={result.zBench.toFixed(2)} />
              <Stat label="AD p-value" value={result.adP.toFixed(3)} highlight={result.adP < 0.05} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2 pt-2 border-t">
              <Stat label="Medel" value={result.mu.toFixed(3)} />
              <Stat label="σ within" value={result.sWithin.toFixed(4)} />
              <Stat label="σ overall" value={result.sOverall.toFixed(4)} />
              <Stat label="MR̄" value={result.mrBar.toFixed(4)} />
              <Stat label="Obs % < LSL" value={result.obsPctBelow.toFixed(2) + "%"} />
              <Stat label="Obs % > USL" value={result.obsPctAbove.toFixed(2) + "%"} />
              <Stat label="Exp % OOS (overall)" value={(result.expPctBelowOverall + result.expPctAboveOverall).toFixed(2) + "%"} />
              <Stat label="Exp % OOS (within)" value={(result.expPctBelowWithin + result.expPctAboveWithin).toFixed(2) + "%"} />
            </div>
          </Card>

          {/* 3x2 grid of charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ChartCard title="Histogram + Normal">
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={result.histData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="bin" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.6} />
                  <Line type="monotone" dataKey="pdfWithin" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} name="Within" />
                  <Line type="monotone" dataKey="pdfOverall" stroke="hsl(var(--accent-foreground))" dot={false} strokeDasharray="4 2" name="Overall" />
                  <ReferenceLine x={result.histData.reduce((p, c) => Math.abs(c.binMid - LSLn) < Math.abs(p.binMid - LSLn) ? c : p).bin} stroke="red" label={{ value: "LSL", fontSize: 9 }} />
                  <ReferenceLine x={result.histData.reduce((p, c) => Math.abs(c.binMid - USLn) < Math.abs(p.binMid - USLn) ? c : p).bin} stroke="red" label={{ value: "USL", fontSize: 9 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={`Normal Probability Plot (AD p=${result.adP.toFixed(3)})`}>
              <ResponsiveContainer width="100%" height={180}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" dataKey="theoretical" name="Teoretisk" tick={{ fontSize: 9 }} />
                  <YAxis type="number" dataKey="sample" name="Observerad" tick={{ fontSize: 9 }} />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={result.qqData} fill="hsl(var(--primary))" />
                  <Line
                    type="linear"
                    data={[
                      { theoretical: result.qqData[0]?.theoretical, sample: result.qqData[0]?.theoretical },
                      { theoretical: result.qqData[result.qqData.length - 1]?.theoretical, sample: result.qqData[result.qqData.length - 1]?.theoretical },
                    ]}
                    dataKey="sample"
                    stroke="hsl(var(--destructive))"
                    dot={false}
                    strokeWidth={1.5}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Capability Plot">
              <div className="h-[180px] flex flex-col justify-center space-y-1.5 text-xs px-2">
                <CapBar label="Cp" value={result.cp} />
                <CapBar label="Cpk" value={result.cpk} />
                <CapBar label="Pp" value={result.pp} />
                <CapBar label="Ppk" value={result.ppk} />
                <div className="pt-1 mt-1 border-t text-[10px] text-muted-foreground">
                  Inom-grupp (Cp/Cpk) vs Total (Pp/Ppk). Mål ≥ 1.33
                </div>
              </div>
            </ChartCard>

            <ChartCard title="I-Chart (individuella värden)">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={result.iChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="idx" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" dot={{ r: 2 }} strokeWidth={1.5} />
                  <ReferenceLine y={result.iUCL} stroke="red" strokeDasharray="3 3" label={{ value: "UCL", fontSize: 9 }} />
                  <ReferenceLine y={result.iCL} stroke="green" label={{ value: "X̄", fontSize: 9 }} />
                  <ReferenceLine y={result.iLCL} stroke="red" strokeDasharray="3 3" label={{ value: "LCL", fontSize: 9 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="MR-Chart (moving range)">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={result.mrChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="idx" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="mr" stroke="hsl(var(--primary))" dot={{ r: 2 }} strokeWidth={1.5} />
                  <ReferenceLine y={result.mrUCL} stroke="red" strokeDasharray="3 3" label={{ value: "UCL", fontSize: 9 }} />
                  <ReferenceLine y={result.mrCL} stroke="green" label={{ value: "MR̄", fontSize: 9 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Senaste 25 observationer">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={result.last25}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="idx" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" dot={{ r: 3 }} strokeWidth={2} />
                  <ReferenceLine y={USLn} stroke="red" label={{ value: "USL", fontSize: 9 }} />
                  <ReferenceLine y={LSLn} stroke="red" label={{ value: "LSL", fontSize: 9 }} />
                  {!isNaN(parseFloat(target)) && <ReferenceLine y={parseFloat(target)} stroke="hsl(var(--accent-foreground))" strokeDasharray="3 3" label={{ value: "Target", fontSize: 9 }} />}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}

      <CalculatorSaveButton
        canSave={canSave}
        isSaving={isSaving}
        hasResult={!!result}
        notes={notes}
        onNotesChange={setNotes}
        onSave={handleSave}
      />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded border bg-muted/30 ${highlight ? "border-destructive/50" : ""}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-mono font-semibold ${highlight ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-2">
      <div className="text-xs font-semibold mb-1 px-1">{title}</div>
      {children}
    </Card>
  );
}

function CapBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, (value / 2) * 100));
  const color = value >= 1.33 ? "bg-green-500" : value >= 1.0 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 font-mono text-[11px]">{label}</span>
      <div className="flex-1 h-3 bg-muted rounded overflow-hidden relative">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        <div className="absolute top-0 h-full w-px bg-foreground/40" style={{ left: "66.5%" }} title="1.33" />
      </div>
      <span className="w-10 text-right font-mono text-[11px] font-semibold">{value.toFixed(2)}</span>
    </div>
  );
}
