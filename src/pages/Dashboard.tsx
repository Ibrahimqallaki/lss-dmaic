import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Loader2, BarChart3, CheckCircle2, Clock, ArrowRight, FolderOpen, TrendingUp, Target, AlertTriangle } from "lucide-react";
import { phases } from "@/data/dmaic-tools";

interface Project {
  id: string;
  name: string;
  description: string | null;
  current_phase: number;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  avgPhase: number;
  phaseDistribution: Record<number, number>;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tollgateProgress, setTollgateProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [sigmaData, setSigmaData] = useState<Record<string, { latest: number; first: number }>>({});
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

    // Fetch projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });

    const projs = projectsData || [];
    setProjects(projs);

    // Fetch tollgate progress for each project
    if (projs.length > 0) {
      const { data: tollgateData } = await supabase
        .from("tollgate_items")
        .select("project_id, is_completed")
        .in("project_id", projs.map(p => p.id));

      if (tollgateData) {
        const progress: Record<string, { completed: number; total: number }> = {};
        tollgateData.forEach(item => {
          if (!progress[item.project_id]) progress[item.project_id] = { completed: 0, total: 0 };
          progress[item.project_id].total++;
          if (item.is_completed) progress[item.project_id].completed++;
        });
        setTollgateProgress(progress);
      }

      // Fetch sigma data
      const { data: sigmaEntries } = await supabase
        .from("sigma_tracking")
        .select("project_id, sigma_level, measurement_date")
        .in("project_id", projs.map(p => p.id))
        .order("measurement_date");

      if (sigmaEntries) {
        const sigma: Record<string, { latest: number; first: number }> = {};
        sigmaEntries.forEach(entry => {
          if (!sigma[entry.project_id]) {
            sigma[entry.project_id] = { latest: Number(entry.sigma_level), first: Number(entry.sigma_level) };
          } else {
            sigma[entry.project_id].latest = Number(entry.sigma_level);
          }
        });
        setSigmaData(sigma);
      }
    }

    setIsLoading(false);
  };

  const stats: DashboardStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === "active").length,
    completedProjects: projects.filter(p => p.status === "completed").length,
    avgPhase: projects.length > 0 ? projects.reduce((sum, p) => sum + p.current_phase, 0) / projects.length : 0,
    phaseDistribution: projects.reduce((acc, p) => {
      acc[p.current_phase] = (acc[p.current_phase] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
  };

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
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-1">Översikt över alla DMAIC-projekt</p>
              </div>
              <Button asChild>
                <Link to="/projects">Alla projekt <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6 text-center">
                  <FolderOpen className="h-8 w-8 mx-auto text-primary mb-2" />
                  <div className="text-3xl font-bold">{stats.totalProjects}</div>
                  <p className="text-sm text-muted-foreground">Totalt projekt</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 mx-auto text-accent mb-2" />
                  <div className="text-3xl font-bold">{stats.activeProjects}</div>
                  <p className="text-sm text-muted-foreground">Aktiva</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <div className="text-3xl font-bold">{stats.completedProjects}</div>
                  <p className="text-sm text-muted-foreground">Klara</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="h-8 w-8 mx-auto text-primary mb-2" />
                  <div className="text-3xl font-bold">{stats.avgPhase.toFixed(1)}</div>
                  <p className="text-sm text-muted-foreground">Snittfas</p>
                </CardContent>
              </Card>
            </div>

            {/* Phase Distribution */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Fasfördelning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 h-32">
                  {phases.map(phase => {
                    const count = stats.phaseDistribution[phase.id] || 0;
                    const maxCount = Math.max(...Object.values(stats.phaseDistribution), 1);
                    const height = (count / maxCount) * 100;
                    return (
                      <div key={phase.id} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-sm font-bold">{count}</span>
                        <div className="w-full bg-muted rounded-t-md relative" style={{ height: `${Math.max(height, 4)}%` }}>
                          <div className="absolute inset-0 bg-primary rounded-t-md opacity-80" />
                        </div>
                        <div className="text-center">
                          <span className="text-lg">{phase.icon}</span>
                          <p className="text-xs text-muted-foreground">{phase.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Project Status Cards */}
            {projects.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Inga projekt</h3>
                  <p className="text-muted-foreground mb-4">Skapa ditt första DMAIC-projekt för att se dashboard-data</p>
                  <Button asChild><Link to="/projects">Gå till Projekt</Link></Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Projektstatus</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {projects.slice(0, 6).map(project => {
                    const phaseData = phases.find(p => p.id === project.current_phase) || phases[0];
                    const tp = tollgateProgress[project.id];
                    const sigma = sigmaData[project.id];
                    const tollgatePercent = tp ? Math.round((tp.completed / tp.total) * 100) : 0;

                    return (
                      <Link to={`/project/${project.id}`} key={project.id}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              <Badge variant={project.status === "completed" ? "default" : "secondary"}>
                                {project.status === "active" ? "Aktiv" : "Klar"}
                              </Badge>
                            </div>
                            {project.description && (
                              <CardDescription className="line-clamp-1">{project.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Phase progress */}
                            <div className="flex items-center gap-2">
                              <span>{phaseData.icon}</span>
                              <span className="text-sm font-medium">{phaseData.name}</span>
                              <div className="flex gap-1 ml-auto">
                                {phases.map(p => (
                                  <div
                                    key={p.id}
                                    className={`h-2 w-6 rounded-full ${p.id <= project.current_phase ? "bg-primary" : "bg-muted"}`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Tollgate progress */}
                            {tp && (
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Tollgate:</span>
                                <div className="flex-1 bg-muted rounded-full h-1.5">
                                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${tollgatePercent}%` }} />
                                </div>
                                <span className="text-xs font-mono">{tp.completed}/{tp.total}</span>
                              </div>
                            )}

                            {/* Sigma */}
                            {sigma && (
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Sigma:</span>
                                <span className="font-mono font-bold">{sigma.latest.toFixed(2)}σ</span>
                                {sigma.latest !== sigma.first && (
                                  <Badge variant="outline" className="text-xs">
                                    {sigma.latest > sigma.first ? "+" : ""}{(sigma.latest - sigma.first).toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                            )}
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
