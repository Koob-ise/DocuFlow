import { FilledDocument } from '../types';

/**
 * Extracts a clean "Surname_Initials" from a full name or company string.
 * Examples:
 * - "Иванов И.И." -> "Иванов_ИИ"
 * - "Иванов Иван Иванович" -> "Иванов_ИИ"
 * - "Петров П. П." -> "Петров_ПП"
 * - "ООО \"Цифровой Консалтинг\"" -> "Цифровой_Консалтинг"
 */
export function formatPersonInitials(nameStr?: string): string {
  if (!nameStr || !nameStr.trim()) return '';

  const cleaned = nameStr.trim().replace(/['"«»]/g, '');

  // Check if it's a company with OOO / IP
  if (/^(ООО|ИП|АО|ЗАО|ПАО)\s+/i.test(cleaned)) {
    return cleaned
      .replace(/^(ООО|ИП|АО|ЗАО|ПАО)\s+/i, '')
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Check pattern: "Фамилия И.О." or "Фамилия И. О." or "Фамилия И.В."
  const initialsMatch = cleaned.match(/^([А-ЯЁа-яёA-Za-z]+)\s+([А-ЯЁA-Z])\.?\s*([А-ЯЁA-Z])?\.?$/);
  if (initialsMatch) {
    const surname = initialsMatch[1];
    const firstInitial = initialsMatch[2] || '';
    const secondInitial = initialsMatch[3] || '';
    return `${surname}_${firstInitial}${secondInitial}`;
  }

  // Check pattern: "Иванов Иван Иванович" (3 words)
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const surname = parts[0];
    const firstInitial = parts[1].charAt(0).toUpperCase();
    const secondInitial = parts[2] ? parts[2].charAt(0).toUpperCase() : '';
    return `${surname}_${firstInitial}${secondInitial}`;
  }

  return cleaned.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').replace(/_+/g, '_');
}

/**
 * Derives a concise, clear document type tag from template title.
 */
export function getDocumentTypePrefix(title: string, format: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('договор')) return 'Договор';
  if (lower.includes('акт')) return 'Акт';
  if (lower.includes('0310001') || lower.includes('пко') || lower.includes('кассов')) return 'ПКО_0310001';
  if (lower.includes('записка') || lower.includes('тз')) return 'ТЗ_Записка';
  if (format === 'xlsx') return 'Отчет_XLS';
  return 'Документ';
}

/**
 * Extracts the primary client/customer name from filled data.
 * Checks client fields first (client_name, client_fio, customer, buyer, client, full_name, fio, etc.),
 * falling back to responsible only if no client is specified.
 */
export function extractClientOrPersonName(data?: Record<string, string>): string {
  if (!data) return '';
  const client =
    data.client_name ||
    data.client_fio ||
    data.customer ||
    data.buyer ||
    data.payer ||
    data.client ||
    data.full_name ||
    data.fio ||
    data.client_initials;

  if (client && client.trim()) {
    return client.trim();
  }

  return (data.responsible || '').trim();
}

/**
 * Sanitizes a string component for safe use in file and ZIP archive names,
 * removing illegal filesystem characters: \ / : * ? " < > |
 */
export function sanitizeFilenamePart(str: string): string {
  if (!str) return '';
  return str.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_').trim();
}

/**
 * Builds a clear, professional file name for an individual document:
 * e.g., "Договор_№001_Иванов_ИИ.docx"
 */
export function getFormattedFileName(doc: FilledDocument, ext: string): string {
  const docType = sanitizeFilenamePart(getDocumentTypePrefix(doc.title, doc.format));
  const rawNum = doc.filledData?.doc_number?.trim() || doc.version || '001';
  const docNum = sanitizeFilenamePart(rawNum);
  const clientName = extractClientOrPersonName(doc.filledData);
  const person = sanitizeFilenamePart(formatPersonInitials(clientName));

  const parts = [docType, `№${docNum}`];
  if (person) parts.push(person);

  const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
  return `${parts.join('_')}.${cleanExt}`;
}

/**
 * Builds a clear archive name for the whole package:
 * e.g., "Документы_№001_Иванов_ИИ.zip" or "Документы_№001_Иванов_ИИ_PDF.zip"
 */
export function getArchiveFileName(
  documents: FilledDocument[],
  suffix: 'Original' | 'PDF' = 'Original'
): string {
  if (documents.length === 0) {
    return suffix === 'PDF' ? 'Dokumenty_PDF.zip' : 'Dokumenty.zip';
  }

  // Gather unique document numbers
  const docNumbers = Array.from(
    new Set(
      documents
        .map((d) => sanitizeFilenamePart(d.filledData?.doc_number?.trim() || d.version || ''))
        .filter(Boolean)
    )
  );

  // Get primary client/person
  const clientName = extractClientOrPersonName(documents[0]?.filledData);
  const primaryPerson = sanitizeFilenamePart(formatPersonInitials(clientName));

  const numPart = docNumbers.length > 0 ? `№${docNumbers.join('_№')}` : '';

  const parts = ['Документы'];
  if (numPart) parts.push(numPart);
  if (primaryPerson) parts.push(primaryPerson);
  if (suffix === 'PDF') parts.push('PDF');

  return `${parts.join('_')}.zip`;
}
