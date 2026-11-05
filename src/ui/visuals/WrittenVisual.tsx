/**
 * Column layout of a written calculation (schriftliches Rechnen) in German Kästchen notation.
 *
 * - showSolution: result plus Überträge (add, mul), Entbündeln marks (Abziehen: crossed-out digit with the new
 *   value above; a digit that was first made smaller and then entbündelt shows both stages, 4 → 3 → 13) or
 *   Erweitern marks (Ergänzen: small 1 at the Subtrahend), partial products (mul) and the division steps below
 *   the one-line notation '5432 : 4 = 1358'.
 * - shownResult / shownPartials (Fehlerdetektiv) and masks (Ziffernrätsel).
 * - decimalPlaces: add and sub comma under comma with muted end zeros, mul with the comma in the factors and the result, div with the shift of the comma as its first line (§6).
 * Long operands scroll sideways inside .written-visual, never the page (docs/research.md §6).
 * Rendered as a layout table inside role="img" with a German aria-label describing the whole calculation.
 */
import type { VisualOf, WrittenMask } from '../../core/types';
import { useEffect, useRef } from 'react';
import { toSpeech } from '../../core/format';
import {
  alignedOperands,
  correctDecimalResult,
  decimalText,
  digitAt,
  digitsOf,
  layoutAdd,
  layoutDiv,
  layoutMul,
  layoutSub,
  numLength,
  partialsSpeech,
  placeDative,
  shiftedDivision,
  writtenPlaces,
  type SubColumn,
} from '../../core/written';
import type { VisualProps } from './types';
import { useScrollStop } from './useScrollStop';
import './WrittenVisual.css';

interface Cell {
  text?: string;
  /** Small prefix (Ergänzen: the extended 1). */
  ext?: string;
  struck?: boolean;
  mask?: string;
  place?: number;
  cls?: string;
  /** A comma on the right edge of this cell. */
  comma?: boolean;
}

interface Row {
  cells: Cell[];
  cls?: string;
}

const OP_TITLE = { add: 'Addition', sub: 'Subtraktion', mul: 'Multiplikation', div: 'Division' } as const;
const OP_SIGN = { add: '+', sub: '−', mul: '·', div: ':' } as const;
const OP_WORD = { add: 'plus', sub: 'minus', mul: 'mal', div: 'geteilt durch' } as const;

function maskAt(masks: readonly WrittenMask[], row: 'operand' | 'result', index: number, place: number): WrittenMask | undefined {
  return masks.find((m) => m.row === row && (row === 'result' || (m.index ?? 0) === index) && m.place === place);
}

/** Digit cells of n, right-aligned in `width` cells; leading positions empty. */
function digitCells(n: number | null, width: number, masks: readonly WrittenMask[], row: 'operand' | 'result', index: number): Cell[] {
  const len = n === null ? 0 : numLength(n);
  return Array.from({ length: width }, (_, i) => {
    const place = width - 1 - i;
    if (n === null || place >= len) return { place };
    const m = maskAt(masks, row, index, place);
    return m ? { place, mask: m.label } : { place, text: String(digitAt(n, place)) };
  });
}

function emptyBoxes(width: number): Cell[] {
  return Array.from({ length: width }, (_, i) => ({ place: width - 1 - i, cls: 'wv-box' }));
}

// ─── Builders ────────────────────────────────────────────────────────────────

function buildAdd(v0: VisualOf<'written'>): Row[] {
  const v = { ...v0, operands: alignedOperands(v0.operands, v0.decimalPlaces) };
  const { masks = [], shownResult } = v;
  const lay = layoutAdd(v.operands);
  const result = shownResult ?? (v.showSolution ? lay.result : null);
  const width = Math.max(lay.width, result === null ? 0 : numLength(result), writtenPlaces(v0) + 1);
  const rows: Row[] = [];
  v.operands.forEach((n, i) => rows.push({
    cls: 'wv-operand',
    cells: [{ text: i > 0 ? '+' : '', cls: 'wv-sign' }, ...digitCells(n, width, masks, 'operand', i)],
  }));
  if (v.showSolution && lay.carries.some((c) => c > 0)) {
    rows.push({
      cls: 'wv-carry-row',
      cells: [{ cls: 'wv-sign' }, ...Array.from({ length: width }, (_, i) => {
        const place = width - 1 - i;
        const c = lay.carries[place] ?? 0;
        return { place, text: c > 0 ? String(c) : undefined, cls: 'wv-carry' };
      })],
    });
  }
  rows.push({
    cls: 'wv-result',
    cells: [{ cls: 'wv-sign' }, ...(result === null ? emptyBoxes(width) : digitCells(result, width, masks, 'result', 0))],
  });
  return rows;
}

/** Abziehen: the Minuend digit was made smaller by an Entbündeln further right (4 → 3, or 0 → 9). */
function reducedFirst(c: SubColumn): boolean {
  return c.before !== c.a;
}

function buildSub(v0: VisualOf<'written'>): Row[] {
  const v = { ...v0, operands: alignedOperands(v0.operands, v0.decimalPlaces) };
  const { masks = [], shownResult } = v;
  const [a, b] = v.operands;
  const method = v.method ?? 'abziehen';
  const lay = layoutSub(a, b, method);
  const result = shownResult ?? (v.showSolution ? lay.result : null);
  // a shown (wrong) result may be longer than the Minuend
  const width = Math.max(lay.width, result === null ? 0 : numLength(result), writtenPlaces(v0) + 1);
  const rows: Row[] = [];
  const minuend = digitCells(a, width, masks, 'operand', 0);
  if (v.showSolution && method === 'abziehen' && lay.columns.some((c) => c.top !== c.a)) {
    /** One row of small digits above the Minuend; `pick` returns the cell content of a column (or nothing). */
    const regroupRow = (pick: (col: SubColumn) => Pick<Cell, 'text' | 'struck'> | null): Row => ({
      cls: 'wv-carry-row wv-regroup-row',
      cells: [{ cls: 'wv-sign' }, ...Array.from({ length: width }, (_, i): Cell => {
        const place = width - 1 - i;
        const col = lay.columns[place];
        const content = col ? pick(col) : null;
        return { place, cls: 'wv-carry', ...(content ?? {}) };
      })],
    });
    // upper row: columns that were first made smaller and then entbündelt themselves (4 → 3 → 13)
    if (lay.columns.some((c) => reducedFirst(c) && c.regrouped)) {
      rows.push(regroupRow((c) => (reducedFirst(c) && c.regrouped ? { text: String(c.top) } : null)));
    }
    // lower row: the smaller digit (crossed out again if it was entbündelt), or the entbündelte value
    rows.push(regroupRow((c) => {
      if (reducedFirst(c)) return { text: String(c.before), struck: c.regrouped };
      return c.regrouped ? { text: String(c.top) } : null;
    }));
    for (const cell of minuend) {
      const col = cell.place === undefined ? undefined : lay.columns[cell.place];
      if (col && col.top !== col.a) cell.struck = true;
    }
  }
  if (v.showSolution && method === 'ergaenzen') {
    for (const cell of minuend) {
      const col = cell.place === undefined ? undefined : lay.columns[cell.place];
      if (col?.extended) cell.ext = '1';
    }
  }
  rows.push({ cls: 'wv-operand', cells: [{ cls: 'wv-sign' }, ...minuend] });
  rows.push({ cls: 'wv-operand', cells: [{ text: OP_SIGN.sub, cls: 'wv-sign' }, ...digitCells(b, width, masks, 'operand', 1)] });
  if (v.showSolution && method === 'ergaenzen' && lay.columns.some((c) => c.carryIn > 0)) {
    rows.push({
      cls: 'wv-carry-row',
      cells: [{ cls: 'wv-sign' }, ...Array.from({ length: width }, (_, i) => {
        const place = width - 1 - i;
        return { place, text: (lay.columns[place]?.carryIn ?? 0) > 0 ? '1' : undefined, cls: 'wv-carry' };
      })],
    });
  }
  rows.push({
    cls: 'wv-result',
    cells: [{ cls: 'wv-sign' }, ...(result === null ? emptyBoxes(width) : digitCells(result, width, masks, 'result', 0))],
  });
  return rows;
}

function buildMul(v: VisualOf<'written'>): Row[] {
  const { masks = [], shownResult, shownPartials } = v;
  const [a, b] = v.operands;
  const [pa, pb] = v.decimalPlaces ?? [0, 0];
  const places = pa + pb;
  const cellsA = factorCells(a, pa, masks, 0);
  const cellsB = factorCells(b, pb, masks, 1);
  const la = cellsA.length;
  const lb = numLength(b);
  const width = la + 1 + cellsB.length;
  const lay = layoutMul(a, b);
  const result = shownResult ?? (v.showSolution ? lay.result : null);
  // grid column of a place (0 = Einer at the right edge)
  const atPlace = (place: number) => width - 1 - place;
  const top: Cell[] = [...cellsA, { text: OP_SIGN.mul, cls: 'wv-op' }, ...cellsB];
  // places for highlighting: with a one-digit second factor, result digit p comes from digit p of the first factor,
  // so that digit carries place p ('·' and the second factor have none). With partial products the columns are
  // only shared by the partial products and the result.
  if (lb === 1) top.slice(0, la).forEach((c, i) => (c.place = la - 1 - i));
  const rows: Row[] = [{ cls: 'wv-top', cells: top }];
  const placeRow = (n: number | null, shift: number, cls: string, isResult: boolean): Row => {
    const cells: Cell[] = Array.from({ length: width }, (_, i) => ({ place: width - 1 - i }));
    if (n !== null) {
      const len = Math.max(numLength(n), isResult ? places + 1 : 0);
      for (let p = 0; p < len; p++) {
        const col = atPlace(p + shift);
        if (col < 0) continue;
        const m = isResult ? maskAt(masks, 'result', 0, p) : undefined;
        cells[col] = m ? { place: p + shift, mask: m.label } : { place: p + shift, text: p < numLength(n) ? String(digitAt(n, p)) : '0', ...(isResult && places > 0 && p === places ? { comma: true } : {}) };
      }
    } else {
      for (let p = 0; p < width - 1; p++) cells[atPlace(p)] = { place: p, cls: 'wv-box' };
    }
    return { cls, cells };
  };
  const partials = shownPartials ?? (v.showSolution && lb > 1 ? lay.partials.map((p) => ({ value: p.value, shift: p.shift })) : null);
  if (partials && partials.length > 0 && (lb > 1 || shownPartials)) {
    for (const part of partials) rows.push(placeRow(part.value, part.shift, 'wv-partial', false));
  }
  if (v.showSolution) {
    const carries = lb > 1 ? lay.sumCarries : lay.partials[0].carries;
    const limit = lb > 1 ? carries.length : la;
    if (carries.some((c, p) => c > 0 && p < limit)) {
      rows.push({
        cls: 'wv-carry-row',
        cells: Array.from({ length: width }, (_, i) => {
          const place = width - 1 - i;
          const c = place < limit ? carries[place] ?? 0 : 0;
          return { place, text: c > 0 ? String(c) : undefined, cls: 'wv-carry' };
        }),
      });
    }
  }
  const resultRow = placeRow(result, 0, partials && partials.length > 0 ? 'wv-result' : 'wv-result-plain', true);
  rows.push(resultRow);
  return rows;
}

function buildDiv(v: VisualOf<'written'>): Row[] {
  const { shownResult } = v;
  const { dividend: a, divisor: d, dividendPlaces } = shiftedDivision(v.operands, v.decimalPlaces);
  const lay = layoutDiv(a, d);
  const places = writtenPlaces(v);
  // Written with its 0 before the comma: 0,75 stands as 0 7 5, one column more than the layout counts.
  const dividendDigits = String(a).padStart(dividendPlaces + 1, '0').split('');
  const offset = dividendDigits.length - numLength(a);
  const L = dividendDigits.length;
  const quotient = shownResult ?? (v.showSolution ? lay.quotient : null);
  const remainder = shownResult === undefined && v.showSolution ? lay.remainder : 0;
  // columns: sign | L dividend digits | ':' | divisor digits | '=' | quotient | 'Rest' | remainder
  const qCells: Cell[] =
    quotient === null
      ? Array.from({ length: L }, (_, i) => ({ cls: 'wv-box', comma: places > 0 && i === L - 1 - places }))
      : String(quotient).padStart(places + 1, '0').split('').map((q, i, all) => ({ text: q, place: all.length - 1 - i, comma: places > 0 && all.length - 1 - i === places }));
  const tail: Cell[] = [{ text: ':', cls: 'wv-op' }, ...digitsOf(d).map((x) => ({ text: String(x) })), { text: '=', cls: 'wv-op' }, ...qCells];
  if (quotient !== null && remainder > 0) tail.push({ text: 'Rest', cls: 'wv-op wv-rest' }, ...digitsOf(remainder).map((x) => ({ text: String(x) })));
  const width = 1 + L + tail.length;
  const rows: Row[] = [{ cls: 'wv-top-div', cells: [{ cls: 'wv-sign' }, ...dividendDigits.map((x, i) => ({ text: x, comma: dividendPlaces > 0 && L - 1 - i === dividendPlaces })), ...tail] }];
  if (!v.showSolution) return rows;
  const blank = (): Cell[] => Array.from({ length: width }, () => ({}));
  /** Write n right-aligned so that its last digit is in dividend column `end` (0-based from the left). */
  const writeAt = (cells: Cell[], n: number, end: number, extra?: string) => {
    const ds = digitsOf(n);
    ds.forEach((x, i) => {
      const col = 1 + offset + end - (ds.length - 1 - i);
      if (col >= 0) cells[col] = { text: String(x), cls: extra };
    });
    return 1 + offset + end - (ds.length - 1);
  };
  lay.steps.forEach((s, k) => {
    const prod = blank();
    const start = writeAt(prod, s.product, s.end, 'wv-under');
    prod[start - 1] = { text: '−', cls: 'wv-under wv-minus' };
    rows.push({ cls: 'wv-step', cells: prod });
    const next = blank();
    if (k < lay.steps.length - 1) writeAt(next, s.diff * 10 + digitsOf(a)[s.end + 1], s.end + 1);
    else writeAt(next, s.diff, s.end);
    rows.push({ cls: 'wv-step', cells: next });
  });
  return rows;
}

// ─── Decimal numbers ────────────────────────────────────────────────────────

/** add, sub: run the natural-number layout on the aligned operands, then set the comma, the 0 before it and the muted end zeros. */
function withComma(rows: Row[], v: VisualOf<'written'>): Row[] {
  const places = writtenPlaces(v);
  if (places === 0) return rows;
  let operand = 0;
  for (const row of rows) {
    const cls = row.cls ?? '';
    if (/carry|regroup|mark/.test(cls)) continue;
    const isOperand = /operand|minuend|subtrahend/.test(cls);
    const own = isOperand ? (v.decimalPlaces?.[operand++] ?? places) : places;
    for (const c of row.cells) {
      if (c.place === undefined) continue;
      if (c.place === places) c.comma = true;
      if (c.place <= places && !c.text && !c.mask && !/wv-box/.test(c.cls ?? '')) c.text = '0';
      if (isOperand && c.place < places - own) c.cls = [c.cls, 'wv-padded'].filter(Boolean).join(' ');
    }
  }
  return rows;
}

/** The digits of one factor as written, with its leading zero and comma: 4 with 1 place is 0,4. */
function factorCells(n: number, places: number, masks: readonly WrittenMask[], index: number): Cell[] {
  const digits = String(n).padStart(places + 1, '0').split('');
  return digits.map((d, i) => {
    const place = digits.length - 1 - i;
    const m = maskAt(masks, 'operand', index, place);
    const cell: Cell = m ? { mask: m.label } : { text: d };
    if (places > 0 && place === places) cell.comma = true;
    return cell;
  });
}

/** The shift of the comma in one line (§6). */
function shiftLine(v: VisualOf<'written'>): string | null {
  if (v.op !== 'div' || !v.decimalPlaces) return null;
  const { dividend, divisor, shift, dividendPlaces } = shiftedDivision(v.operands, v.decimalPlaces);
  if (shift === 0) return null;
  return `Komma um ${shift === 1 ? '1 Stelle' : `${shift} Stellen`} verschieben: ${decimalText(v.operands[0], v.decimalPlaces[0])} : ${decimalText(v.operands[1], v.decimalPlaces[1])} = ${decimalText(dividend, dividendPlaces)} : ${divisor}`;
}

// ─── Description ─────────────────────────────────────────────────────────────

function spokenNumber(n: number, masks: readonly WrittenMask[], row: 'operand' | 'result', index: number): string {
  if (!masks.some((m) => m.row === row && (row === 'result' || (m.index ?? 0) === index))) return String(n);
  const len = numLength(n);
  const parts: string[] = [];
  for (let p = len - 1; p >= 0; p--) {
    const m = maskAt(masks, row, index, p);
    parts.push(m ? `Lücke ${m.label}` : String(digitAt(n, p)));
  }
  return parts.join(' ');
}

export function describeWritten(v: VisualOf<'written'>): string {
  const { masks = [], shownResult, shownPartials } = v;
  if (v.decimalPlaces) {
    const places = writtenPlaces(v);
    const task = v.operands.map((n, i) => decimalText(n, v.decimalPlaces?.[i] ?? 0)).join(` ${OP_WORD[v.op]} `);
    const shift = shiftLine(v);
    const shown = shownResult ?? (v.showSolution ? correctDecimalResult(v.op, v.operands, v.decimalPlaces) : null);
    return toSpeech(`Schriftliche ${OP_TITLE[v.op]}: ${task}.${shift ? ` ${shift}.` : ''}${shown !== null ? ` ${shownResult !== undefined ? 'Darunter steht als Ergebnis' : 'Ergebnis'} ${decimalText(shown, places)}.` : ''}`);
  }
  const task = v.operands.map((n, i) => spokenNumber(n, masks, 'operand', i)).join(` ${OP_WORD[v.op]} `);
  let text = `Schriftliche ${OP_TITLE[v.op]}: ${task}`;
  if (v.showSolution) {
    const res = correctDecimalResult(v.op, v.operands, undefined);
    const rem = v.op === 'div' ? v.operands[0] % v.operands[1] : 0;
    text += `, Ergebnis ${res}${rem ? ` Rest ${rem}` : ''}`;
    if (v.op === 'add') {
      const carries = layoutAdd(v.operands).carries.map((c, p) => (c > 0 ? `${c} bei den ${placeDative(p)}` : '')).filter(Boolean);
      if (carries.length) text += `. Übertrag ${carries.join(', ')}`;
    } else if (v.op === 'sub') {
      const lay = layoutSub(v.operands[0], v.operands[1], v.method ?? 'abziehen');
      const marked = lay.columns.filter((c) => (lay.method === 'abziehen' ? c.regrouped : c.extended)).map((c) => placeDative(c.place));
      if (marked.length) text += `. ${lay.method === 'abziehen' ? 'Entbündelt' : 'Erweitert'} bei den ${marked.join(', ')}`;
      if (lay.method === 'abziehen') {
        // the new digits above the Minuend, both stages where a digit changed twice
        const changes = lay.columns
          .filter((c) => c.top !== c.a)
          .map((c) => `bei den ${placeDative(c.place)}: aus ${c.a} wird ${reducedFirst(c) ? c.before : c.top}${reducedFirst(c) && c.regrouped ? `, dann ${c.top}` : ''}`);
        if (changes.length) text += `. Neue Ziffern ${changes.join('; ')}`;
      }
    } else if (v.op === 'mul' && v.operands[1] >= 10) {
      const parts = partialsSpeech(layoutMul(v.operands[0], v.operands[1]).partials);
      if (parts) text += `. ${parts}`;
    }
  } else if (shownResult !== undefined) {
    text += `, darunter steht als Ergebnis ${spokenNumber(shownResult, masks, 'result', 0)}`;
    // Fehlerdetektiv: the child's partial products (the planted mistake may be in them)
    const parts = v.op === 'mul' ? partialsSpeech(shownPartials) : '';
    if (parts) text += `. ${parts}`;
  }
  return toSpeech(`${text}.`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WrittenVisual({ visual, print }: VisualProps<VisualOf<'written'>>) {
  const box = useRef<HTMLDivElement>(null);
  const { tabIndex } = useScrollStop(box, '');
  // A wide calculation scrolls inside its box, never the page; it starts at the right end, where the Einer are.
  useEffect(() => {
    const el = box.current;
    if (el && visual.op !== 'div' && el.scrollWidth > el.clientWidth + 1) el.scrollLeft = el.scrollWidth;
  }, [visual]);
  const rows =
    visual.op === 'add' ? withComma(buildAdd(visual), visual) : visual.op === 'sub' ? withComma(buildSub(visual), visual) : visual.op === 'mul' ? buildMul(visual) : buildDiv(visual);
  const shift = shiftLine(visual);
  const width = Math.max(...rows.map((r) => r.cells.length));
  return (
    <div ref={box} className={`visual written-visual${print ? ' written-visual--print' : ''}`} role="img" aria-label={describeWritten(visual)} tabIndex={tabIndex}>
      {shift && <p className="wv-shift" aria-hidden="true">{shift}</p>}
      <table className="wv-table" aria-hidden="true">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className={row.cls}>
              {Array.from({ length: width }, (_, i) => {
                const c = row.cells[i] ?? {};
                const cls = ['wv-cell', c.cls, c.struck ? 'wv-struck' : '', c.mask ? 'wv-mask' : ''].filter(Boolean).join(' ');
                return (
                  <td key={i} className={cls}>
                    {c.ext ? <span className="wv-ext">{c.ext}</span> : null}
                    {c.mask ?? c.text ?? ''}
                    {c.comma ? <span className="wv-comma">,</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
