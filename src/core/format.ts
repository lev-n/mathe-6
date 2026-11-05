/**
 * German school notation (docs/research.md T10, T11):
 * - money always with two decimals '3,40 €', or mixed '3 € 40 ct'; lengths '2 m 15 cm', '1,20 m'; quantities 'number + space + unit'
 * - groups of three with a thin space from 5 digits ('1000', '2500 m', '12 500', '1 250 000'); clock times '13.50 Uhr'
 * - operators + − · : and the placeholder □; minus as U+2212, negatives after an operator in brackets: 5 − (−3)
 * - points as P(3 | 5), angles as 90°, temperatures as −3 °C, percent as 25 %
 * - fractions stacked, written in text as {frac:3/4} or {frac:1 3/4} (frac()): the UI draws them, speech says 'drei Viertel'; never 3/4
 */

/** No-break space between number and unit. */
export const NBSP = '\u00A0';
/** Between the groups of a large number: narrow, and a line never breaks there. */
export const THIN = '\u202F';

export const MINUS = '\u2212';
export const TIMES = '\u00B7';
export const DIV = ':';
export const BOX = '\u25A1';
export const APPROX = '\u2248';

/** Unit symbols in text, longest first where one starts another. */
const UNIT_PATTERN = '%|€|ct|mm²|cm²|dm²|km²|m²|mm³|cm³|dm³|m³|mm|cm|dm|km|m|kg|mg|g|t|ml|hl|l|min|h|s|ha|a|°C';

/**
 * For showing a task: a line break never falls inside '9 · 2' or '56 : 7', between '□ Rest □', just before '= □', between a
 * number and its unit (NBSP instead of the spaces, so it never splits up what the child reads as one piece), or inside P(3 | 5)
 * (a browser may break after '|': a word joiner stops it).
 */
export function keepTermsTogether(text: string): string {
  return text
    .replace(/\|/g, '|\u2060')
    .replace(new RegExp(` ([${TIMES}${DIV}]) `, 'g'), `${NBSP}$1${NBSP}`)
    .replace(/ Rest /g, `${NBSP}Rest${NBSP}`)
    .replace(new RegExp(` = ${BOX}`, 'g'), `${NBSP}=${NBSP}${BOX}`)
    .replace(new RegExp(`([\\d½¼¾${BOX}]) (${UNIT_PATTERN}|Uhr)(?=[\\s.,;:?!)]|$)`, 'g'), `$1${NBSP}$2`);
}

/** Thin-space groups from 5 digits (T10): '12500' → '12 500', '2500' stays. */
function groupDigits(digits: string): string {
  return digits.length < 5 ? digits : digits.replace(/\B(?=(\d{3})+$)/g, THIN);
}

/**
 * A number as it is written: fmt(2500) → '2500', fmt(12500) → '12 500', fmt(-3) → '−3', fmt(1.7) → '1,7', fmt(2.5, 2) → '2,50'.
 * @param decimals fixed number of decimal places (default: as needed, at most 3)
 */
export function fmt(n: number, decimals?: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`fmt: not a finite number: ${n}`);
  const abs = Math.abs(n);
  const text = decimals !== undefined ? abs.toFixed(decimals) : String(Math.round(abs * 1000) / 1000);
  const [int, frac] = text.split('.');
  const shown = groupDigits(int) + (frac !== undefined ? `,${frac}` : '');
  return (n < 0 ? MINUS : '') + shown;
}

/** A term's negative number after an operator (T10): fmtSigned(-3) → '(−3)', fmtSigned(3) → '3'. */
export function fmtSigned(n: number): string {
  return n < 0 ? `(${fmt(n)})` : fmt(n);
}

/** A point (T11): fmtPoint('P', 3, 5) → 'P(3 | 5)', fmtPoint('A', -2, 3) → 'A(−2 | 3)'; no-break spaces, so it stays on one line. */
export function fmtPoint(name: string, x: number, y: number): string {
  return `${name}(${fmt(x)}${NBSP}|${NBSP}${fmt(y)})`;
}

/** A share (T10): fmtPercent(25) → '25 %', fmtPercent(12.5) → '12,5 %'. */
export function fmtPercent(value: number): string {
  return `${fmt(value)}${NBSP}%`;
}

/** An angle (T10): fmtAngle(90) → '90°'. */
export function fmtAngle(degrees: number): string {
  return `${fmt(degrees)}°`;
}

/** A temperature (T10): fmtTemp(-3) → '−3 °C'. */
export function fmtTemp(value: number): string {
  return `${fmt(value)}${NBSP}°C`;
}

// ─── Fractions in text ───────────────────────────────────────────────────────

/** frac(3, 4) → '{frac:3/4}', frac(3, 4, 1) → '{frac:1 3/4}'. The token the UI draws stacked and the voice says as 'drei Viertel'. */
export function frac(numerator: number, denominator: number, whole?: number): string {
  return `{frac:${whole !== undefined ? `${whole} ` : ''}${numerator}/${denominator}}`;
}

/** A fraction token in a text. */
export const FRAC_TOKEN = /\{frac:(?:(\d+) )?(\d+)\/(\d+)\}/g;

export type MathPart = { text: string } | { whole?: string; numerator: string; denominator: string };

/** A text cut into plain parts and fractions, for drawing (src/ui/app/MathText.tsx). */
export function mathParts(text: string): MathPart[] {
  const out: MathPart[] = [];
  let at = 0;
  for (const m of text.matchAll(FRAC_TOKEN)) {
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ ...(m[1] !== undefined ? { whole: m[1] } : {}), numerator: m[2], denominator: m[3] });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

/** A text for the places that cannot draw a fraction (titles, aria texts): {frac:3/4} as 'drei Viertel'. */
export function fractionsAsWords(text: string): string {
  return text.replace(FRAC_TOKEN, (_all, whole: string | undefined, n: string, d: string) => fractionWords(Number(n), Number(d), whole === undefined ? undefined : Number(whole)));
}

/** The name of the parts: 'Viertel', 'Zwölftel', 'Hundertstel'. */
function denominatorWord(d: number): string {
  if (d === 1) return 'Ganze';
  if (d === 2) return 'Halbe';
  if (d === 3) return 'Drittel';
  if (d === 7) return 'Siebtel';
  if (d === 8) return 'Achtel';
  const stem = numberWord(d).replace(/^ein(?=hundert|tausend)/, '');
  const word = d < 20 ? `${stem}tel` : `${stem}stel`;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** T16: fractionWords(3, 4) → 'drei Viertel', (1, 2) → 'ein Halb', (1, 4, 2) → 'zwei Ganze und ein Viertel'. */
export function fractionWords(n: number, d: number, whole?: number): string {
  const part = n === 1 ? (d === 2 ? 'ein Halb' : `ein ${denominatorWord(d)}`) : `${numberWord(n)} ${denominatorWord(d)}`;
  if (whole === undefined) return part;
  return `${whole === 1 ? 'ein Ganzes' : `${numberWord(whole)} Ganze`} und ${part}`;
}

/** Money from Cent with the comma, always two decimals (T10): fmtMoney(340) → '3,40 €', fmtMoney(305) → '3,05 €' */
export function fmtMoney(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new RangeError(`fmtMoney: cents must be a whole number ≥ 0: ${cents}`);
  return `${fmt(cents / 100, 2)}${NBSP}€`;
}

/**
 * A quantity in two units (T10): fmtMixed(35, 10, 'cm', 'mm') → '3 cm 5 mm', fmtMixed(2500, 1000, 'km', 'm') → '2 km 500 m',
 * fmtMixed(2300, 1000, 'kg', 'g') → '2 kg 300 g', fmtMixed(80, 60, 'min', 's') → '1 min 20 s'. A zero part stays out.
 */
export function fmtMixed(value: number, perLarge: number, large: string, small: string): string {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`fmtMixed: value must be a whole number ≥ 0: ${value}`);
  const big = Math.floor(value / perLarge);
  const rest = value % perLarge;
  if (big === 0) return `${rest}${NBSP}${small}`;
  return rest === 0 ? `${big}${NBSP}${large}` : `${big}${NBSP}${large} ${rest}${NBSP}${small}`;
}

/** Quantity with unit: fmtQty(5, 'cm') → '5 cm', fmtQty(1.2, 'm', 2) → '1,20 m', fmtQty(1.7, 'km') → '1,7 km' */
export function fmtQty(n: number, unit: string, decimals?: number): string {
  return `${fmt(n, decimals)}${NBSP}${unit}`;
}

/** Clock time as in class (docs/research.md §5, §6): fmtTime(13, 50) → '13.50 Uhr', fmtTime(8, 5, false) → '8.05' */
export function fmtTime(hours: number, minutes: number, withUhr = true): string {
  const t = `${hours}.${String(minutes).padStart(2, '0')}`;
  return withUhr ? `${t}${NBSP}Uhr` : t;
}

/** Time span in mixed notation: fmtDuration(85) → '1 h 25 min', fmtDuration(60) → '1 h', fmtDuration(45) → '45 min' */
export function fmtDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}${NBSP}min`;
  if (m === 0) return `${h}${NBSP}h`;
  return `${h}${NBSP}h ${m}${NBSP}min`;
}

// ─── Zahlwörter ──────────────────────────────────────────────────────────────

const ONES = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const TEENS = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

/** 1–999 as a word stem (1 → 'ein', used inside compounds). */
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = h > 0 ? ONES[h] + 'hundert' : '';
  if (rest === 0) return out;
  if (rest < 10) return out + ONES[rest];
  if (rest < 20) return out + TEENS[rest - 10];
  const o = rest % 10;
  return out + (o > 0 ? ONES[o] + 'und' : '') + TENS[Math.floor(rest / 10)];
}

/**
 * German number word for 0 ≤ n < 10^15 (T16): numberWord(34) → 'vierunddreißig', numberWord(1) → 'eins', numberWord(305) → 'dreihundertfünf',
 * numberWord(1000) → 'eintausend', numberWord(3040000) → 'drei Millionen vierzigtausend', numberWord(2000000000) → 'zwei Milliarden',
 * numberWord(501000000) → 'fünfhunderteine Million'.
 */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e15) throw new RangeError(`numberWord: out of range: ${n}`);
  if (n === 0) return 'null';
  const big: [size: number, one: string, many: string][] = [[1e12, 'Billion', 'Billionen'], [1e9, 'Milliarde', 'Milliarden'], [1e6, 'Million', 'Millionen']];
  const parts: string[] = [];
  let rest = n;
  for (const [size, one, many] of big) {
    const k = Math.floor(rest / size);
    if (k === 0) continue;
    // 1 and any x01 take the feminine singular: 'eine Million', 'fünfhunderteine Million'
    parts.push(k % 100 === 1 ? `${numberWord(k).replace(/eins$/, 'eine')} ${one}` : `${numberWord(k)} ${many}`);
    rest %= size;
  }
  if (rest > 0) {
    const th = Math.floor(rest / 1000);
    const low = rest % 1000;
    const word = (th > 0 ? below1000(th) + 'tausend' : '') + (low > 0 ? below1000(low) : '');
    parts.push(low % 100 === 1 ? `${word}s` : word);
  }
  return parts.join(' ');
}

/** Ordinal of a date ('der neunzehnte', 'am sechsundzwanzigsten'), 1 ≤ n ≤ 31; `ending` is 'e' or 'en'. */
export function ordinalWord(n: number, ending: 'e' | 'en'): string {
  const stem = n === 1 ? 'erst' : n === 3 ? 'dritt' : n === 7 ? 'siebt' : n === 8 ? 'acht' : `${numberWord(n)}${n < 20 ? 't' : 'st'}`;
  return stem + ending;
}

// ─── Screen-reader text ──────────────────────────────────────────────────────

const SUPERSCRIPT_DIGITS: Readonly<Record<string, string>> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

/** A power as it is said: '10⁶' → '10 hoch 6', '□²' → '□ hoch 2', '(−2)³' → 'Klammer auf −2 Klammer zu hoch 3'. A unit such as 'm²' stays for speak(). */
function sayPowers(text: string): string {
  const exponent = (sup: string) => [...sup].map((c) => SUPERSCRIPT_DIGITS[c]).join('');
  return text
    .replace(/\((\u2212[\d,]+)\)([⁰¹²³⁴-⁹]+)/g, (_all, base: string, sup: string) => ` Klammer auf ${base} Klammer zu hoch ${exponent(sup)}`)
    .replace(/([\d\u25A1)])([⁰¹²³⁴-⁹]+)/g, (_all, base: string, sup: string) => `${base} hoch ${exponent(sup)}`);
}

/** A bracket that groups a term changes the term, so it is said (T16). '(−3)' only keeps a sign together, and a remark in brackets is no term. */
function sayBrackets(text: string): string {
  const isTerm = (inner: string) => /Klammer auf|\s[+\u2212\u00B7:]\s/.test(inner);
  let out = text;
  for (let before = ''; before !== out; ) {
    before = out;
    out = out.replace(/\(([^()]*)\)/g, (_all, inner: string) => (isTerm(inner) ? ` Klammer auf ${inner} Klammer zu ` : `\uE000${inner}\uE001`));
  }
  return out.replace(/\uE000/g, '(').replace(/\uE001/g, ')');
}

/** A valid Roman numeral of at least two letters, letter by letter (a voice would read 'XLII' as a word). */
const ROMAN_NUMERAL = /\b(?=[MDCLXVI]{2,}\b)M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})\b/g;

/**
 * Turn displayed maths into speakable German text:
 * '7 · 8 = □' → '7 mal 8 gleich Lücke', '(8 + 4) · 3' → 'Klammer auf 8 plus 4 Klammer zu mal 3', '10⁶' → '10 hoch 6', 'g ∥ h' → 'g ist parallel zu h',
 * 'XIV' → 'X I V'. A Maßstab is said as one: '1 : 100' → '1 zu 100', '1 : 25 000' → '1 zu 25000', '5 : 1' → '5 zu 1'; '1 : 8', the Bruch as a division, stays 'geteilt durch'.
 * A clock time stays a clock time: '14.30 Uhr' as is, and a spaced '21 : 0 Uhr' becomes '21.00 Uhr'
 * (never 'geteilt durch').
 */
export function toSpeech(text: string): string {
  return sayBrackets(sayPowers(fractionsAsWords(text)
    // the groups of a large number are one number
    .replace(/(\d)[\u202F\u2009](?=\d{3})/g, '$1')
    // P(3 | 5) as 'Punkt P mit den Koordinaten 3 und 5' (T20); a negative coordinate as 'minus 2' follows below
    .replace(/\b([A-Z])\(\s*([^()|]+?)\s*\|\s*([^()|]+?)\s*\)/g, 'Punkt $1 mit den Koordinaten $2 und $3')))
    .replace(/(^|[\s(])1\s+:\s+(\d{2,}|\u25A1)(?![\d,]|\s+Uhr)/g, '$1 1 zu $2')
    .replace(/(^|[\s(])(\d+|\u25A1)\s+:\s+1(?![\d,]|\s+Uhr)/g, '$1 $2 zu 1')
    .replace(/\bggT\(([^,()]+),\s*([^()]+)\)/g, 'ggT von $1 und $2')
    // the names of angles: a voice would read the letter's description
    .replace(/α/g, 'Alpha').replace(/β/g, 'Beta').replace(/γ/g, 'Gamma').replace(/δ/g, 'Delta')
    .replace(/\u2225/g, ' ist parallel zu ')
    .replace(/\u22A5/g, ' ist senkrecht zu ')
    .replace(ROMAN_NUMERAL, (roman: string) => (roman ? [...roman].join(' ') : roman))
    .replace(/\|(\u2212?[\d,]+)\|/g, ' Betrag von $1 ')
    // F5: a number after an operator keeps its sign; the operation gets a pause ('5 minus, minus 3')
    .replace(/\s\u2212\s*\(\u2212/g, ' minus, (\u2212')
    .replace(/\(\u2212([^()]+)\)/g, ' minus $1 ')
    .replace(/(^|[\s(=])\u2212(?=\d)/g, '$1 minus ')
    .replace(/\b(\d{1,2})\s+:\s+(\d{1,2})(?=[\s\u00A0]+Uhr\b)/g, (_all, h: string, m: string) => `${h}.${m.padStart(2, '0')}`)
    .replace(/\u00B7/g, ' mal ')
    .replace(/\s:\s/g, ' geteilt durch ')
    .replace(/\u2212/g, ' minus ')
    .replace(/\s\+\s/g, ' plus ')
    .replace(/[\u00A0 ]?\u00B0C/g, ' Grad Celsius')
    .replace(/\u00B0/g, ' Grad')
    .replace(/\u2248/g, ' ist ungefähr ')
    .replace(/\u25A1/g, ' Lücke ')
    .replace(/[\u00A0 ]?%/g, ' Prozent')
    .replace(/\s=\s/g, ' gleich ')
    .replace(/\s<\s/g, ' ist kleiner als ')
    .replace(/\s>\s/g, ' ist größer als ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    // No space before punctuation ('… etwa 1 Lücke .' → '… etwa 1 Lücke.').
    .replace(/\s+([.,;!?])(?=\s|$)/g, '$1')
    .trim();
}

/** The signs of a comparison as words, e.g. on an answer button. */
export const SYMBOL_WORDS: Readonly<Record<string, string>> = { '<': 'kleiner als', '>': 'größer als', '=': 'gleich' };

const UNIT_WORDS: Record<string, [singular: string, plural: string]> = {
  mm: ['Millimeter', 'Millimeter'],
  cm: ['Zentimeter', 'Zentimeter'],
  dm: ['Dezimeter', 'Dezimeter'],
  m: ['Meter', 'Meter'],
  km: ['Kilometer', 'Kilometer'],
  'mm²': ['Quadratmillimeter', 'Quadratmillimeter'],
  'cm²': ['Quadratzentimeter', 'Quadratzentimeter'],
  'dm²': ['Quadratdezimeter', 'Quadratdezimeter'],
  'm²': ['Quadratmeter', 'Quadratmeter'],
  'km²': ['Quadratkilometer', 'Quadratkilometer'],
  a: ['Ar', 'Ar'],
  ha: ['Hektar', 'Hektar'],
  'mm³': ['Kubikmillimeter', 'Kubikmillimeter'],
  'cm³': ['Kubikzentimeter', 'Kubikzentimeter'],
  'dm³': ['Kubikdezimeter', 'Kubikdezimeter'],
  'm³': ['Kubikmeter', 'Kubikmeter'],
  mg: ['Milligramm', 'Milligramm'],
  g: ['Gramm', 'Gramm'],
  kg: ['Kilogramm', 'Kilogramm'],
  t: ['Tonne', 'Tonnen'],
  ml: ['Milliliter', 'Milliliter'],
  l: ['Liter', 'Liter'],
  ct: ['Cent', 'Cent'],
  '€': ['Euro', 'Euro'],
  h: ['Stunde', 'Stunden'],
  min: ['Minute', 'Minuten'],
  s: ['Sekunde', 'Sekunden'],
};

/** A unit standing alone, such as an option of 'Welche Einheit passt?', said as a word; undefined for any other text. */
export function unitWord(label: string): string | undefined {
  return Object.hasOwn(UNIT_WORDS, label) ? UNIT_WORDS[label][1] : undefined;
}

/** A fraction with a quantity (§2.4: only ½, ¼, ¾), as it is said. */
const FRACTION_WORDS: Record<string, string> = {
  '½ kg': 'ein halbes Kilogramm',
  '½ km': 'ein halber Kilometer',
  '½ m': 'ein halber Meter',
  '½ cm': 'ein halber Zentimeter',
  '½ l': 'ein halber Liter',
  '½ h': 'eine halbe Stunde',
  '¼ kg': 'ein Viertelkilogramm',
  '¼ l': 'ein Viertelliter',
  '¼ h': 'eine Viertelstunde',
  '¾ kg': 'ein Dreiviertelkilogramm',
  '¾ l': 'ein Dreiviertelliter',
  '¾ h': 'eine Dreiviertelstunde',
};

/**
 * toSpeech() plus spoken unit names: '3 € 40 ct' → '3 Euro 40 Cent', '1 h 25 min' → '1 Stunde 25 Minuten'. A comma with money or metres
 * reads as in class (T17): '3,05 €' → '3 Euro 5', '0,50 €' → '50 Cent', '1,20 m' → '1 Meter 20'; other commas as 'Komma': '1,7 km'.
 * literalComma keeps the comma: where it is the task (dezimal.groessen), '7,08 €' is '7 Komma 0 8 Euro'.
 * A fraction takes its spoken form before a unit or as a noun: 'eine halbe Stunde', 'eineinhalb Stunden', 'eindreiviertel Stunden', 'die Hälfte der Kinder'.
 */
export function speak(text: string, { literalComma = false }: { literalComma?: boolean } = {}): string {
  let out = toSpeech(text)
    .replace(/([½¼¾]) (kg|km|cm|m|l|h)(?=$|[\s.,;:!?)])/g, (all: string) => FRACTION_WORDS[all] ?? all)
    .replace(/(^|\s)1½(?=\s|$)/g, '$1eineinhalb')
    .replace(/½/g, ' ein Halb').replace(/¼/g, ' ein Viertel').replace(/¾/g, ' drei Viertel');
  if (!literalComma) {
    out = out
      .replace(/(^|\s)(\d+),(\d{2}) €(?=$|[\s.,;:!?)])/g, (_all, pre: string, euro: string, ct: string) => {
        if (Number(ct) === 0) return `${pre}${euro} Euro`;
        return Number(euro) === 0 ? `${pre}${Number(ct)} Cent` : `${pre}${euro} Euro ${Number(ct)}`;
      })
      .replace(/(^|\s)(\d+),(\d{2}) m(?=$|[\s.,;:!?)])/g, (_all, pre: string, m: string, cm: string) => `${pre}${m} Meter ${Number(cm)}`);
  }
  return out
    // Ziffern after the comma are said one by one: '2,075' as '2 Komma 0 7 5'
    .replace(/(\d),(\d+)/g, (_all, int: string, dec: string) => `${int} Komma ${dec.split('').join(' ')}`)
    .replace(/(^|\s)(\S+) (mm²|cm²|dm²|km²|m²|mm³|cm³|dm³|m³|mm|cm|dm|km|kg|mg|ml|ct|min|m|g|t|l|h|s|ha|a|€)(?=$|[\s.,;:!?)])/g, (_all, pre: string, num: string, unit: string, at: number, whole: string) => {
      const [sg, pl] = UNIT_WORDS[unit];
      // a fraction alone is singular ('eine halbe Stunde'); after 'ein Ganzes und' it is plural
      const part = /^\p{Lu}/u.test(num) && !/Ganzes? und \p{L}+$/u.test(whole.slice(0, at));
      return `${pre}${num} ${num === '1' || num === 'ein' || part ? sg : pl}`;
    })
    // a mixed amount first, as its fraction is no 'drei Viertel Stunde'
    .replace(/\bein Ganzes und ein Halb\b/g, 'eineinhalb')
    .replace(/(?<!\p{L})(\p{L}+) Ganze und ein Halb(?!\p{L})/gu, '$1einhalb')
    .replace(/\bein Ganzes und (ein|drei) Viertel(?= (?:Stunden|Kilogramm|Liter|Meter)\b)/g, 'ein$1viertel')
    .replace(/(?<!\p{L})(\p{L}+) Ganze und (ein|drei) Viertel(?= (?:Stunden|Kilogramm|Liter|Meter)\b)/gu, '$1$2viertel')
    .replace(/\bein Halb (derselben|der|des|davon|von|vom|einer|eines|dieser)\b/g, 'die Hälfte $1')
    .replace(/\bmit ein Halb\b(?! (?:Stunde|Liter|Meter|Kilometer|Kilogramm))/g, 'mit einem Halben')
    .replace(/\bein Halb Stunde\b/g, 'eine halbe Stunde')
    .replace(/\bein Viertel Stunde\b/g, 'eine Viertelstunde')
    .replace(/\bdrei Viertel Stunde\b/g, 'eine Dreiviertelstunde')
    .replace(/\bein Halb (Kilogramm)\b/g, 'ein halbes $1')
    .replace(/\bein Halb (Pizza|Tafel|Portion|Torte|Strecke|Stunde|Packung|Flasche|Kanne|Dose|Stange)\b/g, 'eine halbe $1')
    // masculine: the case follows the sentence. In a story 1/2 m is nearly always the object, and the nominative stays for 'ein halber Meter sind …'.
    .replace(/\b(von|mit|in|nach) ein Halb (Liter|Meter|Kilometer)\b/g, '$1 einem halben $2')
    .replace(/\bein Halb (Liter|Meter|Kilometer)(?= (?:sind|ist|hat|kostet)\b)/g, 'ein halber $1')
    .replace(/\bein Halb (Liter|Meter|Kilometer)\b/g, 'einen halben $1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Text for the speech voice (docs/research.md T17): speak() with numbers as words, so '34' sounds as 'vierunddreißig' in every
 * voice, clock times as spoken ('8.30 Uhr' → 'acht Uhr dreißig'), dates as ordinals ('der 19.' → 'der neunzehnte', 'am 6.' →
 * 'am sechsten'), '1-mal' as 'einmal' and 'Z' and 'E' after a number as 'Zehner' and 'Einer'.
 * A 1 before a word (not a sign word: '1 mal 5' is 'eins mal fünf', nor 'Lücke': '1 Lücke A' is a digit of a number) stays a digit, as the voice knows
 * the right ending ('1 Münze' → 'eine Münze'). A letter directly after a number is said apart: '5b' → 'fünf b'.
 */
export function spokenWords(text: string, options?: { literalComma?: boolean }): string {
  return speak(text, options)
    .replace(/\b(\d{1,2})[.:](\d{2}) Uhr/g, (_all, h: string, m: string) => (Number(m) === 0 ? `${h} Uhr` : `${h} Uhr ${m}`))
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_all, h: string, m: string) => (Number(m) === 0 ? `${h} Uhr` : `${h} Uhr ${m}`))
    // not \b at the end: it treats 'ü' as a word boundary, so '3 Türme' would turn into '3 Tausenderürme'
    .replace(/\b(\d+) Z(?![\p{L}\p{N}])/gu, '$1 Zehner')
    .replace(/\b(\d+) E(?![\p{L}\p{N}])/gu, '$1 Einer')
    .replace(/\b(\d+) H(?![\p{L}\p{N}])/gu, '$1 Hunderter')
    .replace(/\b(\d+) T(?![\p{L}\p{N}])/gu, '$1 Tausender')
    // not \b at the start: it treats 'ä' as a word boundary, so 'Räder 35.' would turn into 'Räder fünfunddreißigste'
    .replace(/(?<!\p{L})(der|am|vom|zum|den) ((?!0\.)\d{1,2})\.(\?)?/gu, (_all, article: string, n: string, question: string | undefined) =>
      `${article} ${ordinalWord(Number(n), article === 'der' ? 'e' : 'en')}${question ?? '.'}`)
    .replace(/\b1-mal\b/g, 'einmal')
    // '801 Millionen' is 'achthunderteine Million', as in numberWord()
    .replace(/\b(\d*01) (Million|Milliarde)(?:en|n)\b/g, (all: string, k: string, noun: string) => (Number(k) > 1 && Number(k) % 100 === 1 ? `${numberWord(Number(k)).replace(/eins$/, 'eine')} ${noun}` : all))
    .replace(/\d+/g, (digits: string, at: number, all: string) => {
      const n = Number(digits);
      const next = all.slice(at + digits.length);
      if (n === 1 && /^ (?!mal\b|gleich\b|plus\b|minus\b|geteilt\b|zu\b|Lücke\b|hoch\b)\p{L}/u.test(next)) return digits;
      return /^\p{L}/u.test(next) ? `${numberWord(n)} ` : numberWord(n);
    });
}
