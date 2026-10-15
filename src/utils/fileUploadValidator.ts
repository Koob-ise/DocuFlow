import JSZip from 'jszip';
import {
  extractTagsAndTextFromDocx,
  extractTagsFromText,
  extractTagsAndTextFromExcel
} from './tagExtractor';
import { DocumentFormat } from '../types';

export interface ExtractedTemplateItem {
  fileName: string;
  title: string;
  format: DocumentFormat;
  content: string;
  tags: string[];
  rawDocxBase64?: string;
  rawFileBase64?: string;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Allowed extensions: Word (.docx, .doc), Excel (.xlsx, .xlsm, .xls), Text (.txt)
const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.docx',
  '.doc',
  '.xlsx',
  '.xlsm',
  '.xls',
  '.txt',
];
const ALLOWED_ARCHIVE_EXTENSIONS = ['.zip'];

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
}

export function isAllowedDocument(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALLOWED_DOCUMENT_EXTENSIONS.includes(ext);
}

export function isAllowedArchive(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALLOWED_ARCHIVE_EXTENSIONS.includes(ext);
}

export function isSupportedUploadFile(filename: string): boolean {
  return isAllowedDocument(filename) || isAllowedArchive(filename);
}

/**
 * Validates a single file and extracts its template data.
 * Throws an error if the file format is disallowed (anti-file-dump check).
 */
export async function processSingleFile(file: File): Promise<ExtractedTemplateItem> {
  const ext = getFileExtension(file.name);

  if (!isAllowedDocument(file.name)) {
    throw new Error(
      `Файл "${file.name}" имеет недопустимый формат (${ext || 'без расширения'}). ` +
      `Разрешена загрузка ТОЛЬКО документов Word (.docx, .doc), таблиц Excel (.xlsx, .xlsm, .xls), текстовых файлов (.txt) или ZIP-архивов с шаблонами.`
    );
  }

  const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_]/g, ' ');

  if (ext === '.docx' || ext === '.doc') {
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const { tags, extractedText } = extractTagsAndTextFromDocx(buffer);
    return {
      fileName: file.name,
      title,
      format: 'docx',
      content: extractedText || `Документ ${file.name}`,
      tags,
      rawDocxBase64: base64,
      rawFileBase64: base64,
    };
  }

  if (ext === '.xlsx' || ext === '.xlsm' || ext === '.xls') {
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const { tags, extractedText } = extractTagsAndTextFromExcel(buffer);
    const fmt: DocumentFormat = ext === '.xlsm' ? 'xlsm' : ext === '.xls' ? 'xls' : 'xlsx';
    return {
      fileName: file.name,
      title,
      format: fmt,
      content: extractedText || `Таблица ${file.name}`,
      tags,
      rawFileBase64: base64,
    };
  }

  if (ext === '.txt') {
    const text = await file.text();
    const tags = extractTagsFromText(text);
    return {
      fileName: file.name,
      title,
      format: 'docx',
      content: text,
      tags,
    };
  }

  throw new Error(`Неподдерживаемый формат: ${ext}`);
}

/**
 * Extracts all valid Word (.docx), Excel (.xlsx, .xlsm, .xls) and text (.txt) documents from a ZIP archive.
 * Rejects disallowed files inside the archive.
 */
export async function processZipArchive(file: File): Promise<{
  items: ExtractedTemplateItem[];
  ignoredFilesCount: number;
}> {
  const zip = new JSZip();
  let zipContent: JSZip;

  try {
    const buffer = await file.arrayBuffer();
    zipContent = await zip.loadAsync(buffer);
  } catch (err) {
    throw new Error(`Не удалось открыть ZIP-архив "${file.name}". Возможно файл поврежден.`);
  }

  const items: ExtractedTemplateItem[] = [];
  let ignoredFilesCount = 0;

  for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
    // Skip directories and system hidden files (__MACOSX, .DS_Store, etc.)
    if (zipEntry.dir || relativePath.includes('__MACOSX') || relativePath.startsWith('.') || relativePath.includes('/.')) {
      continue;
    }

    const baseName = relativePath.split('/').pop() || relativePath;
    const ext = getFileExtension(baseName);

    if (ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
      const title = baseName.replace(/\.[^/.]+$/, '').replace(/[_]/g, ' ');

      if (ext === '.docx' || ext === '.doc') {
        const arrayBuffer = await zipEntry.async('arraybuffer');
        const base64 = arrayBufferToBase64(arrayBuffer);
        const { tags, extractedText } = extractTagsAndTextFromDocx(arrayBuffer);
        items.push({
          fileName: baseName,
          title,
          format: 'docx',
          content: extractedText || `Шаблон ${baseName}`,
          tags,
          rawDocxBase64: base64,
          rawFileBase64: base64,
        });
      } else if (ext === '.xlsx' || ext === '.xlsm' || ext === '.xls') {
        const arrayBuffer = await zipEntry.async('arraybuffer');
        const base64 = arrayBufferToBase64(arrayBuffer);
        const { tags, extractedText } = extractTagsAndTextFromExcel(arrayBuffer);
        const fmt: DocumentFormat = ext === '.xlsm' ? 'xlsm' : ext === '.xls' ? 'xls' : 'xlsx';
        items.push({
          fileName: baseName,
          title,
          format: fmt,
          content: extractedText || `Таблица ${baseName}`,
          tags,
          rawFileBase64: base64,
        });
      } else if (ext === '.txt') {
        const text = await zipEntry.async('string');
        const tags = extractTagsFromText(text);
        items.push({
          fileName: baseName,
          title,
          format: 'docx',
          content: text,
          tags,
        });
      }
    } else {
      ignoredFilesCount++;
    }
  }

  if (items.length === 0) {
    throw new Error(
      `В архиве "${file.name}" не найдено подходящих шаблонов. ` +
      `Архив должен содержать документы Word (.docx, .doc), таблицы Excel (.xlsx, .xlsm, .xls) или текстовые файлы (.txt). ` +
      `Использование системы как файлообменника запрещено.`
    );
  }

  return { items, ignoredFilesCount };
}

/**
 * Handles multiple files (e.g. from folder upload or multi-select).
 * Filters out disallowed file types and extracts all valid templates.
 */
export async function processMultipleFiles(files: File[]): Promise<{
  items: ExtractedTemplateItem[];
  rejectedFileNames: string[];
}> {
  const items: ExtractedTemplateItem[] = [];
  const rejectedFileNames: string[] = [];

  for (const file of files) {
    // If it's a zip
    if (isAllowedArchive(file.name)) {
      try {
        const zipResult = await processZipArchive(file);
        items.push(...zipResult.items);
      } catch (err: any) {
        rejectedFileNames.push(`${file.name} (${err.message})`);
      }
      continue;
    }

    // If it's allowed document
    if (isAllowedDocument(file.name)) {
      try {
        const item = await processSingleFile(file);
        items.push(item);
      } catch (err: any) {
        rejectedFileNames.push(`${file.name} (${err.message})`);
      }
    } else {
      rejectedFileNames.push(file.name);
    }
  }

  return { items, rejectedFileNames };
}
