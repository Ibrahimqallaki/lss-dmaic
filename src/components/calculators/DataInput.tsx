import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DataInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  exampleData?: string;
  helpText?: string;
}

export function DataInput({
  label,
  value,
  onChange,
  placeholder,
  exampleData,
  helpText,
}: DataInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePasteCSV = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Convert CSV/tab-separated to comma-separated
      const cleaned = text
        .split(/[\n\r]+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(", ")
        .replace(/[\t;]/g, ", ");
      onChange(cleaned);
      setIsOpen(false);
    } catch {
      // Clipboard access denied or empty
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Parse CSV - handle both comma and semicolon separators
      const values = text
        .split(/[\n\r]+/)
        .flatMap((line) => line.split(/[,;\t]/))
        .map((v) => v.trim())
        .filter((v) => v && !isNaN(parseFloat(v)));
      onChange(values.join(", "));
    };
    reader.readAsText(file);
    event.target.value = "";
    setIsOpen(false);
  };

  const loadExample = () => {
    if (exampleData) {
      onChange(exampleData);
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
              <Upload className="h-3 w-3" />
              Import
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs gap-2"
                onClick={handlePasteCSV}
              >
                <FileSpreadsheet className="h-3 w-3" />
                Klistra in från urklipp
              </Button>
              <label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs gap-2"
                  asChild
                >
                  <span>
                    <Upload className="h-3 w-3" />
                    Ladda upp CSV/TXT
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              {exampleData && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs gap-2"
                  onClick={loadExample}
                >
                  <Sparkles className="h-3 w-3" />
                  Ladda exempeldata
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-16 text-sm resize-none font-mono"
      />
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
