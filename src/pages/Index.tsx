import { Layout } from "@/components/Layout";
import { PhaseCard } from "@/components/PhaseCard";
import { phases, sigmaTable } from "@/data/dmaic-tools";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, CheckCircle2, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Target,
    title: "Målstyrt",
    description: "Identifiera och kvantifiera problemets omfattning.",
  },
  {
    icon: BarChart3,
    title: "Strukturerat",
    description: "Följ en beprövad metodik från problem till lösning.",
  },
  {
    icon: Users,
    title: "Kundfokus",
    description: "Basera förbättringar på vad kunden faktiskt värdesätter.",
  },
  {
    icon: CheckCircle2,
    title: "Resultatorienterat",
    description: "Säkerställ mätbara och varaktiga förbättringar.",
  },
];

export default function Index() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              Six Sigma Black Belt
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Mastering{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                DMAIC
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Din ultimata guide till Six Sigma Black Belt-verktyg. Navigera genom varje fas med rätt statistik och metodik.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link to="/phase/1">
                  Börja Guiden <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/calculators">
                  Kalkylatorer
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-card rounded-xl p-6 border shadow-sm hover:shadow-md transition-shadow"
              >
                <feature.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DMAIC Phases */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">DMAIC Faserna</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Define, Measure, Analyze, Improve, Control - En strukturerad metodik för processförbättring.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {phases.map((phase, index) => (
              <PhaseCard key={phase.id} phase={phase} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Sigma Level Table */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Sigma-nivåer</h2>
              <p className="text-muted-foreground">
                Förstå sambandet mellan Sigma-nivå, DPMO och processutbyte.
              </p>
            </div>
            <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Sigma-nivå</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold">DPMO</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold">Utbyte (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {sigmaTable.map((row, i) => (
                    <tr key={row.sigma} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-6 py-4 font-medium">{row.sigma}σ</td>
                      <td className="px-6 py-4 text-right font-mono text-sm">
                        {row.dpmo.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm">
                        {row.yield}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary to-accent rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Redo att optimera processen?
            </h2>
            <p className="text-white/90 mb-8 max-w-2xl mx-auto">
              Få tillgång till över 50 statistiska verktyg med konkreta exempel och applikationsguider.
            </p>
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link to="/phase/1">
                Gå till Define-fasen <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
