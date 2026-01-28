import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { phases } from "@/data/dmaic-tools";
import { cn } from "@/lib/utils";
import { Activity, Calculator, Home, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-bold text-lg">Six Sigma</span>
                <span className="text-muted-foreground text-sm block -mt-1">DMAIC Guide</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Home className="h-4 w-4 inline-block mr-2" />
                Hem
              </Link>
              {phases.map((phase) => (
                <Link
                  key={phase.id}
                  to={`/phase/${phase.id}`}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === `/phase/${phase.id}`
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {phase.name}
                </Link>
              ))}
              <Link
                to="/calculators"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/calculators"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Calculator className="h-4 w-4 inline-block mr-2" />
                Kalkylatorer
              </Link>
              <Link
                to="/control-charts"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === "/control-charts"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <BarChart3 className="h-4 w-4 inline-block mr-2" />
                Styrdiagram
              </Link>
              <ThemeToggle />
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Link
                to="/"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Home className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Phase Navigation */}
      <div className="md:hidden sticky top-16 z-40 glass border-b overflow-x-auto">
        <div className="flex items-center gap-1 px-4 py-2">
          {phases.map((phase) => (
            <Link
              key={phase.id}
              to={`/phase/${phase.id}`}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                location.pathname === `/phase/${phase.id}`
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {phase.icon} {phase.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Six Sigma Black Belt DMAIC Guide</p>
          <p className="mt-1">Processtyrning & Statistik</p>
        </div>
      </footer>
    </div>
  );
}
