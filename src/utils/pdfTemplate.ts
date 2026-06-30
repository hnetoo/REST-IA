import jsPDF from 'jspdf';

const BRAND_NAME = 'Tasca do Vereda';
const BRAND_COLOR: [number, number, number] = [16, 185, 129]; // emerald-500
const DARK_COLOR: [number, number, number] = [30, 41, 59]; // slate-800
const LIGHT_BG: [number, number, number] = [241, 245, 249]; // slate-100
const GREEN_TEXT: [number, number, number] = [34, 197, 94];
const RED_TEXT: [number, number, number] = [239, 68, 68];
const AMBER_TEXT: [number, number, number] = [245, 158, 11];

export interface ReportSummary {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'amber' | 'dark';
}

export interface ReportConfig {
  title: string;
  subtitle?: string;
  dateRange?: { start: string; end: string };
  landscape?: boolean;
  summary?: ReportSummary[];
}

function getDateString(): string {
  return new Date().toLocaleDateString('pt-AO', {
    timeZone: 'Africa/Luanda',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getColorTuple(color: string): [number, number, number] {
  switch (color) {
    case 'green': return GREEN_TEXT;
    case 'red': return RED_TEXT;
    case 'amber': return AMBER_TEXT;
    default: return DARK_COLOR;
  }
}

export function createReportPDF(config: ReportConfig): { doc: jsPDF; contentStartY: number } {
  const doc = new jsPDF(config.landscape ? 'landscape' : 'portrait');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header background bar
  doc.setFillColor(...DARK_COLOR);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand name
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(BRAND_NAME, margin, 12);

  // Report title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(config.title, margin, 20);

  // Date on right
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(getDateString(), pageWidth - margin, 12, { align: 'right' });

  if (config.dateRange && (config.dateRange.start || config.dateRange.end)) {
    const range = [config.dateRange.start, config.dateRange.end].filter(Boolean).join(' → ');
    doc.text(`Período: ${range}`, pageWidth - margin, 20, { align: 'right' });
  }

  // Subtitle
  let currentY = 36;
  if (config.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(...DARK_COLOR);
    doc.setFont('helvetica', 'italic');
    doc.text(config.subtitle, margin, currentY);
    currentY += 8;
  }

  // Summary boxes
  if (config.summary && config.summary.length > 0) {
    currentY += 4;
    const boxWidth = (pageWidth - margin * 2 - (config.summary.length - 1) * 4) / config.summary.length;
    const boxHeight = 20;

    config.summary.forEach((item, index) => {
      const x = margin + index * (boxWidth + 4);

      // Box background
      const color = item.color ? getColorTuple(item.color) : DARK_COLOR;
      doc.setFillColor(...LIGHT_BG);
      doc.rect(x, currentY, boxWidth, boxHeight, 'F');

      // Top accent line
      doc.setFillColor(...color);
      doc.rect(x, currentY, boxWidth, 2, 'F');

      // Label
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label.toUpperCase(), x + 3, currentY + 8);

      // Value
      doc.setFontSize(11);
      doc.setTextColor(...color);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, x + 3, currentY + 16);
    });

    currentY += boxHeight + 8;
  }

  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  return { doc, contentStartY: currentY };
}

export function addReportFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    // Footer text
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${BRAND_NAME} | Gerado em ${getDateString()}`,
      14,
      pageHeight - 7
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14,
      pageHeight - 7,
      { align: 'right' }
    );
  }
}

export function finalizeReportPDF(doc: jsPDF, filename: string): void {
  addReportFooter(doc);
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    alert('Erro ao exportar PDF.');
  }
}

export { BRAND_NAME, BRAND_COLOR, DARK_COLOR, GREEN_TEXT, RED_TEXT, AMBER_TEXT, formatKz };

function formatKz(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  }).format(value);
}
