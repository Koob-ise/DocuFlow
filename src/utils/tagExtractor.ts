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
 * Extracts all runs and text elements from a single Word paragraph.
 */
function extractParagraphRuns(p: Element): string {
  let text = '';
  // Check if paragraph has first-line indent (e.g. standard Russian 1.25cm = ~708 dxa)
  const pPr = p.getElementsByTagName('w:pPr')[0];
  if (pPr) {
    const ind = pPr.getElementsByTagName('w:ind')[0];
    if (ind) {
      const firstLine = parseInt(ind.getAttribute('w:firstLine') || '0', 10);
      if (firstLine >= 300) {
        text += '\t';
      }
    }
  }

  // Iterate over child nodes in order to keep text, tabs and linebreaks aligned
  for (let i = 0; i < p.childNodes.length; i++) {
    const child = p.childNodes[i];
    const name = child.nodeName;

    if (name === 'w:r') {
      for (let j = 0; j < child.childNodes.length; j++) {
        const rChild = child.childNodes[j];
        const rName = rChild.nodeName;
        if (rName === 'w:t') {
          text += rChild.textContent || '';
        } else if (rName === 'w:tab') {
          text += '\t';
        } else if (rName === 'w:br' || rName === 'w:cr') {
          text += '\n';
        } else if (rName === 'w:noBreakHyphen') {
          text += '-';
        }
      }
    } else if (name === 'w:hyperlink') {
      const runs = (child as Element).getElementsByTagName('w:r');
      for (let j = 0; j < runs.length; j++) {
        const ts = runs[j].getElementsByTagName('w:t');
        for (let k = 0; k < ts.length; k++) {
          text += ts[k].textContent || '';
        }
      }
    } else if (name === 'w:sdt') {
      const sdtContent = (child as Element).getElementsByTagName('w:sdtContent')[0];
      if (sdtContent) {
        const runs = sdtContent.getElementsByTagName('w:r');
        for (let j = 0; j < runs.length; j++) {
          const ts = runs[j].getElementsByTagName('w:t');
          for (let k = 0; k < ts.length; k++) {
            text += ts[k].textContent || '';
          }
        }
      }
    }
  }

  return text;
}

/**
 * Traverses a Word body element, preserving tables, rows, columns, and paragraphs.
 */
function extractTextFromWordXmlDom(body: Element): string {
  let output = '';

  for (let i = 0; i < body.childNodes.length; i++) {
    const node = body.childNodes[i];
    const name = node.nodeName;

    if (name === 'w:tbl') {
      const rows = (node as Element).getElementsByTagName('w:tr');
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const cells = (row as Element).getElementsByTagName('w:tc');
        const cellValues: string[] = [];
        for (let c = 0; c < cells.length; c++) {
          const cell = cells[c];
          const ps = cell.getElementsByTagName('w:p');
          const cellPs: string[] = [];
          for (let p = 0; p < ps.length; p++) {
            const pStr = extractParagraphRuns(ps[p]).trim();
            if (pStr) cellPs.push(pStr);
          }
          cellValues.push(cellPs.join(' '));
        }
        if (cellValues.some((v) => v.length > 0)) {
          output += cellValues.join('\t') + '\n';
        }
      }
      output += '\n';
    } else if (name === 'w:p') {
      const pText = extractParagraphRuns(node as Element);
      output += pText + '\n';
    } else if (name === 'w:sdt') {
      const sdtContent = (node as Element).getElementsByTagName('w:sdtContent')[0];
      if (sdtContent) {
        output += extractTextFromWordXmlDom(sdtContent) + '\n';
      }
    }
  }

  return output;
}

/**
 * Fallback regex extractor that preserves tabs, linebreaks, and table rows.
 */
function extractDocxTextWithRegex(documentXml: string): string {
  let res = documentXml;
  res = res
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\/>|<w:cr\/>/g, '\n')
    .replace(/<w:noBreakHyphen\/>/g, '-')
    .replace(/<w:softHyphen\/>/g, '')
    .replace(/<\/w:tc>\s*<w:tc[^>]*>/g, '\t')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<w:pPr>[^<]*<w:ind[^>]*w:firstLine="([3-9]\d{2,}|\d{4,})"[^>]*>[^<]*<\/w:pPr>/g, '\t')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  return res;
}

/**
 * Extracts text and tags from a .docx binary ArrayBuffer.
 * Handles cases where MS Word separates text runs like <w:t>{</w:t><w:t>tag</w:t><w:t>}</w:t>,
 * while strictly preserving indents, tabs, line breaks, and table columns.
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

    let extractedText = '';

    // If DOMParser is available (browser environment)
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(documentXml, 'application/xml');
        const body = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.documentElement;
        if (body) {
          extractedText = extractTextFromWordXmlDom(body);
        }
      } catch (err) {
        console.warn('DOMParser failed on docx, using regex fallback:', err);
      }
    }

    if (!extractedText) {
      extractedText = extractDocxTextWithRegex(documentXml);
    }

    // Clean up common XML run/drop-down break artifacts:
    extractedText = extractedText
      .replace(/\(\s*-\s*\n\s*([а-яёa-z]+)\s*\n\s*\)/gi, '(-$1)')
      .replace(/\n\s*электронно\s*\n/gi, ' электронно ')
      .replace(/\n\s*и\s+или\s*\n/gi, ' и/или ')
      .replace(/\n\s*и\/или\s*\n/gi, ' и/или ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Tags might be in full XML as <w:t>{tag}</w:t> or in extracted text
    const directTags = extractTagsFromText(extractedText);
    const xmlTags = extractTagsFromText(fullXml);
    const combined = Array.from(new Set([...directTags, ...xmlTags]));

    return {
      tags: combined,
      extractedText,
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
