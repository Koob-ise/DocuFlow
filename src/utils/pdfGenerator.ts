import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Safely escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates a standard styled container for printing/rendering a document to PDF safely.
 */
export function createSafeDocumentElement(text: string): HTMLDivElement {
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.width = '794px'; // ~A4 width in 96dpi
  tempDiv.style.padding = '40px';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.style.fontFamily = "'Times New Roman', 'Liberation Serif', serif";
  tempDiv.style.fontSize = '14px';
  tempDiv.style.lineHeight = '1.6';
  tempDiv.style.color = '#111827';

  const escapedParagraphs = text
    .split('\n')
    .map((p) => {
      const clean = escapeHtml(p.trim());
      return `<p style="margin-bottom: 8px;">${clean || '&nbsp;'}</p>`;
    })
    .join('');

  tempDiv.innerHTML = escapedParagraphs;
  return tempDiv;
}

/**
 * Exports an HTML element representing a document to a downloadable PDF file.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  _fileName?: string
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // Subsequent pages if document overflows A4
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  const blob = pdf.output('blob');
  return blob;
}
