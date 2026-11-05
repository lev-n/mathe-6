import { describe, expect, it } from 'vitest';
import { NO_MINUS_REASON, parseNumber } from './parse';

const ok = (raw: string) => {
  const r = parseNumber(raw);
  if (!r.ok) throw new Error(`expected ok for "${raw}": ${r.reason}`);
  return r.value;
};
const bad = (raw: string) => {
  const r = parseNumber(raw);
  if (r.ok) throw new Error(`expected reason for "${raw}", got ${r.value}`);
  return r.reason;
};

describe('parseNumber', () => {
  it('accepts whole numbers, also with stray spaces', () => {
    expect(ok(' 42 ')).toBe(42);
    expect(ok('1 00')).toBe(100);
    expect(ok('007')).toBe(7);
  });
  it('gives friendly reasons instead of judging unreadable input', () => {
    expect(bad('')).toMatch(/Zahl ein/);
    expect(bad('abc')).toMatch(/Ziffern/);
    expect(bad('3,5')).toMatch(/ganze Zahl/);
    expect(bad('3.5')).toMatch(/ganze Zahl/);
  });
  it('a dot and three places: thousands where a whole number or at most two places are asked for', () => {
    expect(parseNumber('2.500')).toEqual({ ok: true, value: 2500 });
    expect(parseNumber('3.125', 2)).toEqual({ ok: true, value: 3125 });
    expect(parseNumber('1.250.000', 3)).toEqual({ ok: true, value: 1250000 });
  });
  it('a dot and three places on an item with three places: a question back, never a guess', () => {
    expect(parseNumber('3.125', 3)).toEqual({ ok: false, reason: 'Meinst du 3,125 oder 3125? Schreibe die Zahl ohne Punkt.' });
    expect(parseNumber('12.500', 3).ok).toBe(false);
    expect(parseNumber('−3.125', 3, true).ok).toBe(false);
    // what is clear stays read
    expect(parseNumber('3,125', 3)).toEqual({ ok: true, value: 3.125 });
    expect(parseNumber('3.5', 3)).toEqual({ ok: true, value: 3.5 });
    expect(parseNumber('3.12', 3)).toEqual({ ok: true, value: 3.12 });
    expect(parseNumber('0.125', 3)).toEqual({ ok: true, value: 0.125 });
  });
  it('a leading 0 never reads as a thousands group', () => {
    expect(parseNumber('0.125', 0).ok).toBe(false);
    expect(parseNumber('0.125', 2).ok).toBe(false);
  });
  it('signed items accept a minus and a plus; −0 is 0', () => {
    const signed = (t: string) => parseNumber(t, 0, true);
    expect(signed('−5')).toEqual({ ok: true, value: -5 });
    expect(signed('-5')).toEqual({ ok: true, value: -5 });
    expect(signed('+5')).toEqual({ ok: true, value: 5 });
    const zero = signed('−0');
    expect(zero).toEqual({ ok: true, value: 0 });
    expect(zero.ok && Object.is(zero.value, 0)).toBe(true);
  });
  it('other items reject a minus with a calm message', () => {
    expect(parseNumber('−5')).toEqual({ ok: false, reason: NO_MINUS_REASON });
    expect(parseNumber('-5')).toEqual({ ok: false, reason: NO_MINUS_REASON });
  });
});
