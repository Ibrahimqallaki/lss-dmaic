export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  usage: string;
  example?: string;
  formula?: string;
}

export interface Phase {
  id: number;
  name: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  tools: Tool[];
}

export const phases: Phase[] = [
  {
    id: 1,
    name: "Define",
    title: "Definiera problemet",
    description: "Identifiera och kvantifiera problemets omfattning. Fastställ projektmål, omfattning och kundkrav.",
    color: "from-blue-500 to-blue-600",
    icon: "🎯",
    tools: [
      {
        id: "project-charter",
        name: "Project Charter",
        description: "Formellt dokument som definierar projektets syfte, omfattning och mål.",
        category: "Projektplanering",
        usage: "Använd i början av projektet för att säkerställa att alla intressenter har samma förståelse för projektets mål.",
        example: "Problem: 15% av leveranser är försenade. Mål: Reducera förseningar till <5% inom 6 månader."
      },
      {
        id: "sipoc",
        name: "SIPOC Diagram",
        description: "Suppliers, Inputs, Process, Outputs, Customers - Högnivåöversikt av processen.",
        category: "Processöversikt",
        usage: "Kartlägg processen på hög nivå för att förstå dess omfattning och gränser.",
        example: "Leverantör → Råmaterial → Tillverkningsprocess → Färdig produkt → Kund"
      },
      {
        id: "voc",
        name: "Voice of Customer (VOC)",
        description: "Metod för att samla in och förstå kundernas behov och förväntningar.",
        category: "Kundanalys",
        usage: "Genomför intervjuer, enkäter eller fokusgrupper för att identifiera vad kunden verkligen värdesätter."
      },
      {
        id: "ctq",
        name: "CTQ Tree (Critical to Quality)",
        description: "Översätter kundbehov till mätbara krav.",
        category: "Kravanalys",
        usage: "Bryt ner VOC till specifika, mätbara kvalitetskrav.",
        example: "Kundbehov: Snabb leverans → CTQ: Leveranstid ≤ 2 dagar"
      },
      {
        id: "stakeholder-analysis",
        name: "Intressentanalys",
        description: "Identifierar och prioriterar projektets intressenter.",
        category: "Projektplanering",
        usage: "Kartlägg alla som påverkas av eller kan påverka projektet."
      },
      {
        id: "problem-statement",
        name: "Problemformulering",
        description: "Tydlig och specifik beskrivning av problemet.",
        category: "Projektdefinition",
        usage: "Beskriv vad, var, när och omfattning - men INTE varför eller hur.",
        example: "Vad: 15% defekter. Var: Monteringsavdelning. När: Sedan Q2. Omfattning: 500 enheter/månad."
      },
      {
        id: "kano-model",
        name: "Kano-modell",
        description: "Kategoriserar kundkrav i Basic, Performance och Delighters.",
        category: "Kundanalys",
        usage: "Prioritera förbättringar baserat på kundpåverkan."
      }
    ]
  },
  {
    id: 2,
    name: "Measure",
    title: "Mät nuläget",
    description: "Kvantifiera processens nuvarande prestanda. Samla in data och validera mätsystemet.",
    color: "from-green-500 to-green-600",
    icon: "📊",
    tools: [
      {
        id: "process-mapping",
        name: "Processkartläggning",
        description: "Detaljerad visuell representation av processflödet.",
        category: "Processanalys",
        usage: "Dokumentera varje steg i processen med inputs, outputs och beslutspunkter."
      },
      {
        id: "data-collection-plan",
        name: "Datainsamlingsplan",
        description: "Strukturerad plan för att samla in processdata.",
        category: "Datainsamling",
        usage: "Definiera vad, hur, var, när och vem som samlar in data."
      },
      {
        id: "msa",
        name: "MSA (Measurement System Analysis)",
        description: "Validerar att mätsystemet är tillförlitligt.",
        category: "Mätvalidering",
        usage: "Genomför Gage R&R studie för att verifiera mätsystemets noggrannhet.",
        formula: "%R&R = (σ_mätsystem / σ_total) × 100. Acceptabelt: <10%, Marginellt: 10-30%, Oacceptabelt: >30%"
      },
      {
        id: "gage-rr",
        name: "Gage R&R",
        description: "Analyserar repeterbarhet och reproducerbarhet i mätsystemet.",
        category: "Mätvalidering",
        usage: "Mät samma objekt flera gånger med olika operatörer för att bedöma variation.",
        formula: "Total Variation = √(Part-to-Part² + Repeatability² + Reproducibility²)"
      },
      {
        id: "capability-cp",
        name: "Processduglighet (Cp)",
        description: "Mäter processens potential utan hänsyn till centrering.",
        category: "Kapabilitet",
        formula: "Cp = (USL - LSL) / (6σ)",
        usage: "Cp ≥ 1.33 indikerar en kapabel process. Jämför specifikationsbredd med processvariation."
      },
      {
        id: "capability-cpk",
        name: "Processduglighet (Cpk)",
        description: "Mäter processens faktiska duglighet inklusive centrering.",
        category: "Kapabilitet",
        formula: "Cpk = min[(USL - μ)/(3σ), (μ - LSL)/(3σ)]",
        usage: "Cpk ≥ 1.33 är målet. Lägre Cpk än Cp indikerar centreringsproblem."
      },
      {
        id: "dpmo",
        name: "DPMO (Defects Per Million Opportunities)",
        description: "Antal defekter per miljon möjligheter.",
        category: "Kvalitetsmått",
        formula: "DPMO = (Antal defekter / (Antal enheter × Möjligheter per enhet)) × 1,000,000",
        usage: "Konvertera till Sigma-nivå. 3.4 DPMO = 6 Sigma."
      },
      {
        id: "sigma-level",
        name: "Sigma-nivå",
        description: "Standardiserat kvalitetsmått.",
        category: "Kvalitetsmått",
        usage: "Konvertera DPMO till Sigma: 6σ = 3.4 DPMO, 5σ = 233 DPMO, 4σ = 6,210 DPMO, 3σ = 66,807 DPMO"
      },
      {
        id: "control-chart-basics",
        name: "Styrdiagram (Grundläggande)",
        description: "Visuellt verktyg för att övervaka processstabilitet.",
        category: "SPC",
        usage: "Plotta mätvärden över tid med kontrollgränser (UCL, LCL).",
        formula: "UCL = X̄ + 3σ, LCL = X̄ - 3σ"
      },
      {
        id: "pareto",
        name: "Paretoanalys",
        description: "80/20-regeln - identifiera de viktigaste orsakerna.",
        category: "Prioritering",
        usage: "Rangordna defekttyper efter frekvens för att fokusera förbättringsinsatser."
      }
    ]
  },
  {
    id: 3,
    name: "Analyze",
    title: "Analysera rotorsaker",
    description: "Identifiera grundorsakerna till problem genom statistisk analys och problemlösningsverktyg.",
    color: "from-yellow-500 to-orange-500",
    icon: "🔍",
    tools: [
      {
        id: "fishbone",
        name: "Fiskbensdiagram (Ishikawa)",
        description: "Strukturerad brainstorming för att identifiera potentiella orsaker.",
        category: "Rotorsaksanalys",
        usage: "Kategorisera orsaker i 6M: Människa, Maskin, Material, Metod, Miljö, Mätning."
      },
      {
        id: "5-whys",
        name: "5 Varför",
        description: "Iterativ frågeteknik för att nå rotorsaken.",
        category: "Rotorsaksanalys",
        usage: "Fråga 'Varför?' upprepade gånger tills du når den underliggande orsaken.",
        example: "Varför är leveransen försenad? → Varför var komponenten slut? → Varför upptäcktes det inte? → ..."
      },
      {
        id: "hypothesis-testing",
        name: "Hypotestestning",
        description: "Statistisk metod för att dra slutsatser från data.",
        category: "Statistisk analys",
        usage: "Formulera H₀ och H₁, välj signifikansnivå (α), beräkna p-värde, dra slutsats.",
        formula: "Om p-värde < α: Förkasta H₀. Typiskt α = 0.05"
      },
      {
        id: "t-test-1sample",
        name: "1-sample t-test",
        description: "Testar om medelvärdet skiljer sig från ett målvärde.",
        category: "Hypotestest",
        formula: "t = (X̄ - μ₀) / (s/√n)",
        usage: "Använd när du vill jämföra ett stickprovs medelvärde med ett känt värde."
      },
      {
        id: "t-test-2sample",
        name: "2-sample t-test",
        description: "Jämför medelvärden mellan två grupper.",
        category: "Hypotestest",
        formula: "t = (X̄₁ - X̄₂) / √(s₁²/n₁ + s₂²/n₂)",
        usage: "Testa om det finns signifikant skillnad mellan två grupper."
      },
      {
        id: "anova",
        name: "ANOVA (Analysis of Variance)",
        description: "Jämför medelvärden mellan tre eller fler grupper.",
        category: "Hypotestest",
        formula: "F = MS_between / MS_within",
        usage: "Identifiera om det finns signifikanta skillnader mellan flera grupper."
      },
      {
        id: "chi-square",
        name: "Chi-två-test",
        description: "Testar samband mellan kategoriska variabler.",
        category: "Hypotestest",
        formula: "χ² = Σ[(O - E)² / E]",
        usage: "Analysera frekvenstabeller för att identifiera beroenden."
      },
      {
        id: "correlation",
        name: "Korrelationsanalys",
        description: "Mäter styrkan av linjärt samband mellan variabler.",
        category: "Regressionsanalys",
        formula: "r = Σ[(xᵢ - x̄)(yᵢ - ȳ)] / √[Σ(xᵢ - x̄)² × Σ(yᵢ - ȳ)²]",
        usage: "r = 1: Perfekt positiv, r = -1: Perfekt negativ, r = 0: Inget samband"
      },
      {
        id: "regression",
        name: "Regressionsanalys",
        description: "Modellerar sambandet mellan X och Y.",
        category: "Regressionsanalys",
        formula: "Y = β₀ + β₁X + ε",
        usage: "Förutsäg Y baserat på X och kvantifiera sambandets styrka (R²)."
      },
      {
        id: "multi-vari",
        name: "Multi-Vari-analys",
        description: "Identifierar variationskällor i processen.",
        category: "Variationsanalys",
        usage: "Analysera variation inom enheter, mellan enheter och över tid."
      },
      {
        id: "normality-test",
        name: "Normalitetstest",
        description: "Kontrollerar om data är normalfördelad.",
        category: "Datatestning",
        usage: "Anderson-Darling, Shapiro-Wilk. P > 0.05 indikerar normalfördelning."
      },
      {
        id: "fmea",
        name: "FMEA (Failure Mode & Effects Analysis)",
        description: "Systematisk identifiering av potentiella felorsaker och deras effekter.",
        category: "Riskanalys",
        formula: "RPN = Allvarlighet × Sannolikhet × Upptäckbarhet",
        usage: "Prioritera åtgärder baserat på RPN (Risk Priority Number)."
      }
    ]
  },
  {
    id: 4,
    name: "Improve",
    title: "Förbättra processen",
    description: "Utveckla, testa och implementera lösningar för att eliminera rotorsakerna.",
    color: "from-purple-500 to-purple-600",
    icon: "🚀",
    tools: [
      {
        id: "doe-basics",
        name: "DOE (Design of Experiments)",
        description: "Systematiskt tillvägagångssätt för att testa flera faktorer samtidigt.",
        category: "Experiment",
        usage: "Identifiera vilka faktorer och interaktioner som påverkar resultatet."
      },
      {
        id: "full-factorial",
        name: "Full faktoriell design",
        description: "Testar alla kombinationer av faktornivåer.",
        category: "Experiment",
        formula: "Antal körningar = 2^k (för k faktorer på 2 nivåer)",
        usage: "Ger fullständig information om alla huvud- och interaktionseffekter."
      },
      {
        id: "fractional-factorial",
        name: "Fraktionell faktoriell design",
        description: "Testar en delmängd av alla kombinationer.",
        category: "Experiment",
        formula: "Antal körningar = 2^(k-p) (reducerad design)",
        usage: "Använd när resurser är begränsade. Kompromiss: vissa effekter konfunderas."
      },
      {
        id: "response-surface",
        name: "Response Surface Methodology",
        description: "Optimerar processinställningar för bästa resultat.",
        category: "Optimering",
        usage: "Hitta optimala nivåer för processfaktorer genom ytor och konturer."
      },
      {
        id: "pilot-study",
        name: "Pilotstudie",
        description: "Småskaligt test av föreslagen lösning.",
        category: "Implementering",
        usage: "Validera lösningen innan fullskalig implementation."
      },
      {
        id: "pugh-matrix",
        name: "Pugh-matris",
        description: "Strukturerad jämförelse av lösningsalternativ.",
        category: "Beslutsfattande",
        usage: "Utvärdera alternativ mot kriterier för att välja bästa lösning."
      },
      {
        id: "solution-selection",
        name: "Lösningsval",
        description: "Kriteriebaserad utvärdering av potentiella lösningar.",
        category: "Beslutsfattande",
        usage: "Använd viktade kriterier för att objektivt välja lösning."
      },
      {
        id: "implementation-plan",
        name: "Implementeringsplan",
        description: "Detaljerad plan för att genomföra förbättringen.",
        category: "Implementering",
        usage: "Definiera aktiviteter, ansvariga, tidsplan och resurser."
      },
      {
        id: "5s",
        name: "5S",
        description: "Sortera, Strukturera, Städa, Standardisera, Självdisciplin.",
        category: "Lean",
        usage: "Skapa ordning och reda för effektivare arbetsplats."
      },
      {
        id: "kaizen",
        name: "Kaizen Event",
        description: "Fokuserad förbättringsworkshop (3-5 dagar).",
        category: "Lean",
        usage: "Snabb implementation av förbättringar med tvärfunktionellt team."
      },
      {
        id: "mistake-proofing",
        name: "Poka-Yoke (Felsäkring)",
        description: "Designa bort möjligheten till fel.",
        category: "Lean",
        usage: "Gör det omöjligt eller svårt att göra fel."
      }
    ]
  },
  {
    id: 5,
    name: "Control",
    title: "Styra och upprätthålla",
    description: "Säkerställ att förbättringarna bibehålls över tid genom standardisering och övervakning.",
    color: "from-red-500 to-red-600",
    icon: "🎮",
    tools: [
      {
        id: "control-plan",
        name: "Kontrollplan",
        description: "Dokument som specificerar hur processen ska övervakas.",
        category: "Dokumentation",
        usage: "Definiera vad som mäts, hur ofta, av vem, och åtgärder vid avvikelse."
      },
      {
        id: "spc-imr",
        name: "I-MR Chart",
        description: "Individual-Moving Range chart för kontinuerlig data.",
        category: "SPC",
        usage: "Övervaka enskilda mätvärden och variationen mellan dem.",
        formula: "UCL = X̄ + 2.66×MR̄, LCL = X̄ - 2.66×MR̄"
      },
      {
        id: "spc-xbar-r",
        name: "X̄-R Chart",
        description: "Övervakar medelvärde och variation för undergrupper.",
        category: "SPC",
        formula: "UCL_X̄ = X̿ + A₂R̄, UCL_R = D₄R̄",
        usage: "Använd när du har undergrupper (n=2-10)."
      },
      {
        id: "spc-xbar-s",
        name: "X̄-S Chart",
        description: "Övervakar medelvärde och standardavvikelse.",
        category: "SPC",
        usage: "Använd för större undergrupper (n>10)."
      },
      {
        id: "spc-p-chart",
        name: "p-Chart",
        description: "Övervakar andelen defekta.",
        category: "SPC",
        formula: "UCL = p̄ + 3√(p̄(1-p̄)/n)",
        usage: "Använd för attributdata med varierande stickprovsstorlek."
      },
      {
        id: "spc-np-chart",
        name: "np-Chart",
        description: "Övervakar antal defekta.",
        category: "SPC",
        usage: "Använd för attributdata med konstant stickprovsstorlek."
      },
      {
        id: "spc-c-chart",
        name: "c-Chart",
        description: "Övervakar antal defekter per enhet.",
        category: "SPC",
        formula: "UCL = c̄ + 3√c̄",
        usage: "Konstant möjlighetsområde för defekter."
      },
      {
        id: "spc-u-chart",
        name: "u-Chart",
        description: "Övervakar defekter per enhet.",
        category: "SPC",
        usage: "Varierande möjlighetsområde för defekter."
      },
      {
        id: "cusum",
        name: "CUSUM Chart",
        description: "Kumulativ summa - känslig för små skift.",
        category: "SPC",
        usage: "Upptäck gradvisa förändringar i processmedelvärdet."
      },
      {
        id: "ewma",
        name: "EWMA Chart",
        description: "Exponentially Weighted Moving Average.",
        category: "SPC",
        usage: "Balans mellan känslighet och stabilitet för att upptäcka små skift."
      },
      {
        id: "sop",
        name: "SOP (Standard Operating Procedure)",
        description: "Standardiserade arbetsinstruktioner.",
        category: "Dokumentation",
        usage: "Dokumentera den nya, förbättrade processen."
      },
      {
        id: "training-plan",
        name: "Utbildningsplan",
        description: "Plan för att utbilda personal i nya rutiner.",
        category: "Implementering",
        usage: "Säkerställ att alla förstår och kan utföra den nya processen."
      },
      {
        id: "response-plan",
        name: "Reaktionsplan",
        description: "Definierar åtgärder vid processavvikelser.",
        category: "Dokumentation",
        usage: "Vem gör vad när kontrollgränser överskrids?"
      },
      {
        id: "audit-plan",
        name: "Revisionsplan",
        description: "Schema för regelbundna processgranskningar.",
        category: "Uppföljning",
        usage: "Säkerställ att förbättringar upprätthålls långsiktigt."
      }
    ]
  }
];

export const sigmaTable = [
  { sigma: 1, dpmo: 691462, yield: 30.9 },
  { sigma: 2, dpmo: 308538, yield: 69.1 },
  { sigma: 3, dpmo: 66807, yield: 93.3 },
  { sigma: 4, dpmo: 6210, yield: 99.38 },
  { sigma: 5, dpmo: 233, yield: 99.977 },
  { sigma: 6, dpmo: 3.4, yield: 99.99966 },
];

export const controlChartConstants = {
  A2: { 2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 },
  D3: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223 },
  D4: { 2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777 },
  d2: { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078 },
};
