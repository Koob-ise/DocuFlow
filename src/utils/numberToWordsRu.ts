/**
 * Converts a number or numeric string to Russian words with rubles and kopecks.
 * e.g., 150000 -> "Сто пятьдесят тысяч рублей 00 копеек"
 */
export function numberToWordsRu(numStr: string | number): string {
  const num = typeof numStr === 'string' ? parseFloat(numStr.replace(/\s+/g, '').replace(',', '.')) : numStr;
  if (isNaN(num)) return '';

  const units = [
    ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'],
    ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
  ];

  const teens = [
    'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
    'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'
  ];

  const tens = [
    '', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят',
    'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'
  ];

  const hundreds = [
    '', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот',
    'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'
  ];

  const orders = [
    { gender: 0, forms: ['рубль', 'рубля', 'рублей'] },
    { gender: 1, forms: ['тысяча', 'тысячи', 'тысяч'] },
    { gender: 0, forms: ['миллион', 'миллиона', 'миллионов'] },
    { gender: 0, forms: ['миллиард', 'миллиарда', 'миллиардов'] },
    { gender: 0, forms: ['триллион', 'триллиона', 'триллионов'] }
  ];

  function getPlural(n: number, forms: string[]): string {
    const n100 = Math.abs(n) % 100;
    const n10 = n100 % 10;
    if (n100 > 10 && n100 < 20) return forms[2];
    if (n10 > 1 && n10 < 5) return forms[1];
    if (n10 === 1) return forms[0];
    return forms[2];
  }

  const isNegative = num < 0;
  let integerPart = Math.floor(Math.abs(num));
  let kopecks = Math.round((Math.abs(num) - Math.floor(Math.abs(num))) * 100);

  if (kopecks === 100) {
    integerPart += 1;
    kopecks = 0;
  }

  const kopStr = kopecks.toString().padStart(2, '0');
  const kopPlural = getPlural(kopecks, ['копейка', 'копейки', 'копеек']);

  if (integerPart === 0) {
    const prefix = isNegative ? 'Минус ' : '';
    return `${prefix}Ноль рублей ${kopStr} ${kopPlural}`;
  }

  let rest = integerPart;
  const parts: string[] = [];
  let orderIndex = 0;

  while (rest > 0 && orderIndex < orders.length) {
    const chunk = rest % 1000;
    rest = Math.floor(rest / 1000);

    if (chunk > 0) {
      const order = orders[orderIndex];
      const h = Math.floor(chunk / 100);
      const t = Math.floor((chunk % 100) / 10);
      const u = chunk % 10;

      const chunkWords: string[] = [];
      if (h > 0) chunkWords.push(hundreds[h]);

      if (t === 1) {
        chunkWords.push(teens[u]);
      } else {
        if (t > 1) chunkWords.push(tens[t]);
        if (u > 0) chunkWords.push(units[order.gender][u]);
      }

      chunkWords.push(getPlural(chunk, order.forms));
      parts.unshift(chunkWords.join(' '));
    } else if (orderIndex === 0) {
      parts.unshift(getPlural(0, orders[0].forms));
    }

    orderIndex++;
  }

  let result = parts.join(' ').trim();
  result = result.charAt(0).toUpperCase() + result.slice(1);
  const prefix = isNegative ? 'Минус ' : '';

  return `${prefix}${result} ${kopStr} ${kopPlural}`;
}
