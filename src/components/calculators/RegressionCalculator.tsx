import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { DataInput } from "./DataInput";
import { ExampleDataButton } from "./ExampleDataButton";
import { useCalculatorSave } from "@/hooks/useCalculatorSave";
import { CalculatorSaveButton } from "./CalculatorSaveButton";
import { olsRegression, predict, normInv, tCritical, type RegressionResult } from "@/lib/regression-stats";
import {
  ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ScatterChart, BarChart, Bar,
} from "recharts";

interface XVar { name: string; values: string }

const parse = (s: string) => s.split(/[,;\s\t\n]+/).map((v) => parseFloat(v.replace(",", "."))).filter((v) => !isNaN(v));

// Exempel: sena leveranser (%) förklaras av ledtid (h), orderstorlek och personalbemanning
const EXAMPLE = {
  yName: "Sena leveranser (%)",
  y: "4.2, 5.1, 6.8, 7.4, 8.9, 9.6, 11.2, 12.0, 13.5, 14.1, 15.8, 16.4, 6.1, 9.0, 12.7",
  xs: [
    { name: "Ledtid (h)", values: "12, 14, 18, 20, 24, 26, 30, 32, 36, 38, 42, 44, 16, 25, 34" },
    { name: "Orderstorlek", values: "50, 60, 55, 70, 65, 80, 75, 90, 85, 95, 100, 110, 58, 72, 88" },
    { name: "Bemanning", values: "10, 10, 9, 9, 8, 8, 8, 7, 7, 7, 6, 6, 9, 8, 7" },
  ],
};

const fmtP = (p: number) => (p < 0.001 ? "<0.001" : p.toFixed(3));

export function RegressionCalculator({ toolId = "regression" }: { toolId?: string; toolName?: string; phase?: number }) {
  const [yName, setYName] = useState("Y");
  const [yValues, setYValues] = useState("");
  const [xVars, setXVars] = useState<XVar[]>([{ name: "X1", values: "" }]);
  const [alpha, setAlpha] = useState(0.05);
  const [result, setResult] = useState<RegressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [predInputs, setPredInputs] = useState<string[]>([""]);

  const handleLoad = useCallback((inputs: Record<string, unknown>) => {
    if (typeof inputs.yName === "string") setYName(inputs.yName);
    if (Array.isArray(inputs.yValues)) setYValues((inputs.yValues as number[]).join(", "));
    if (Array.isArray(inputs.xVars)) {
      const xv = (inputs.xVars as { name: string; values: number[] }[]).map((x) => ({ name: x.name, values: x.values.join(", ") }));
      setXVars(xv);
      setPredInputs(xv.map(() => ""));
    }
  }, []);

  const { canSave, isSaving, notes, setNotes, saveCalculation } = useCalculatorSave(toolId, handleLoad);

  const loadExample = () => {
    setYName(EXAMPLE.yName);
    setYValues(EXAMPLE.y);
    setXVars(EXAMPLE.xs);
    setPredInputs(EXAMPLE.xs.map(() => ""));
    setResult(null);
    setError(null);
  };

  const addX = () => { setXVars([...xVars, { name: `X${xVars.length + 1}`, values: "" }]); setPredInputs([...predInputs, ""]); };
  const removeX = (i: number) => { setXVars(xVars.filter((_, j) => j !== i)); setPredInputs(predInputs.filter((_, j) => j !== i)); setResult(null); };
  const updateX = (i: number, patch: Partial<XVar>) => setXVars(xVars.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const calculate = () => {
    setError(null);
    const y = parse(yValues);
    const cols = xVars.map((x) => parse(x.values));
    if (y.length < 3) return setError("Minst 3 Y-värden krävs.");
    if (cols.some((c) => c.length !== y.length)) return setError("Alla X-kolumner måste ha lika många värden som Y.");
    if (y.length < xVars.length + 2) return setError(`Minst ${xVars.length + 2} observationer krävs för ${xVars.length} X-variabler.`);
    const res = olsRegression(y, cols, xVars.map((x) => x.name || "X"));
    if (!res) return setError("Kunde inte beräkna – X-variablerna är troligen helt beroende av varandra.");
    setResult(res);
  };

  const yArr = useMemo(() => parse(yValues), [yValues]);
  const isSimple = xVars.length === 1;

  // Simple regression chart with confidence & prediction bands
  const fitChart = useMemo(() => {
    if (!result || !isSimple) return null;
    const x = parse(xVars[0].values);
    const min = Math.min(...x), max = Math.max(...x);
    const pts = Array.from({ length: 30 }, (_, i) => {
      const xv = min + ((max - min) * i) / 29;
      const p = predict(result, [xv], alpha);
      return { x: xv, fit: p.yhat, ciLow: p.ciLow, ciHigh: p.ciHigh, piLow: p.piLow, piHigh: p.piHigh };
    });
    return { line: pts, scatter: x.map((xv, i) => ({ x: xv, y: yArr[i] })) };
  }, [result, isSimple, xVars, yArr, alpha]);

  const diag = useMemo(() => {
    if (!result) return null;
    const n = result.n;
    const sorted = result.stdResiduals.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r);
    const normal = sorted.map((s, k) => ({ theo: normInv((k + 1 - 0.375) / (n + 0.25)), r: s.r }));
    const vsFit = result.fitted.map((f, i) => ({ fit: f, r: result.stdResiduals[i] }));
    const order = result.stdResiduals.map((r, i) => ({ i: i + 1, r }));
    const bins = Math.max(5, Math.min(10, Math.ceil(Math.sqrt(n))));
    const mn = sorted[0].r, mx = sorted[n - 1].r, w = (mx - mn) / bins || 1;
    const hist = Array.from({ length: bins }, (_, b) => ({ bin: (mn + w * (b + 0.5)).toFixed(1), count: 0 }));
    result.stdResiduals.forEach((r) => { hist[Math.min(bins - 1, Math.floor((r - mn) / w))].count++; });
    const outliers = order.filter((o) => Math.abs(o.r) > 2).map((o) => o.i);
    return { normal, vsFit, order, hist, outliers };
  }, [result]);

  const interpretation = useMemo(() => {
    if (!result) return [];
    const msgs: string[] = [];
    msgs.push(result.fP < alpha
      ? `Modellen är statistiskt signifikant (p = ${fmtP(result.fP)}) och förklarar ${(result.adjR2 * 100).toFixed(1)} % av variationen i ${yName} (justerad R²).`
      : `Modellen är inte signifikant (p = ${fmtP(result.fP)}) – X-variablerna förklarar inte ${yName} på ett säkerställt sätt.`);
    result.coefficients.slice(1).forEach((c) => {
      if (c.p < alpha) msgs.push(`${c.name}: varje ökning med 1 enhet ${c.estimate >= 0 ? "ökar" : "minskar"} ${yName} med ${Math.abs(c.estimate).toFixed(3)} (p = ${fmtP(c.p)}).`);
      else msgs.push(`${c.name} är inte signifikant (p = ${fmtP(c.p)}) – överväg att ta bort den ur modellen.`);
      if (c.vif && c.vif > 5) msgs.push(`${c.name} har hög VIF (${c.vif.toFixed(1)}) – stark multikollinearitet med andra X.`);
    });
    if (diag?.outliers.length) msgs.push(`Möjliga avvikare (|std. residual| > 2): observation ${diag.outliers.join(", ")}.`);
    if (result.r2 < 0.3 && result.fP < alpha) msgs.push("Låg förklaringsgrad – det finns sannolikt fler viktiga X-faktorer.");
    return msgs;
  }, [result, alpha, yName, diag]);

  const prediction = useMemo(() => {
    if (!result) return null;
    const vals = predInputs.map((v) => parseFloat(v.replace(",", ".")));
    if (vals.length !== result.k || vals.some(isNaN)) return null;
    return predict(result, vals, alpha);
  }, [result, predInputs, alpha]);

  const handleSave = () => {
    if (!result) return;
    saveCalculation({
      toolId: "regression",
      toolName: "Regressionsanalys",
      phase: 3,
      inputs: { yName, yValues: yArr, xVars: xVars.map((x) => ({ name: x.name, values: parse(x.values) })), alpha },
      results: {
        r2: result.r2, adjR2: result.adjR2, s: result.s, f: result.f, pValue: result.fP, n: result.n,
        equation: `${yName} = ${result.coefficients.map((c, j) => (j === 0 ? c.estimate.toFixed(4) : `${c.estimate >= 0 ? "+" : "-"} ${Math.abs(c.estimate).toFixed(4)}·${c.name}`)).join(" ")}`,
        coefficients: result.coefficients.map((c) => ({ name: c.name, estimate: c.estimate, se: c.se, t: c.t, p: c.p, vif: c.vif ?? null })),
      },
    });
  };

  const equation = result
    ? `${yName} = ${result.coefficients.map((c, j) => (j === 0 ? c.estimate.toFixed(4) : `${c.estimate >= 0 ? "+" : "−"} ${Math.abs(c.estimate).toFixed(4)}·${c.name}`)).join(" ")}`
    : "";

  const smallChart = "h-44 w-full";

  return (
    <div className="space-y-4 pt-2">
      <ExampleDataButton onLoad={loadExample} />

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Namn på Y (utfall)</Label>
          <Input value={yName} onChange={(e) => setYName(e.target.value)} className="h-8" />
        </div>
        <DataInput label="Y-värden" value={yValues} onChange={setYValues} placeholder="12.3, 18.1, 22.5..." helpText="Separera med komma eller klistra in en kolumn från Excel" />

        {xVars.map((x, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={x.name} onChange={(e) => updateX(i, { name: e.target.value })} className="h-8" aria-label={`Namn på X${i + 1}`} />
              {xVars.length > 1 && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeX(i)} aria-label="Ta bort X-variabel">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <DataInput label={`Värden för ${x.name || "X"}`} value={x.values} onChange={(v) => updateX(i, { values: v })} placeholder="10, 15, 20..." helpText="Samma antal värden som Y" />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={addX} className="gap-1"><Plus className="h-3 w-3" /> Lägg till X-variabel</Button>
          <div className="flex items-center gap-2 ml-auto">
            <Label className="text-xs">Signifikansnivå α</Label>
            <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={alpha} onChange={(e) => setAlpha(parseFloat(e.target.value))}>
              <option value={0.1}>0.10</option>
              <option value={0.05}>0.05</option>
              <option value={0.01}>0.01</option>
            </select>
          </div>
        </div>
      </div>

      <Button onClick={calculate} size="sm" className="w-full">
        Beräkna {isSimple ? "enkel" : "multipel"} regression
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Regressionsekvation</div>
            <div className="font-mono text-sm break-words">{equation}</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { l: "R²", v: `${(result.r2 * 100).toFixed(1)}%` },
              { l: "Justerad R²", v: `${(result.adjR2 * 100).toFixed(1)}%` },
              { l: "S (std. fel)", v: result.s.toFixed(3) },
              { l: "Modellens p-värde", v: fmtP(result.fP), ok: result.fP < alpha },
            ].map((k) => (
              <div key={k.l} className="p-3 bg-muted/50 rounded-lg text-center">
                <div className="text-xs text-muted-foreground">{k.l}</div>
                <div className={`text-lg font-bold font-mono ${k.ok === false ? "text-destructive" : ""}`}>{k.v}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-1 pr-2">Term</th>
                  <th className="text-right px-2">Koef.</th>
                  <th className="text-right px-2">SE</th>
                  <th className="text-right px-2">t</th>
                  <th className="text-right px-2">p</th>
                  {!isSimple && <th className="text-right px-2">VIF</th>}
                  <th className="text-right pl-2"></th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {result.coefficients.map((c, j) => (
                  <tr key={j} className="border-b last:border-0">
                    <td className="py-1 pr-2 font-sans">{c.name}</td>
                    <td className="text-right px-2">{c.estimate.toFixed(4)}</td>
                    <td className="text-right px-2">{c.se.toFixed(4)}</td>
                    <td className="text-right px-2">{isFinite(c.t) ? c.t.toFixed(2) : "∞"}</td>
                    <td className="text-right px-2">{fmtP(c.p)}</td>
                    {!isSimple && <td className="text-right px-2">{j === 0 ? "" : c.vif === undefined ? "–" : isFinite(c.vif) ? c.vif.toFixed(2) : "∞"}</td>}
                    <td className="text-right pl-2">
                      {j > 0 && <Badge variant={c.p < alpha ? "default" : "secondary"} className="text-[10px]">{c.p < alpha ? "Signifikant" : "Ej sign."}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-muted-foreground mt-1">n = {result.n}, frihetsgrader = {result.dfResid}, F = {result.f.toFixed(2)}</p>
          </div>

          {fitChart && (
            <div>
              <div className="text-xs font-medium mb-1">Anpassad linje med {((1 - alpha) * 100).toFixed(0)} % konfidens- (KI) och prediktionsintervall (PI)</div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="x" type="number" domain={["dataMin", "dataMax"]} tick={{ fontSize: 10 }} name={xVars[0].name} />
                    <YAxis type="number" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <Tooltip formatter={(v: number) => v.toFixed(2)} />
                    <Line data={fitChart.line} dataKey="piHigh" stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" dot={false} name="PI övre" />
                    <Line data={fitChart.line} dataKey="piLow" stroke="hsl(var(--muted-foreground))" strokeDasharray="2 4" dot={false} name="PI nedre" />
                    <Line data={fitChart.line} dataKey="ciHigh" stroke="hsl(var(--primary))" strokeOpacity={0.5} strokeDasharray="5 3" dot={false} name="KI övre" />
                    <Line data={fitChart.line} dataKey="ciLow" stroke="hsl(var(--primary))" strokeOpacity={0.5} strokeDasharray="5 3" dot={false} name="KI nedre" />
                    <Line data={fitChart.line} dataKey="fit" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Anpassning" />
                    <Scatter data={fitChart.scatter} dataKey="y" fill="hsl(var(--primary))" name={yName} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {diag && (
            <div>
              <div className="text-xs font-medium mb-2">Residualdiagnostik (standardiserade residualer)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-muted-foreground">Normalfördelningsplot</div>
                  <div className={smallChart}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="theo" type="number" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                        <YAxis dataKey="r" type="number" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                        <ReferenceLine segment={[{ x: -2.5, y: -2.5 }, { x: 2.5, y: 2.5 }]} stroke="hsl(var(--destructive))" strokeDasharray="4 4" ifOverflow="hidden" />
                        <Scatter data={diag.normal} fill="hsl(var(--primary))" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Residualer mot anpassade värden</div>
                  <div className={smallChart}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="fit" type="number" tick={{ fontSize: 9 }} domain={["auto", "auto"]} />
                        <YAxis dataKey="r" type="number" tick={{ fontSize: 9 }} />
                        <ReferenceLine y={0} stroke="hsl(var(--destructive))" />
                        <Scatter data={diag.vsFit} fill="hsl(var(--primary))" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Histogram</div>
                  <div className={smallChart}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diag.hist} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="bin" tick={{ fontSize: 9 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Residualer i observationsordning</div>
                  <div className={smallChart}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={diag.order} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="i" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <ReferenceLine y={0} stroke="hsl(var(--destructive))" />
                        <Line dataKey="r" stroke="hsl(var(--primary))" dot={{ r: 2 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg border space-y-2">
            <div className="text-xs font-medium">Förutsäg {yName}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {xVars.map((x, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-[11px]">{x.name}</Label>
                  <Input type="number" className="h-8" value={predInputs[i] ?? ""} onChange={(e) => setPredInputs(predInputs.map((p, j) => (j === i ? e.target.value : p)))} />
                </div>
              ))}
            </div>
            {prediction && (
              <div className="text-sm space-y-0.5">
                <div>Förutsagt värde: <span className="font-mono font-bold">{prediction.yhat.toFixed(3)}</span></div>
                <div className="text-xs text-muted-foreground">{((1 - alpha) * 100).toFixed(0)} % KI (medelvärde): {prediction.ciLow.toFixed(3)} – {prediction.ciHigh.toFixed(3)}</div>
                <div className="text-xs text-muted-foreground">{((1 - alpha) * 100).toFixed(0)} % PI (enskild observation): {prediction.piLow.toFixed(3)} – {prediction.piHigh.toFixed(3)}</div>
              </div>
            )}
          </div>

          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs font-medium mb-1">Tolkning</div>
            <ul className="text-xs space-y-1 list-disc pl-4">
              {interpretation.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        </div>
      )}

      <CalculatorSaveButton canSave={canSave} isSaving={isSaving} hasResult={!!result} notes={notes} onNotesChange={setNotes} onSave={handleSave} />
    </div>
  );
}

// re-export for tests
export { tCritical };
