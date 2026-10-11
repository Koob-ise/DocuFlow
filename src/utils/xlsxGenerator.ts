import ExcelJS from 'exceljs';

/**
 * Generates a unified Russian Primary Document Form KO-1 (OKUD 0310001)
 * or a tabular specification in native Excel (.xlsx) format with styling.
 */
export async function generateExcelDocument(
  templateTitle: string,
  data: Record<string, string>
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DocuFlow System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('КО-1 (0310001)', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });

  // Set column widths
  sheet.columns = [
    { width: 14 }, // A
    { width: 16 }, // B
    { width: 14 }, // C
    { width: 14 }, // D
    { width: 16 }, // E
    { width: 18 }, // F
    { width: 2 },  // G separator
    { width: 28 }, // H receipt column
    { width: 20 }, // I
  ];

  // Helper styles
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  const centerBold: Partial<ExcelJS.Style> = {
    font: { name: 'Arial', size: 9, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };

  // Header row
  sheet.mergeCells('A1:E1');
  const orgCell = sheet.getCell('A1');
  orgCell.value = data.company || 'ООО "Компания"';
  orgCell.font = { name: 'Arial', size: 10, bold: true };
  sheet.getCell('A2').value = `ИНН: ${data.inn || '7701234567'} | ОКВЭД: ${data.okved || '62.01'}`;
  sheet.getCell('A2').font = { name: 'Arial', size: 8, italic: true };

  sheet.getCell('E1').value = 'Унифицированная форма № КО-1';
  sheet.getCell('E1').font = { name: 'Arial', size: 8 };
  sheet.getCell('E2').value = 'Код по ОКУД: 0310001';
  sheet.getCell('E2').font = { name: 'Arial', size: 8, bold: true };

  // Receipt right header
  sheet.mergeCells('H1:I1');
  const receiptTitle = sheet.getCell('H1');
  receiptTitle.value = 'КВИТАНЦИЯ к ПКО';
  receiptTitle.font = { name: 'Arial', size: 10, bold: true };
  receiptTitle.alignment = { horizontal: 'center' };

  // Document Title
  sheet.mergeCells('A4:F4');
  const titleCell = sheet.getCell('A4');
  titleCell.value = `ПРИХОДНЫЙ КАССОВЫЙ ОРДЕР № ${data.doc_number || '1'}`;
  titleCell.font = { name: 'Arial', size: 12, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A5:F5');
  const dateCell = sheet.getCell('A5');
  dateCell.value = data.doc_date ? `от «${data.doc_date}» года` : '';
  dateCell.font = { name: 'Arial', size: 10, bold: true };
  dateCell.alignment = { horizontal: 'center' };

  // Table Headers
  const tableHeaders = [
    'Корр. счет',
    'Код подразд.',
    'Код аналит.',
    'Сумма, руб.',
    'Код цел. назн.',
    'Примечание',
  ];

  tableHeaders.forEach((th, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    const cell = sheet.getCell(`${colLetter}7`);
    cell.value = th;
    cell.font = { name: 'Arial', size: 8, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  });

  // Calculate clean numeric amount and words (prioritizing advance_sum, then sum)
  const rawSum = data.advance_sum || data.sum || '0';
  const numericSum = parseFloat(String(rawSum).replace(/\s/g, '').replace(',', '.')) || 0;
  const wordsSum = data.advance_sum_words || data.sum_words || `${numericSum} руб. 00 коп.`;

  // Table Data Row
  const row8Values = [
    '50.01',
    '01',
    data.okved || '31.02',
    numericSum,
    data.version || '1.0',
    data.basis || (data.doc_number ? `Договор № ${data.doc_number}` : 'Оплата по договору'),
  ];

  row8Values.forEach((val, idx) => {
    const colLetter = String.fromCharCode(65 + idx);
    const cell = sheet.getCell(`${colLetter}8`);
    cell.value = val;
    cell.font = { name: 'Arial', size: 9 };
    cell.alignment = { horizontal: idx === 3 ? 'right' : 'center', vertical: 'middle' };
    cell.border = thinBorder;
    if (idx === 3) {
      cell.numFmt = '#,##0.00';
    }
  });

  // Details section
  sheet.getCell('A10').value = 'Принято от:';
  sheet.getCell('A10').font = { name: 'Arial', size: 9, bold: true };
  sheet.mergeCells('B10:F10');
  const payerDisplay = data.client_fio
    ? `${data.client_name || ''} (${data.client_position ? data.client_position + ' ' : ''}${data.client_fio})`
    : (data.client_name || data.client_fio || '');
  sheet.getCell('B10').value = payerDisplay;
  sheet.getCell('B10').font = { name: 'Arial', size: 9 };
  sheet.getCell('B10').border = { bottom: { style: 'thin' } };

  sheet.getCell('A11').value = 'Основание:';
  sheet.getCell('A11').font = { name: 'Arial', size: 9, bold: true };
  sheet.mergeCells('B11:F11');
  sheet.getCell('B11').value = data.basis || (data.doc_number ? `Договор № ${data.doc_number}` : 'Оплата по договору');
  sheet.getCell('B11').font = { name: 'Arial', size: 9 };
  sheet.getCell('B11').border = { bottom: { style: 'thin' } };

  sheet.getCell('A12').value = 'В том числе:';
  sheet.getCell('A12').font = { name: 'Arial', size: 9, bold: true };
  sheet.mergeCells('B12:F12');
  sheet.getCell('B12').value = 'НДС не облагается (специальный налоговый режим)';
  sheet.getCell('B12').font = { name: 'Arial', size: 9 };
  sheet.getCell('B12').border = { bottom: { style: 'thin' } };

  sheet.getCell('A13').value = 'Сумма прописью:';
  sheet.getCell('A13').font = { name: 'Arial', size: 9, bold: true };
  sheet.mergeCells('B13:F13');
  sheet.getCell('B13').value = wordsSum;
  sheet.getCell('B13').font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell('B13').border = { bottom: { style: 'thin' } };

  // Signatures left
  sheet.getCell('A15').value = `Руководитель: ${data.position || 'Индивидуальный предприниматель'}`;
  sheet.getCell('A15').font = { name: 'Arial', size: 8 };
  sheet.mergeCells('C15:D15');
  sheet.getCell('C15').value = '___________________';
  sheet.getCell('E15').value = data.responsible || 'Иванов И.И.';
  sheet.getCell('E15').font = { name: 'Arial', size: 8, bold: true };

  sheet.getCell('A16').value = 'Главный бухгалтер:';
  sheet.getCell('A16').font = { name: 'Arial', size: 8 };
  sheet.mergeCells('C16:D16');
  sheet.getCell('C16').value = '___________________';
  sheet.getCell('E16').value = '';
  sheet.getCell('E16').font = { name: 'Arial', size: 8 };

  sheet.getCell('A17').value = 'Кассир:';
  sheet.getCell('A17').font = { name: 'Arial', size: 8 };
  sheet.mergeCells('C17:D17');
  sheet.getCell('C17').value = '___________________';
  sheet.getCell('E17').value = '';
  sheet.getCell('E17').font = { name: 'Arial', size: 8 };

  // Receipt details right side (Columns H-I)
  sheet.getCell('H3').value = `Организация: ${data.company || 'ООО "Компания"'}`;
  sheet.getCell('H3').font = { name: 'Arial', size: 8 };
  sheet.getCell('H4').value = `Квитанция к ПКО № ${data.doc_number || '1'}`;
  sheet.getCell('H4').font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell('H5').value = data.doc_date ? `от ${data.doc_date}` : '';
  sheet.getCell('H5').font = { name: 'Arial', size: 8 };
  sheet.getCell('H7').value = `Принято: ${payerDisplay}`;
  sheet.getCell('H7').font = { name: 'Arial', size: 8 };
  sheet.getCell('H9').value = `Основание: ${data.basis || (data.doc_number ? `Договор № ${data.doc_number}` : 'Оплата по договору')}`;
  sheet.getCell('H9').font = { name: 'Arial', size: 8 };
  sheet.getCell('H11').value = `Сумма: ${numericSum.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} руб.`;
  sheet.getCell('H11').font = { name: 'Arial', size: 9, bold: true };
  sheet.getCell('H13').value = `Сумма прописью: ${wordsSum}`;
  sheet.getCell('H13').font = { name: 'Arial', size: 7, italic: true };
  sheet.getCell('H15').value = 'М.П.  Кассир: __________________';
  sheet.getCell('H15').font = { name: 'Arial', size: 8 };
  sheet.getCell('H15').value = 'М.П.  Кассир: __________________';
  sheet.getCell('H15').font = { name: 'Arial', size: 8 };

  // Generate buffer and convert to Blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
