import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { controlChartConstants } from "@/data/dmaic-tools";
import { BarChart3, TrendingUp, Target, AlertTriangle } from "lucide-react";

interface ChartDataPoint {
  sample: number;
  value: number;
  ucl: number;
  lcl: number;
  cl: number;
}

export default function ControlCharts() {
  // X̄-R Chart State
  const [xbarData, setXbarData] = useState("");
  const [xbarSubgroupSize, setXbarSubgroupSize] = useState(5);
  const [xbarChartData, setXbarChartData] = useState<{ xbar: ChartDataPoint[]; r: ChartDataPoint[] } | null>(null);

  // I-MR Chart State
  const [imrData, setImrData] = useState("");
  const [imrChartData, setImrChartData] = useState<{ i: ChartDataPoint[]; mr: ChartDataPoint[] } | null>(null);

  // p-Chart State
  const [pChartData, setPChartData] = useState("");
  const [pChartSampleSize, setPChartSampleSize] = useState(100);
  const [pChartResult, setPChartResult] = useState<ChartDataPoint[] | null>(null);

  // c-Chart State
  const [cChartData, setCChartData] = useState("");
  const [cChartResult, setCChartResult] = useState<ChartDataPoint[] | null>(null);

  // X̄-R Chart Calculation
  const calculateXbarR = () => {
    const rows = xbarData.trim().split("\n").filter(r => r.trim());
    if (rows.length < 2) return;

    const subgroups = rows.map(row => 
      row.split(/[,;\s]+/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
    );

    const n = xbarSubgroupSize;
    const constants = controlChartConstants[n];
    if (!constants) return;

    const xbars = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / sg.length);
    const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));

    const xbarBar = xbars.reduce((a, b) => a + b, 0) / xbars.length;
    const rBar = ranges.reduce((a, b) => a + b, 0) / ranges.length;

    const xbarUCL = xbarBar + constants.A2 * rBar;
    const xbarLCL = xbarBar - constants.A2 * rBar;
    const rUCL = constants.D4 * rBar;
    const rLCL = constants.D3 * rBar;

    const xbarChartPoints: ChartDataPoint[] = xbars.map((val, i) => ({
      sample: i + 1,
      value: parseFloat(val.toFixed(4)),
      ucl: parseFloat(xbarUCL.toFixed(4)),
      lcl: parseFloat(xbarLCL.toFixed(4)),
      cl: parseFloat(xbarBar.toFixed(4))
    }));

    const rChartPoints: ChartDataPoint[] = ranges.map((val, i) => ({
      sample: i + 1,
      value: parseFloat(val.toFixed(4)),
      ucl: parseFloat(rUCL.toFixed(4)),
      lcl: parseFloat(rLCL.toFixed(4)),
      cl: parseFloat(rBar.toFixed(4))
    }));

    setXbarChartData({ xbar: xbarChartPoints, r: rChartPoints });
  };

  // I-MR Chart Calculation
  const calculateIMR = () => {
    const values = imrData.split(/[,;\s\n]+/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (values.length < 2) return;

    const movingRanges: number[] = [];
    for (let i = 1; i < values.length; i++) {
      movingRanges.push(Math.abs(values[i] - values[i - 1]));
    }

    const xBar = values.reduce((a, b) => a + b, 0) / values.length;
    const mrBar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;

    // Constants for n=2: E2 = 2.66, D4 = 3.267, D3 = 0
    const E2 = 2.66;
    const D4 = 3.267;
    const D3 = 0;

    const iUCL = xBar + E2 * mrBar;
    const iLCL = xBar - E2 * mrBar;
    const mrUCL = D4 * mrBar;
    const mrLCL = D3 * mrBar;

    const iChartPoints: ChartDataPoint[] = values.map((val, i) => ({
      sample: i + 1,
      value: parseFloat(val.toFixed(4)),
      ucl: parseFloat(iUCL.toFixed(4)),
      lcl: parseFloat(iLCL.toFixed(4)),
      cl: parseFloat(xBar.toFixed(4))
    }));

    const mrChartPoints: ChartDataPoint[] = movingRanges.map((val, i) => ({
      sample: i + 2,
      value: parseFloat(val.toFixed(4)),
      ucl: parseFloat(mrUCL.toFixed(4)),
      lcl: parseFloat(mrLCL.toFixed(4)),
      cl: parseFloat(mrBar.toFixed(4))
    }));

    setImrChartData({ i: iChartPoints, mr: mrChartPoints });
  };

  // p-Chart Calculation
  const calculatePChart = () => {
    const defects = pChartData.split(/[,;\s\n]+/).map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    if (defects.length < 2) return;

    const n = pChartSampleSize;
    const proportions = defects.map(d => d / n);
    const pBar = proportions.reduce((a, b) => a + b, 0) / proportions.length;

    const ucl = pBar + 3 * Math.sqrt((pBar * (1 - pBar)) / n);
    const lcl = Math.max(0, pBar - 3 * Math.sqrt((pBar * (1 - pBar)) / n));

    const chartPoints: ChartDataPoint[] = proportions.map((val, i) => ({
      sample: i + 1,
      value: parseFloat(val.toFixed(4)),
      ucl: parseFloat(ucl.toFixed(4)),
      lcl: parseFloat(lcl.toFixed(4)),
      cl: parseFloat(pBar.toFixed(4))
    }));

    setPChartResult(chartPoints);
  };

  // c-Chart Calculation
  const calculateCChart = () => {
    const counts = cChartData.split(/[,;\s\n]+/).map(v => parseInt(v.trim())).filter(v => !isNaN(v));
    if (counts.length < 2) return;

    const cBar = counts.reduce((a, b) => a + b, 0) / counts.length;
    const ucl = cBar + 3 * Math.sqrt(cBar);
    const lcl = Math.max(0, cBar - 3 * Math.sqrt(cBar));

    const chartPoints: ChartDataPoint[] = counts.map((val, i) => ({
      sample: i + 1,
      value: val,
      ucl: parseFloat(ucl.toFixed(4)),
      lcl: parseFloat(lcl.toFixed(4)),
      cl: parseFloat(cBar.toFixed(4))
    }));

    setCChartResult(chartPoints);
  };

  const renderControlChart = (data: ChartDataPoint[], title: string, yLabel: string) => {
    const hasOutOfControl = data.some(d => d.value > d.ucl || d.value < d.lcl);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{title}</h4>
          {hasOutOfControl && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Utom kontroll
            </Badge>
          )}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="sample" label={{ value: 'Stickprov', position: 'bottom', offset: -5 }} />
              <YAxis label={{ value: yLabel, angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <ReferenceLine y={data[0]?.ucl} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="UCL" />
              <ReferenceLine y={data[0]?.cl} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="CL" />
              <ReferenceLine y={data[0]?.lcl} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="LCL" />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isOutOfControl = payload.value > payload.ucl || payload.value < payload.lcl;
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={isOutOfControl ? 6 : 4} 
                      fill={isOutOfControl ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }}
                name="Värde"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-destructive/10 rounded-lg">
            <div className="text-muted-foreground">UCL</div>
            <div className="font-mono font-semibold">{data[0]?.ucl}</div>
          </div>
          <div className="text-center p-2 bg-primary/10 rounded-lg">
            <div className="text-muted-foreground">CL</div>
            <div className="font-mono font-semibold">{data[0]?.cl}</div>
          </div>
          <div className="text-center p-2 bg-destructive/10 rounded-lg">
            <div className="text-muted-foreground">LCL</div>
            <div className="font-mono font-semibold">{data[0]?.lcl}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Styrdiagram (SPC)</h1>
          <p className="text-muted-foreground">
            Interaktiva styrdiagram för Statistical Process Control. Mata in data för att beräkna kontrollgränser och visualisera processens stabilitet.
          </p>
        </div>

        <Tabs defaultValue="xbar-r" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 h-auto p-2">
            <TabsTrigger value="xbar-r" className="flex items-center gap-2 py-3">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">X̄-R</span>
              <span className="sm:hidden">X̄-R</span>
            </TabsTrigger>
            <TabsTrigger value="i-mr" className="flex items-center gap-2 py-3">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">I-MR</span>
              <span className="sm:hidden">I-MR</span>
            </TabsTrigger>
            <TabsTrigger value="p-chart" className="flex items-center gap-2 py-3">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">p-diagram</span>
              <span className="sm:hidden">p</span>
            </TabsTrigger>
            <TabsTrigger value="c-chart" className="flex items-center gap-2 py-3">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">c-diagram</span>
              <span className="sm:hidden">c</span>
            </TabsTrigger>
          </TabsList>

          {/* X̄-R Chart */}
          <TabsContent value="xbar-r">
            <Card>
              <CardHeader>
                <CardTitle>X̄-R Styrdiagram</CardTitle>
                <CardDescription>
                  Används för kontinuerliga data med delgrupper (2-10 mätningar per grupp). Övervakar både medelvärde och variation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delgruppsstorlek (n)</Label>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      value={xbarSubgroupSize}
                      onChange={(e) => setXbarSubgroupSize(parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data (en delgrupp per rad, värden separerade med komma eller mellanslag)</Label>
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg bg-background font-mono text-sm"
                    placeholder="10.2, 10.5, 10.3, 10.4, 10.1&#10;10.3, 10.6, 10.2, 10.5, 10.4&#10;10.1, 10.4, 10.5, 10.3, 10.2"
                    value={xbarData}
                    onChange={(e) => setXbarData(e.target.value)}
                  />
                </div>
                <Button onClick={calculateXbarR} className="w-full md:w-auto">
                  Beräkna styrdiagram
                </Button>

                {xbarChartData && (
                  <div className="space-y-8 pt-4 border-t">
                    {renderControlChart(xbarChartData.xbar, "X̄-diagram (Medelvärde)", "X̄")}
                    {renderControlChart(xbarChartData.r, "R-diagram (Variationsvidd)", "R")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* I-MR Chart */}
          <TabsContent value="i-mr">
            <Card>
              <CardHeader>
                <CardTitle>I-MR Styrdiagram (Individuella värden)</CardTitle>
                <CardDescription>
                  Används för kontinuerliga data där endast en mätning görs åt gången. Perfekt för långa cykeltider eller dyra mätningar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Data (värden separerade med komma, mellanslag eller radbrytning)</Label>
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg bg-background font-mono text-sm"
                    placeholder="10.2, 10.5, 10.3, 10.4, 10.1, 10.3, 10.6, 10.2"
                    value={imrData}
                    onChange={(e) => setImrData(e.target.value)}
                  />
                </div>
                <Button onClick={calculateIMR} className="w-full md:w-auto">
                  Beräkna styrdiagram
                </Button>

                {imrChartData && (
                  <div className="space-y-8 pt-4 border-t">
                    {renderControlChart(imrChartData.i, "I-diagram (Individuella värden)", "X")}
                    {renderControlChart(imrChartData.mr, "MR-diagram (Glidande variationsvidd)", "MR")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* p-Chart */}
          <TabsContent value="p-chart">
            <Card>
              <CardHeader>
                <CardTitle>p-diagram (Andel defekta)</CardTitle>
                <CardDescription>
                  Används för attributdata där man räknar andelen defekta enheter i varje stickprov. Stickprovsstorleken är konstant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stickprovsstorlek (n)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={pChartSampleSize}
                      onChange={(e) => setPChartSampleSize(parseInt(e.target.value) || 100)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Antal defekta per stickprov (separerade med komma eller radbrytning)</Label>
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg bg-background font-mono text-sm"
                    placeholder="3, 5, 2, 4, 6, 3, 2, 5, 4, 3"
                    value={pChartData}
                    onChange={(e) => setPChartData(e.target.value)}
                  />
                </div>
                <Button onClick={calculatePChart} className="w-full md:w-auto">
                  Beräkna styrdiagram
                </Button>

                {pChartResult && (
                  <div className="space-y-8 pt-4 border-t">
                    {renderControlChart(pChartResult, "p-diagram (Andel defekta)", "p")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* c-Chart */}
          <TabsContent value="c-chart">
            <Card>
              <CardHeader>
                <CardTitle>c-diagram (Antal fel)</CardTitle>
                <CardDescription>
                  Används för attributdata där man räknar antal fel per enhet. Enheten är konstant (t.ex. fel per produkt, per dag, per m²).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Antal fel per enhet (separerade med komma eller radbrytning)</Label>
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg bg-background font-mono text-sm"
                    placeholder="3, 5, 2, 4, 6, 3, 2, 5, 4, 3, 7, 2"
                    value={cChartData}
                    onChange={(e) => setCChartData(e.target.value)}
                  />
                </div>
                <Button onClick={calculateCChart} className="w-full md:w-auto">
                  Beräkna styrdiagram
                </Button>

                {cChartResult && (
                  <div className="space-y-8 pt-4 border-t">
                    {renderControlChart(cChartResult, "c-diagram (Antal fel)", "c")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Om styrdiagram</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-foreground font-semibold mb-2">Kontinuerliga data</h4>
                <ul className="space-y-1">
                  <li><strong>X̄-R:</strong> Delgrupper med 2-10 mätningar</li>
                  <li><strong>X̄-S:</strong> Delgrupper med &gt;10 mätningar (använder standardavvikelse)</li>
                  <li><strong>I-MR:</strong> Individuella mätningar utan delgrupper</li>
                </ul>
              </div>
              <div>
                <h4 className="text-foreground font-semibold mb-2">Attributdata</h4>
                <ul className="space-y-1">
                  <li><strong>p-diagram:</strong> Andel defekta (konstant n)</li>
                  <li><strong>np-diagram:</strong> Antal defekta (konstant n)</li>
                  <li><strong>c-diagram:</strong> Antal fel per enhet (konstant enhet)</li>
                  <li><strong>u-diagram:</strong> Fel per enhet (variabel enhetsstorlek)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
