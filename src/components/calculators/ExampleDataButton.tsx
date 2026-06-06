import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface ExampleDataButtonProps {
  onLoad: () => void;
  label?: string;
}

export function ExampleDataButton({ onLoad, label = "Exempeldata" }: ExampleDataButtonProps) {
  return (
    <div className="flex justify-end">
      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onLoad}>
        <Sparkles className="h-3 w-3" /> {label}
      </Button>
    </div>
  );
}
