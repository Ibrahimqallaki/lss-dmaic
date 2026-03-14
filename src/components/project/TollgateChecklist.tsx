import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { phases } from "@/data/dmaic-tools";

interface TollgateItem {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  sort_order: number;
}

const DEFAULT_CHECKLIST: Record<number, string[]> = {
  1: [
    "Project Charter godkänd",
    "Problem- och målformulering definierad",
    "SIPOC-diagram komplett",
    "VOC/CTQ identifierade",
    "Projektomfattning avgränsad",
    "Intressentanalys genomförd",
    "Teammedlemmar tilldelade",
  ],
  2: [
    "Datainsamlingsplan upprättad",
    "MSA/Gage R&R godkänd (<10% R&R)",
    "Baseline-data insamlad",
    "Processkapabilitet (Cp/Cpk) beräknad",
    "Sigma-nivå fastställd",
    "Processkarta detaljerad",
    "Mätetal validerade",
  ],
  3: [
    "Rotorsaker identifierade (Fiskben/5 Varför)",
    "Statistiska tester genomförda",
    "Kritiska X-faktorer verifierade",
    "Paretoanalys av defekttyper",
    "Korrelation/regression analyserad",
    "FMEA uppdaterad",
    "Datadrivna slutsatser dokumenterade",
  ],
  4: [
    "Lösningar genererade och utvärderade",
    "DOE genomförd och analyserad",
    "Pilottest genomfört",
    "Förbättring verifierad med data",
    "Implementeringsplan klar",
    "Riskanalys för implementation",
    "Intressenter informerade",
  ],
  5: [
    "Kontrollplan upprättad",
    "Styrdiagram implementerade",
    "SOP:ar uppdaterade",
    "Utbildning genomförd",
    "Reaktionsplan dokumenterad",
    "Processägare utsedd",
    "Projektrapport/A3 färdigställd",
  ],
};

interface TollgateChecklistProps {
  projectId: string;
  phase: number;
  isEditor?: boolean;
}

export function TollgateChecklist({ projectId, phase, isEditor = true }: TollgateChecklistProps) {
  const [items, setItems] = useState<TollgateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    fetchItems();
  }, [projectId, phase]);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("tollgate_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("phase", phase)
      .order("sort_order");

    if (error) {
      console.error("Error fetching tollgate items:", error);
    } else if (data && data.length === 0) {
      // Initialize with defaults
      await initializeDefaults();
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  const initializeDefaults = async () => {
    const defaults = DEFAULT_CHECKLIST[phase] || [];
    const inserts = defaults.map((title, i) => ({
      project_id: projectId,
      phase,
      title,
      sort_order: i,
    }));

    if (inserts.length === 0) return;

    const { data, error } = await supabase
      .from("tollgate_items")
      .insert(inserts)
      .select();

    if (!error && data) {
      setItems(data);
    }
  };

  const toggleItem = async (item: TollgateItem) => {
    if (!isEditor) return;
    const newCompleted = !item.is_completed;
    const { error } = await supabase
      .from("tollgate_items")
      .update({
        is_completed: newCompleted,
        completed_by: newCompleted ? user?.id : null,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", item.id);

    if (!error) {
      setItems(items.map(i => i.id === item.id ? {
        ...i,
        is_completed: newCompleted,
        completed_by: newCompleted ? user?.id || null : null,
        completed_at: newCompleted ? new Date().toISOString() : null,
      } : i));
    }
  };

  const addItem = async () => {
    if (!newTitle.trim()) return;
    const { data, error } = await supabase
      .from("tollgate_items")
      .insert({
        project_id: projectId,
        phase,
        title: newTitle.trim(),
        sort_order: items.length,
      })
      .select()
      .single();

    if (!error && data) {
      setItems([...items, data]);
      setNewTitle("");
    } else {
      toast.error("Kunde inte lägga till punkt");
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("tollgate_items").delete().eq("id", id);
    if (!error) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const completed = items.filter(i => i.is_completed).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const phaseData = phases.find(p => p.id === phase);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {progress === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            Tollgate: {phaseData?.name}
          </CardTitle>
          <Badge variant={progress === 100 ? "default" : "secondary"}>
            {completed}/{total} ({progress}%)
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group"
          >
            <Checkbox
              checked={item.is_completed}
              onCheckedChange={() => toggleItem(item)}
              disabled={!isEditor}
            />
            <span className={`flex-1 text-sm ${item.is_completed ? "line-through text-muted-foreground" : ""}`}>
              {item.title}
            </span>
            {item.completed_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(item.completed_at).toLocaleDateString("sv-SE")}
              </span>
            )}
            {isEditor && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        {isEditor && (
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Lägg till egen punkt..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              className="h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={addItem} className="h-8">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
