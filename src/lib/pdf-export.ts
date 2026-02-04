import jsPDF from "jspdf";
import { phases } from "@/data/dmaic-tools";

interface ProjectNote {
  id: string;
  phase: number;
  title: string;
  content: string | null;
  created_at: string;
}

interface ProjectCalculation {
  id: string;
  phase: number;
  tool_id: string;
  tool_name: string;
  inputs: unknown;
  results: unknown;
  notes: string | null;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  current_phase: number;
  status: string;
}

export function exportProjectToPDF(
  project: Project,
  notes: ProjectNote[],
  calculations: ProjectCalculation[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let yPos = 20;

  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(project.name, marginLeft, yPos);
  yPos += 10;

  // Description
  if (project.description) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(project.description, contentWidth);
    doc.text(descLines, marginLeft, yPos);
    yPos += descLines.length * 5 + 5;
  }

  // Status and date
  doc.setFontSize(10);
  doc.setTextColor(120);
  const statusText = project.status === "active" ? "Aktiv" : project.status === "completed" ? "Klar" : "Arkiverad";
  doc.text(`Status: ${statusText} | Exporterad: ${new Date().toLocaleDateString("sv-SE")}`, marginLeft, yPos);
  yPos += 15;

  // Divider
  doc.setDrawColor(200);
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
  yPos += 10;

  // Loop through each phase
  phases.forEach((phase) => {
    const phaseNotes = notes.filter((n) => n.phase === phase.id);
    const phaseCalcs = calculations.filter((c) => c.phase === phase.id);

    if (phaseNotes.length === 0 && phaseCalcs.length === 0) return;

    checkPageBreak(30);

    // Phase header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`${phase.icon} ${phase.name}: ${phase.title}`, marginLeft, yPos);
    yPos += 10;

    // Notes section
    if (phaseNotes.length > 0) {
      checkPageBreak(15);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Anteckningar", marginLeft, yPos);
      yPos += 7;

      phaseNotes.forEach((note) => {
        checkPageBreak(25);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40);
        doc.text(`• ${note.title}`, marginLeft + 5, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(new Date(note.created_at).toLocaleDateString("sv-SE"), marginLeft + 10, yPos);
        yPos += 5;

        if (note.content) {
          doc.setFontSize(10);
          doc.setTextColor(60);
          const contentLines = doc.splitTextToSize(note.content, contentWidth - 15);
          contentLines.forEach((line: string) => {
            checkPageBreak(6);
            doc.text(line, marginLeft + 10, yPos);
            yPos += 5;
          });
        }
        yPos += 3;
      });
    }

    // Calculations section
    if (phaseCalcs.length > 0) {
      checkPageBreak(15);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Beräkningar", marginLeft, yPos);
      yPos += 7;

      phaseCalcs.forEach((calc) => {
        checkPageBreak(30);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40);
        doc.text(`• ${calc.tool_name}`, marginLeft + 5, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(new Date(calc.created_at).toLocaleDateString("sv-SE"), marginLeft + 10, yPos);
        yPos += 6;

        // Results
        if (calc.results && typeof calc.results === "object") {
          doc.setFontSize(10);
          Object.entries(calc.results as Record<string, unknown>).forEach(([key, value]) => {
            checkPageBreak(6);
            doc.setTextColor(80);
            const displayValue = typeof value === "number" ? value.toFixed(4) : String(value);
            doc.text(`${key}: ${displayValue}`, marginLeft + 10, yPos);
            yPos += 5;
          });
        }

        if (calc.notes) {
          checkPageBreak(10);
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.setFont("helvetica", "italic");
          const noteLines = doc.splitTextToSize(`Anteckning: ${calc.notes}`, contentWidth - 15);
          noteLines.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, marginLeft + 10, yPos);
            yPos += 5;
          });
          doc.setFont("helvetica", "normal");
        }
        yPos += 3;
      });
    }

    yPos += 8;
  });

  // Footer on last page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Sida ${i} av ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  // Save
  const fileName = `${project.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\s]/g, "").replace(/\s+/g, "_")}_rapport.pdf`;
  doc.save(fileName);
}
