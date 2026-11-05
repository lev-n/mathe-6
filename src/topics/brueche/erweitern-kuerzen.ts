/**
 * Erweitern und Kürzen: the division of the Ganze changes, the value stays.
 * Stufe 1 (given factor 2, 3, 5; Nenner up to 20): AB I erweitern, AB II kürzen, or read a second bar, AB III judge someone's work.
 * Stufe 2 (find the factor; kürzen as far as it goes; Nenner up to 60): AB I find the factor, AB II kürzen fully, AB III the largest factor, or fully with large numbers.
 * Stufe 3 (a target Nenner; the unequal fraction in a set): AB I erweitern or kürzen to a Nenner, AB II the odd one out of four, AB III via the lowest form to a Nenner, or the odd one out of five.
 */
import { BOX, frac } from '../../core/format';
import type { Bug, ChoiceOption, SkillDef } from '../../core/types';
import { build, fractionAnswer, fractionBugs, makeChoice, numberBugs, pickPerson } from '../shared';
import { byStufeAndAb, fracOf, isLowest, range, speak, valueBugs, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.erweitern-kuerzen', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-erweitern'];

/** Fractions in lowest terms below 1. */
const lowFractions = (maxD: number): readonly Frac[] => range(2, maxD).flatMap((d) => range(1, d - 1).filter((n) => isLowest(n, d)).map((n): Frac => [n, d]));

const JUDGE_PROMPT = 'Welcher Satz passt dazu?';
const JUDGE_RIGHT = 'Alles stimmt.';

const S1_BASES = lowFractions(10);
/** [n, d, k]: a fraction and a factor 2, 3 or 5, with a result Nenner up to 20. */
const S1_TASKS: readonly (readonly [number, number, number])[] = [2, 3, 5].flatMap((k) => S1_BASES.filter(([, d]) => d * k <= 20).map(([n, d]) => [n, d, k] as const));

const extendBugs = (n: number, d: number, k: number): Bug[] => fractionBugs([
  { id: 'nur-zaehler-erweitert', match: { numerator: n * k, denominator: d }, hint: 'Beim Erweitern verfeinerst du: Zähler und Nenner ändern sich beide.' },
  { id: 'nur-nenner-erweitert', match: { numerator: n, denominator: d * k }, hint: 'Beim Erweitern verfeinerst du: Zähler und Nenner ändern sich beide.' },
  { id: 'erweitern-addiert', match: { numerator: n + k, denominator: d + k }, hint: `Erweitern heißt malnehmen. Nimm beide Zahlen mal ${k}.` },
], { numerator: n * k, denominator: d * k });

const shortenBugs = (n: number, d: number, k: number, p: number, q: number): Bug[] => fractionBugs([
  n > k && { id: 'kuerzen-subtrahiert', match: { numerator: n - k, denominator: d - k }, hint: 'Kürzen heißt teilen: Zähler und Nenner durch dieselbe Zahl.' },
  { id: 'nur-zaehler-gekuerzt', match: { numerator: p, denominator: d }, hint: 'Teile auch den Nenner durch dieselbe Zahl.' },
  { id: 'nur-nenner-gekuerzt', match: { numerator: n, denominator: q }, hint: 'Teile auch den Zähler durch dieselbe Zahl.' },
], { numerator: p, denominator: q });

/** Stufe 1, AB I. */
const extendGiven: Form = (rng, stufe, ab) => {
  const [n, d, k] = rng.pick(S1_TASKS);
  const prompt = `Erweitere ${frac(n, d)} mit ${k}.`;
  return build(SKILL, stufe, {
    key: `erweitern:${n}/${d}:${k}`,
    ab,
    prompt,
    answer: fractionAnswer(n * k, d * k, { accept: 'exact' }),
    hints: [`Nimm den Zähler mal ${k}.`, `Nimm auch den Nenner mal ${k}.`],
    steps: [`Zähler: ${n} · ${k} = ${n * k}`, `Nenner: ${d} · ${k} = ${d * k}`, `${frac(n, d)} = ${frac(n * k, d * k)}`],
    bugs: extendBugs(n, d, k),
    praise: 'Du hast Zähler und Nenner mit derselben Zahl malgenommen.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 1, AB II. */
const shortenGiven: Form = (rng, stufe, ab) => {
  const [p, q, k] = rng.pick(S1_TASKS);
  const n = p * k;
  const d = q * k;
  const prompt = `Kürze ${frac(n, d)} mit ${k}.`;
  return build(SKILL, stufe, {
    key: `kuerzen:${n}/${d}:${k}`,
    ab,
    prompt,
    answer: fractionAnswer(p, q, { accept: 'exact' }),
    hints: [`Teile den Zähler durch ${k}.`, `Teile auch den Nenner durch ${k}.`],
    steps: [`Zähler: ${n} : ${k} = ${p}`, `Nenner: ${d} : ${k} = ${q}`, `${frac(n, d)} = ${frac(p, q)}`],
    bugs: shortenBugs(n, d, k, p, q),
    praise: 'Du hast Zähler und Nenner durch dieselbe Zahl geteilt.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 1, AB II: two bars of the same length show the same value. */
const barPair: Form = (rng, stufe, ab) => {
  const [n, d, k] = rng.pick(S1_TASKS);
  const prompt = `Der obere Streifen zeigt ${frac(n, d)}. Welcher Bruch passt zum unteren Streifen?`;
  return build(SKILL, stufe, {
    key: `streifen:${n}/${d}:${k}`,
    ab,
    prompt,
    visual: { type: 'fractionModel', form: 'bar', parts: d, filled: n, compare: { parts: d * k, filled: n * k } },
    answer: fractionAnswer(n * k, d * k, { accept: 'exact' }),
    hints: ['Zähle alle Teile des unteren Streifens. Das ist der neue Nenner.', 'Zähle die gefärbten Teile unten. Das ist der neue Zähler.'],
    steps: [`Unten hat der Streifen ${d} · ${k} = ${d * k} Teile.`, `Gefärbt sind ${n} · ${k} = ${n * k} Teile.`, `${frac(n, d)} = ${frac(n * k, d * k)}. Der Wert bleibt gleich.`],
    bugs: extendBugs(n, d, k),
    praise: 'Du hast die feinere Einteilung am Streifen gezählt.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.darstellen'],
  });
};

/** Stufe 1, AB III: judge someone's work; the numbers decide which sentence fits, and it can be right. The sentences stay the same, so they give nothing away. */
const judgeWork: Form = (rng, stufe, ab) => {
  const [p, q, k] = rng.pick(S1_TASKS);
  const name = pickPerson(rng).name;
  const n = p * k;
  const d = q * k;
  const shorten = rng.chance(0.5);
  // Kürzen by subtracting would leave a Zähler of 0 when p is 1.
  const kind = rng.pick(['nur-zaehler', 'nur-nenner', 'stimmt', ...(!shorten || p > 1 ? ['rechenart' as const] : [])] as const);
  const from = shorten ? frac(n, d) : frac(p, q);
  const to = shorten ? frac(p, q) : frac(n, d);
  const written = kind === 'stimmt' ? to
    : kind === 'rechenart' ? (shorten ? frac(n - k, d - k) : frac(p + k, q + k))
      : kind === 'nur-zaehler' ? (shorten ? frac(p, d) : frac(n, q))
        : shorten ? frac(n, q) : frac(p, d);
  const context = `${name} ${shorten ? 'kürzt' : 'erweitert'} ${from} mit ${k} und schreibt ${written}.`;
  const action = shorten ? `durch ${k} teilen` : `mal ${k} nehmen`;
  const alsoNenner = `${name} muss auch den Nenner ${action}.`;
  const alsoZaehler = `${name} muss auch den Zähler ${action}.`;
  const wrongKind = shorten ? `${name} muss durch ${k} teilen, nicht ${k} abziehen.` : `${name} muss mal ${k} nehmen, nicht ${k} addieren.`;
  const correct = kind === 'stimmt' ? JUDGE_RIGHT : kind === 'rechenart' ? wrongKind : kind === 'nur-zaehler' ? alsoNenner : alsoZaehler;
  const done = `Diese Zahl ist schon ${shorten ? 'geteilt' : 'malgenommen'}.`;
  const why: Record<string, string> = {
    [alsoNenner]: kind === 'rechenart' ? 'Schau auf die Rechenart. Beide Zahlen sind anders gerechnet.' : done,
    [alsoZaehler]: kind === 'rechenart' ? 'Schau auf die Rechenart. Beide Zahlen sind anders gerechnet.' : done,
    [wrongKind]: `Niemand hat hier ${shorten ? 'abgezogen' : 'addiert'}. Vergleiche die Zahlen vorher und nachher.`,
    [JUDGE_RIGHT]: `Vergleiche die Werte: ${from} und ${written} sind nicht gleich.`,
  };
  const others: ChoiceOption[] = [alsoNenner, alsoZaehler, wrongKind, JUDGE_RIGHT].filter((label) => label !== correct).map((label) => ({ label, whyWrong: why[label] }));
  return build(SKILL, stufe, {
    key: `fehler:${shorten ? 'k' : 'e'}:${kind}:${shorten ? `${n}/${d}` : `${p}/${q}`}:${k}`,
    ab,
    context,
    prompt: JUDGE_PROMPT,
    answer: makeChoice(rng, { label: correct }, others),
    hints: ['Vergleiche die Zahlen vorher und nachher.', 'Der Wert des Bruchs muss gleich bleiben.'],
    steps: shorten
      ? [`Zähler: ${n} : ${k} = ${p}`, `Nenner: ${d} : ${k} = ${q}`, `${kind === 'stimmt' ? 'Alles stimmt' : 'Richtig ist'}: ${from} = ${to}`]
      : [`Zähler: ${p} · ${k} = ${n}`, `Nenner: ${q} · ${k} = ${d}`, `${kind === 'stimmt' ? 'Alles stimmt' : 'Richtig ist'}: ${from} = ${to}`],
    praise: 'Du hast den Rechenweg Zahl für Zahl geprüft.',
    srText: speak(`${context} ${JUDGE_PROMPT}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** [p, q, k]: a fraction in lowest terms, a factor from 2 to 9, a Nenner up to 60 in the larger form. */
const S2_TASKS: readonly (readonly [number, number, number])[] = range(2, 9).flatMap((k) => lowFractions(12).filter(([, q]) => q * k <= 60).map(([p, q]) => [p, q, k] as const));

/** Tasks whose factor stands nowhere in the equation: with a Zähler of 1 the larger form has the factor as its Zähler, and a factor equal to p or q could be copied too. */
const HIDDEN_FACTOR = S2_TASKS.filter(([p, q, k]) => p > 1 && k !== p && k !== q);

/** Stufe 2, AB I. */
const findFactor: Form = (rng, stufe, ab) => {
  const [p, q, k] = rng.pick(HIDDEN_FACTOR);
  const down = rng.chance(0.5);
  const [from, to] = down ? [frac(p * k, q * k), frac(p, q)] : [frac(p, q), frac(p * k, q * k)];
  const prompt = down ? 'Mit welcher Zahl ist der Bruch gekürzt?' : 'Mit welcher Zahl ist der Bruch erweitert?';
  return build(SKILL, stufe, {
    key: `faktor:${down ? 'k' : 'e'}:${p}/${q}:${k}`,
    ab,
    prompt,
    expression: `${from} = ${to}`,
    answer: { kind: 'number', value: k, label: down ? 'Zahl zum Kürzen' : 'Zahl zum Erweitern' },
    hints: [down ? `Rechne: ${q * k} : ${BOX} = ${q}` : `Rechne: ${q} · ${BOX} = ${q * k}`, 'Prüfe deine Zahl auch am Zähler.'],
    steps: [down ? `Nenner: ${q * k} : ${k} = ${q}` : `Nenner: ${q} · ${k} = ${q * k}`, down ? `Zähler: ${p * k} : ${k} = ${p}` : `Zähler: ${p} · ${k} = ${p * k}`, `Die Zahl ist ${k}.`],
    bugs: numberBugs([{ id: 'unterschied-statt-faktor', match: q * k - q, hint: down ? 'Kürzen heißt teilen. Der Unterschied der Nenner hilft nicht.' : 'Erweitern heißt malnehmen. Der Unterschied der Nenner hilft nicht.' }], k),
    praise: 'Du hast die Zahl an Zähler und Nenner geprüft.',
    srText: speak(`${prompt} ${from} gleich ${to}.`),
    kmk: KMK,
  });
};

/** A fraction that can be shortened by at least minG, with Nenner up to 60. */
const reducible = (minG: number, maxG = 9): readonly (readonly [number, number, number])[] => S2_TASKS.filter(([, , g]) => g >= minG && g <= maxG);

/** Stufe 2, AB II and AB III: shorten as far as it goes. */
function shortenFully(minG: number, maxG: number): Form {
  const pool = reducible(minG, maxG);
  return (rng, stufe, ab) => {
    const [p, q, g] = rng.pick(pool);
    const n = p * g;
    const d = q * g;
    const prompt = `Kürze ${frac(n, d)} so weit wie möglich.`;
    const smallest = range(2, g).find((x) => g % x === 0) ?? g;
    const steps = smallest < g
      ? [`Kürze mit ${smallest}: ${frac(n, d)} = ${frac(n / smallest, d / smallest)}.`, `Kürze weiter mit ${g / smallest}: ${frac(n / smallest, d / smallest)} = ${frac(p, q)}.`, `${p} und ${q} haben keinen gemeinsamen Teiler mehr.`]
      : [`Kürze mit ${g}: ${frac(n, d)} = ${frac(p, q)}.`, `${p} und ${q} haben keinen gemeinsamen Teiler mehr.`];
    return build(SKILL, stufe, {
      key: `ganz:${n}/${d}`,
      ab,
      prompt,
      answer: fractionAnswer(p, q),
      hints: ['Durch welche Zahl kannst du Zähler und Nenner beide teilen?', 'Prüfe danach: Geht es noch einmal?'],
      steps,
      bugs: valueBugs([
        n > smallest && { id: 'kuerzen-subtrahiert', match: { numerator: n - smallest, denominator: d - smallest }, hint: 'Kürzen heißt teilen: Zähler und Nenner durch dieselbe Zahl.' },
        { id: 'nur-zaehler-gekuerzt', match: { numerator: p, denominator: d }, hint: 'Teile auch den Nenner durch dieselbe Zahl.' },
        { id: 'nur-nenner-gekuerzt', match: { numerator: n, denominator: q }, hint: 'Teile auch den Zähler durch dieselbe Zahl.' },
      ], { numerator: p, denominator: q }),
      praise: 'Du hast gekürzt, bis es nicht mehr ging.',
      srText: speak(prompt),
      kmk: KMK,
    });
  };
}

/** Stufe 2, AB III: the largest factor; with a lowest form of Zähler 1 it would be the Zähler in the prompt. */
const largestFactor: Form = (rng, stufe, ab) => {
  const [p, q, g] = rng.pick(reducible(4).filter(([x]) => x > 1));
  const n = p * g;
  const d = q * g;
  const prompt = `Mit welcher größten Zahl kannst du ${frac(n, d)} kürzen?`;
  const smaller = range(2, g - 1).filter((x) => g % x === 0);
  return build(SKILL, stufe, {
    key: `groesste:${n}/${d}`,
    ab,
    prompt,
    answer: { kind: 'number', value: g, label: 'Größte Zahl zum Kürzen' },
    hints: ['Suche Zahlen, die Zähler und Nenner beide teilen.', 'Nimm die größte dieser Zahlen.'],
    steps: [`Beide Zahlen haben diesen größten Teiler: ${g}.`, `${n} : ${g} = ${p} und ${d} : ${g} = ${q}.`, `Die größte Zahl ist ${g}.`],
    bugs: numberBugs(smaller.map((x) => ({ id: 'nicht-die-groesste', match: x, hint: 'Mit dieser Zahl kannst du kürzen. Es gibt noch eine größere Zahl.' })), g),
    praise: 'Du hast den größten gemeinsamen Teiler gefunden.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** [p, q, k] for a target Nenner: a Nenner up to 60. */
const S3_TASKS: readonly (readonly [number, number, number])[] = S2_TASKS.filter(([, q, k]) => q >= 3 && k >= 3);

const targetBugs = (from: Frac, to: Frac): Bug[] => {
  const [n, d] = from;
  const [p, q] = to;
  const up = q > d;
  return fractionBugs([
    { id: up ? 'nur-nenner-erweitert' : 'nur-nenner-gekuerzt', match: { numerator: n, denominator: q }, hint: up ? 'Beim Erweitern verfeinerst du: Zähler und Nenner ändern sich beide.' : 'Kürzen heißt teilen: Zähler und Nenner durch dieselbe Zahl.' },
    up && { id: 'erweitern-addiert', match: { numerator: n + (q - d), denominator: q }, hint: 'Erweitern heißt malnehmen. Zähle den Unterschied der Nenner nicht dazu.' },
    !up && n > d - q && { id: 'kuerzen-subtrahiert', match: { numerator: n - (d - q), denominator: q }, hint: 'Kürzen heißt teilen: Zähler und Nenner durch dieselbe Zahl.' },
  ], { numerator: p, denominator: q });
};

/** Stufe 3, AB I. */
const toTarget: Form = (rng, stufe, ab) => {
  const [p, q, k] = rng.pick(S3_TASKS);
  const down = rng.chance(0.4);
  const from: Frac = down ? [p * k, q * k] : [p, q];
  const to: Frac = down ? [p, q] : [p * k, q * k];
  const prompt = down ? `Kürze ${fracOf(from)} auf den Nenner ${q}.` : `Erweitere ${fracOf(from)} auf den Nenner ${q * k}.`;
  return build(SKILL, stufe, {
    key: `ziel:${down ? 'k' : 'e'}:${p}/${q}:${k}`,
    ab,
    prompt,
    answer: fractionAnswer(to[0], to[1], { accept: 'exact' }),
    hints: [`Mit welcher Zahl kommst du vom Nenner ${from[1]} zum Nenner ${to[1]}?`, 'Rechne dann den Zähler mit derselben Zahl.'],
    steps: down
      ? [`Nenner: ${q * k} : ${k} = ${q}`, `Zähler: ${p * k} : ${k} = ${p}`, `${fracOf(from)} = ${fracOf(to)}`]
      : [`Nenner: ${q} · ${k} = ${q * k}`, `Zähler: ${p} · ${k} = ${p * k}`, `${fracOf(from)} = ${fracOf(to)}`],
    bugs: targetBugs(from, to),
    praise: 'Du hast zuerst am Nenner die passende Zahl gefunden.',
    srText: speak(prompt),
    kmk: KMK,
  });
};

/** Stufe 3, AB III: not a multiple, so through the lowest form: 6/9 with Nenner 12. */
const VIA: readonly (readonly [p: number, q: number, from: number, to: number])[] = lowFractions(6).filter(([, q]) => q >= 3).flatMap(([p, q]) => [2, 3, 4, 5].flatMap((from) => [2, 3, 4, 5, 6, 7].filter((to) => from % to !== 0 && to % from !== 0 && q * Math.max(from, to) <= 60).map((to) => [p, q, from, to] as const)));

const viaLowest: Form = (rng, stufe, ab) => {
  const [p, q, a, b] = rng.pick(VIA);
  const from: Frac = [p * a, q * a];
  const to: Frac = [p * b, q * b];
  const prompt = `Schreibe ${fracOf(from)} als Bruch mit dem Nenner ${to[1]}.`;
  return build(SKILL, stufe, {
    key: `ueber:${from.join('/')}:${to[1]}`,
    ab,
    prompt,
    answer: fractionAnswer(to[0], to[1], { accept: 'exact' }),
    hints: ['Vom alten zum neuen Nenner passt keine ganze Zahl. Kürze zuerst.', 'Erweitere den gekürzten Bruch danach auf den neuen Nenner.'],
    steps: [`Kürze mit ${a}: ${fracOf(from)} = ${frac(p, q)}.`, `Erweitere mit ${b}: ${frac(p, q)} = ${fracOf(to)}.`],
    bugs: targetBugs(from, to),
    praise: 'Du bist über den gekürzten Bruch gegangen.',
    srText: speak(prompt),
    kmk: [...KMK, 'PK.problemloesen'],
  });
};

/** Stufe 3, AB II (three equal, one not) and AB III (four equal, one close by). */
function oddOneOut(equalCount: 3 | 4, close: boolean): Form {
  const bases = lowFractions(6).filter(([, q]) => q >= 3);
  return (rng, stufe, ab) => {
    const [p, q] = rng.pick(bases);
    const factors = rng.sample(range(2, 9).filter((k) => q * k <= 60), equalCount);
    const j = rng.pick(factors);
    const odd: Frac = close ? [p * j + 1, q * j] : [p + j, q + j];
    const equal = factors.map((k): Frac => [p * k, q * k]);
    const options: ChoiceOption[] = equal.map((f) => ({ label: fracOf(f), whyWrong: `Dieser Bruch lässt sich auf ${frac(p, q)} kürzen.` }));
    const prompt = `${equalCount === 3 ? 'Drei' : 'Vier'} Brüche haben denselben Wert. Welcher Bruch passt nicht dazu?`;
    return build(SKILL, stufe, {
      key: `anders:${equalCount}:${p}/${q}:${[...factors].sort((x, y) => x - y).join()}:${odd.join('/')}`,
      ab,
      prompt,
      answer: makeChoice(rng, { label: fracOf(odd) }, options, { max: equalCount + 1 }),
      hints: ['Kürze jeden Bruch so weit wie möglich.', 'Bei welchem Bruch kommt etwas anderes heraus?'],
      steps: [`Gekürzt ist ${frac(equal[0][0], equal[0][1])} = ${frac(p, q)}.`, `Auch die anderen gleichen Brüche ergeben ${frac(p, q)}.`, `${fracOf(odd)} ergibt gekürzt nicht ${frac(p, q)}. Dieser Bruch passt nicht.`],
      praise: 'Du hast die Brüche durch Kürzen verglichen.',
      srText: speak(prompt),
      kmk: [...KMK, 'PK.argumentieren'],
    });
  };
}

export const erweiternKuerzenSkill: SkillDef = {
  ...SKILL,
  title: 'Erweitern und Kürzen',
  description: 'Du änderst die Einteilung, und der Wert bleibt gleich.',
  stufen: {
    1: 'Mit 2, 3 oder 5; Nenner bis 20',
    2: 'Die Zahl finden; ganz kürzen; Nenner bis 60',
    3: 'Auf einen Zielnenner; den ungleichen Bruch finden',
  },
  kmk: KMK,
  generate: byStufeAndAb({
    1: { 1: [extendGiven], 2: [shortenGiven, barPair], 3: [judgeWork] },
    2: { 1: [findFactor], 2: [shortenFully(2, 5)], 3: [largestFactor, shortenFully(6, 9)] },
    3: { 1: [toTarget], 2: [oddOneOut(3, false)], 3: [viaLowest, oddOneOut(4, true)] },
  }),
};
