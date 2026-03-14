import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Loader2, Sparkles } from "lucide-react";

interface AIRootCauseProps {
  fishboneData?: Record<string, string[]>;
  fiveWhysData?: Array<{ problem: string; whys: string[]; rootCause: string }>;
  problemStatement?: string;
}

export function AIRootCauseAnalysis({ fishboneData, fiveWhysData, problemStatement }: AIRootCauseProps) {
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customContext, setCustomContext] = useState("");

  const runAnalysis = async () => {
    setIsLoading(true);
    setAnalysis("");

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-root-cause`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          fishboneData,
          fiveWhysData,
          problemStatement: problemStatement || customContext || "Analysera tillgänglig data",
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Analys misslyckades");
      }

      if (!resp.body) throw new Error("Ingen response");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setAnalysis(content);
            }
          } catch {
            // partial json
          }
        }
      }
    } catch (err) {
      setAnalysis(`Fel: ${err instanceof Error ? err.message : "Okänt fel"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const hasData = (fishboneData && Object.values(fishboneData).some(v => v.length > 0)) ||
    (fiveWhysData && fiveWhysData.length > 0);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Rotorsaksanalys
          <Sparkles className="h-4 w-4 text-accent" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasData && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Beskriv problemet och eventuella observationer för AI-analys:
            </p>
            <Textarea
              placeholder="T.ex. Vi ser 15% defekter i monteringslinjen, främst skruvfel och felaktiga komponenter..."
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {hasData && (
          <p className="text-sm text-muted-foreground">
            AI analyserar dina fiskbens- och 5 Varför-data för att föreslå ytterligare rotorsaker och åtgärder.
          </p>
        )}

        <Button
          onClick={runAnalysis}
          disabled={isLoading || (!hasData && !customContext.trim())}
          className="w-full gap-2"
          variant="default"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {isLoading ? "Analyserar..." : "Kör AI-analys"}
        </Button>

        {analysis && (
          <div className="prose prose-sm max-w-none dark:prose-invert bg-background rounded-lg p-4 border">
            <div className="whitespace-pre-wrap text-sm">{analysis}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
