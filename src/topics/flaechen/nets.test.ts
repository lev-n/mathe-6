import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/rng';
import { NETS, NET_MAX_H, NET_MAX_W, NOT_NETS, fold, netWords, normalise, oppositeFace, orientations, pickForm, quaderNet, type NetLayout } from './nets';

const form = (cells: readonly (readonly [number, number])[]) => normalise(cells as [number, number][]).map((c) => c.join()).join(';');

describe('cube nets', () => {
  it('NETS fold onto six faces, NOT_NETS do not', () => {
    for (const net of NETS) expect(new Set(fold(net)).size).toBe(6);
    for (const net of NOT_NETS) expect(fold(net)).toBeNull();
  });

  it('a net stays a net in every turned or mirrored form', () => {
    for (const net of NETS) for (const turned of orientations(net)) expect(fold(turned)).not.toBeNull();
    for (const net of NOT_NETS) for (const turned of orientations(net)) expect(fold(turned)).toBeNull();
  });

  it('the lists hold 29 different figures of six squares', () => {
    const canon = (cells: readonly (readonly [number, number])[]) => orientations(cells as [number, number][]).map(form).sort()[0];
    const all = [...NETS, ...NOT_NETS].map(canon);
    expect(all).toHaveLength(29);
    expect(new Set(all).size).toBe(29);
    for (const net of [...NETS, ...NOT_NETS]) expect(net).toHaveLength(6);
  });

  it('in a straight strip of four, the faces two apart lie opposite each other', () => {
    const strip = NETS[0];
    const faces = fold(strip)!;
    const row = strip.map((c, i) => ({ c, i })).filter(({ c }) => c[1] === 1).sort((a, b) => a.c[0] - b.c[0]);
    expect(faces[row[0].i]).toBe(oppositeFace(faces[row[2].i]));
    expect(faces[row[1].i]).toBe(oppositeFace(faces[row[3].i]));
  });

  it('pickForm stays narrow for a phone where a form allows it', () => {
    for (let seed = 1; seed < 80; seed++) {
      const cells = pickForm(createRng(seed), NETS[seed % NETS.length]);
      expect(Math.max(...cells.map((c) => c[0]))).toBeLessThanOrEqual(seed % NETS.length === 10 ? 4 : 3);
    }
  });
});

describe('Quader nets', () => {
  const rects = (a: number, b: number, c: number, layout?: NetLayout) => {
    const v = quaderNet(a, b, c, {}, layout);
    if (!('rects' in v)) throw new Error('no rects');
    return v.rects;
  };
  const same = (x: number, y: number) => Math.abs(x - y) < 0.02;

  it('a net has the six faces of its Quader, drawn to scale', () => {
    for (const [a, b, c] of [[5, 3, 2], [4, 2, 6], [15, 4, 9], [2, 3, 7]] as const) {
      for (const layout of ['kreuz', 'versetzt'] as const) {
        const list = rects(a, b, c, layout);
        const s = list[1].w / a;
        const wanted = [a * b, a * b, a * c, a * c, b * c, b * c].map((x) => x * s * s).sort((x, y) => x - y);
        list.map((r) => r.w * r.h).sort((x, y) => x - y).forEach((area, i) => expect(area).toBeCloseTo(wanted[i], 0));
      }
    }
  });

  it('a net that folds has one flap above and one below the band; the wrong ones do not fold', () => {
    const band = (list: ReturnType<typeof rects>) => list[0].y;
    for (const layout of ['kreuz', 'versetzt'] as const) {
      const list = rects(4, 2, 3, layout);
      const flaps = list.slice(4);
      expect(flaps.filter((r) => same(r.y + r.h, band(list)))).toHaveLength(1);
      expect(flaps.filter((r) => same(r.y, band(list) + list[0].h))).toHaveLength(1);
    }
    const sameSide = rects(4, 2, 3, 'gleiche-seite');
    expect(sameSide.slice(4).filter((r) => same(r.y + r.h, band(sameSide)))).toHaveLength(2);
    const tooLong = rects(4, 2, 3, 'zu-lang');
    expect(tooLong[5].h).toBeGreaterThan(tooLong[4].h);
  });

  it('a net fits a phone, and its labels stay readable under the 55 mm cap of a worksheet', () => {
    const CAP_PX = 55 * 96 / 25.4;
    for (const [a, b, c] of [[15, 14, 13], [8, 7, 2], [2, 3, 4], [10, 10, 10], [7, 4, 6], [3, 2, 7]] as const) {
      for (const layout of ['kreuz', 'versetzt', 'gleiche-seite', 'zu-lang'] as const) {
        const list = rects(a, b, c, layout);
        const w = Math.max(...list.map((r) => r.x + r.w)) - Math.min(...list.map((r) => r.x));
        const h = Math.max(...list.map((r) => r.y + r.h)) - Math.min(...list.map((r) => r.y));
        expect(w).toBeLessThanOrEqual(NET_MAX_W + 0.01);
        expect(h).toBeLessThanOrEqual(NET_MAX_H + 0.01);
        // the drawn sizes of src/ui/visuals/NetVisual.tsx: 28 px a unit, a margin of 44 px, labels of 16 px
        expect(16 * Math.min(1, CAP_PX / (h * 28 + 88)), `${a}-${b}-${c} ${layout}`).toBeGreaterThanOrEqual(11.9);
      }
    }
  });

  it('in words, two layouts of one Quader read differently, and a label stays with its face', () => {
    const said = (layout: NetLayout) => netWords(rects(5, 3, 2, layout));
    expect(new Set((['kreuz', 'versetzt', 'gleiche-seite', 'zu-lang'] as const).map(said)).size).toBe(4);
    expect(said('kreuz')).toContain('Über der zweiten Fläche');
    expect(said('kreuz')).toContain('Unter der zweiten Fläche');
    const v = quaderNet(5, 3, 2, { topWidth: '5 cm', topHeight: '3 cm', leftHeight: '2 cm', mark: 'back' });
    const words = netWords('rects' in v ? v.rects : []);
    expect(words).toContain('Über der zweiten Fläche liegt eine Fläche: 5 cm breit, 3 cm hoch.');
    expect(words).toContain('ersten Stelle der Reihe: 2 cm hoch.');
    expect(words).toContain('vierten Stelle der Reihe: mit dem Fragezeichen.');
  });
});
