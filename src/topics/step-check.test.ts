import { describe, expect, it } from 'vitest';
import { checkStepText, evalSide } from './step-check';

describe('step checker (self-test)', () => {
  it('evaluates quantities in base units', () => {
    expect(evalSide('4 · 100 cm')?.value).toBe(4000);
    expect(evalSide('2 km 50 m')?.value).toBe(2_050_000);
    expect(evalSide('1 h 25 min')?.value).toBe(5100);
    expect(evalSide('2 ¾ kg')?.value).toBe(2750);
    expect(evalSide('360 € : 24')?.value).toBe(1500);
    expect(evalSide('Preis + 3 €')).toBeNull();
  });
  it('finds wrong lines and accepts right ones', () => {
    expect(checkStepText('4 m = 4 · 100 cm = 400 cm')).toBeNull();
    expect(checkStepText('Rechnung: 459 − 109 = 350')).toBeNull();
    expect(checkStepText('95 : 8 = 11 Rest 7')).toBeNull();
    expect(checkStepText('1,5 m = 15 cm')).toMatch(/mismatch/);
    expect(checkStepText('95 : 8 = 11 Rest 6')).toMatch(/remainder/);
  });
});
