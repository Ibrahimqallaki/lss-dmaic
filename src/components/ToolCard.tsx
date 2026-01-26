import { Tool } from "@/data/dmaic-tools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: Tool;
  phaseColor: string;
}

export function ToolCard({ tool, phaseColor }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isExpanded && "ring-2 ring-primary/20"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">{tool.name}</CardTitle>
            <CardDescription className="mt-1">{tool.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary" className="text-xs">
              {tool.category}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Usage */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Användning</h4>
            <p className="text-sm text-muted-foreground">{tool.usage}</p>
          </div>

          {/* Formula */}
          {tool.formula && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Formel</h4>
              <div className="formula">
                {tool.formula}
              </div>
            </div>
          )}

          {/* Example */}
          {tool.example && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Exempel</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {tool.example}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
