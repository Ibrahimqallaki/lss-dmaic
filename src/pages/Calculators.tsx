import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { controlChartConstants, sigmaTable } from "@/data/dmaic-tools";

export default function Calculators() {
  return (
    <Layout>
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold mb-4">Statistiska Kalkylatorer</h1>
              <p className="text-muted-foreground">
                Interaktiva verktyg för Six Sigma-beräkningar
              </p>
            </div>

            <Tabs defaultValue="dpmo" className="space-y-6">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
                <TabsTrigger value="dpmo">DPMO & Sigma</TabsTrigger>
                <TabsTrigger value="capability">Kapabilitet</TabsTrigger>
                <TabsTrigger value="sample">Stickprov</TabsTrigger>
                <TabsTrigger value="control">Styrdiagram</TabsTrigger>
              </TabsList>

              <TabsContent value="dpmo">
                <DPMOCalculator />
              </TabsContent>

              <TabsContent value="capability">
                <CapabilityCalculator />
              </TabsContent>

              <TabsContent value="sample">
                <SampleSizeCalculator />
              </TabsContent>

              <TabsContent value="control">
                <ControlChartCalculator />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function DPMOCalculator() {
  const [defects, setDefects] = useState("");
  const [units, setUnits] = useState("");
  const [opportunities, setOpportunities] = useState("");
  const [result, setResult] = useState<{ dpmo: number; sigma: number; yield: number } | null>(null);

  const calculate = () => {
    const d = parseFloat(defects);
    const u = parseFloat(units);
    const o = parseFloat(opportunities);

    if (isNaN(d) || isNaN(u) || isNaN(o) || u === 0 || o === 0) return;

    const dpmo = (d / (u * o)) * 1000000;
    
    // Find closest sigma level
    let sigma = 0;
    let yieldValue = 0;
    for (let i = sigmaTable.length - 1; i >= 0; i--) {
      if (dpmo <= sigmaTable[i].dpmo) {
        sigma = sigmaTable[i].sigma;
        yieldValue = sigmaTable[i].yield;
        break;
      }
    }

    // Interpolate for more accurate sigma
    const actualYield = (1 - d / (u * o)) * 100;

    setResult({ dpmo: Math.round(dpmo), sigma, yield: actualYield });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>DPMO & Sigma-nivå</CardTitle>
        <CardDescription>
          Beräkna defekter per miljon möjligheter och motsvarande Sigma-nivå
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="defects">Antal defekter</Label>
            <Input
              id="defects"
              type="number"
              placeholder="t.ex. 15"
              value={defects}
              onChange={(e) => setDefects(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="units">Antal enheter</Label>
            <Input
              id="units"
              type="number"
              placeholder="t.ex. 1000"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="opportunities">Möjligheter per enhet</Label>
            <Input
              id="opportunities"
              type="number"
              placeholder="t.ex. 5"
              value={opportunities}
              onChange={(e) => setOpportunities(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={calculate}>Beräkna</Button>

        {result && (
          <div className="mt-6 p-6 bg-muted/50 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">DPMO:</span>
              <span className="text-2xl font-bold font-mono">{result.dpmo.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Sigma-nivå:</span>
              <span className="text-2xl font-bold">{result.sigma}σ</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Processutbyte:</span>
              <span className="text-2xl font-bold">{result.yield.toFixed(3)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CapabilityCalculator() {
  const [usl, setUsl] = useState("");
  const [lsl, setLsl] = useState("");
  const [mean, setMean] = useState("");
  const [stdDev, setStdDev] = useState("");
  const [result, setResult] = useState<{ cp: number; cpk: number; cpu: number; cpl: number } | null>(null);

  const calculate = () => {
    const USL = parseFloat(usl);
    const LSL = parseFloat(lsl);
    const μ = parseFloat(mean);
    const σ = parseFloat(stdDev);

    if (isNaN(USL) || isNaN(LSL) || isNaN(μ) || isNaN(σ) || σ === 0) return;

    const cp = (USL - LSL) / (6 * σ);
    const cpu = (USL - μ) / (3 * σ);
    const cpl = (μ - LSL) / (3 * σ);
    const cpk = Math.min(cpu, cpl);

    setResult({ cp, cpk, cpu, cpl });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processkapabilitet (Cp & Cpk)</CardTitle>
        <CardDescription>
          Beräkna processens duglighet i förhållande till specifikationsgränser
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="usl">Övre specgräns (USL)</Label>
            <Input
              id="usl"
              type="number"
              placeholder="t.ex. 10.5"
              value={usl}
              onChange={(e) => setUsl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lsl">Nedre specgräns (LSL)</Label>
            <Input
              id="lsl"
              type="number"
              placeholder="t.ex. 9.5"
              value={lsl}
              onChange={(e) => setLsl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mean">Medelvärde (μ)</Label>
            <Input
              id="mean"
              type="number"
              placeholder="t.ex. 10.0"
              value={mean}
              onChange={(e) => setMean(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stddev">Standardavvikelse (σ)</Label>
            <Input
              id="stddev"
              type="number"
              placeholder="t.ex. 0.15"
              value={stdDev}
              onChange={(e) => setStdDev(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={calculate}>Beräkna</Button>

        {result && (
          <div className="mt-6 p-6 bg-muted/50 rounded-xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-muted-foreground text-sm">Cp</div>
                <div className="text-3xl font-bold">{result.cp.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {result.cp >= 1.33 ? "✓ Kapabel" : result.cp >= 1 ? "⚠ Marginal" : "✗ Ej kapabel"}
                </div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-muted-foreground text-sm">Cpk</div>
                <div className="text-3xl font-bold">{result.cpk.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {result.cpk >= 1.33 ? "✓ Kapabel" : result.cpk >= 1 ? "⚠ Marginal" : "✗ Ej kapabel"}
                </div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-muted-foreground text-sm">Cpu</div>
                <div className="text-2xl font-bold">{result.cpu.toFixed(2)}</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-muted-foreground text-sm">Cpl</div>
                <div className="text-2xl font-bold">{result.cpl.toFixed(2)}</div>
              </div>
            </div>
            {result.cp !== result.cpk && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                💡 Cp ≠ Cpk indikerar att processen inte är centrerad
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SampleSizeCalculator() {
  const [confidence, setConfidence] = useState("95");
  const [margin, setMargin] = useState("");
  const [population, setPopulation] = useState("");
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const conf = parseFloat(confidence);
    const e = parseFloat(margin) / 100;
    const N = parseFloat(population);

    if (isNaN(conf) || isNaN(e) || e === 0) return;

    // Z-score for confidence level
    let z = 1.96; // 95%
    if (conf === 90) z = 1.645;
    if (conf === 99) z = 2.576;

    // Assume p = 0.5 for maximum sample size
    const p = 0.5;

    // Infinite population formula
    let n = (z * z * p * (1 - p)) / (e * e);

    // Finite population correction
    if (!isNaN(N) && N > 0) {
      n = n / (1 + (n - 1) / N);
    }

    setResult(Math.ceil(n));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stickprovsstorlek</CardTitle>
        <CardDescription>
          Beräkna erforderlig stickprovsstorlek för statistisk säkerhet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="confidence">Konfidensnivå (%)</Label>
            <select
              id="confidence"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
            >
              <option value="90">90%</option>
              <option value="95">95%</option>
              <option value="99">99%</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="margin">Felmarginal (%)</Label>
            <Input
              id="margin"
              type="number"
              placeholder="t.ex. 5"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="population">Populationsstorlek (valfritt)</Label>
            <Input
              id="population"
              type="number"
              placeholder="t.ex. 10000"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={calculate}>Beräkna</Button>

        {result && (
          <div className="mt-6 p-6 bg-muted/50 rounded-xl text-center">
            <div className="text-muted-foreground mb-2">Erforderlig stickprovsstorlek:</div>
            <div className="text-4xl font-bold">{result.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-2">
              enheter behöver mätas
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ControlChartCalculator() {
  const [subgroupSize, setSubgroupSize] = useState("5");
  const [xBarBar, setXBarBar] = useState("");
  const [rBar, setRBar] = useState("");
  const [result, setResult] = useState<{
    uclX: number;
    lclX: number;
    uclR: number;
    lclR: number;
    sigma: number;
  } | null>(null);

  const calculate = () => {
    const n = parseInt(subgroupSize);
    const xbb = parseFloat(xBarBar);
    const rb = parseFloat(rBar);

    if (isNaN(n) || isNaN(xbb) || isNaN(rb) || n < 2 || n > 10) return;

    const A2 = controlChartConstants.A2[n as keyof typeof controlChartConstants.A2];
    const D3 = controlChartConstants.D3[n as keyof typeof controlChartConstants.D3];
    const D4 = controlChartConstants.D4[n as keyof typeof controlChartConstants.D4];
    const d2 = controlChartConstants.d2[n as keyof typeof controlChartConstants.d2];

    const sigma = rb / d2;
    const uclX = xbb + A2 * rb;
    const lclX = xbb - A2 * rb;
    const uclR = D4 * rb;
    const lclR = D3 * rb;

    setResult({ uclX, lclX, uclR, lclR, sigma });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>X̄-R Styrdiagram Gränser</CardTitle>
        <CardDescription>
          Beräkna kontrollgränser för X̄-R styrdiagram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subgroup">Undergruppsstorlek (n)</Label>
            <select
              id="subgroup"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={subgroupSize}
              onChange={(e) => setSubgroupSize(e.target.value)}
            >
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="xbarbar">X̿ (Medel av medelvärden)</Label>
            <Input
              id="xbarbar"
              type="number"
              placeholder="t.ex. 50.0"
              value={xBarBar}
              onChange={(e) => setXBarBar(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rbar">R̄ (Medel av variationsbredd)</Label>
            <Input
              id="rbar"
              type="number"
              placeholder="t.ex. 2.5"
              value={rBar}
              onChange={(e) => setRBar(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={calculate}>Beräkna</Button>

        {result && (
          <div className="mt-6 p-6 bg-muted/50 rounded-xl">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">X̄ Diagram</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UCL:</span>
                    <span className="font-mono font-medium">{result.uclX.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CL:</span>
                    <span className="font-mono font-medium">{parseFloat(xBarBar).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LCL:</span>
                    <span className="font-mono font-medium">{result.lclX.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">R Diagram</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UCL:</span>
                    <span className="font-mono font-medium">{result.uclR.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CL:</span>
                    <span className="font-mono font-medium">{parseFloat(rBar).toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LCL:</span>
                    <span className="font-mono font-medium">{result.lclR.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-center">
              <span className="text-muted-foreground">Uppskattad σ: </span>
              <span className="font-mono font-bold">{result.sigma.toFixed(4)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
