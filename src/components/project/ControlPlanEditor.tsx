import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

interface ControlPlanRow {
  id: string;
  process_step: string;
  characteristic: string;
  specification: string | null;
  measurement_method: string | null;
  sample_size: string | null;
  frequency: string | null;
  responsible: string | null;
  reaction_plan: string | null;
  sort_order: number;
}

interface ControlPlanEditorProps {
  projectId: string;
}

export function ControlPlanEditor({ projectId }: ControlPlanEditorProps) {
  const [rows, setRows] = useState<ControlPlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchRows();
  }, [projectId]);

  const fetchRows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("control_plans")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order");

    if (!error) setRows(data || []);
    setIsLoading(false);
  };

  const addRow = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("control_plans")
      .insert({
        project_id: projectId,
        user_id: user.id,
        process_step: "",
        characteristic: "",
        sort_order: rows.length,
      })
      .select()
      .single();

    if (!error && data) {
      setRows([...rows, data]);
    } else {
      toast.error("Kunde inte lägga till rad");
    }
  };

  const updateRow = async (id: string, field: keyof ControlPlanRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    // Debounced save
    await supabase.from("control_plans").update({ [field]: value }).eq("id", id);
  };

  const deleteRow = async (id: string) => {
    const { error } = await supabase.from("control_plans").delete().eq("id", id);
    if (!error) setRows(rows.filter(r => r.id !== id));
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Kontrollplan
          </CardTitle>
          <Button size="sm" onClick={addRow} className="gap-1">
            <Plus className="h-3 w-3" /> Lägg till rad
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Ingen kontrollplan ännu. Klicka "Lägg till rad" för att börja.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Processteg</TableHead>
                  <TableHead className="min-w-[120px]">Karaktäristik</TableHead>
                  <TableHead className="min-w-[100px]">Specifikation</TableHead>
                  <TableHead className="min-w-[120px]">Mätmetod</TableHead>
                  <TableHead className="min-w-[80px]">Stickprov</TableHead>
                  <TableHead className="min-w-[80px]">Frekvens</TableHead>
                  <TableHead className="min-w-[100px]">Ansvarig</TableHead>
                  <TableHead className="min-w-[120px]">Reaktionsplan</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        value={row.process_step}
                        onChange={(e) => updateRow(row.id, "process_step", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Steg..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.characteristic}
                        onChange={(e) => updateRow(row.id, "characteristic", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Vad mäts..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.specification || ""}
                        onChange={(e) => updateRow(row.id, "specification", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Krav..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.measurement_method || ""}
                        onChange={(e) => updateRow(row.id, "measurement_method", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Hur..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.sample_size || ""}
                        onChange={(e) => updateRow(row.id, "sample_size", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="n=..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.frequency || ""}
                        onChange={(e) => updateRow(row.id, "frequency", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Var..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.responsible || ""}
                        onChange={(e) => updateRow(row.id, "responsible", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Vem..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.reaction_plan || ""}
                        onChange={(e) => updateRow(row.id, "reaction_plan", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Åtgärd vid avvikelse..."
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRow(row.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
