import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  HeadingLevel,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

/**
 * Renders an existing binary DOCX file (ArrayBuffer) using docxtemplater.
 * Replaces all {tag} placeholders with provided data.
 */
export async function renderDocxWithTemplate(
  arrayBuffer: ArrayBuffer,
  data: Record<string, string>
): Promise<Blob> {
  try {
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
    });

    // Render document with replaced data
    doc.render(data);

    const outBlob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return outBlob;
  } catch (error) {
    console.error('Docxtemplater render failed, falling back to document builder:', error);
    throw error;
  }
}

/**
 * Builds a clean, professional native Word (.docx) document from structured text.
 * Respects standard Russian business document standards (Times New Roman / Calibri,
 * paragraph spacing, center headers, signatures).
 */
export async function generateNativeDocx(
  title: string,
  renderedText: string
): Promise<Blob> {
  const lines = renderedText.split('\n');
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    // Check if line is title
    if (
      line.startsWith('ДОГОВОР') ||
      line.startsWith('АКТ') ||
      line.startsWith('СЛУЖЕБНАЯ ЗАПИСКА') ||
      line.startsWith('ПРИХОДНЫЙ КАССОВЫЙ ОРДЕР')
    ) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 180 },
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 28, // 14pt
              font: 'Times New Roman',
            }),
          ],
        })
      );
      continue;
    }

    // Check if section heading like "1. ПРЕДМЕТ ДОГОВОРА"
    if (/^\d+\.\s+[А-ЯЁ\s]+$/.test(line) || /^[А-ЯЁ\s]{4,}:$/.test(line)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: line,
              bold: true,
              size: 24, // 12pt
              font: 'Times New Roman',
            }),
          ],
        })
      );
      continue;
    }

    // Standard paragraph
    paragraphs.push(
      new Paragraph({
        alignment: line.includes('г.') && (line.includes('«') || line.includes('"'))
          ? AlignmentType.BOTH
          : AlignmentType.LEFT,
        spacing: { after: 100, line: 260 },
        children: [
          new TextRun({
            text: line,
            size: 24, // 12pt
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              right: 850, // ~1.5cm
              bottom: 1134, // ~2cm
              left: 1700, // ~3cm for filing
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
