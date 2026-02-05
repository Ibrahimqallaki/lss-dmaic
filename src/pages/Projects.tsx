import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, FolderOpen, Trash2, Loader2, Users } from "lucide-react";
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

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ title: "Kunde inte hämta projekt", variant: "destructive" });
    } else {
      setProjects(data || []);
    }
    setIsLoading(false);
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      toast({ title: "Ange ett projektnamn", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null,
        user_id: user!.id
      })
      .select()
      .single();

    setIsCreating(false);

    if (error) {
      toast({ title: "Kunde inte skapa projekt", variant: "destructive" });
    } else {
      toast({ title: "Projekt skapat!" });
      setProjects([data, ...projects]);
      setNewProjectName("");
      setNewProjectDescription("");
      setIsDialogOpen(false);
      navigate(`/project/${data.id}`);
    }
  };

  const deleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Är du säker på att du vill ta bort projektet?")) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      toast({ title: "Kunde inte ta bort projekt", variant: "destructive" });
    } else {
      toast({ title: "Projekt borttaget" });
      setProjects(projects.filter((p) => p.id !== projectId));
    }
  };

  const getPhaseInfo = (phaseNumber: number) => {
    return phases.find((p) => p.id === phaseNumber) || phases[0];
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
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Mina Projekt</h1>
                <p className="text-muted-foreground mt-1">
                  Hantera dina DMAIC-projekt och delade projekt
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nytt projekt
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Skapa nytt projekt</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="project-name">Projektnamn</Label>
                      <Input
                        id="project-name"
                        placeholder="T.ex. Kvalitetsförbättring Q1"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-desc">Beskrivning (valfritt)</Label>
                      <Textarea
                        id="project-desc"
                        placeholder="Beskriv projektets syfte..."
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                      />
                    </div>
                    <Button onClick={createProject} className="w-full" disabled={isCreating}>
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Skapa projekt
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {projects.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Inga projekt än</h3>
                  <p className="text-muted-foreground mb-4">
                    Skapa ditt första DMAIC-projekt för att komma igång
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Skapa projekt
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => {
                  const phase = getPhaseInfo(project.current_phase);
                  return (
                    <Link to={`/project/${project.id}`} key={project.id}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <CardTitle className="text-xl">{project.name}</CardTitle>
                                {project.user_id !== user?.id && (
                                  <Badge variant="outline" className="gap-1">
                                    <Users className="h-3 w-3" />
                                    Delad
                                  </Badge>
                                )}
                                <Badge variant={project.status === "completed" ? "default" : "secondary"}>
                                  {project.status === "active" ? "Aktiv" : project.status === "completed" ? "Klar" : "Arkiverad"}
                                </Badge>
                              </div>
                              {project.description && (
                                <CardDescription>{project.description}</CardDescription>
                              )}
                            </div>
                            {project.user_id === user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={(e) => deleteProject(project.id, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{phase.icon}</span>
                              <div>
                                <div className="text-sm font-medium">Fas {phase.id}: {phase.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Uppdaterad {new Date(project.updated_at).toLocaleDateString("sv-SE")}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {phases.map((p) => (
                                <div
                                  key={p.id}
                                  className={`h-2 w-6 rounded-full ${
                                    p.id <= project.current_phase
                                      ? "bg-primary"
                                      : "bg-muted"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
