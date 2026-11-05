/**
 * Lenient parsing of what children type. Never says "falsch" for input it cannot read:
 * returns a friendly German reason instead (counted as "invalid", not as an attempt).
 *
 * Accepts: '2500', '2 500', '12 500', '2.500' (dot + groups of 3 = thousands), and on items that accept a comma '3,5', '3,50', '3.5'.
 * On items with three places, '3.125' could be 3,125 or 3125: it gets a question back and costs no attempt. '0.125' and '1.250.000' are clear.
 * On signed items also a leading '−' or '-' and '+5'; '−0' is 0.
 */

export type ParseResult = { ok: true; value: number } | { ok: false; reason: string };

const SPACES = /[\s\u00A0\u2009\u202F]/g;

/** Shown when a minus is typed where no negative number is asked for. */
export const NO_MINUS_REASON = 'Hier ist eine Zahl ohne Minus gesucht.';

export function parseNumber(raw: string, decimals = 0, signed = false): ParseResult {
  let text = raw.replace(SPACES, '').replace(/−/g, '-');
  if (text === '') return { ok: false, reason: 'Gib zuerst eine Zahl ein.' };

  let negative = false;
  if (text.startsWith('-')) {
    if (!signed) return { ok: false, reason: NO_MINUS_REASON };
    negative = true;
    text = text.slice(1);
  } else if (signed && text.startsWith('+')) {
    text = text.slice(1);
  }
  if (!/^[0-9.,]+$/.test(text)) {
    return { ok: false, reason: decimals > 0 ? 'Schreibe nur Ziffern und ein Komma.' : 'Schreibe nur Ziffern.' };
  }

  // never −0 ('−0' is 0)
  const withSign = (n: number): ParseResult => ({ ok: true, value: negative && n !== 0 ? -n : n });
  const commas = (text.match(/,/g) ?? []).length;
  const dots = (text.match(/\./g) ?? []).length;

  if (commas > 1) {
    if (decimals === 0) return { ok: false, reason: 'Hier ist eine ganze Zahl gesucht – ohne Komma.' };
    return { ok: false, reason: 'Eine Zahl hat höchstens ein Komma.' };
  }

  if (commas === 1) {
    if (decimals === 0) return { ok: false, reason: 'Hier ist eine ganze Zahl gesucht – ohne Komma.' };
    const [intPart, frac] = text.split(',');
    if (frac === '' || intPart === '') return { ok: false, reason: 'Vor und nach dem Komma muss eine Ziffer stehen.' };
    if (!/^\d+$/.test(frac)) return { ok: false, reason: 'Nach dem Komma dürfen nur Ziffern stehen.' };
    if (frac.length > decimals) {
      return { ok: false, reason: `Hier gibt es höchstens ${decimals} ${decimals === 1 ? 'Stelle' : 'Stellen'} nach dem Komma.` };
    }
    const intValue = parseIntPart(intPart);
    if (intValue === null) return { ok: false, reason: 'Diese Zahl kann ich nicht lesen. Prüfe die Punkte.' };
    return withSign(intValue + Number('0.' + frac));
  }

  if (dots === 0) return withSign(Number(text));

  // Only dots.
  if (decimals >= 3 && /^[1-9]\d{0,2}\.\d{3}$/.test(text)) {
    return { ok: false, reason: `Meinst du ${text.replace('.', ',')} oder ${text.replace('.', '')}? Schreibe die Zahl ohne Punkt.` };
  }
  if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(text)) return withSign(Number(text.replace(/\./g, '')));
  if (dots === 1 && /^\d+\.\d+$/.test(text)) {
    if (decimals === 0) return { ok: false, reason: 'Hier ist eine ganze Zahl gesucht – ohne Punkt oder Komma.' };
    const frac = text.split('.')[1];
    if (frac.length > decimals) {
      return { ok: false, reason: `Hier gibt es höchstens ${decimals} ${decimals === 1 ? 'Stelle' : 'Stellen'} nach dem Komma.` };
    }
    return withSign(Number(text));
  }
  return { ok: false, reason: 'Diese Zahl kann ich nicht lesen. Schreibe sie ohne Punkte, zum Beispiel 2500.' };
}

function parseIntPart(intPart: string): number | null {
  if (/^\d+$/.test(intPart)) return Number(intPart);
  if (/^\d{1,3}(\.\d{3})+$/.test(intPart)) return Number(intPart.replace(/\./g, ''));
  return null;
}

/** Digits-only input of written calculations ('' allowed for empty leading places). */
export function parseDigits(raw: string): ParseResult {
  const text = raw.replace(SPACES, '');
  if (text === '') return { ok: false, reason: 'Trage zuerst das Ergebnis ein.' };
  // WrittenInput sends an empty box between filled ones as '_'.
  if (/^[\d_]+$/.test(text) && text.includes('_')) return { ok: false, reason: 'Ein Kästchen im Ergebnis ist noch leer.' };
  if (!/^\d+$/.test(text)) return { ok: false, reason: 'In jedes Kästchen kommt genau eine Ziffer.' };
  return { ok: true, value: Number(text) };
}

/**
 * The parts of a fraction: digits only, and the Nenner is not 0 (a parse message, no attempt). A Ganze field that holds a number and two empty fraction fields is a whole number: 3 is 3 0/1.
 */
export function parseFraction(raw: { numerator: string; denominator: string; whole?: string }, wantWhole: boolean): { ok: true; numerator: number; denominator: number; whole: number } | { ok: false; reason: string } {
  const clean = (s: string | undefined) => (s ?? '').replace(SPACES, '');
  const [n, d, w] = [clean(raw.numerator), clean(raw.denominator), clean(raw.whole)];
  const digitsOnly = (s: string) => s === '' || /^\d+$/.test(s);
  if (!digitsOnly(n) || !digitsOnly(d) || !digitsOnly(w)) return { ok: false, reason: 'Schreibe nur Ziffern.' };
  if (w !== '' && n === '' && d === '') return { ok: true, numerator: 0, denominator: 1, whole: Number(w) };
  if (wantWhole && w === '') return { ok: false, reason: 'Trage zuerst die ganze Zahl ein.' };
  if (n === '') return { ok: false, reason: 'Trage zuerst den Zähler ein.' };
  if (d === '') return { ok: false, reason: 'Trage zuerst den Nenner ein.' };
  if (Number(d) === 0) return { ok: false, reason: 'Der Nenner kann nicht 0 sein.' };
  return { ok: true, numerator: Number(n), denominator: Number(d), whole: w === '' ? 0 : Number(w) };
}
