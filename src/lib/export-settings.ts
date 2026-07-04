// Shared export configuration used by PDF and PPTX exports.
// Settings persist in localStorage so the user's choices survive reloads.

export interface ExportOptions {
  // Executive summary (delas mellan PDF och PPTX)
  executiveSummary: boolean;
  execKeyPoints: boolean;
  execTopRisks: boolean;
  execKpiCards: boolean;      // PPTX
  execSigmaChart: boolean;    // PPTX

  // PDF – innehåll per fas
  pdfTollgate: boolean;
  pdfNotes: boolean;
  pdfToolResults: boolean;
  pdfSigmaHeader: boolean;

  // PPTX – slides
  pptxOverviewSlide: boolean;
  pptxPhaseSlides: boolean;
  pptxPhaseTollgate: boolean;
  pptxPhaseTools: boolean;
  pptxPhaseNotes: boolean;
  pptxClosingSlide: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  executiveSummary: true,
  execKeyPoints: true,
  execTopRisks: true,
  execKpiCards: true,
  execSigmaChart: true,

  pdfTollgate: true,
  pdfNotes: true,
  pdfToolResults: true,
  pdfSigmaHeader: true,

  pptxOverviewSlide: true,
  pptxPhaseSlides: true,
  pptxPhaseTollgate: true,
  pptxPhaseTools: true,
  pptxPhaseNotes: true,
  pptxClosingSlide: true,
};

const STORAGE_KEY = "sixsigma:export-options";

export function loadExportOptions(): ExportOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_EXPORT_OPTIONS };
    const parsed = JSON.parse(raw) as Partial<ExportOptions>;
    return { ...DEFAULT_EXPORT_OPTIONS, ...parsed };
  } catch {
    return { ...DEFAULT_EXPORT_OPTIONS };
  }
}

export function saveExportOptions(opts: ExportOptions): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
  } catch {
    // ignore
  }
}
