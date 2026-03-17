import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface SaveCalculationParams {
  toolId: string;
  toolName: string;
  phase: number;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  notes?: string;
}

interface SavedCalculation {
  id: string;
  tool_id: string;
  tool_name: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

export function useCalculatorSave(toolId?: string) {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const canSave = !!projectId && !!user;

  const fetchSaved = useCallback(async () => {
    if (!projectId || !user || !toolId) return;
    setIsLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from("project_calculations")
        .select("id, tool_id, tool_name, inputs, results, notes, created_at")
        .eq("project_id", projectId)
        .eq("tool_id", toolId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setSavedCalculations((data as unknown as SavedCalculation[]) || []);
    } catch (e) {
      console.error("Error fetching saved calculations:", e);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [projectId, user, toolId]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const saveCalculation = async (params: SaveCalculationParams) => {
    if (!projectId || !user) {
      toast.error("Du måste vara i ett projekt för att spara beräkningar");
      return false;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("project_calculations").insert([{
        project_id: projectId,
        user_id: user.id,
        tool_id: params.toolId,
        tool_name: params.toolName,
        phase: params.phase,
        inputs: params.inputs as Json,
        results: params.results as Json,
        notes: params.notes || notes,
      }]);

      if (error) throw error;

      toast.success("Beräkningen har sparats till projektet!");
      setNotes("");
      // Refresh saved list
      fetchSaved();
      return true;
    } catch (error) {
      console.error("Error saving calculation:", error);
      toast.error("Kunde inte spara beräkningen");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    canSave,
    isSaving,
    notes,
    setNotes,
    saveCalculation,
    projectId,
    savedCalculations,
    isLoadingSaved,
  };
}
