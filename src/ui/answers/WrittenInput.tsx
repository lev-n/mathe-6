/**
 * Answer input for written calculations (answer kind 'written'), German Kästchen layout.
 *
 * - Operands right-aligned stellengerecht in a <table> (font var(--font-mono)).
 * - One digit box per result digit, labelled 'Ergebnis, Zehner'. Typing a digit moves focus LEFT
 *   (right-to-left entry, like on paper); division quotient and remainder are entered left to right.
 *   Every typed digit replaces the box content and moves on, even if it is the same digit as before
 *   (retyping a corrected result must not shift the digits): single-digit boxes keep the caret collapsed,
 *   so keyboard, Ziffernblock and on-screen keyboards always change the value.
 *   Backspace in an empty box clears the previous box and moves there; arrow keys move.
 * - Enter is handled by AnswerInput (fieldNav.ts): the Überschlag and the graded boxes are answer fields in
 *   reading order (Überschlag, then the result right to left; division: quotient, then Rest). Empty boxes to
 *   the left of the highest digit typed are not "missing" (a result may have fewer digits than boxes); a gap
 *   between typed digits is. The Rest may stay empty (it is optional for Enter).
 * - Ungraded helper boxes: Überträge (add, mul), Entbündeln (Abziehen), gemerkte 1 (Ergänzen),
 *   partial products (mul with a multi-digit factor) and Nebenrechnungen (div, on request).
 * - Wrong columns (CheckResult.wrongColumns) get colour + dashed outline + a ▲ marker + screen-reader text.
 * - reveal: shows the correct digits read-only. print: static empty Kästchen.
 * - Überschlag (answer.ueberschlag set, Stufe 2–3): a number field above the Kästchen for the child's own
 *   Überschlag ("Mach zuerst einen Überschlag"). Required before checking, checked loosely (never graded).
 * - Decimal numbers (answer.decimalPlaces, §6): add and sub stand comma under comma, with the end zeros muted; the comma of the result is fixed. mul shows the factors with their commas, and
 *   the child places the comma in the result: the ',' key in a box, or the two buttons under the boxes. div first shows the shift of the comma as a worked step, then the boxes around a fixed
 *   comma, with no Rest. Only the calculation scrolls sideways (.wi-scroll), so it fits a 360 px phone with any number of digits.
 * Response: { kind: 'written', result: digits (gaps as '_'), remainder?, ueberschlag?, comma? }.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import { fmt, keepTermsTogether } from '../../core/format';
import type { AnswerOf, CheckResult, Response } from '../../core/types';
import { alignedOperands, decimalText, digitAt, digitsOf, numLength, placeNameAt, placeShortAt, shiftedDivision, writtenPlaces } from '../../core/written';
import { MathText } from '../app/MathText';
import { keepAboveKeypad } from './fieldNav';
import { describedByIds, type AnswerInputProps } from './types';
import { FieldMark } from './NumberInput';
import './NumberInput.css';
import './WrittenInput.css';

type WrittenAnswer = AnswerOf<'written'>;
type Group = 'result' | 'carry' | 'regroup' | 'partial' | 'quotient' | 'remainder' | 'scratch';

interface Slot {
  key: string;
  group: Group;
  /** Navigation row and column. */
  row: number;
  col: number;
  label: string;
  dir: 'rtl' | 'ltr';
  maxLen: 1 | 2;
  advance: boolean;
  /** result: place (0 = Einer); quotient/remainder: index from the left. */
  pos: number;
}

type GCell =
  | { t: 'text'; text: string; cls?: string; comma?: boolean }
  | { t: 'head'; text: string }
  | { t: 'slot'; slot: Slot }
  | { t: 'empty'; cls?: string };

interface GRow {
  cells: GCell[];
  cls?: string;
}

interface Built {
  rows: GRow[];
  slots: Slot[];
  caption: string;
  legend: string;
}

const GRADED: readonly Group[] = ['result', 'quotient', 'remainder'];
const isGraded = (s: Slot) => GRADED.includes(s.group);
const SPOKEN_OP = { add: 'plus', sub: 'minus', mul: 'mal', div: 'geteilt durch' } as const;
const SIGN = { add: '+', sub: '−', mul: '·', div: ':' } as const;

/** The digits of a number, right-aligned; with decimals `places` is where the comma stands, `own` the places the number really has, so the end zeros below them are muted. */
function digitTextCells(n: number, width: number, places = 0, own = places): GCell[] {
  const len = numLength(n);
  return Array.from({ length: width }, (_, i) => {
    const place = width - 1 - i;
    if (place >= len && (places === 0 || place > places)) return { t: 'empty' };
    const cls = places > own && place < places - own ? 'wi-digit wi-padded' : 'wi-digit';
    return { t: 'text', text: place < len ? String(digitAt(n, place)) : '0', cls, comma: places > 0 && place === places };
  });
}

/** One factor as written, with its leading zero and comma: 4 with 1 place is 0,4. */
function factorCells(n: number, places: number): GCell[] {
  const digits = String(n).padStart(places + 1, '0').split('');
  return digits.map((d, i): GCell => ({ t: 'text', text: d, cls: 'wi-digit', comma: places > 0 && digits.length - 1 - i === places }));
}

/** Operands as said: 'drei Komma fünf' comes from the digits and the comma (src/core/format.ts). */
function spokenOperands(answer: WrittenAnswer): string {
  return answer.operands.map((n, i) => decimalText(n, answer.decimalPlaces?.[i] ?? 0)).join(` ${SPOKEN_OP[answer.op]} `);
}

function resultSlots(width: number, row: number, colOffset: number, count: number, places = 0): Slot[] {
  return Array.from({ length: count }, (_, place) => ({
    key: `r:${place}`,
    group: 'result' as const,
    row,
    col: colOffset + width - 1 - place,
    label: `Ergebnis, ${placeNameAt(place, places)}`,
    dir: 'rtl' as const,
    maxLen: 1 as const,
    advance: true,
    pos: place,
  }));
}

/** Place a set of slots into a row of `width` cells (by slot.col). */
function rowWith(width: number, slots: readonly Slot[], fill: (col: number) => GCell = () => ({ t: 'empty' })): GCell[] {
  const cells: GCell[] = Array.from({ length: width }, (_, c) => fill(c));
  for (const s of slots) cells[s.col] = { t: 'slot', slot: s };
  return cells;
}

function buildAddSub(answer: WrittenAnswer): Built {
  // comma under comma: integers of one unit, and the lengths count the 0 before the comma too
  const ops = alignedOperands(answer.operands, answer.decimalPlaces);
  const places = writtenPlaces(answer);
  const isAdd = answer.op === 'add';
  const method = answer.method ?? 'abziehen';
  const maxLen = Math.max(places + 1, ...ops.map(numLength));
  const W = isAdd ? maxLen + 1 : maxLen;
  const cols = W + 1; // sign column first
  const rows: GRow[] = [];
  const slots: Slot[] = [];
  rows.push({ cls: 'wi-head', cells: [{ t: 'empty' }, ...Array.from({ length: W }, (_, i): GCell => ({ t: 'head', text: placeShortAt(W - 1 - i, places) }))] });
  let nav = 0;
  if (!isAdd && method === 'abziehen') {
    const regroup: Slot[] = Array.from({ length: W }, (_, place) => ({
      key: `g:${place}`, group: 'regroup', row: nav, col: 1 + W - 1 - place, label: `Entbündeln, ${placeNameAt(place, places)}`,
      dir: 'rtl', maxLen: 2, advance: false, pos: place,
    }));
    slots.push(...regroup);
    rows.push({ cls: 'wi-helper-row', cells: rowWith(cols, regroup) });
    nav++;
  }
  ops.forEach((n, i) => {
    const sign = i === 0 ? '' : isAdd ? '+' : SIGN.sub;
    rows.push({ cls: 'wi-operand', cells: [{ t: 'text', text: sign, cls: 'wi-sign' }, ...digitTextCells(n, W, places, answer.decimalPlaces?.[i])] });
  });
  if (isAdd || method === 'ergaenzen') {
    const carry: Slot[] = Array.from({ length: W - 1 }, (_, i) => {
      const place = i + 1;
      return {
        key: `c:${place}`, group: 'carry' as const, row: nav, col: 1 + W - 1 - place,
        label: `${isAdd ? 'Übertrag' : 'Gemerkte 1'}, ${placeNameAt(place, places)}`, dir: 'rtl' as const, maxLen: 1 as const, advance: false, pos: place,
      };
    });
    slots.push(...carry);
    rows.push({ cls: 'wi-helper-row wi-carry-row', cells: rowWith(cols, carry) });
    nav++;
  }
  const result = resultSlots(W, nav, 1, W, places);
  slots.push(...result);
  rows.push({ cls: 'wi-result-row', cells: rowWith(cols, result) });
  const legend = isAdd
    ? 'Die kleinen Kästchen sind für Überträge. Sie werden nicht bewertet.'
    : method === 'abziehen'
      ? 'Die kleinen Kästchen oben sind zum Entbündeln. Sie werden nicht bewertet.'
      : 'Die kleinen Kästchen sind für die gemerkte 1. Sie werden nicht bewertet.';
  return { rows, slots, caption: '', legend };
}

function buildMul(answer: WrittenAnswer): Built {
  const [a, b] = answer.operands;
  const [pa, pb] = answer.decimalPlaces ?? [0, 0];
  const topA = factorCells(a, pa);
  const topB = factorCells(b, pb);
  const la = topA.length;
  const lb = topB.length;
  const W = la + 1 + lb;
  const rows: GRow[] = [];
  const slots: Slot[] = [];
  const top: GCell[] = [...topA, { t: 'text', text: SIGN.mul, cls: 'wi-sign' }, ...topB];
  rows.push({ cls: 'wi-top-row', cells: top });
  let nav = 0;
  // A written multiplication with decimals counts like the one with natural numbers: the places name no column until the child has set the comma.
  const placeName = (place: number) => (pa + pb > 0 ? `Stelle ${place + 1} von rechts` : placeNameAt(place, 0));
  const partials = numLength(b) > 1;
  if (partials) {
    for (let j = 0; j < numLength(b); j++) {
      const end = W - numLength(b) + j;
      const part: Slot[] = [];
      for (let col = Math.max(0, end - la); col <= end; col++) {
        const place = W - 1 - col;
        part.push({
          key: `p${j}:${place}`, group: 'partial', row: nav, col, label: `${j + 1}. Teilprodukt, ${placeName(place)}`,
          dir: 'rtl', maxLen: 1, advance: true, pos: place,
        });
      }
      slots.push(...part);
      rows.push({ cls: 'wi-helper-row wi-partial-row', cells: rowWith(W, part) });
      nav++;
    }
  }
  const carry: Slot[] = Array.from({ length: la + lb - 1 }, (_, i) => {
    const place = i + 1;
    return {
      key: `c:${place}`, group: 'carry' as const, row: nav, col: W - 1 - place, label: `Übertrag, ${placeName(place)}`,
      dir: 'rtl' as const, maxLen: 1 as const, advance: false, pos: place,
    };
  });
  slots.push(...carry);
  rows.push({ cls: 'wi-helper-row wi-carry-row', cells: rowWith(W, carry) });
  nav++;
  const result = resultSlots(W, nav, 0, la + lb);
  if (pa + pb > 0) result.forEach((slot) => (slot.label = `Ergebnis, ${placeName(slot.pos)}`));
  slots.push(...result);
  rows.push({ cls: partials ? 'wi-result-row' : 'wi-result-row wi-result-row--plain', cells: rowWith(W, result) });
  const legend =
    partials
      ? 'Die grauen Zeilen sind für Teilprodukte und Überträge. Bewertet wird nur das Ergebnis unter dem Strich.'
      : 'Die kleinen Kästchen sind für Überträge. Sie werden nicht bewertet.';
  return { rows, slots, caption: '', legend };
}

/** Division: quotient and remainder slots (the line is rendered separately) + optional scratch grid. */
function buildDiv(answer: WrittenAnswer): Built {
  const { dividend: a, divisor } = shiftedDivision(answer.operands, answer.decimalPlaces);
  const places = writtenPlaces(answer);
  const L = Math.max(numLength(a), places + 1);
  const slots: Slot[] = [];
  for (let i = 0; i < L; i++) {
    const label = places > 0 ? placeNameAt(L - 1 - i, places) : `${i + 1}. Ziffer`;
    slots.push({ key: `q:${i}`, group: 'quotient', row: 0, col: i, label: `Ergebnis, ${label}`, dir: 'ltr', maxLen: 1, advance: true, pos: i });
  }
  // The Rest has at most as many digits as the Divisor (three-digit divisors at Stufe 3). A decimal division ends, so it has none.
  for (let i = 0; !answer.decimalPlaces && i < numLength(divisor); i++) {
    slots.push({ key: `rem:${i}`, group: 'remainder', row: 0, col: 100 + i, label: `Rest, ${i + 1}. Ziffer`, dir: 'ltr', maxLen: 1, advance: true, pos: i });
  }
  const scratchRows: GRow[] = [{ cls: 'wi-scratch-head', cells: digitsOf(a).map((d): GCell => ({ t: 'text', text: String(d), cls: 'wi-digit' })) }];
  for (let r = 0; r < 2 * L; r++) {
    const rowSlots: Slot[] = Array.from({ length: L }, (_, c) => ({
      key: `s${r}:${c}`, group: 'scratch' as const, row: r + 1, col: c, label: `Nebenrechnung, Zeile ${r + 1}, Spalte ${c + 1}`,
      dir: 'ltr' as const, maxLen: 1 as const, advance: true, pos: c,
    }));
    slots.push(...rowSlots);
    scratchRows.push({ cls: 'wi-helper-row wi-scratch-row', cells: rowWith(L, rowSlots) });
  }
  return { rows: scratchRows, slots, caption: '', legend: !answer.decimalPlaces ? 'Schreibe das Ergebnis und, wenn etwas übrig bleibt, den Rest.' : places > 0 ? 'Schreibe das Ergebnis. Das Komma steht schon da.' : 'Schreibe das Ergebnis von links nach rechts.' };
}

function build(answer: WrittenAnswer): Built {
  const built = answer.op === 'div' ? buildDiv(answer) : answer.op === 'mul' ? buildMul(answer) : buildAddSub(answer);
  const task = spokenOperands(answer);
  built.caption =
    answer.op === 'div'
      ? `Teile schriftlich: ${task}. Trage das Ergebnis von links nach rechts ein${answer.decimalPlaces ? '' : ', dann den Rest'}.`
      : `Rechne schriftlich: ${task}. Trage das Ergebnis von rechts nach links ein. Mit den Pfeiltasten erreichst du die anderen Kästchen.`;
  return built;
}

// ─── Response <-> values ─────────────────────────────────────────────────────

type Values = Record<string, string>;

function sortedGroup(slots: readonly Slot[], group: Group): Slot[] {
  return slots.filter((s) => s.group === group).sort((x, y) => x.pos - y.pos);
}

/** Right-aligned digits (index = place): '' if empty, gaps as '_'. */
function composeRtl(byPlace: readonly Slot[], values: Values): string {
  let top = -1;
  byPlace.forEach((s, i) => {
    if ((values[s.key] ?? '') !== '') top = i;
  });
  if (top < 0) return '';
  let out = '';
  for (let i = top; i >= 0; i--) out += values[byPlace[i].key] || '_';
  return out;
}

/** Left-aligned digits: leading/trailing empty boxes ignored, inner gaps as '_'. */
function composeLtr(ordered: readonly Slot[], values: Values): string {
  const filled = ordered.map((s) => values[s.key] ?? '');
  const first = filled.findIndex((v) => v !== '');
  if (first < 0) return '';
  let last = first;
  filled.forEach((v, i) => {
    if (v !== '') last = i;
  });
  return filled.slice(first, last + 1).map((v) => v || '_').join('');
}

/** A quotient around a fixed comma: empty boxes on the left do not count, and one on the right is a gap ('_'), as the comma says what each box is worth. */
function composeFixed(ordered: readonly Slot[], values: Values): string {
  const filled = ordered.map((s) => values[s.key] ?? '');
  const first = filled.findIndex((v) => v !== '');
  return first < 0 ? '' : filled.slice(first).map((v) => v || '_').join('');
}

function compose(answer: WrittenAnswer, slots: readonly Slot[], values: Values, ueberschlag: string, comma: number | undefined): Response {
  const r: Extract<Response, { kind: 'written' }> =
    answer.op === 'div'
      ? {
          kind: 'written',
          result: (writtenPlaces(answer) > 0 ? composeFixed : composeLtr)(sortedGroup(slots, 'quotient'), values),
          remainder: composeLtr(sortedGroup(slots, 'remainder'), values),
        }
      : { kind: 'written', result: composeRtl(sortedGroup(slots, 'result'), values) };
  if (answer.ueberschlag !== undefined) r.ueberschlag = ueberschlag;
  if (comma !== undefined) r.comma = comma;
  return r;
}

function serialize(r: Response | null): string {
  return r && r.kind === 'written' ? `${r.result}|${r.remainder ?? ''}|${r.ueberschlag ?? ''}|${r.comma ?? ''}` : '|||';
}

/** Characters allowed in the Überschlag field: digits and digit-group spaces/dots ('8 000', '8.000'), with decimals also a comma. */
function cleanUeberschlag(raw: string, decimals: boolean): string {
  return raw.replace(decimals ? /[^\d .,\u202F\u00A0]/g : /[^\d .\u202F\u00A0]/g, '').slice(0, 18);
}

/** How to make the Überschlag (shown under its field). */
function ueberschlagHelp(answer: WrittenAnswer): string {
  return answer.op === 'div'
    ? answer.decimalPlaces
      ? 'Nimm Zahlen in der Nähe, die gut durcheinander teilbar sind, und rechne im Kopf.'
      : `Nimm statt ${fmt(answer.operands[0])} eine Zahl in der Nähe, die gut durch ${fmt(answer.operands[1])} teilbar ist, und rechne im Kopf.`
    : 'Runde jede Zahl auf die höchste Stelle und rechne im Kopf.';
}

function gradedFromResponse(answer: WrittenAnswer, slots: readonly Slot[], r: Response | null): Values {
  const out: Values = {};
  for (const s of slots) if (isGraded(s)) out[s.key] = '';
  if (!r || r.kind !== 'written') return out;
  const clean = (ch: string) => (/\d/.test(ch) ? ch : '');
  if (answer.op === 'div') {
    const quotient = sortedGroup(slots, 'quotient');
    // around a fixed comma the digits stand at the right end of the boxes
    const from = writtenPlaces(answer) > 0 ? quotient.length - r.result.length : 0;
    quotient.forEach((s, i) => (out[s.key] = clean(r.result[i - from] ?? '')));
    sortedGroup(slots, 'remainder').forEach((s, i) => (out[s.key] = clean((r.remainder ?? '')[i] ?? '')));
  } else {
    const chars = r.result.split('').reverse();
    sortedGroup(slots, 'result').forEach((s, i) => (out[s.key] = clean(chars[i] ?? '')));
  }
  return out;
}

function revealedValues(answer: WrittenAnswer, slots: readonly Slot[]): Values {
  const out: Values = {};
  if (answer.op === 'div') {
    const quotient = sortedGroup(slots, 'quotient');
    // Around a fixed comma the digits stand at the right end, with the 0 before the comma and no other leading zero (5,58, never 05,58).
    const places = writtenPlaces(answer);
    const q = places > 0 ? String(answer.result).padStart(places + 1, '0') : String(answer.result);
    const from = places > 0 ? quotient.length - q.length : 0;
    const rem = answer.remainder ? String(answer.remainder) : '';
    quotient.forEach((s, i) => (out[s.key] = q[i - from] ?? ''));
    sortedGroup(slots, 'remainder').forEach((s, i) => (out[s.key] = rem[i] ?? ''));
  } else {
    const len = Math.max(numLength(answer.result), writtenPlaces(answer) + 1);
    sortedGroup(slots, 'result').forEach((s) => (out[s.key] = s.pos < len ? String(digitAt(answer.result, s.pos)) : ''));
  }
  return out;
}

/** Keys of graded boxes to mark as "noch nicht richtig". */
function wrongKeys(answer: WrittenAnswer, slots: readonly Slot[], values: Values, result: CheckResult | null): Set<string> {
  const out = new Set<string>();
  if (!result || result.correct || result.invalid) return out;
  const cols = result.wrongColumns ?? [];
  if (answer.op === 'div') {
    const q = sortedGroup(slots, 'quotient');
    if (writtenPlaces(answer) > 0) {
      for (const c of cols) if (c < q.length) out.add(q[q.length - 1 - c].key);
      return out;
    }
    const filled = q.map((s) => values[s.key] ?? '');
    const first = filled.findIndex((v) => v !== '');
    let last = first;
    filled.forEach((v, i) => {
      if (v !== '') last = i;
    });
    const given = first < 0 ? 0 : last - first + 1;
    for (const c of cols) {
      const idx = c < given ? last - c : (first < 0 ? 0 : first) - (c - given + 1);
      if (idx >= 0 && idx < q.length) out.add(q[idx].key);
    }
    if (result.remainderCorrect === false) sortedGroup(slots, 'remainder').forEach((s) => out.add(s.key));
  } else {
    const byPlace = sortedGroup(slots, 'result');
    for (const c of cols) if (c < byPlace.length) out.add(byPlace[c].key);
  }
  return out;
}

/**
 * Boxes of a digit group (in entry order) that are empty but needed: gaps between typed digits, or the first
 * box while the group is empty. Boxes beyond the last typed digit are not needed (fewer digits than boxes).
 */
export function neededEmpty(ordered: readonly { key: string }[], values: Values): Set<string> {
  const filled = ordered.map((s) => (values[s.key] ?? '') !== '');
  const last = filled.lastIndexOf(true);
  if (last < 0) return new Set(ordered.length ? [ordered[0].key] : []);
  const out = new Set<string>();
  for (let i = 0; i < last; i++) if (!filled[i]) out.add(ordered[i].key);
  return out;
}

/** Reading order of a graded box for Enter navigation (0 is the Überschlag). */
function fieldOrder(s: Slot): number {
  return s.group === 'remainder' ? 100 + s.pos : 1 + s.pos;
}

/**
 * The digit just typed into a single-digit box. The box keeps its old digit until React re-renders, so the raw
 * value can be '87' (typed after the 8) or '78' (typed before it): drop one copy of the old digit.
 */
export function typedDigit(previous: string, digits: string): string {
  if (digits.length <= 1) return digits;
  const i = previous === '' ? -1 : digits.indexOf(previous);
  const rest = i < 0 ? digits : digits.slice(0, i) + digits.slice(i + 1);
  return rest.slice(-1);
}

/** Collapse the caret to the end of a single-digit box (a selected digit retyped unchanged would not fire onChange). */
function collapseCaret(el: HTMLInputElement): void {
  const n = el.value.length;
  try {
    if (el.selectionStart !== n || el.selectionEnd !== n) el.setSelectionRange(n, n);
  } catch {
    // selection not supported: nothing to do
  }
}

/** The operation of a task written in one line. */
const WRITTEN_SIGN = { add: '+', sub: '−', mul: '·', div: ':' } as const;

const NO_KEYS: ReadonlySet<string> = new Set();

// ─── Component ───────────────────────────────────────────────────────────────

export default function WrittenInput(props: AnswerInputProps<WrittenAnswer>) {
  const { answer } = props;
  // a new task gets a fresh component (helper boxes are local state)
  const key = `${answer.op}:${answer.operands.join(',')}:${answer.method ?? ''}`;
  return props.print ? <WrittenPrint answer={answer} /> : <WrittenInputInner key={key} {...props} />;
}

function WrittenInputInner({ answer, response, onChange, disabled, result, reveal, idBase, keypad, describedBy }: AnswerInputProps<WrittenAnswer>) {
  const built = useMemo(() => build(answer), [answer]);
  const { slots } = built;
  const [values, setValues] = useState<Values>(() => gradedFromResponse(answer, slots, response));
  const [ueb, setUeb] = useState(() => (response?.kind === 'written' ? (response.ueberschlag ?? '') : ''));
  // mul with decimals: the places after the comma the child has set in the result (src/core/check.ts)
  const places = writtenPlaces(answer);
  const commaByChild = answer.op === 'mul' && places > 0;
  const [comma, setComma] = useState<number | undefined>(() => (response?.kind === 'written' ? response.comma : undefined));
  // "changed after this check" is keyed by the check result it belongs to, so a new result shows all its
  // marks in its very first render (the page picks the first wrong field to focus right after that render)
  const [uebEditedAfter, setUebEditedAfter] = useState<CheckResult | null | undefined>(undefined);
  const uebEdited = uebEditedAfter === result;
  const lastEmitted = useRef(serialize(response));
  const refs = useRef(new Map<string, HTMLInputElement>());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scratchOpen, setScratchOpen] = useState(false);
  // On a narrow screen the table scrolls sideways: start at the right end, where the Einer are
  // (written calculations start there; otherwise the operands look cut off and the Einer column is hidden).
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const box = scrollRef.current;
    if (box && box.scrollWidth > box.clientWidth + 1) {
      box.scrollLeft = box.scrollWidth;
      // the leading digits start out of view, so the task stays readable as one line
      setScrolled(true);
    }
  }, []);
  useEffect(() => {
    // the line appears after the field got its place on the screen, and pushes it down
    const active = document.activeElement;
    if (scrolled && active instanceof HTMLElement && scrollRef.current?.contains(active)) keepAboveKeypad(active);
  }, [scrolled]);
  // boxes changed after the last check lose their "noch nicht" mark
  const [editedAfter, setEditedAfter] = useState<{ result: CheckResult | null; keys: ReadonlySet<string> }>(() => ({ result, keys: new Set() }));
  const edited: ReadonlySet<string> = editedAfter.result === result ? editedAfter.keys : NO_KEYS;
  const readOnly = disabled || reveal;
  // roving tab stops: Tab enters at the Einer (or the first quotient/remainder box); arrows move inside
  const tabStops = useMemo(() => {
    const stops = new Set<string>();
    // lowest position: result → Einer (place 0); quotient/remainder/scratch → leftmost box
    for (const group of ['result', 'quotient', 'remainder', 'scratch'] as const) {
      const g = sortedGroup(slots, group);
      if (g.length) stops.add(g[0].key);
    }
    return stops;
  }, [slots]);

  // external change (e.g. response cleared by the page): adopt it
  const prevResponse = useRef(response);
  useEffect(() => {
    if (response === prevResponse.current) return;
    prevResponse.current = response;
    const s = serialize(response);
    if (s !== lastEmitted.current) {
      lastEmitted.current = s;
      setValues((v) => ({ ...v, ...gradedFromResponse(answer, slots, response) }));
      setUeb(response?.kind === 'written' ? (response.ueberschlag ?? '') : '');
      setComma(response?.kind === 'written' ? response.comma : undefined);
    }
  }, [response, answer, slots]);

  const shown: Values = reveal ? { ...values, ...revealedValues(answer, slots) } : values;
  const wrong = reveal ? new Set<string>() : new Set([...wrongKeys(answer, slots, values, result)].filter((k) => !edited.has(k)));
  const allRight = !reveal && !!result?.correct;
  const wrongId = `${idBase}-wrong`;

  const emit = (next: Values, nextUeb: string = ueb, nextComma: number | undefined = comma) => {
    const r = compose(answer, slots, next, nextUeb, nextComma);
    lastEmitted.current = serialize(r);
    onChange(r);
  };

  const focusSlot = (s: Slot | undefined) => {
    if (!s) return;
    const el = refs.current.get(s.key);
    if (el) el.focus();
  };

  const visible = (s: Slot) => s.group !== 'scratch' || scratchOpen;

  /** Neighbour in the same row (+1 = to the right, −1 = to the left). */
  const horizontal = (s: Slot, delta: 1 | -1, sameGroup = false): Slot | undefined => {
    const candidates = slots.filter((o) => o.row === s.row && visible(o) && (!sameGroup || o.group === s.group) && (delta > 0 ? o.col > s.col : o.col < s.col));
    candidates.sort((x, y) => (delta > 0 ? x.col - y.col : y.col - x.col));
    return candidates[0];
  };

  const vertical = (s: Slot, delta: 1 | -1): Slot | undefined => {
    const rows = [...new Set(slots.filter((o) => visible(o)).map((o) => o.row))].sort((x, y) => x - y);
    const idx = rows.indexOf(s.row) + delta;
    if (idx < 0 || idx >= rows.length) return undefined;
    const inRow = slots.filter((o) => o.row === rows[idx] && visible(o));
    inRow.sort((x, y) => Math.abs(x.col - s.col) - Math.abs(y.col - s.col));
    return inRow[0];
  };

  const step = (s: Slot, forward: boolean): Slot | undefined => {
    const toRight = s.dir === 'ltr' ? forward : !forward;
    return horizontal(s, toRight ? 1 : -1, true);
  };

  const markEdited = (key: string) => {
    if (!edited.has(key)) setEditedAfter({ result, keys: new Set(edited).add(key) });
  };

  /** Set a box, report a changed graded box, and move on after a digit – also when the digit was already there. */
  const commit = (s: Slot, v: string, moveOn = true) => {
    if (v !== (values[s.key] ?? '')) {
      const next = { ...values, [s.key]: v };
      setValues(next);
      if (isGraded(s)) {
        emit(next);
        markEdited(s.key);
      }
    }
    if (moveOn && v !== '' && s.advance) focusSlot(step(s, true));
  };

  const placeComma = (next: number) => {
    setComma(next);
    emit(values, ueb, next);
  };

  const handleChange = (s: Slot, raw: string) => {
    if (readOnly) return;
    // The ',' key in a box of the result: the comma goes to the right of this box, so the digits typed so far come after it.
    if (commaByChild && s.group === 'result' && /,/.test(raw)) {
      placeComma(s.pos);
      return;
    }
    const prev = values[s.key] ?? '';
    const digits = raw.replace(/\D/g, '');
    // a letter or other non-digit only gets removed again; it does not move on
    commit(s, s.maxLen === 1 ? typedDigit(prev, digits) : digits.slice(-s.maxLen), digits !== prev);
  };

  const handleKey = (s: Slot, e: KeyboardEvent<HTMLInputElement>) => {
    // a digit on the keyboard always replaces a single-digit box and moves on, also when it is the same digit
    if (s.maxLen === 1 && /^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (readOnly) return;
      e.preventDefault();
      commit(s, e.key);
      return;
    }
    switch (e.key) {
      case 'Delete': {
        // the caret sits behind the digit, so Delete clears the box itself
        if (readOnly || s.maxLen !== 1 || (values[s.key] ?? '') === '') return;
        e.preventDefault();
        commit(s, '');
        return;
      }
      case 'Backspace': {
        if (readOnly || (values[s.key] ?? '') !== '') return;
        e.preventDefault();
        const prev = step(s, false);
        if (!prev) return;
        const next = { ...values, [prev.key]: '' };
        setValues(next);
        if (isGraded(prev)) {
          emit(next);
          markEdited(prev.key);
        }
        focusSlot(prev);
        return;
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.preventDefault();
        focusSlot(horizontal(s, e.key === 'ArrowRight' ? 1 : -1));
        return;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        e.preventDefault();
        focusSlot(vertical(s, e.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      default:
        return;
    }
  };

  // empty boxes that still need a digit (Enter goes there before checking)
  const needed = new Set<string>();
  for (const group of ['result', 'quotient', 'remainder'] as const) {
    const ordered = sortedGroup(slots, group);
    const range = group === 'result' ? ordered : ordered.slice(Math.max(0, ordered.findIndex((sl) => (values[sl.key] ?? '') !== '')));
    neededEmpty(range, values).forEach((k) => needed.add(k));
  }

  /** The comma stands on the right edge of a box: fixed in add, sub and div, where the child sets it in mul. */
  const commaAt = (s: Slot): boolean => {
    if (s.group === 'quotient' && places > 0) return s.pos === sortedGroup(slots, 'quotient').length - 1 - places;
    if (s.group !== 'result') return false;
    if (commaByChild) return (reveal ? places : comma) === s.pos && s.pos > 0;
    return places > 0 && s.pos === places;
  };

  const renderSlot = (s: Slot) => {
    const graded = isGraded(s);
    const isWrong = graded && wrong.has(s.key);
    const value = shown[s.key] ?? '';
    const cls = [
      graded ? 'digit-box wi-box' : 'wi-helper',
      s.group === 'partial' || s.group === 'scratch' ? 'wi-helper--digit' : '',
      isWrong ? 'is-wrong' : '',
      graded && allRight && value !== '' ? 'is-right' : '',
      graded && reveal ? 'wi-revealed' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <span className="wi-slot">
        <input
          ref={(el) => {
            if (el) refs.current.set(s.key, el);
            else refs.current.delete(s.key);
          }}
          id={`${idBase}-${s.key.replace(':', '-')}`}
          className={cls}
          type="text"
          inputMode={keypad ? 'none' : 'numeric'}
          tabIndex={tabStops.has(s.key) ? 0 : -1}
          autoComplete="off"
          spellCheck={false}
          value={value}
          readOnly={readOnly}
          aria-label={s.label}
          aria-invalid={isWrong || undefined}
          aria-describedby={describedByIds(graded && tabStops.has(s.key) && describedBy, isWrong && wrongId)}
          data-answer-field={graded ? '' : undefined}
          data-answer-order={graded ? fieldOrder(s) : undefined}
          data-answer-empty={graded ? String(needed.has(s.key)) : undefined}
          data-answer-optional={s.group === 'remainder' ? '' : undefined}
          data-answer-wrong={isWrong ? '' : undefined}
          onFocus={(e) => (s.maxLen === 1 ? collapseCaret(e.currentTarget) : e.currentTarget.select())}
          onSelect={s.maxLen === 1 ? (e: SyntheticEvent<HTMLInputElement>) => collapseCaret(e.currentTarget) : undefined}
          onChange={(e) => handleChange(s, e.currentTarget.value)}
          onKeyDown={(e) => handleKey(s, e)}
        />
        {isWrong ? (
          <span className="wi-mark" aria-hidden="true">
            ▲
          </span>
        ) : null}
        {commaAt(s) ? <span className="wi-comma" aria-hidden="true">,</span> : null}
      </span>
    );
  };

  const renderRows = (rows: readonly GRow[]) =>
    rows.map((row, r) => (
      <tr key={r} className={row.cls}>
        {row.cells.map((c, i) => {
          if (c.t === 'slot') return <td key={i} className="wi-cell wi-cell--slot">{renderSlot(c.slot)}</td>;
          if (c.t === 'head') return <th key={i} scope="col" className="wi-cell wi-headcell"><abbr title={placeNameAt(headPlace(row, i), places)}>{c.text}</abbr></th>;
          if (c.t === 'text') return <td key={i} className={`wi-cell ${c.cls ?? ''}`}>{c.text}{c.comma ? <span className="wi-comma" aria-hidden="true">,</span> : null}</td>;
          return <td key={i} className={`wi-cell ${c.cls ?? ''}`} />;
        })}
      </tr>
    ));

  const hasUeb = answer.ueberschlag !== undefined;
  const uebOff = hasUeb && !reveal && !uebEdited && result?.ueberschlagOk === false && !result.invalid;
  const uebFits = hasUeb && !reveal && !uebEdited && result?.ueberschlagOk === true && !result.invalid;
  const uebId = `${idBase}-ueb`;
  const uebNoteId = `${idBase}-ueb-note`;
  const uebHelpId = `${idBase}-ueb-help`;

  const ueberschlagField = hasUeb ? (
    <div className="wi-ueb">
      <div className="wi-ueb__row">
        <label className="wi-ueb__label" htmlFor={uebId}>
          Überschlag
        </label>
        <span className="wi-ueb__approx" aria-hidden="true">
          ≈
        </span>
        <input
          id={uebId}
          className={['num-input', 'wi-ueb__input', uebOff ? 'is-wrong' : '', uebFits ? 'is-right' : '', reveal ? 'wi-revealed' : ''].filter(Boolean).join(' ')}
          type="text"
          inputMode={keypad ? 'none' : 'numeric'}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="next"
          value={reveal ? fmt(answer.ueberschlag!) : ueb}
          readOnly={readOnly}
          aria-invalid={uebOff || undefined}
          aria-describedby={describedByIds(describedBy, uebOff ? uebNoteId : uebHelpId)}
          data-answer-field=""
          data-answer-order={0}
          data-answer-wrong={uebOff ? '' : undefined}
          onChange={(e) => {
            if (readOnly) return;
            const next = cleanUeberschlag(e.currentTarget.value, !!answer.decimalPlaces);
            if (next === ueb) return;
            setUeb(next);
            setUebEditedAfter(result);
            emit(values, next);
          }}
        />
        {uebOff ? <FieldMark state="wrong" /> : uebFits ? <FieldMark state="right" /> : null}
      </div>
      {uebOff ? (
        <p className="wi-ueb__note" id={uebNoteId}>
          Dein Überschlag passt noch nicht ganz. {ueberschlagHelp(answer)}
        </p>
      ) : (
        <p className="wi-ueb__help" id={uebHelpId}>
          {ueberschlagHelp(answer)}
        </p>
      )}
    </div>
  ) : null;

  const srStatus = allRight ? 'Alle Ziffern stimmen.' : wrong.size > 0 ? `${wrong.size === 1 ? 'Eine Stelle stimmt' : `${wrong.size} Stellen stimmen`} noch nicht. Sie sind markiert.` : '';

  if (answer.op === 'div') {
    const { dividend: a, divisor: d, shift, dividendPlaces } = shiftedDivision(answer.operands, answer.decimalPlaces);
    const q = sortedGroup(slots, 'quotient');
    const rem = sortedGroup(slots, 'remainder');
    const shown = decimalText(a, dividendPlaces);
    return (
      <div className="written-input written-input--div">
        {ueberschlagField}
        <p className="visually-hidden">{built.caption}</p>
        {shift > 0 && <p className="wi-shift" data-testid="wi-shift"><MathText text={keepTermsTogether(shiftStep(answer))} /></p>}
        <div className="wi-div-line" role="group" aria-label={`${shown} geteilt durch ${d}`}>
          <span className="wi-div-task" aria-hidden="true">
            {[...shown].map((x, i) => (
              <span key={i} className={x === ',' ? 'wi-static wi-static--comma' : 'wi-static'}>{x}</span>
            ))}
            <span className="wi-static wi-sign">:</span>
            {digitsOf(d).map((x, i) => (
              <span key={i} className="wi-static">{x}</span>
            ))}
            <span className="wi-static wi-sign">=</span>
          </span>
          <span className="wi-group" role="group" aria-label="Ergebnis">
            {q.map((s) => (
              <span key={s.key}>{renderSlot(s)}</span>
            ))}
          </span>
          {rem.length > 0 && (
            <span className="wi-rest">
              <span className="wi-static wi-sign wi-rest-label" aria-hidden="true">Rest</span>
              <span className="wi-group" role="group" aria-label="Rest">
                {rem.map((s) => (
                  <span key={s.key}>{renderSlot(s)}</span>
                ))}
              </span>
            </span>
          )}
        </div>
        <p className="wi-legend">{built.legend}</p>
        <button type="button" className="btn wi-scratch-toggle" aria-expanded={scratchOpen} onClick={() => setScratchOpen((o) => !o)}>
          {scratchOpen ? 'Nebenrechnungen ausblenden' : 'Platz für Nebenrechnungen'}
        </button>
        {scratchOpen ? (
          <div className="wi-scroll">
            <table className="wi-table wi-table--scratch">
              <caption className="visually-hidden">Nebenrechnungen, werden nicht bewertet</caption>
              <tbody>{renderRows(built.rows)}</tbody>
            </table>
          </div>
        ) : null}
        <span id={wrongId} hidden>Diese Stelle stimmt noch nicht.</span>
        {srStatus ? <p className="visually-hidden">{srStatus}</p> : null}
      </div>
    );
  }

  return (
    <div className={`written-input written-input--${answer.op}`}>
      {ueberschlagField}
      {scrolled && <p className="wi-whole-task" aria-hidden="true">{answer.operands.map((n, i) => (answer.decimalPlaces ? decimalText(n, answer.decimalPlaces[i]) : fmt(n))).join(` ${WRITTEN_SIGN[answer.op]} `)}</p>}
      <div className="wi-scroll" ref={scrollRef}>
        <table className="wi-table">
          <caption className="visually-hidden">{built.caption}</caption>
          <tbody>{renderRows(built.rows)}</tbody>
        </table>
      </div>
      {commaByChild && (
        <div className="wi-comma-row" role="group" aria-label="Komma im Ergebnis">
          <button type="button" className="btn wi-comma-btn" disabled={readOnly || (comma ?? 0) >= sortedGroup(slots, 'result').length - 1} onClick={() => placeComma((comma ?? 0) + 1)}>
            <span aria-hidden="true">◀</span> Komma nach links
          </button>
          <button type="button" className="btn wi-comma-btn" disabled={readOnly || comma === undefined || comma === 0} onClick={() => placeComma((comma ?? 1) - 1)}>
            Komma nach rechts <span aria-hidden="true">▶</span>
          </button>
          <output className="wi-comma-state" aria-live="polite">{commaState(reveal ? places : comma)}</output>
          {result && !result.invalid && result.commaCorrect === false && !reveal ? <p className="wi-comma-note">Prüfe das Komma: Zähle die Stellen nach dem Komma in beiden Faktoren zusammen.</p> : null}
        </div>
      )}
      <p className="wi-legend">{built.legend}</p>
      {/* hidden: only read through aria-describedby of a marked box, never in browse mode */}
      <span id={wrongId} hidden>Diese Stelle stimmt noch nicht.</span>
      {srStatus ? <p className="visually-hidden">{srStatus}</p> : null}
    </div>
  );
}

/** The state of the comma in words, as the one thing in the result that a box does not show by itself. */
function commaState(places: number | undefined): string {
  if (places === undefined) return 'Noch kein Komma gesetzt';
  if (places === 0) return 'Kein Komma im Ergebnis';
  return places === 1 ? '1 Stelle nach dem Komma' : `${places} Stellen nach dem Komma`;
}

/** The shift of the comma as a worked step (§6): 'Verschiebe das Komma bei beiden Zahlen um 1 Stelle: 0,75 : 0,5 = 7,5 : 5'. */
function shiftStep(answer: WrittenAnswer): string {
  const { dividend, divisor, shift, dividendPlaces } = shiftedDivision(answer.operands, answer.decimalPlaces);
  const [pa, pd] = answer.decimalPlaces ?? [0, 0];
  return `Verschiebe das Komma bei beiden Zahlen um ${shift === 1 ? '1 Stelle' : `${shift} Stellen`}: ${decimalText(answer.operands[0], pa)} : ${decimalText(answer.operands[1], pd)} = ${decimalText(dividend, dividendPlaces)} : ${divisor}`;
}

/** Place of a header cell (header rows have an empty sign cell first). */
function headPlace(row: GRow, index: number): number {
  return row.cells.length - 1 - index;
}

// ─── Print ───────────────────────────────────────────────────────────────────

/** Worksheet line for the Überschlag (tasks that ask for one first). */
function PrintUeberschlag({ answer }: { answer: WrittenAnswer }) {
  if (answer.ueberschlag === undefined) return null;
  return (
    <p className="wi-print-ueb">
      Überschlag: <span className="wi-print-ueb__line" aria-hidden="true" />
    </p>
  );
}

function WrittenPrint({ answer }: { answer: WrittenAnswer }) {
  const box = (k: number) => <span key={k} className="digit-box wi-print-box" />;
  if (answer.op === 'div') {
    const { dividend: a, divisor: d, shift, dividendPlaces } = shiftedDivision(answer.operands, answer.decimalPlaces);
    const places = writtenPlaces(answer);
    const L = Math.max(numLength(a), places + 1);
    const shown = decimalText(a, dividendPlaces).replace(',', '');
    const commaAfter = dividendPlaces > 0 ? shown.length - 1 - dividendPlaces : -1;
    // the Dividend is the first row of the Kästchen grid (one column in front for the minus sign), so the
    // Teilprodukte can be written under the matching digits; ': d = □□□ R □□' follows in the same row
    return (
      <div className="written-input written-input--print written-input--print-div">
        <PrintUeberschlag answer={answer} />
        {shift > 0 && <p className="wi-shift"><MathText text={shiftStep(answer)} /></p>}
        <table className="wi-print-grid wi-print-div">
          <caption className="visually-hidden">{`Teile schriftlich: ${decimalText(a, dividendPlaces)} geteilt durch ${d}. Darunter ist Platz für die Nebenrechnungen.`}</caption>
          <tbody>
            <tr className="wi-print-task">
              <td className="wi-print-cell" />
              {[...shown].map((x, i) => (
                <td key={i} className="wi-print-cell wi-print-digit">{x}{i === commaAfter ? ',' : ''}</td>
              ))}
              <td className="wi-print-tail">
                <span className="wi-static wi-sign">:</span>
                {digitsOf(d).map((x, i) => (
                  <span key={i} className="wi-static">{x}</span>
                ))}
                <span className="wi-static wi-sign">=</span>
                <span className="wi-group">{Array.from({ length: L }, (_, i) => (places > 0 && i === L - places ? [<span key={`c${i}`} className="wi-static">,</span>, box(i)] : box(i)))}</span>
                {!answer.decimalPlaces && (
                  <>
                    <span className="wi-static wi-sign">Rest</span>
                    <span className="wi-group">{Array.from({ length: numLength(d) }, (_, i) => box(i))}</span>
                  </>
                )}
              </td>
            </tr>
            {Array.from({ length: 2 * L }, (_, r) => (
              <tr key={r} aria-hidden="true">
                {Array.from({ length: L + 1 }, (_, c) => (
                  <td key={c} className="wi-print-cell" />
                ))}
                <td className="wi-print-tail" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const built = build(answer);
  const keep = ['wi-head', 'wi-operand', 'wi-top-row', 'wi-partial-row', 'wi-result-row'];
  const rows = built.rows
    .filter((r) => keep.some((k) => (r.cls ?? '').split(' ').includes(k)))
    .map((r) => ({
      cls: r.cls,
      cells: r.cells.map((c, i) =>
        c.t === 'slot' ? (
          <td key={i} className="wi-cell">{box(i)}{writtenPlaces(answer) > 0 && answer.op !== 'mul' && c.slot.group === 'result' && c.slot.pos === writtenPlaces(answer) ? <span className="wi-comma" aria-hidden="true">,</span> : null}</td>
        ) : c.t === 'text' || c.t === 'head' ? (
          <td key={i} className={`wi-cell ${c.t === 'head' ? 'wi-headcell' : c.cls ?? ''}`}>{c.text}{c.t === 'text' && c.comma ? <span className="wi-comma" aria-hidden="true">,</span> : null}</td>
        ) : (
          <td key={i} className="wi-cell" />
        ),
      ),
    }));
  return (
    <div className="written-input written-input--print">
      <PrintUeberschlag answer={answer} />
      <table className="wi-table">
        <caption className="visually-hidden">{built.caption}</caption>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={r.cls}>{r.cells}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
