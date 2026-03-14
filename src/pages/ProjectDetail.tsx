import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Loader2, FileText, Calculator, BarChart3, Save, Download, CheckCircle2, Shield, Users, TrendingUp, Brain } from "lucide-react";
import { exportProjectToPDF } from "@/lib/pdf-export";
import { phases } from "@/data/dmaic-tools";
import { ToolCard } from "@/components/ToolCard";
import { ProjectCollaborators } from "@/components/ProjectCollaborators";
import { TollgateChecklist } from "@/components/project/TollgateChecklist";
import { ControlPlanEditor } from "@/components/project/ControlPlanEditor";
import { RACIMatrix } from "@/components/project/RACIMatrix";
import { SigmaTracker } from "@/components/project/SigmaTracker";
import { AIRootCauseAnalysis } from "@/components/tools/AIRootCauseAnalysis";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  current_phase: number;
  status: string;
  user_id: string;
}

interface ProjectNote {
  id: string;
  phase: number;
  title: string;
  content: string | null;
  created_at: string;
}

interface ProjectCalculation {
  id: string;
  phase: number;
  tool_id: string;
  tool_name: string;
  inputs: unknown;
  results: unknown;
  notes: string | null;
  created_at: string;
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [calculations, setCalculations] = useState<ProjectCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePhase, setActivePhase] = useState(1);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && projectId) {
      fetchProjectData();
    }
  }, [user, projectId]);

  const fetchProjectData = async () => {
    setIsLoading(true);

    // Fetch project
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      toast({ title: "Projekt hittades inte", variant: "destructive" });
      navigate("/projects");
      return;
    }

    setProject(projectData);
    setActivePhase(projectData.current_phase);

    // Fetch notes
    const { data: notesData } = await supabase
      .from("project_notes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setNotes(notesData || []);

    // Fetch calculations
    const { data: calcsData } = await supabase
      .from("project_calculations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setCalculations(calcsData || []);

    setIsLoading(false);
  };

  const updatePhase = async (newPhase: number) => {
    if (!project) return;

    const { error } = await supabase
      .from("projects")
      .update({ current_phase: newPhase })
      .eq("id", project.id);

    if (!error) {
      setProject({ ...project, current_phase: newPhase });
    }
  };

  const createNote = async () => {
    if (!noteTitle.trim()) {
      toast({ title: "Ange en rubrik", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from("project_notes")
      .insert({
        project_id: projectId,
        user_id: user!.id,
        phase: activePhase,
        title: noteTitle.trim(),
        content: noteContent.trim() || null
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      toast({ title: "Kunde inte spara anteckning", variant: "destructive" });
    } else {
      toast({ title: "Anteckning sparad!" });
      setNotes([data, ...notes]);
      setNoteTitle("");
      setNoteContent("");
      setIsNoteDialogOpen(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Ta bort anteckningen?")) return;

    const { error } = await supabase
      .from("project_notes")
      .delete()
      .eq("id", noteId);

    if (!error) {
      setNotes(notes.filter((n) => n.id !== noteId));
      toast({ title: "Anteckning borttagen" });
    }
  };

  const deleteCalculation = async (calcId: string) => {
    if (!confirm("Ta bort beräkningen?")) return;

    const { error } = await supabase
      .from("project_calculations")
      .delete()
      .eq("id", calcId);

    if (!error) {
      setCalculations(calculations.filter((c) => c.id !== calcId));
      toast({ title: "Beräkning borttagen" });
    }
  };

  const currentPhaseData = phases.find((p) => p.id === activePhase) || phases[0];
  const phaseNotes = notes.filter((n) => n.phase === activePhase);
  const phaseCalculations = calculations.filter((c) => c.phase === activePhase);

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!project) return null;

  return (
    <Layout>
      {/* Project Header */}
      <section className={cn("bg-gradient-to-br text-white", currentPhaseData.color)}>
        <div className="container mx-auto px-4 py-8">
          <Link to="/projects" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till projekt
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-white/80">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <ProjectCollaborators
                projectId={project.id}
                isOwner={project.user_id === user?.id}
                currentUserId={user?.id || ""}
              />
              <Button
                variant="outline"
                size="sm"
                className="bg-white/20 border-white/40 text-white hover:bg-white/30"
                onClick={() => exportProjectToPDF(project, notes, calculations)}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportera PDF
              </Button>
              <Badge variant="outline" className="bg-white/20 text-white border-white/40">
                {project.status === "active" ? "Aktiv" : project.status === "completed" ? "Klar" : "Arkiverad"}
              </Badge>
            </div>
          </div>

          {/* Phase Progress */}
          <div className="flex items-center gap-2 mt-6">
            {phases.map((phase) => (
              <button
                key={phase.id}
                onClick={() => {
                  setActivePhase(phase.id);
                  if (phase.id > project.current_phase) {
                    updatePhase(phase.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                  phase.id === activePhase
                    ? "bg-white text-foreground shadow-lg"
                    : phase.id <= project.current_phase
                    ? "bg-white/30 text-white hover:bg-white/40"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                )}
              >
                <span>{phase.icon}</span>
                <span className="hidden md:inline font-medium">{phase.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Phase Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">{currentPhaseData.icon}</span>
                {currentPhaseData.name}: {currentPhaseData.title}
              </h2>
              <p className="text-muted-foreground mt-1">{currentPhaseData.description}</p>
            </div>

            <Tabs defaultValue="notes" className="space-y-6">
              <TabsList>
                <TabsTrigger value="notes" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Anteckningar ({phaseNotes.length})
                </TabsTrigger>
                <TabsTrigger value="calculations" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Beräkningar ({phaseCalculations.length})
                </TabsTrigger>
                <TabsTrigger value="tools" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Verktyg
                </TabsTrigger>
              </TabsList>

              <TabsContent value="notes" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Anteckningar för {currentPhaseData.name}</h3>
                  <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Ny anteckning
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ny anteckning - {currentPhaseData.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Rubrik</Label>
                          <Input
                            placeholder="T.ex. Problemformulering"
                            value={noteTitle}
                            onChange={(e) => setNoteTitle(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Innehåll</Label>
                          <Textarea
                            placeholder="Skriv din anteckning här..."
                            rows={6}
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                          />
                        </div>
                        <Button onClick={createNote} className="w-full" disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          Spara
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {phaseNotes.length === 0 ? (
                  <Card className="text-center py-8">
                    <CardContent>
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Inga anteckningar för denna fas ännu</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {phaseNotes.map((note) => (
                      <Card key={note.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{note.title}</CardTitle>
                              <CardDescription>
                                {new Date(note.created_at).toLocaleDateString("sv-SE")}
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => deleteNote(note.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        {note.content && (
                          <CardContent>
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="calculations" className="space-y-4">
                <h3 className="font-semibold">Sparade beräkningar för {currentPhaseData.name}</h3>
                
                {phaseCalculations.length === 0 ? (
                  <Card className="text-center py-8">
                    <CardContent>
                      <Calculator className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        Inga sparade beräkningar ännu. Använd verktygen för att göra beräkningar och spara dem.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {phaseCalculations.map((calc) => (
                      <Card key={calc.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{calc.tool_name}</CardTitle>
                              <CardDescription>
                                {new Date(calc.created_at).toLocaleDateString("sv-SE")}
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => deleteCalculation(calc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {calc.results && typeof calc.results === 'object' && Object.entries(calc.results as Record<string, unknown>).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground capitalize">{key}:</span>
                                  <span className="font-mono font-medium">
                                    {typeof value === "number" ? (value as number).toFixed(2) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {calc.notes && (
                              <p className="text-muted-foreground pt-2 border-t">{calc.notes}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tools" className="space-y-4">
                <h3 className="font-semibold">Verktyg för {currentPhaseData.name}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {currentPhaseData.tools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      phaseColor={currentPhaseData.color}
                      phaseId={activePhase}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </Layout>
  );
}
