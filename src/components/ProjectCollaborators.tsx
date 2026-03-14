import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Trash2, Loader2, Crown } from "lucide-react";

interface Collaborator {
  id: string;
  user_id: string;
  user_email: string | null;
  role: string;
  created_at: string;
}

interface ProjectCollaboratorsProps {
  projectId: string;
  isOwner: boolean;
  currentUserId: string;
}

export function ProjectCollaborators({
  projectId,
  isOwner,
  currentUserId,
}: ProjectCollaboratorsProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("editor");
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCollaborators();
  }, [projectId]);

  const fetchCollaborators = async () => {
    setIsLoading(true);
    // Use the secure view that hides emails from non-owners
    // The view returns user_email as NULL for non-owners
    const { data, error } = await supabase
      .rpc("get_project_collaborators_safe" as any, { _project_id: projectId });

    if (!error && data) {
      setCollaborators(data as Collaborator[]);
    } else {
      console.error("Failed to fetch collaborators:", error);
      setCollaborators([]);
    }
    setIsLoading(false);
  };

  const inviteCollaborator = async () => {
    if (!email.trim()) {
      toast({ title: "Ange en e-postadress", variant: "destructive" });
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: "Ogiltig e-postadress", variant: "destructive" });
      return;
    }

    setIsInviting(true);

    // Check if already invited locally (for immediate feedback)
    const existingCollaborator = collaborators.find(
      (c) => c.user_email && c.user_email.toLowerCase() === email.trim().toLowerCase()
    );
    if (existingCollaborator) {
      toast({ title: "Användaren är redan inbjuden", variant: "destructive" });
      setIsInviting(false);
      return;
    }

    try {
      // Use Edge Function to properly look up user and create collaborator record
      const { data, error } = await supabase.functions.invoke("invite-collaborator", {
        body: {
          email: email.trim().toLowerCase(),
          project_id: projectId,
          role: role,
        },
      });

      setIsInviting(false);

      if (error) {
        console.error("Edge function error:", error);
        toast({ title: "Kunde inte bjuda in användare", variant: "destructive" });
        return;
      }

      if (data?.error) {
        // Handle specific error messages from the edge function
        if (data.error.includes("not found")) {
          toast({ 
            title: "Användaren hittades inte", 
            description: "Användaren måste registrera sig först innan de kan bjudas in.",
            variant: "destructive" 
          });
        } else if (data.error.includes("already a collaborator")) {
          toast({ title: "Användaren är redan inbjuden", variant: "destructive" });
        } else if (data.error.includes("yourself")) {
          toast({ title: "Du kan inte bjuda in dig själv", variant: "destructive" });
        } else {
          toast({ title: data.error, variant: "destructive" });
        }
        return;
      }

      if (data?.success && data?.collaborator) {
        toast({ title: `${email} har bjudits in som ${role === "editor" ? "redigerare" : "läsare"}` });
        setCollaborators([...collaborators, data.collaborator]);
        setEmail("");
        setRole("editor");
        setIsDialogOpen(false);
      }
    } catch (err) {
      console.error("Invitation error:", err);
      setIsInviting(false);
      toast({ title: "Ett oväntat fel inträffade", variant: "destructive" });
    }
  };

  const removeCollaborator = async (collaboratorId: string, collaboratorEmail: string | null) => {
    if (!confirm(`Ta bort ${collaboratorEmail || 'denna samarbetspartner'} från projektet?`)) return;

    const { error } = await supabase
      .from("project_collaborators")
      .delete()
      .eq("id", collaboratorId);

    if (!error) {
      setCollaborators(collaborators.filter((c) => c.id !== collaboratorId));
      toast({ title: "Samarbetspartner borttagen" });
    } else {
      toast({ title: "Kunde inte ta bort samarbetspartner", variant: "destructive" });
    }
  };

  const updateRole = async (collaboratorId: string, newRole: string) => {
    const { error } = await supabase
      .from("project_collaborators")
      .update({ role: newRole })
      .eq("id", collaboratorId);

    if (!error) {
      setCollaborators(
        collaborators.map((c) =>
          c.id === collaboratorId ? { ...c, role: newRole } : c
        )
      );
      toast({ title: "Roll uppdaterad" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Laddar...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Collaborator avatars/count */}
      {collaborators.length > 0 && (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-white/80" />
          <span className="text-sm text-white/80">
            {collaborators.length} samarbetspartner{collaborators.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Manage collaborators dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {isOwner ? "Dela" : "Visa team"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Projektteam
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Invite form - only for owners */}
            {isOwner && (
              <div className="space-y-3 pb-4 border-b">
                <Label>Bjud in ny samarbetspartner</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="E-postadress"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={role} onValueChange={(v) => setRole(v as "viewer" | "editor")}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Redigerare</SelectItem>
                      <SelectItem value="viewer">Läsare</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={inviteCollaborator}
                  disabled={isInviting || !email.trim()}
                  className="w-full"
                >
                  {isInviting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Bjud in
                </Button>
              </div>
            )}

            {/* Team list */}
            <div className="space-y-2">
              <Label>Teammedlemmar</Label>

              {/* Owner indicator */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">Du (Ägare)</span>
                </div>
                <Badge>Ägare</Badge>
              </div>

              {/* Collaborators */}
              {collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Inga samarbetspartners ännu
                </p>
              ) : (
                collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {collab.user_email || "Samarbetspartner"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tillagd {new Date(collab.created_at).toLocaleDateString("sv-SE")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <>
                          <Select
                            value={collab.role}
                            onValueChange={(v) => updateRole(collab.id, v)}
                          >
                            <SelectTrigger className="w-[110px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="editor">Redigerare</SelectItem>
                              <SelectItem value="viewer">Läsare</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeCollaborator(collab.id, collab.user_email)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary">
                          {collab.role === "editor" ? "Redigerare" : "Läsare"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
