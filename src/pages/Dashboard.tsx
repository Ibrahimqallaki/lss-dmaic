import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, BarChart3, CheckCircle2, Clock, ArrowRight, FolderOpen,
  TrendingUp, Target, AlertTriangle, DollarSign, Activity, CalendarDays
} from "lucide-react";
import { phases } from "@/data/dmaic-tools";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell
} from "recharts";

interface Project {
  id: string;
  name: string;
  description: string | null;
  current_phase: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  estimated_savings: number | null;
  actual_savings: number | null;
}

interface SigmaEntry {
  project_id: string;
  sigma_level: number;
  measurement_date: string;
  phase: number;
}

interface TollgateProgress {
  completed: number;
  total: number;
}

interface FMEARisk {
  project_id: string;
  rpn: number;
  failureMode: string;
  risk: string;
}

const PHASE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function formatCurrency(val: number | null): string {
  if (val == null) return "–";
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(val);
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tollgateProgress, setTollgateProgress] = useState<Record<string, TollgateProgress>>({});
  const [sigmaData, setSigmaData] = useState<SigmaEntry[]>([]);
  const [toolsUsed, setToolsUsed] = useState<Record<string, string[]>>({});
  const [fmeaRisks, setFmeaRisks] = useState<FMEARisk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setIsLoading(true);

    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });

    const projs = (projectsData || []) as Project[];
    setProjects(projs);

    if (projs.length > 0) {
      const ids = projs.map(p => p.id);

      // Tollgate progress
      const { data: tollgateData } = await supabase
        .from("tollgate_items")
        .select("project_id, is_completed")
        .in("project_id", ids);

      if (tollgateData) {
        const progress: Record<string, TollgateProgress> = {};
        tollgateData.forEach(item => {
          if (!progress[item.project_id]) progress[item.project_id] = { completed: 0, total: 0 };
          progress[item.project_id].total++;
          if (item.is_completed) progress[item.project_id].completed++;
        });
        setTollgateProgress(progress);
      }

      // Sigma data
      const { data: sigmaEntries } = await supabase
        .from("sigma_tracking")
        .select("project_id, sigma_level, measurement_date, phase")
        .in("project_id", ids)
        .order("measurement_date");

      setSigmaData(sigmaEntries || []);

      // Tools used per project + FMEA risks
      const { data: calcData } = await supabase
        .from("project_calculations")
        .select("project_id, tool_id, results, inputs")
        .in("project_id", ids);

      if (calcData) {
        const tools: Record<string, string[]> = {};
        const risks: FMEARisk[] = [];
        calcData.forEach((c: any) => {
          if (!tools[c.project_id]) tools[c.project_id] = [];
          if (!tools[c.project_id].includes(c.tool_id)) tools[c.project_id].push(c.tool_id);
          
          if (c.tool_id === 'fmea' && c.results?.rpn) {
            risks.push({
              project_id: c.project_id,
              rpn: Number(c.results.rpn),
              failureMode: c.inputs?.failureMode || 'Okänt',
              risk: c.results.risk || 'Okänd',
            });
          }
        });
        setToolsUsed(tools);
        setFmeaRisks(risks);
      }
    }

    setIsLoading(false);
  };

  // Derived stats
  const activeProjects = projects.filter(p => p.status === "active");
  const completedProjects = projects.filter(p => p.status === "completed");
  const stagnantProjects = activeProjects.filter(p => daysSince(p.updated_at) > 14);
  const totalEstimatedSavings = projects.reduce((sum, p) => sum + (p.estimated_savings || 0), 0);
  const totalActualSavings = projects.reduce((sum, p) => sum + (p.actual_savings || 0), 0);
  const highRiskFmea = fmeaRisks.filter(r => r.rpn >= 200);
  const fmeaByProject = fmeaRisks.reduce<Record<string, FMEARisk[]>>((acc, r) => {
    if (!acc[r.project_id]) acc[r.project_id] = [];
    acc[r.project_id].push(r);
    return acc;
  }, {});

  // Phase distribution for bar chart
  const phaseDistData = phases.map(phase => ({
    name: phase.name,
    icon: phase.icon,
    count: activeProjects.filter(p => p.current_phase === phase.id).length,
  }));

  // Sigma trend (all projects combined, chronological)
  const sigmaTrendData = sigmaData.map(s => ({
    date: new Date(s.measurement_date).toLocaleDateString("sv-SE"),
    sigma: Number(s.sigma_level),
  }));

  // Expected tools per phase
  const expectedToolsPerPhase: Record<number, number> = { 1: 7, 2: 10, 3: 12, 4: 11, 5: 13 };

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Projektportfölj</h1>
                <p className="text-muted-foreground mt-1">Översikt, KPI:er och riskindikatorer</p>
              </div>
              <Button asChild>
                <Link to="/projects">Alla projekt <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </div>

            {/* Top KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <FolderOpen className="h-7 w-7 mx-auto text-primary mb-2" />
                  <div className="text-3xl font-bold">{projects.length}</div>
                  <p className="text-xs text-muted-foreground">Totalt projekt</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Activity className="h-7 w-7 mx-auto text-blue-500 mb-2" />
                  <div className="text-3xl font-bold">{activeProjects.length}</div>
                  <p className="text-xs text-muted-foreground">Aktiva</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-7 w-7 mx-auto text-green-500 mb-2" />
                  <div className="text-3xl font-bold">{completedProjects.length}</div>
                  <p className="text-xs text-muted-foreground">Avslutade</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <DollarSign className="h-7 w-7 mx-auto text-emerald-500 mb-2" />
                  <div className="text-2xl font-bold">{formatCurrency(totalEstimatedSavings || null)}</div>
                  <p className="text-xs text-muted-foreground">Uppsk. besparing</p>
                </CardContent>
              </Card>
              <Card className={highRiskFmea.length > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
                <CardContent className="pt-6 text-center">
                  <Target className={`h-7 w-7 mx-auto mb-2 ${highRiskFmea.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                  <div className="text-3xl font-bold">{highRiskFmea.length}</div>
                  <p className="text-xs text-muted-foreground">FMEA högrisk (RPN≥200)</p>
                </CardContent>
              </Card>
              <Card className={stagnantProjects.length > 0 ? "border-orange-400/50 bg-orange-50/30 dark:bg-orange-950/20" : ""}>
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className={`h-7 w-7 mx-auto mb-2 ${stagnantProjects.length > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                  <div className="text-3xl font-bold">{stagnantProjects.length}</div>
                  <p className="text-xs text-muted-foreground">Stagnerade (&gt;14 dagar)</p>
                </CardContent>
              </Card>
            </div>

            {/* Middle row: Phase distribution + Sigma trend */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Phase Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Fasfördelning (aktiva)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={phaseDistData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, fontSize: 13 }}
                          formatter={(value: number) => [`${value} projekt`, "Antal"]}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {phaseDistData.map((_, i) => (
                            <Cell key={i} fill={PHASE_COLORS[i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Sigma Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Sigma-trend (alla projekt)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sigmaTrendData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      Ingen sigma-data registrerad ännu
                    </div>
                  ) : (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sigmaTrendData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 6]} tick={{ fontSize: 12 }} />
                          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                          <Line type="monotone" dataKey="sigma" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="σ-nivå" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Stagnant Projects Alert */}
            {stagnantProjects.length > 0 && (
              <Card className="border-orange-400/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    Projekt som kräver uppmärksamhet
                  </CardTitle>
                  <CardDescription>Dessa projekt har inte uppdaterats på mer än 14 dagar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stagnantProjects.map(p => {
                      const days = daysSince(p.updated_at);
                      const phaseData = phases.find(ph => ph.id === p.current_phase) || phases[0];
                      return (
                        <Link to={`/project/${p.id}`} key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{phaseData.icon}</span>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">Fas: {phaseData.name}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-orange-600 border-orange-300 dark:text-orange-400">
                            <Clock className="h-3 w-3 mr-1" />
                            {days} dagar sedan
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Project Cards */}
            {projects.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Inga projekt</h3>
                  <p className="text-muted-foreground mb-4">Skapa ditt första DMAIC-projekt</p>
                  <Button asChild><Link to="/projects">Gå till Projekt</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Projektstatus</h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map(project => {
                    const phaseData = phases.find(p => p.id === project.current_phase) || phases[0];
                    const tp = tollgateProgress[project.id];
                    const tollgatePercent = tp ? Math.round((tp.completed / tp.total) * 100) : 0;
                    const projectSigma = sigmaData.filter(s => s.project_id === project.id);
                    const latestSigma = projectSigma.length > 0 ? Number(projectSigma[projectSigma.length - 1].sigma_level) : null;
                    const firstSigma = projectSigma.length > 0 ? Number(projectSigma[0].sigma_level) : null;
                    const tools = toolsUsed[project.id] || [];
                    const phaseTools = phases.find(p => p.id === project.current_phase)?.tools.length || 0;
                    const days = daysSince(project.updated_at);
                    const isStagnant = project.status === "active" && days > 14;

                    return (
                      <Link to={`/project/${project.id}`} key={project.id}>
                        <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${isStagnant ? "border-orange-300/50" : ""}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{project.name}</CardTitle>
                              <div className="flex items-center gap-2">
                                {isStagnant && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                <Badge variant={project.status === "completed" ? "default" : "secondary"} className="text-xs">
                                  {project.status === "active" ? "Aktiv" : "Klar"}
                                </Badge>
                              </div>
                            </div>
                            {project.description && (
                              <CardDescription className="line-clamp-1 text-xs">{project.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Phase progress dots */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{phaseData.icon}</span>
                              <span className="text-xs font-medium">{phaseData.name}</span>
                              <div className="flex gap-1 ml-auto">
                                {phases.map(p => (
                                  <div
                                    key={p.id}
                                    className="h-2 w-5 rounded-full"
                                    style={{
                                      backgroundColor: p.id <= project.current_phase ? PHASE_COLORS[p.id - 1] : undefined,
                                    }}
                                    {...(p.id > project.current_phase ? { className: "h-2 w-5 rounded-full bg-muted" } : { className: "h-2 w-5 rounded-full" })}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Tollgate */}
                            {tp && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Tollgate
                                  </span>
                                  <span className="font-mono">{tp.completed}/{tp.total} ({tollgatePercent}%)</span>
                                </div>
                                <Progress value={tollgatePercent} className="h-1.5" />
                              </div>
                            )}

                            {/* Sigma + Savings row */}
                            <div className="flex items-center justify-between text-xs">
                              {latestSigma !== null ? (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-mono font-bold">{latestSigma.toFixed(2)}σ</span>
                                  {firstSigma !== null && latestSigma !== firstSigma && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {latestSigma > firstSigma ? "+" : ""}{(latestSigma - firstSigma).toFixed(2)}
                                    </Badge>
                                  )}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Ingen sigma</span>
                              )}
                              {(project.estimated_savings || project.actual_savings) && (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(project.actual_savings || project.estimated_savings)}
                                </span>
                              )}
                            </div>

                            {/* Tools used indicator */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{tools.length} verktyg använda</span>
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {days === 0 ? "Idag" : `${days}d sedan`}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
