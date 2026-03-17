import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, ChevronDown, Clock, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SavedCalc {
  id: string;
  inputs: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

interface CalculatorLoadButtonProps {
  savedCalculations: SavedCalc[];
  isLoading: boolean;
  onLoad: (inputs: Record<string, unknown>) => void;
  className?: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function summarize(inputs: Record<string, unknown>): string {
  const vals = Object.values(inputs);
  const strs = vals
    .flatMap(v => {
      if (typeof v === "string" && v.trim()) return [v.trim().slice(0, 40)];
      if (Array.isArray(v)) return v.filter(i => typeof i === "string" && i.trim()).map((i: unknown) => String(i).slice(0, 30));
      return [];
    })
    .filter(Boolean)
    .slice(0, 2);
  return strs.length ? strs.join(", ") + (strs.length < vals.length ? "…" : "") : "Sparad beräkning";
}

export function CalculatorLoadButton({
  savedCalculations,
  isLoading,
  onLoad,
  className,
}: CalculatorLoadButtonProps) {
  if (!savedCalculations.length && !isLoading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 text-xs text-muted-foreground", className)}
          disabled={isLoading || !savedCalculations.length}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Ladda sparad ({savedCalculations.length})
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-64 overflow-y-auto">
        {savedCalculations.map((calc) => (
          <DropdownMenuItem
            key={calc.id}
            onClick={() => onLoad(calc.inputs)}
            className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 w-full">
              <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium truncate flex-1">
                {summarize(calc.inputs)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-[18px]">
              <Clock className="h-2.5 w-2.5" />
              {formatDate(calc.created_at)}
              {calc.notes && <span className="truncate ml-1">— {calc.notes}</span>}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
