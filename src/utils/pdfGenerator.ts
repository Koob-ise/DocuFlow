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
  tempDiv.style.padding = '48px 56px';
  tempDiv.style.backgroundColor = '#ffffff';
  tempDiv.style.fontFamily = "'Times New Roman', 'Liberation Serif', serif";
  tempDiv.style.fontSize = '13.5px';
  tempDiv.style.lineHeight = '1.5';
  tempDiv.style.color = '#111827';
  tempDiv.style.tabSize = '4';

  const escapedParagraphs = text
    .split('\n')
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) {
        return '<p style="margin: 0; min-height: 12px;">&nbsp;</p>';
      }

      const hasTabIndent = p.startsWith('\t');
      const isTableRow = p.includes('\t') && !hasTabIndent;

      // Centered uppercase headers
      if (
        trimmed.length < 100 &&
        (/^[А-ЯЁ\s]{4,}$/.test(trimmed) ||
          trimmed.startsWith('ДОГОВОР') ||
          trimmed.startsWith('ПРИЛОЖЕНИЕ') ||
          trimmed.startsWith('СПЕЦИФИКАЦИЯ') ||
          trimmed.startsWith('АКТ'))
      ) {
        return `<h2 style="text-align: center; font-size: 15px; font-weight: bold; text-transform: uppercase; margin: 14px 0 6px 0;">${escapeHtml(trimmed)}</h2>`;
      }

      // City and date two-column line
      if (
        trimmed.length < 90 &&
        (trimmed.startsWith('г.') || trimmed.includes('«')) &&
        (p.includes('\t') || /\s{3,}/.test(p))
      ) {
        const parts = trimmed.split(/\t+|\s{3,}/);
        if (parts.length >= 2) {
          return `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 500; font-size: 13px;"><span>${escapeHtml(parts[0].trim())}</span><span>${escapeHtml(parts[1].trim())}</span></div>`;
        }
      }

      // Table row
      if (isTableRow) {
        const cols = p.split('\t');
        const cells = cols
          .map(
            (c) =>
              `<td style="border: 1px solid #9ca3af; padding: 4px 6px; font-size: 11.5px; vertical-align: top;">${escapeHtml(c.trim())}</td>`
          )
          .join('');
        return `<table style="width: 100%; border-collapse: collapse; margin: 4px 0; table-layout: fixed;"><tr>${cells}</tr></table>`;
      }

      // Standard paragraph
      const clean = escapeHtml(hasTabIndent ? p.replace(/^\t+/, '').trim() : trimmed);
      const textIndent = hasTabIndent ? '1.25cm' : '0cm';
      return `<p style="margin-bottom: 5px; text-indent: ${textIndent}; text-align: left; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere;">${clean || '&nbsp;'}</p>`;
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
