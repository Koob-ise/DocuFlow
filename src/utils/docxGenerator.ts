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

import { base64ToArrayBuffer } from './fileUploadValidator';
import { renderExcelWithTemplate, generateExcelDocument } from './xlsxGenerator';
import { FilledDocument } from '../types';

/**
 * Renders an existing binary DOCX file (ArrayBuffer) using docxtemplater.
 * Replaces all {tag} placeholders with provided data while preserving 100% of styles,
 * indents, tables, linebreaks and original layout.
 */
export async function renderDocxWithTemplate(
  arrayBuffer: ArrayBuffer,
  data: Record<string, string>
): Promise<Blob> {
  try {
    const zip = new PizZip(arrayBuffer);
    const parser = (tag: string) => ({
      get: (scope: any) => {
        const cleanTag = (tag || '').trim();
        if (scope && scope[cleanTag] !== undefined && scope[cleanTag] !== null) {
          return String(scope[cleanTag]);
        }
        return '';
      },
    });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{', end: '}' },
      parser,
      nullGetter: () => '',
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
 * Universal helper that returns a Blob for any FilledDocument:
 * Uses original docx/excel templates with docxtemplater/exceljs if available,
 * or falls back to native document generation.
 */
export async function getGeneratedDocumentBlob(doc: FilledDocument): Promise<Blob> {
  if (doc.format === 'docx') {
    if (doc.rawDocxBase64 || doc.rawFileBase64) {
      try {
        const buf = base64ToArrayBuffer(doc.rawDocxBase64 || doc.rawFileBase64!);
        return await renderDocxWithTemplate(buf, doc.filledData);
      } catch (err) {
        console.warn('docxtemplater failed, falling back to native docx:', err);
      }
    }
    return await generateNativeDocx(doc.title, doc.rawText);
  } else {
    if (doc.rawFileBase64) {
      try {
        const buf = base64ToArrayBuffer(doc.rawFileBase64);
        return await renderExcelWithTemplate(buf, doc.filledData);
      } catch (err) {
        console.warn('Excel template render failed, falling back to native excel:', err);
      }
    }
    return await generateExcelDocument(doc.title, doc.filledData);
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
    const rawLine = lines[i];
    const hasIndent = rawLine.startsWith('\t');
    const line = rawLine.replace(/^\t+/, '').trim();

    if (!line) {
      paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    // Check if line is title
    if (
      line.length < 90 &&
      (line.startsWith('ДОГОВОР') ||
      line.startsWith('АКТ') ||
      line.startsWith('СЛУЖЕБНАЯ ЗАПИСКА') ||
      line.startsWith('ПРИХОДНЫЙ КАССОВЫЙ ОРДЕР'))
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
    if (line.length < 100 && (/^\d+\.\s+[А-ЯЁ\s\-]+$/.test(line) || /^[А-ЯЁ\s\-]{4,}:$/.test(line))) {
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

    // Standard paragraph with true first-line indent if originally indented
    paragraphs.push(
      new Paragraph({
        alignment: line.length < 80 && line.includes('г.') && (line.includes('«') || line.includes('"'))
          ? AlignmentType.BOTH
          : AlignmentType.LEFT,
        indent: hasIndent ? { firstLine: 708 } : undefined,
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
