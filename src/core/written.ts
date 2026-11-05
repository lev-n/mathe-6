/**
 * Layout engine for written calculations (schriftliche Rechenverfahren).
 *
 * Pure arithmetic: computes carries (Überträge), Entbündeln/Erweitern marks, partial products and division steps. Shared by the generators
 * (worked steps), the bug library, WrittenVisual and WrittenInput; it lives here and not in a topic directory because the UI imports it
 * statically (src/topics/contract.test.ts). Keep this module free of UI and generator imports.
 *
 * Places are counted from the right: 0 = Einer, 1 = Zehner, 2 = Hunderter, … A decimal calculation works on integers plus decimal places per operand (§6, WrittenAnswer.decimalPlaces):
 * the layouts below stay integer arithmetic, and alignedOperands(), shiftedDivision() and writtenPlaces() say what the digits are worth.
 */
import type { SubtractionMethod, VisualOf, WrittenOp } from './types';

// ─── Place names ─────────────────────────────────────────────────────────────

const PLACE_NOM = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender', 'Hunderttausender', 'Millionen', 'Zehnmillionen', 'Hundertmillionen', 'Milliarden', 'Zehnmilliarden', 'Hundertmilliarden'];
const PLACE_DAT = ['Einern', 'Zehnern', 'Hundertern', 'Tausendern', 'Zehntausendern', 'Hunderttausendern', 'Millionen', 'Zehnmillionen', 'Hundertmillionen', 'Milliarden', 'Zehnmilliarden', 'Hundertmilliarden'];
const PLACE_ONE = ['einen Einer', 'einen Zehner', 'einen Hunderter', 'einen Tausender', 'einen Zehntausender', 'einen Hunderttausender', 'eine Million', 'eine Zehnmillion', 'eine Hundertmillion', 'eine Milliarde', 'eine Zehnmilliarde', 'eine Hundertmilliarde'];
const PLACE_SHORT = ['E', 'Z', 'H', 'T', 'ZT', 'HT', 'M', 'ZM', 'HM', 'Mrd', 'ZMrd', 'HMrd'];

/** 'Einer', 'Zehner', … (also the plural). */
export function placeName(place: number): string {
  return PLACE_NOM[place] ?? `${place + 1}. Stelle`;
}
/** Dative plural: 'bei den Zehnern'. */
export function placeDative(place: number): string {
  return PLACE_DAT[place] ?? `${place + 1}. Stelle`;
}
/** 'einen Zehner' (accusative singular, for Entbündeln). */
export function placeOne(place: number): string {
  return PLACE_ONE[place] ?? 'eine Stelle';
}
/** Stellentafel abbreviation: 'E', 'Z', 'H', 'T', 'ZT', 'HT', 'M', … 'HMrd'. */
export function placeShort(place: number): string {
  return PLACE_SHORT[place] ?? '';
}

// ─── Digits ──────────────────────────────────────────────────────────────────

/** Number of digits of a non-negative integer (0 has one digit). */
export function numLength(n: number): number {
  return String(Math.abs(Math.trunc(n))).length;
}

/** Digit at a place (0 = Einer). */
export function digitAt(n: number, place: number): number {
  return Math.floor(n / 10 ** place) % 10;
}

/** Big-endian digits: 5432 → [5, 4, 3, 2]. */
export function digitsOf(n: number): number[] {
  return String(n).split('').map(Number);
}

// ─── Addition ────────────────────────────────────────────────────────────────

export interface AddLayout {
  op: 'add';
  operands: number[];
  /** Number of columns of the solution (max operand length, +1 if the result is longer). */
  width: number;
  /** carries[p] = Übertrag written into place p (from place p − 1); carries[0] = 0. Length = width. */
  carries: number[];
  /** Column sum at each place including the incoming carry. Length = width. */
  columnSums: number[];
  result: number;
}

export function layoutAdd(operands: readonly number[]): AddLayout {
  const maxLen = Math.max(...operands.map(numLength));
  const carries: number[] = [0];
  const columnSums: number[] = [];
  let carry = 0;
  for (let p = 0; p < maxLen || carry > 0; p++) {
    let s = carry;
    for (const n of operands) if (numLength(n) > p) s += digitAt(n, p);
    columnSums.push(s);
    carry = Math.floor(s / 10);
    carries.push(carry);
  }
  carries.length = columnSums.length;
  return {
    op: 'add',
    operands: operands.slice(),
    width: columnSums.length,
    carries,
    columnSums,
    result: operands.reduce((a, b) => a + b, 0),
  };
}

// ─── Subtraction ─────────────────────────────────────────────────────────────

export interface SubColumn {
  place: number;
  /** Original Minuend digit. */
  a: number;
  /** Subtrahend digit, null if the Subtrahend has no digit at this place. */
  b: number | null;
  /** Abziehen: the Minuend value at this place when the column is reached (after earlier Entbündeln). */
  before: number;
  /** Abziehen: value used for subtracting (after own Entbündeln). Shown small above the crossed-out digit if ≠ a. */
  top: number;
  /** Abziehen: this column needed Entbündeln (top = before + 10). */
  regrouped: boolean;
  /** Abziehen: place the bundle was taken from (> place + 1 means Entbündeln across zeros). */
  regroupFrom?: number;
  /** Ergänzen: the gemerkte 1 added to the Subtrahend digit at this place (0 or 1). */
  carryIn: number;
  /** Ergänzen: the Minuend digit was extended by 10. */
  extended: boolean;
  /** Result digit. */
  r: number;
}

export interface SubLayout {
  op: 'sub';
  method: SubtractionMethod;
  minuend: number;
  subtrahend: number;
  width: number;
  columns: SubColumn[];
  result: number;
  /** Number of Entbündeln (abziehen) or Erweitern (ergaenzen) steps. */
  regroupings: number;
  /** Abziehen: Entbündeln across a zero happened; Ergänzen: a zero in the Minuend was extended. */
  acrossZero: boolean;
}

export function layoutSub(minuend: number, subtrahend: number, method: SubtractionMethod): SubLayout {
  if (subtrahend > minuend) throw new RangeError(`layoutSub: ${minuend} − ${subtrahend} < 0`);
  const width = numLength(minuend);
  const lb = numLength(subtrahend);
  const a = Array.from({ length: width }, (_, p) => digitAt(minuend, p));
  const bAt = (p: number): number | null => (p < lb ? digitAt(subtrahend, p) : null);
  const columns: SubColumn[] = [];
  let regroupings = 0;
  let acrossZero = false;

  if (method === 'abziehen') {
    const t = a.slice();
    for (let p = 0; p < width; p++) {
      const b = bAt(p) ?? 0;
      const before = t[p];
      let regrouped = false;
      let regroupFrom: number | undefined;
      if (t[p] < b) {
        let j = p + 1;
        while (t[j] === 0) j++;
        t[j] -= 1;
        for (let k = p + 1; k < j; k++) t[k] = 9;
        t[p] += 10;
        regrouped = true;
        regroupFrom = j;
        regroupings++;
        if (j > p + 1) acrossZero = true;
      }
      columns.push({ place: p, a: a[p], b: bAt(p), before, top: t[p], regrouped, regroupFrom, carryIn: 0, extended: false, r: t[p] - b });
    }
  } else {
    let c = 0;
    for (let p = 0; p < width; p++) {
      const b = bAt(p) ?? 0;
      const s = b + c;
      const extended = a[p] < s;
      const r = extended ? a[p] + 10 - s : a[p] - s;
      if (extended) {
        regroupings++;
        if (a[p] === 0) acrossZero = true;
      }
      columns.push({ place: p, a: a[p], b: bAt(p), before: a[p], top: a[p], regrouped: false, carryIn: c, extended, r });
      c = extended ? 1 : 0;
    }
  }
  return { op: 'sub', method, minuend, subtrahend, width, columns, result: minuend - subtrahend, regroupings, acrossZero };
}

// ─── Multiplication ──────────────────────────────────────────────────────────

export interface MulPartial {
  /** Digit of the second factor. */
  digit: number;
  /** Place of that digit in the second factor (0 = Einer) = shift of this partial product. */
  shift: number;
  /** First factor · digit (not shifted). */
  value: number;
  /** carries[p] = Übertrag into place p of this partial product (p relative to the partial). */
  carries: number[];
}

export interface MulLayout {
  op: 'mul';
  a: number;
  b: number;
  /** Partial products in German order: highest digit of the second factor first. */
  partials: MulPartial[];
  /** Multi-digit second factor: carries when adding the shifted partial products, by absolute place. */
  sumCarries: number[];
  result: number;
  /** Number of carries in all partial products (Stufe bounds, praise). */
  carryCount: number;
}

export function layoutMul(a: number, b: number): MulLayout {
  const bDigits = digitsOf(b);
  const la = numLength(a);
  const partials: MulPartial[] = bDigits.map((digit, i) => {
    const shift = bDigits.length - 1 - i;
    const carries = [0];
    let c = 0;
    for (let p = 0; p < la; p++) {
      const v = digitAt(a, p) * digit + c;
      c = Math.floor(v / 10);
      carries.push(c);
    }
    return { digit, shift, value: a * digit, carries };
  });
  const sumCarries: number[] = [0];
  if (partials.length > 1) {
    const result = a * b;
    const width = numLength(result);
    let c = 0;
    for (let p = 0; p < width; p++) {
      let s = c;
      for (const part of partials) {
        const rel = p - part.shift;
        if (rel >= 0 && rel < numLength(part.value)) s += digitAt(part.value, rel);
      }
      c = Math.floor(s / 10);
      sumCarries.push(c);
    }
  }
  const carryCount = partials.reduce((acc, part) => acc + part.carries.filter((c, i) => i > 0 && i < la && c > 0).length, 0);
  return { op: 'mul', a, b, partials, sumCarries, result: a * b, carryCount };
}

// ─── Division ────────────────────────────────────────────────────────────────

export interface DivStep {
  /** Index (from the left, 0-based) of the last Dividend digit used in this partial Dividend. */
  end: number;
  /** Teil-Dividend. */
  partial: number;
  /** Quotient digit. */
  q: number;
  /** q · Divisor. */
  product: number;
  /** partial − product. */
  diff: number;
}

export interface DivLayout {
  op: 'div';
  dividend: number;
  divisor: number;
  steps: DivStep[];
  quotient: number;
  remainder: number;
  /** The first partial Dividend needs more than one digit (2 345 : 5 → 23). */
  firstTwoDigits: boolean;
  /** Number of zeros in the quotient (Null im Ergebnis). */
  quotientZeros: number;
}

export function layoutDiv(dividend: number, divisor: number): DivLayout {
  if (divisor <= 0) throw new RangeError('layoutDiv: divisor must be > 0');
  const ds = digitsOf(dividend);
  let i = 0;
  let partial = ds[0];
  while (partial < divisor && i < ds.length - 1) {
    i++;
    partial = partial * 10 + ds[i];
  }
  const firstEnd = i;
  const steps: DivStep[] = [];
  for (;;) {
    const q = Math.floor(partial / divisor);
    const product = q * divisor;
    const diff = partial - product;
    steps.push({ end: i, partial, q, product, diff });
    if (i === ds.length - 1) break;
    i++;
    partial = diff * 10 + ds[i];
  }
  const quotient = Math.floor(dividend / divisor);
  return {
    op: 'div',
    dividend,
    divisor,
    steps,
    quotient,
    remainder: dividend % divisor,
    firstTwoDigits: firstEnd > 0,
    quotientZeros: steps.filter((s, k) => s.q === 0 && !(k === 0 && quotient === 0)).length,
  };
}

/**
 * Partial products in words (German order, highest digit of the second factor first), for screen readers:
 * 'Teilprodukte: 3762, um eine Stelle eingerückt und 8778' (no final period; '' without partials).
 */
export function partialsSpeech(parts: readonly { value: number; shift: number }[] | undefined): string {
  if (!parts || parts.length === 0) return '';
  const one = (p: { value: number; shift: number }) =>
    p.shift === 0 ? String(p.value) : `${p.value}, um ${p.shift === 1 ? 'eine Stelle' : `${p.shift} Stellen`} eingerückt`;
  if (parts.length === 1) return `Teilprodukt: ${one(parts[0])}`;
  return `Teilprodukte: ${parts.slice(0, -1).map(one).join('; ')} und ${one(parts[parts.length - 1])}`;
}

// ─── Decimal numbers ─────────────────────────────────────────────────────────

const PLACE_AFTER_COMMA = ['Zehntel', 'Hundertstel', 'Tausendstel'];
const PLACE_AFTER_COMMA_SHORT = ['z', 'h', 't'];

/** The name of a column in a calculation with `places` decimals: place 0 is the rightmost box, so with 2 places it is 'Hundertstel', and place 2 is 'Einer'. */
export function placeNameAt(place: number, places: number): string {
  return place >= places ? placeName(place - places) : (PLACE_AFTER_COMMA[places - 1 - place] ?? `${places - place}. Stelle nach dem Komma`);
}

/** The same as a column head: 'h', 'z', 'E', 'Z'. */
export function placeShortAt(place: number, places: number): string {
  return place >= places ? placeShort(place - places) : (PLACE_AFTER_COMMA_SHORT[places - 1 - place] ?? '');
}

/** add, sub: all operands as integers of the same unit, comma under comma. [35, 125] with places [1, 2] gives [350, 125]. */
export function alignedOperands(operands: readonly number[], decimalPlaces: readonly number[] | undefined): number[] {
  if (!decimalPlaces) return [...operands];
  const most = Math.max(...decimalPlaces);
  return operands.map((n, i) => n * 10 ** (most - decimalPlaces[i]));
}

/**
 * div: the shift of the comma (§6). The Divisor becomes a natural number, and the Dividend moves with it: 0,75 : 0,5 is 7,5 : 5 (shift 1), which divides as 75 : 5 with 1 place in the result.
 * dividend and divisor are integers; dividendPlaces are the places left in the Dividend.
 */
export function shiftedDivision(operands: readonly number[], decimalPlaces: readonly number[] | undefined): { dividend: number; divisor: number; shift: number; dividendPlaces: number } {
  const [a, d] = operands;
  const [pa, pd] = decimalPlaces ?? [0, 0];
  return { dividend: a * 10 ** Math.max(0, pd - pa), divisor: d, shift: pd, dividendPlaces: Math.max(0, pa - pd) };
}

/** Decimal places of the result of a written calculation; 0 for natural numbers. `result` is an integer in units of this. */
export function writtenPlaces(calc: { op: WrittenOp; decimalPlaces?: readonly number[] }): number {
  const places = calc.decimalPlaces;
  if (!places) return 0;
  if (calc.op === 'mul') return places.reduce((a, b) => a + b, 0);
  if (calc.op === 'div') return Math.max(0, places[0] - places[1]);
  return Math.max(...places);
}

/** The integer `result` of `places` as text with its comma: decimalText(475, 2) → '4,75', decimalText(5, 2) → '0,05'. */
export function decimalText(value: number, places: number): string {
  if (places === 0) return String(value);
  const digits = String(value).padStart(places + 1, '0');
  return `${digits.slice(0, -places)},${digits.slice(-places)}`;
}

/** The correct integer result of a decimal calculation, in units of writtenPlaces(). Natural numbers: as correctResult(). */
export function correctDecimalResult(op: WrittenOp, operands: readonly number[], decimalPlaces: readonly number[] | undefined): number {
  if (op === 'add' || op === 'sub') return correctResult(op, alignedOperands(operands, decimalPlaces));
  if (op === 'mul') return operands[0] * operands[1];
  const { dividend, divisor } = shiftedDivision(operands, decimalPlaces);
  return Math.floor(dividend / divisor);
}

// ─── Generic ─────────────────────────────────────────────────────────────────

export function correctResult(op: WrittenOp, operands: readonly number[]): number {
  switch (op) {
    case 'add':
      return operands.reduce((a, b) => a + b, 0);
    case 'sub':
      return operands[0] - operands[1];
    case 'mul':
      return operands[0] * operands[1];
    case 'div':
      return Math.floor(operands[0] / operands[1]);
  }
}

/** Build a 'written' visual; drops undefined fields so exercises stay plain JSON. */
export function writtenVisual(spec: VisualOf<'written'>): VisualOf<'written'> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(spec)) if (v !== undefined) out[k] = v;
  return out as VisualOf<'written'>;
}
