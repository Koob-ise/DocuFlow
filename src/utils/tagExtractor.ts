import PizZip from 'pizzip';

/**
 * Extracts all unique placeholder tags in format {tag_name} from raw text or XML.
 */
export function extractTagsFromText(text: string): string[] {
  if (!text) return [];
  const regex = /\{([a-zA-Z0-9_\u0400-\u04FF]+)\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      matches.add(match[1].trim());
    }
  }
  return Array.from(matches);
}

/**
 * Extracts text and tags from a .docx binary ArrayBuffer.
 * Handles cases where MS Word separates text runs like <w:t>{</w:t><w:t>tag</w:t><w:t>}</w:t>.
 */
export function extractTagsAndTextFromDocx(arrayBuffer: ArrayBuffer): {
  tags: string[];
  extractedText: string;
} {
  try {
    const zip = new PizZip(arrayBuffer);
    const documentXml = zip.files['word/document.xml']?.asText() || '';
    
    // Also check header and footer files if available
    const headerFooterXmls = Object.keys(zip.files)
      .filter((name) => name.startsWith('word/header') || name.startsWith('word/footer'))
      .map((name) => zip.files[name]?.asText() || '')
      .join(' ');

    const fullXml = documentXml + ' ' + headerFooterXmls;

    // Convert XML to plaintext by stripping XML tags, but preserve paragraphs
    const cleanedText = documentXml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<\/w:tr>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');

    // Tags might be in full XML as <w:t>{tag}</w:t> or separated
    // First extract direct matches in cleanedText:
    const directTags = extractTagsFromText(cleanedText);

    // Also look for tags in XML where formatting tags might have been stripped
    const xmlTags = extractTagsFromText(fullXml);
    const combined = Array.from(new Set([...directTags, ...xmlTags]));

    return {
      tags: combined,
      extractedText: cleanedText.trim()
    };
  } catch (error) {
    console.error('Error extracting tags from docx:', error);
    return { tags: [], extractedText: '' };
  }
}

/**
 * Extracts tags and readable cell contents from Excel files (.xlsx, .xlsm, .xls).
 */
export function extractTagsAndTextFromExcel(arrayBuffer: ArrayBuffer): {
  tags: string[];
  extractedText: string;
} {
  try {
    const zip = new PizZip(arrayBuffer);
    const sharedStrings = zip.files['xl/sharedStrings.xml']?.asText() || '';
    const worksheetXmls = Object.keys(zip.files)
      .filter((name) => name.startsWith('xl/worksheets/'))
      .map((name) => zip.files[name]?.asText() || '')
      .join(' ');

    const fullXml = sharedStrings + ' ' + worksheetXmls;
    const directTags = extractTagsFromText(fullXml);

    // Extract text values from shared strings <t>...</t>
    const strings: string[] = [];
    const tRegex = /<t[^>]*>(.*?)<\/t>/gs;
    let m;
    while ((m = tRegex.exec(sharedStrings)) !== null) {
      if (m[1]) {
        const clean = m[1].replace(/<[^>]+>/g, '').trim();
        if (clean) strings.push(clean);
      }
    }

    return {
      tags: directTags,
      extractedText: strings.slice(0, 100).join('\n') || 'Таблица Excel (XLSX / XLSM)',
    };
  } catch (error) {
    // If binary .xls (BIFF format)
    try {
      const decoder = new TextDecoder('windows-1251', { fatal: false });
      const sample = arrayBuffer.byteLength > 500000 ? arrayBuffer.slice(0, 500000) : arrayBuffer;
      const str = decoder.decode(sample);
      const tags = extractTagsFromText(str);
      return {
        tags,
        extractedText: 'Документ Excel (.xls)',
      };
    } catch {
      return { tags: [], extractedText: 'Таблица Excel' };
    }
  }
}

/**
 * Generates an intuitive human-readable Russian label for a tag name if not already defined.
 */
export function guessLabelForTag(tag: string): string {
  const map: Record<string, string> = {
    doc_number: 'Номер документа',
    doc_date: 'Дата документа',
    company: 'Организация / Исполнитель',
    client_name: 'Организация Заказчика',
    client_fio: 'ФИО представителя Заказчика',
    client_position: 'Должность Заказчика',
    client_basis: 'Действует на основании (Заказчик)',
    client_inn: 'ИНН Заказчика',
    client_address: 'Адрес Заказчика',
    start_date: 'Срок начала работ',
    end_date: 'Срок окончания работ',
    inn: 'ИНН организации',
    kpp: 'КПП',
    ogrn: 'ОГРН',
    okved: 'Коды ОКВЭД',
    sum: 'Сумма (числом, руб.)',
    sum_words: 'Сумма прописью',
    responsible: 'ФИО Исполнителя / Подписант',
    position: 'Должность Исполнителя',
    city: 'Город',
    address: 'Юридический адрес',
    phone: 'Контактный телефон',
    email: 'Электронная почта',
    basis: 'Основание документа',
    notes: 'Примечание / Приложение',
  };

  if (map[tag]) return map[tag];

  // If starts with target e.g. target3
  if (/^target\d+$/i.test(tag)) {
    const num = tag.replace(/\D/g, '');
    return `Поле цели / Этап №${num} (${tag})`;
  }

  // Capitalize and format snake_case or camelCase
  return tag
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
