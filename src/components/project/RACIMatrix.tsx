import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface RACIRow {
  id: string;
  activity: string;
  responsible: string | null;
  accountable: string | null;
  consulted: string | null;
  informed: string | null;
  phase: number | null;
}

interface RACIMatrixProps {
  projectId: string;
}

export function RACIMatrix({ projectId }: RACIMatrixProps) {
  const [rows, setRows] = useState<RACIRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchRows();
  }, [projectId]);

  const fetchRows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("raci_matrix")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");

    if (!error) setRows(data || []);
    setIsLoading(false);
  };

  const addRow = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("raci_matrix")
      .insert({
        project_id: projectId,
        user_id: user.id,
        activity: "",
      })
      .select()
      .single();

    if (!error && data) {
      setRows([...rows, data]);
    } else {
      toast.error("Kunde inte lägga till rad");
    }
  };

  const updateRow = async (id: string, field: keyof RACIRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    await supabase.from("raci_matrix").update({ [field]: value }).eq("id", id);
  };

  const deleteRow = async (id: string) => {
    const { error } = await supabase.from("raci_matrix").delete().eq("id", id);
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
            <Users className="h-5 w-5 text-primary" />
            RACI-matris
          </CardTitle>
          <Button size="sm" onClick={addRow} className="gap-1">
            <Plus className="h-3 w-3" /> Lägg till aktivitet
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Ingen RACI-matris ännu.</p>
            <p className="text-xs mt-1">R = Responsible, A = Accountable, C = Consulted, I = Informed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Aktivitet</TableHead>
                  <TableHead className="min-w-[120px]">
                    <span className="font-bold text-primary">R</span>esponsible
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    <span className="font-bold text-primary">A</span>ccountable
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    <span className="font-bold text-primary">C</span>onsulted
                  </TableHead>
                  <TableHead className="min-w-[120px]">
                    <span className="font-bold text-primary">I</span>nformed
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        value={row.activity}
                        onChange={(e) => updateRow(row.id, "activity", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Beskriv aktiviteten..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.responsible || ""}
                        onChange={(e) => updateRow(row.id, "responsible", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Vem utför..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.accountable || ""}
                        onChange={(e) => updateRow(row.id, "accountable", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Vem äger..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.consulted || ""}
                        onChange={(e) => updateRow(row.id, "consulted", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Vem rådfrågad..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.informed || ""}
                        onChange={(e) => updateRow(row.id, "informed", e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Vem informerad..."
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
