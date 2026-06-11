import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIDMAICCoachProps {
  projectId: string;
  projectName: string;
}

export function AIDMAICCoach({ projectId, projectName }: AIDMAICCoachProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runCoach = async (userQuestion?: string) => {
    setIsLoading(true);
    setResponse("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Inte inloggad");

      const url = `https://uswqbrghiqhjqwyrclid.supabase.co/functions/v1/ai-dmaic-coach`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId, question: userQuestion || "" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Okänt fel" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Ingen stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setResponse(acc);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      toast({
        title: "AI-coach fel",
        description: e instanceof Error ? e.message : "Okänt fel",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAsk = () => {
    const q = question.trim();
    if (!q) return;
    runCoach(q);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 shadow-2xl rounded-full h-14 w-14 p-0 bg-gradient-to-br from-primary to-primary/70 hover:scale-110 transition-transform"
          aria-label="Öppna AI DMAIC-coach"
        >
          <Brain className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI DMAIC-coach
          </SheetTitle>
          <SheetDescription>
            Coachande analys av <span className="font-medium">{projectName}</span> baserat på din faktiska projektdata.
          </SheetDescription>
        </SheetHeader>

        <div className="flex gap-2">
          <Button
            onClick={() => runCoach()}
            disabled={isLoading}
            className="flex-1 gap-2"
            variant="default"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Coacha mitt projekt nu
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ställ en fråga... (t.ex. 'Är jag redo för Improve-fasen?')"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) handleAsk();
            }}
            disabled={isLoading}
          />
          <Button onClick={handleAsk} disabled={isLoading || !question.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4">
          {!response && !isLoading && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Klicka "Coacha mitt projekt nu" för att få en personlig analys,</p>
              <p>eller ställ en specifik fråga.</p>
            </div>
          )}
          {isLoading && !response && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyserar projektdata...
            </div>
          )}
          {response && (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
