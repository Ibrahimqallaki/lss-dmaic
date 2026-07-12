import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { phases } from "@/data/dmaic-tools";

interface ProjectRow {
  id: string;
  name: string;
  current_phase: number | null;
  status: string | null;
  estimated_savings: number | null;
  actual_savings: number | null;
  created_at: string;
}

interface Props {
  projects: ProjectRow[];
  tollgateProgress?: Record<string, { completed: number; total: number }>;
}

/**
 * Impact = uppskattad/faktisk besparing (SEK).
 * Effort = 1..10 där aktuell fas + tid utan progress ger högre effort.
 */
function scoreEffort(p: ProjectRow, prog?: { completed: number; total: number }): number {
  const phase = p.current_phase ?? 1;
  // Basen: senare fas = mindre återstående arbete
  let effort = 10 - Math.min(9, (phase - 1) * 2);
  if (prog && prog.total > 0) {
    const pct = prog.completed / prog.total;
    effort -= pct * 3;
  }
  // Ålder utan avslut ökar effort (indikator på att det fastnat)
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86_400_000;
  if (p.status !== "completed" && ageDays > 60) effort += 1.5;
  return Math.max(1, Math.min(10, effort));
}

function quadrant(x: number, y: number, xMid: number, yMid: number) {
  if (x >= xMid && y <= yMid) return "quick-win";
  if (x >= xMid && y > yMid) return "big-bet";
  if (x < xMid && y <= yMid) return "fill-in";
  return "thankless";
}

const QUADRANT_COLORS: Record<string, string> = {
  "quick-win": "hsl(142 71% 45%)",
  "big-bet": "hsl(217 91% 60%)",
  "fill-in": "hsl(45 93% 47%)",
  "thankless": "hsl(0 84% 60%)",
};

export function ProjectHeatmap({ projects, tollgateProgress }: Props) {
  const data = useMemo(() => {
    const rows = projects
      .filter(p => (p.estimated_savings ?? p.actual_savings ?? 0) > 0)
      .map(p => {
        const impact = (p.actual_savings ?? p.estimated_savings ?? 0) / 1000; // TSEK
        const effort = scoreEffort(p, tollgateProgress?.[p.id]);
        const phaseName = phases.find(x => x.id === (p.current_phase ?? 1))?.name || "Define";
        return { id: p.id, name: p.name, impact, effort, phase: phaseName };
      });
    const xMid = rows.length ? rows.reduce((s, r) => s + r.impact, 0) / rows.length : 100;
    const yMid = 5;
    return rows.map(r => ({ ...r, q: quadrant(r.impact, r.effort, xMid, yMid), color: QUADRANT_COLORS[quadrant(r.impact, r.effort, xMid, yMid)] }));
  }, [projects, tollgateProgress]);

  const xMid = data.length ? data.reduce((s, r) => s + r.impact, 0) / data.length : 100;
  const yMid = 5;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projektportfölj – Impact × Effort</CardTitle>
          <CardDescription>Lägg in uppskattad besparing på projekten för att visa heatmap.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Projektportfölj – Impact × Effort</CardTitle>
        <CardDescription>
          <span className="inline-flex items-center gap-1 mr-3"><span className="inline-block w-2 h-2 rounded-full" style={{ background: QUADRANT_COLORS["quick-win"] }} /> Quick Wins</span>
          <span className="inline-flex items-center gap-1 mr-3"><span className="inline-block w-2 h-2 rounded-full" style={{ background: QUADRANT_COLORS["big-bet"] }} /> Big Bets</span>
          <span className="inline-flex items-center gap-1 mr-3"><span className="inline-block w-2 h-2 rounded-full" style={{ background: QUADRANT_COLORS["fill-in"] }} /> Fill-ins</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full" style={{ background: QUADRANT_COLORS["thankless"] }} /> Thankless</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis
                type="number"
                dataKey="impact"
                name="Impact"
                unit=" TSEK"
                label={{ value: "Impact (besparing, TSEK)", position: "insideBottom", offset: -15 }}
              />
              <YAxis
                type="number"
                dataKey="effort"
                domain={[0, 10]}
                reversed
                label={{ value: "Effort (låg → hög)", angle: -90, position: "insideLeft" }}
              />
              <ZAxis range={[80, 80]} />
              <ReferenceLine x={xMid} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <ReferenceLine y={yMid} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as typeof data[number];
                  return (
                    <div className="rounded-lg border bg-background p-2 text-xs shadow-md">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-muted-foreground">{p.phase}</div>
                      <div>Impact: {p.impact.toLocaleString("sv-SE")} TSEK</div>
                      <div>Effort: {p.effort.toFixed(1)}/10</div>
                    </div>
                  );
                }}
              />
              <Scatter data={data}>
                {data.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
