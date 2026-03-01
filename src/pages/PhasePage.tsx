import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ToolCard } from "@/components/ToolCard";
import { phases } from "@/data/dmaic-tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export default function PhasePage() {
  const { phaseId } = useParams<{ phaseId: string }>();
  const [searchQuery, setSearchQuery] = useState("");

  const currentPhaseId = parseInt(phaseId || "1", 10);
  const phase = phases.find((p) => p.id === currentPhaseId);
  const prevPhase = phases.find((p) => p.id === currentPhaseId - 1);
  const nextPhase = phases.find((p) => p.id === currentPhaseId + 1);

  const filteredTools = useMemo(() => {
    if (!phase) return [];
    if (!searchQuery.trim()) return phase.tools;
    const query = searchQuery.toLowerCase();
    return phase.tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query)
    );
  }, [phase, searchQuery]);

  const categories = useMemo(() => {
    const cats = new Set(filteredTools.map((t) => t.category));
    return Array.from(cats);
  }, [filteredTools]);

  if (!phase) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      {/* Phase Header */}
      <section className={cn("bg-gradient-to-br text-white", phase.color)}>
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-4xl">
            {/* Phase indicator */}
            <div className="flex items-center gap-2 mb-4">
              {phases.map((p) => (
                <Link
                  key={p.id}
                  to={`/phase/${p.id}`}
                  className={cn(
                    "h-3 w-3 rounded-full transition-all",
                    p.id === currentPhaseId
                      ? "bg-white w-8"
                      : "bg-white/40 hover:bg-white/60"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{phase.icon}</span>
              <div>
                <span className="text-white/80 text-sm font-medium">Fas {phase.id}</span>
                <h1 className="text-4xl md:text-5xl font-bold">{phase.name}</h1>
              </div>
            </div>
            <p className="text-xl text-white/90 max-w-2xl">
              {phase.description}
            </p>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Sök verktyg..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tools by category */}
          {categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Inga verktyg hittades för "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-10">
              {categories.map((category) => (
                <div key={category}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span className="h-1 w-4 bg-primary rounded-full" />
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTools
                      .filter((t) => t.category === category)
                      .map((tool) => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          phaseColor={phase.color}
                          phaseId={phase.id}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t">
            {prevPhase ? (
              <Button asChild variant="ghost" className="gap-2">
                <Link to={`/phase/${prevPhase.id}`}>
                  <ArrowLeft className="h-4 w-4" />
                  {prevPhase.icon} {prevPhase.name}
                </Link>
              </Button>
            ) : (
              <div />
            )}
            {nextPhase ? (
              <Button asChild className="gap-2">
                <Link to={`/phase/${nextPhase.id}`}>
                  {nextPhase.icon} {nextPhase.name}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="gap-2">
                <Link to="/calculators">
                  Kalkylatorer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
