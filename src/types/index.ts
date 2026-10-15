export type DocumentFormat = 'docx' | 'xlsx' | 'xlsm' | 'xls';

export interface TagDefinition {
  tag: string;              // e.g. "target", "target1", "doc_number"
  label: string;            // Human-readable title: "Цель / Предмет договора"
  type: 'text' | 'textarea' | 'date' | 'number' | 'currency' | 'select';
  category?: 'Реквизиты' | 'Цели и описание' | 'Финансы' | 'Даты и номера' | 'Заказчик' | 'Исполнитель' | 'Пользовательские' | string;
  placeholder?: string;
  defaultValue: string;
  options?: string[];       // for select type
  description?: string;
}

export interface DocTemplate {
  id: string;
  title: string;
  format: DocumentFormat;
  version: string;          // e.g. "003", "006", "0310001", "custom"
  category: string;
  description: string;
  tags: string[];           // array of tags used: ["target", "target1", ...]
  content: string;          // Rich text / markdown / template markup with {tag}
  rawDocxBase64?: string;   // optional base64 of original binary docx
  rawFileBase64?: string;   // optional base64 of original binary docx / xlsx / xlsm / xls
  isCustom?: boolean;
  createdAt: string;
  badge?: string;
}

export interface FilledDocument {
  id: string;
  templateId: string;
  title: string;
  format: DocumentFormat;
  version: string;
  renderedHtml: string;
  rawText: string;
  filledData: Record<string, string>;
  generatedBlob?: Blob;
  rawDocxBase64?: string;
  rawFileBase64?: string;
}

export interface DocumentPackage {
  id: string;
  title: string;              // e.g. "Иванов И.И. • Договор № 003"
  personName: string;         // e.g. "Иванов И.И."
  docNumber: string;          // e.g. "003"
  docDate: string;            // e.g. "20.09.2026"
  createdAt: string;          // e.g. "2026-10-11T17:05:00.000Z"
  documents: FilledDocument[];
}

export type AppStep = 'select' | 'fill' | 'results' | 'archive';
