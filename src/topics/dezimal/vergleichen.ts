/**
 * Dezimalzahlen vergleichen.
 * Stufe 1: same number of decimals, then a different whole part. Stufe 2: different lengths (3,14 and 3,5; 0,4 and 0,45). Stufe 3: order 5 numbers, find a number in between.
 */
import { speak } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Exercise, OrderAnswer, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, numberBugs, targetAb } from '../shared';
import { attempt, fracOf, KEYS, noEndZero, numberAnswer, orderBugs, scaled, show, tafel, val, wholeOf, type Dec } from './helpers';

const KMK = ['ZO.dezimal-darstellen'];
const PLACE_HINT = 'Vergleiche Stelle für Stelle: zuerst die Zehntel, dann die Hundertstel.';

/** A number at the shared places: both as integers. */
function common(a: Dec, b: Dec): [number, number, number] {
  const places = Math.max(a[1], b[1]);
  return [scaled(a, places), scaled(b, places), places];
}

function compareSteps(a: Dec, b: Dec): string[] {
  const [x, y, places] = common(a, b);
  const sign = x < y ? '<' : x > y ? '>' : '=';
  const line = `Also ${show(a)} ${sign} ${show(b)}.`;
  if (x === y) return [`Schreibe gleich viele Stellen: ${show([x, places])} und ${show([y, places])}.`, line];
  if (wholeOf(a) !== wholeOf(b)) return [`Vor dem Komma stehen ${wholeOf(a)} und ${wholeOf(b)}.`, line];
  const fa = fracOf([x, places]);
  const fb = fracOf([y, places]);
  const at = [...fa].findIndex((c, i) => c !== fb[i]);
  const name = ['Zehnteln', 'Hundertsteln', 'Tausendsteln'][at];
  return [`Schreibe gleich viele Stellen: ${show([x, places])} und ${show([y, places])}.`, `Der erste Unterschied steht bei den ${name}: ${fa[at]} und ${fb[at]}.`, line];
}

/** The hint for the wrong sign: what a child probably thought. */
function wrongSignHint(a: Dec, b: Dec): string {
  if (wholeOf(a) !== wholeOf(b)) return 'Schau zuerst auf die Zahl vor dem Komma.';
  if (a[1] === b[1]) return 'Vergleiche Stelle für Stelle, von links nach rechts.';
  const [short, long] = a[1] < b[1] ? [a, b] : [b, a];
  const prefix = fracOf(long).startsWith(fracOf(short));
  if (prefix) return `Beide haben dieselben Ziffern bis ${show(short)}. Die längere Zahl hat noch etwas dazu.`;
  return PLACE_HINT;
}

function signItem(rng: Rng, stufe: Stufe, ab: Ab, a: Dec, b: Dec, withTafel: boolean, praise: string): Exercise {
  const [x, y] = common(a, b);
  const correct = x < y ? '<' : x > y ? '>' : '=';
  const expression = `${show(a)} □ ${show(b)}`;
  const wrongs: ChoiceOption[] = ['<', '>', '=']
    .filter((l) => l !== correct)
    .map((label) => ({
      label,
      whyWrong: correct === '=' ? 'Hänge an die kürzere Zahl Nullen an. Vergleiche dann noch einmal.' : label === '=' ? 'Hänge an die kürzere Zahl Nullen an. Irgendwo unterscheiden sich die Ziffern.' : wrongSignHint(a, b),
    }));
  return build(skill, stufe, {
    key: `zeichen:${show(a)}:${show(b)}`,
    ab,
    prompt: 'Welches Zeichen passt?',
    expression,
    ...(withTafel ? { visual: tafel([a, b]) } : {}),
    answer: makeChoice(rng, { label: correct }, wrongs, { layout: 'symbols', order: ['<', '>', '='] }),
    hints: wholeOf(a) !== wholeOf(b) ? ['Schau zuerst auf die Zahl vor dem Komma.', 'Die größere Zahl vor dem Komma entscheidet hier.'] : ['Die Zahl vor dem Komma ist gleich.', PLACE_HINT],
    steps: [...compareSteps(a, b).slice(0, -1), { text: compareSteps(a, b).at(-1) ?? '', visual: tafel([a, b]) }],
    praise,
    srText: speak(`Welches Zeichen passt zwischen ${show(a)} und ${show(b)}: kleiner, größer oder gleich?`),
    kmk: KMK,
  });
}

// ─── Stufe 1 ─────────────────────────────────────────────────────────────────

function pairOtherWhole(rng: Rng): [Dec, Dec] {
  const places = rng.int(1, 2);
  const [w1, w2] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2);
  const frac = () => rng.int(1, 10 ** places - 1);
  return [[w1 * 10 ** places + frac(), places], [w2 * 10 ** places + frac(), places]];
}

function pairSameWhole(rng: Rng): [Dec, Dec] {
  const places = rng.int(1, 2);
  const w = rng.int(0, 12);
  const [f1, f2] = rng.sample(Array.from({ length: 10 ** places - 1 }, (_, i) => i + 1), 2);
  return [[w * 10 ** places + f1, places], [w * 10 ** places + f2, places]];
}

/**
 * The largest (or smallest) of four numbers of the same length. Three share their whole part, one has its neighbour. Mostly that neighbour stands on the far side of the
 * asked end, so the answer is one of the three and takes the Zehntel, sometimes the Hundertstel as well.
 */
function extremeSameLength(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const w = rng.int(2, 8);
  const [a, b, c] = rng.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  const largest = rng.chance(0.5);
  const answerInThree = rng.chance(0.75);
  const neighbour = answerInThree === largest ? w - 1 : w + 1;
  const third = rng.chance(0.5) ? c : a * 10 + c;
  const values: Dec[] = [[w * 100 + a * 10 + b, 2], [w * 100 + b * 10 + a, 2], [w * 100 + third, 2], [neighbour * 100 + rng.int(1, 9) * 10 + rng.int(1, 9), 2]];
  return extreme(rng, stufe, ab, values, largest, 'Du hast zuerst vor dem Komma und dann danach verglichen.');
}

function extreme(rng: Rng, stufe: Stufe, ab: Ab, values: Dec[], largest: boolean, praise: string): Exercise {
  const places = Math.max(...values.map((d) => d[1]));
  const sorted = [...values].sort((x, y) => scaled(x, places) - scaled(y, places));
  const target = largest ? sorted[sorted.length - 1] : sorted[0];
  const word = largest ? 'größte' : 'kleinste';
  const others = values.filter((d) => d !== target).map((d) => ({ label: show(d), whyWrong: `Es gibt eine ${largest ? 'größere' : 'kleinere'} Zahl. ${wrongHintFor(d, target)}` }));
  return build(skill, stufe, {
    key: `extrem:${values.map(show).join(':')}:${word}`,
    ab,
    prompt: `Welche Zahl ist die ${word}?`,
    answer: makeChoice(rng, { label: show(target) }, others),
    hints: [new Set(values.map(wholeOf)).size === 1 ? 'Vor dem Komma steht überall dieselbe Zahl.' : 'Vergleiche zuerst die Zahlen vor dem Komma.', PLACE_HINT],
    steps: [{ text: 'Schreibe alle Zahlen in die Stellentafel.', visual: tafel(sorted) }, `Der Größe nach: ${sorted.map(show).join(' < ')}.`, `Die ${word} Zahl ist ${show(target)}.`],
    praise,
    srText: speak(`Welche Zahl ist die ${word}: ${values.map(show).join(', ')}?`),
    kmk: KMK,
  });
}

const wrongHintFor = (d: Dec, target: Dec) => (wholeOf(d) !== wholeOf(target) ? 'Schau vor das Komma.' : 'Vergleiche von links.');

// ─── Stufe 2 ─────────────────────────────────────────────────────────────────

/** 3,5 and 3,14: the shorter number is larger. */
function pairLonger(rng: Rng): [Dec, Dec] {
  const w = rng.int(0, 9);
  const big = rng.int(3, 9);
  const first = rng.int(1, big - 1);
  const second = rng.int(1, 9);
  const pair: [Dec, Dec] = [[w * 10 + big, 1], [w * 100 + first * 10 + second, 2]];
  return rng.chance(0.5) ? pair : [pair[1], pair[0]];
}

/** 0,4 and 0,45: the shorter number is the start of the longer one. */
function pairPrefix(rng: Rng): [Dec, Dec] {
  const w = rng.int(0, 9);
  const z = rng.int(1, 9);
  const h = rng.int(1, 9);
  const pair: [Dec, Dec] = [[w * 10 + z, 1], [w * 100 + z * 10 + h, 2]];
  return rng.chance(0.5) ? pair : [pair[1], pair[0]];
}

/** 3,05 and 3,5, or 2,50 and 2,5, or 7,2 and 7,125. */
function pairZero(rng: Rng): [Dec, Dec] {
  const w = rng.int(1, 9);
  const d = rng.int(1, 9);
  const kind = rng.int(1, 3);
  let pair: [Dec, Dec];
  if (kind === 1) pair = [[w * 100 + d, 2], [w * 10 + d, 1]];
  else if (kind === 2) pair = [[w * 100 + d * 10, 2], [w * 10 + d, 1]];
  else {
    const small = rng.int(1, 8);
    pair = [[w * 1000 + small * 100 + rng.int(11, 99), 3], [w * 10 + small + 1, 1]];
  }
  return rng.chance(0.5) ? pair : [pair[1], pair[0]];
}

/** Four numbers of different lengths near each other. The answer has a length drawn in advance, so longer-is-larger and shorter-is-larger each fail sometimes (F4). */
function extremeMixedLength(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const w = rng.int(0, 9);
  const a = rng.int(2, 8);
  const largest = rng.chance(0.5);
  const answerPlaces = rng.int(1, 3);
  const number = (places: number): Dec => {
    let frac = rng.pick([a - 1, a, a + 1]);
    for (let p = 1; p < places; p++) frac = frac * 10 + (p === places - 1 ? rng.int(1, 9) : rng.int(0, 9));
    return [w * 10 ** places + frac, places];
  };
  const values = attempt<Dec[]>(
    () => {
      const out = rng.shuffle([1, 2, 3, rng.int(1, 3)]).map(number);
      const sizes = out.map((d) => scaled(d, 3));
      if (new Set(sizes).size < out.length) return null;
      const at = sizes.indexOf(largest ? Math.max(...sizes) : Math.min(...sizes));
      return out[at][1] === answerPlaces ? out : null;
    },
    [[w * 10 + a, 1], [w * 100 + (a - 1) * 10 + 5, 2], [w * 1000 + a * 100 + 25, 3], [w * 100 + a * 10 + 1, 2]],
  );
  return extreme(rng, stufe, ab, values, largest, 'Du hast Stelle für Stelle verglichen.');
}

/** 'Mia sagt: 3,14 ist größer als 3,5. Stimmt das?' */
function claim(rng: Rng, stufe: Stufe, ab: Ab, name: string): Exercise {
  const [a, b] = rng.chance(0.5) ? pairLonger(rng) : pairPrefix(rng);
  const [x, y] = common(a, b);
  const prompt = `${name} sagt: ${show(a)} ist größer als ${show(b)}. Stimmt das?`;
  const right = x > y;
  const hint = wrongSignHint(a, b);
  return build(skill, stufe, {
    key: `behauptung:${show(a)}:${show(b)}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: right ? 'Ja, das stimmt.' : 'Nein, das stimmt nicht.' }, [{ label: right ? 'Nein, das stimmt nicht.' : 'Ja, das stimmt.', whyWrong: hint }], { order: ['Ja, das stimmt.', 'Nein, das stimmt nicht.'] }),
    hints: ['Schreibe beide Zahlen mit gleich vielen Stellen.', PLACE_HINT],
    steps: compareSteps(a, b),
    praise: 'Du hast die Aussage Stelle für Stelle geprüft.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** Five different numbers of mixed length near each other. */
function fiveNumbers(rng: Rng, maxPlaces: number): Dec[] {
  const w = rng.int(0, 9);
  return attempt<Dec[]>(
    () => {
      const seen = new Set<number>();
      const out: Dec[] = [];
      for (let i = 0; i < 5; i++) {
        const places = rng.int(1, maxPlaces);
        const whole = rng.chance(0.2) ? w + 1 : w;
        const int = whole * 10 ** places + rng.int(1, 10 ** places - 1);
        if (int % 10 === 0) return null;
        const at = scaled([int, places], 3);
        if (seen.has(at)) return null;
        seen.add(at);
        out.push([int, places]);
      }
      return new Set(out.map((d) => d[1])).size > 1 ? out : null;
    },
    [[w * 10 + 5, 1], [w * 100 + 14, 2], [w * 100 + 45, 2], [w * 10 + 2, 1], [w * 100 + 7, 2]],
  );
}

function orderItem(rng: Rng, stufe: Stufe, ab: Ab, values: Dec[], direction: OrderAnswer['direction']): Exercise {
  const at = (d: Dec) => scaled(d, 3);
  const up = [...values].sort((x, y) => at(x) - at(y));
  const sorted = direction === 'aufsteigend' ? up : [...up].reverse();
  let shown = rng.shuffle(values);
  if (shown.every((d, i) => d === sorted[i])) shown = [...shown.slice(1), shown[0]];
  const answer: OrderAnswer = { kind: 'order', items: shown.map(show), correct: sorted.map((d) => shown.indexOf(d)), direction };
  const inDirection = (list: Dec[]) => (direction === 'aufsteigend' ? list : [...list].reverse()).map(show);
  // 3,14 > 3,5, as 14 > 5: the digits after the comma read as a whole number
  const byLength = [...values].sort((x, y) => wholeOf(x) - wholeOf(y) || Number(fracOf(x)) - Number(fracOf(y)) || at(x) - at(y));
  // 0,4 > 0,45: the shorter number taken as larger
  const shorterLarger = [...values].sort((x, y) => wholeOf(x) - wholeOf(y) || y[1] - x[1] || at(x) - at(y));
  const bugs: Bug[] = orderBugs(answer, [
    { id: 'laenger-groesser', order: inDirection(byLength), hint: PLACE_HINT },
    { id: 'kuerzer-groesser', order: inDirection(shorterLarger), hint: 'Eine kürzere Zahl ist nicht automatisch größer. Vergleiche Stelle für Stelle.' },
  ]);
  const places = Math.max(...values.map((d) => d[1]));
  const word = direction === 'aufsteigend' ? 'Beginne mit der kleinsten Zahl.' : 'Beginne mit der größten Zahl.';
  return build(skill, stufe, {
    key: `ordnen:${values.map(show).join(':')}:${direction}`,
    ab,
    prompt: `Ordne die Zahlen. ${word}`,
    answer,
    hints: [`Schreibe alle Zahlen mit ${places} Stellen nach dem Komma.`, PLACE_HINT],
    steps: [{ text: `Schreibe alle Zahlen mit ${places} Stellen nach dem Komma.`, visual: tafel(sorted) }, `Die Reihenfolge ist: ${sorted.map(show).join(direction === 'aufsteigend' ? ' < ' : ' > ')}.`],
    bugs,
    praise: 'Du hast Stelle für Stelle verglichen und richtig geordnet.',
    srText: speak(`Ordne die Zahlen. ${word} ${values.map(show).join(', ')}.`),
    kmk: KMK,
  });
}

function betweenChoice(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  const low = noEndZero(rng, 11, 88);
  const lo: Dec = [low, 1];
  const hi: Dec = [low + 1, 1];
  const d = rng.int(1, 9);
  const right: Dec = [low * 10 + d, 2];
  const prompt = `Welche Zahl liegt zwischen ${show(lo)} und ${show(hi)}?`;
  const wrongs: ChoiceOption[] = [
    { label: show([(low + 1) * 10 + d, 2]), whyWrong: `Diese Zahl ist größer als ${show(hi)}. Schreibe beide Grenzen mit 2 Stellen.` },
    { label: show([(low - 1) * 10 + d, 2]), whyWrong: `Diese Zahl ist kleiner als ${show(lo)}. Schreibe beide Grenzen mit 2 Stellen.` },
    { label: show([Math.floor(low / 10) * 100 + d, 2]), whyWrong: 'Die 0 steht bei den Zehnteln. Vergleiche die Zehntel noch einmal.' },
  ];
  return build(skill, stufe, {
    key: `zwischen-wahl:${low}:${d}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: show(right) }, wrongs),
    hints: [`Schreibe ${show(lo)} als ${show([low * 10, 2])}. Schreibe ${show(hi)} als ${show([(low + 1) * 10, 2])}.`, 'Welche Zahlen mit 2 Stellen liegen dazwischen?'],
    steps: [`${show(lo)} = ${show([low * 10, 2])} und ${show(hi)} = ${show([(low + 1) * 10, 2])}`, `Die passende Zahl ist ${show(right)}.`],
    praise: 'Du hast die Zahl zwischen den beiden Grenzen gefunden.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

/** Any number in between counts: value is the middle, tolerance reaches up to one Tausendstel below each border. */
function betweenNumber(rng: Rng, stufe: Stufe, ab: Ab, places: 1 | 2): Exercise {
  const low = places === 1 ? noEndZero(rng, 11, 88) : noEndZero(rng, 101, 898);
  const lo: Dec = [low, places];
  const hi: Dec = [low + 1, places];
  const middle: Dec = [low * 10 + 5, places + 1];
  const tolerance = (places === 1 ? 49 : 4) / 1000;
  const prompt = `Schreibe eine Zahl zwischen ${show(lo)} und ${show(hi)}.`;
  const rand = 'Die Zahl soll dazwischen liegen, nicht genau auf der Grenze.';
  return build(skill, stufe, {
    key: `zwischen:${show(lo)}`,
    ab,
    prompt,
    answer: numberAnswer(val(middle), { tolerance, label: 'Eine Zahl dazwischen' }),
    hints: ['Hänge an beide Zahlen eine 0 an.', 'Jetzt siehst du Zahlen, die dazwischen passen.'],
    steps: [`Hänge eine 0 an: ${show([low * 10, places + 1])} und ${show([(low + 1) * 10, places + 1])}.`, { text: `Jede Zahl dazwischen passt, zum Beispiel ${show(middle)}.`, visual: { type: 'numberLine', min: low * 10, max: (low + 1) * 10, majorStep: 5, minorStep: 1, labelMajor: false, labels: [low * 10, (low + 1) * 10], marks: [{ value: middle[0], label: show(middle) }], denominator: 10 ** (places + 1), labelFormat: 'decimal' } }],
    bugs: numberBugs(
      [
        { id: 'rand-getroffen', match: val(lo), hint: rand },
        { id: 'rand-getroffen', match: val(hi), hint: rand },
      ],
      val(middle),
    ),
    praise: 'Du hast mit einer weiteren Stelle eine Zahl dazwischen gefunden.',
    srText: speak(prompt),
    kmk: KMK,
  });
}

function generate(rng: Rng, stufe: Stufe, ab: Ab): Exercise {
  if (stufe === 1) {
    if (ab === 1) {
      const [a, b] = pairOtherWhole(rng);
      return signItem(rng, stufe, ab, a, b, true, 'Du hast zuerst die Zahlen vor dem Komma verglichen.');
    }
    if (ab === 2) {
      const [a, b] = pairSameWhole(rng);
      return signItem(rng, stufe, ab, a, b, false, 'Du hast Stelle für Stelle verglichen.');
    }
    return extremeSameLength(rng, stufe, ab);
  }
  if (stufe === 2) {
    if (ab === 1) {
      const [a, b] = rng.chance(0.5) ? pairLonger(rng) : pairPrefix(rng);
      return signItem(rng, stufe, ab, a, b, true, 'Du hast die Zehntel zuerst verglichen.');
    }
    if (ab === 2) {
      const [a, b] = pairZero(rng);
      return signItem(rng, stufe, ab, a, b, false, 'Du hast auch verschieden lange Zahlen Stelle für Stelle verglichen.');
    }
    return rng.chance(0.5) ? extremeMixedLength(rng, stufe, ab) : claim(rng, stufe, ab, rng.pick(['Mia', 'Tom', 'Elif', 'Omar', 'Lena', 'Finn']));
  }
  if (ab === 1) return rng.chance(0.7) ? orderItem(rng, stufe, ab, fiveNumbers(rng, 2), 'aufsteigend') : betweenChoice(rng, stufe, ab);
  if (ab === 2) return rng.chance(0.6) ? orderItem(rng, stufe, ab, fiveNumbers(rng, 3), rng.chance(0.5) ? 'absteigend' : 'aufsteigend') : betweenNumber(rng, stufe, ab, 1);
  return rng.chance(0.5) ? orderItem(rng, stufe, ab, fiveNumbers(rng, 3), 'absteigend') : betweenNumber(rng, stufe, ab, 2);
}

const skill: SkillDef = {
  id: 'dezimal.vergleichen',
  topicId: 'dezimal',
  title: 'Dezimalzahlen vergleichen',
  description: 'Du vergleichst Dezimalzahlen Stelle für Stelle.',
  stufen: {
    1: 'Gleich viele Stellen; zuerst vor dem Komma vergleichen',
    2: 'Verschieden lang: 3,14 und 3,5; 0,4 und 0,45',
    3: '5 Zahlen ordnen; eine Zahl dazwischen finden',
  },
  kmk: KMK,
  keys: KEYS,
  generate: (rng, stufe, ctx) => generate(rng, stufe, targetAb(rng, stufe, ctx)),
};
export default skill;
