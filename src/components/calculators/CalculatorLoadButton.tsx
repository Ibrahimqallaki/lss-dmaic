import { Button } from "@/components/ui/button";
import { FolderOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedCalc {
  id: string;
  inputs: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

interface CalculatorLoadButtonProps {
  savedCalculation: SavedCalc | null;
  isLoading: boolean;
  onLoad: (inputs: Record<string, unknown>) => void;
  className?: string;
}

export function CalculatorLoadButton({
  savedCalculation,
  isLoading,
  onLoad,
  className,
}: CalculatorLoadButtonProps) {
  if (!savedCalculation && !isLoading) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1.5 text-xs text-muted-foreground", className)}
      disabled={isLoading || !savedCalculation}
      onClick={() => savedCalculation && onLoad(savedCalculation.inputs)}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FolderOpen className="h-3.5 w-3.5" />
      )}
      Ladda sparad data
    </Button>
  );
}
