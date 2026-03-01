import { Tool } from "@/data/dmaic-tools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Calculator } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CpCpkCalculator,
  DPMOCalculator,
  FMEACalculator,
  TTestCalculator,
  CorrelationCalculator,
  DOECalculator,
  ControlLimitsCalculator,
} from "@/components/calculators";
import {
  FiveWhysAnalysis,
  SIPOCDiagram,
  ParetoAnalysis,
  FishboneDiagram,
} from "@/components/tools";

interface ToolCardProps {
  tool: Tool;
  phaseColor: string;
  phaseId?: number;
}

// Map tool IDs to their calculator components
const calculatorMap: Record<string, React.ComponentType<{ toolId?: string; toolName?: string; phase?: number }>> = {
  "capability-cp": CpCpkCalculator,
  "capability-cpk": CpCpkCalculator,
  "dpmo": DPMOCalculator,
  "sigma-level": DPMOCalculator,
  "fmea": FMEACalculator,
  "t-test-1sample": TTestCalculator,
  "correlation": CorrelationCalculator,
  "regression": CorrelationCalculator,
  "doe-basics": DOECalculator,
  "full-factorial": DOECalculator,
  "fractional-factorial": DOECalculator,
  "control-chart-basics": ControlLimitsCalculator,
  "spc-imr": ControlLimitsCalculator,
  "spc-xbar-r": ControlLimitsCalculator,
  "spc-xbar-s": ControlLimitsCalculator,
  "spc-p-chart": ControlLimitsCalculator,
  "spc-np-chart": ControlLimitsCalculator,
  "spc-c-chart": ControlLimitsCalculator,
  "spc-u-chart": ControlLimitsCalculator,
  // Process tools
  "5-whys": FiveWhysAnalysis,
  "sipoc": SIPOCDiagram,
  "pareto": ParetoAnalysis,
  "fishbone": FishboneDiagram,
};

export function ToolCard({ tool, phaseColor, phaseId }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const CalculatorComponent = calculatorMap[tool.id];
  const hasCalculator = !!CalculatorComponent;

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
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg leading-tight">{tool.name}</CardTitle>
              {hasCalculator && (
                <Calculator className="h-4 w-4 text-primary" />
              )}
            </div>
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
          {/* Calculator */}
          {CalculatorComponent && (
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="border border-primary/20 rounded-lg p-4 bg-primary/5"
            >
              <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Interaktiv Kalkylator
              </h4>
              <CalculatorComponent toolId={tool.id} toolName={tool.name} phase={phaseId} />
            </div>
          )}

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
