/**
 * Gemischte Zahlen: both directions between a gemischte Zahl and an unechter Bruch, and the Ganze field in real use: the child opens "Ganze" for every answer
 * that asks for a gemischte Zahl, and a value right but in the other form gets a bug hint, not a mark.
 * Stufe 1 (1 1/2 and 2 3/4 to an unechter Bruch): AB I with Nenner 2, 3, 4, the circles in the worked steps, AB II a harder Nenner, or read the circles as a gemischte Zahl, AB III judge a
 * conversion, or how many pieces.
 * Stufe 2 (both directions, Nenner up to 10): AB I to a gemischte Zahl, AB II either way with larger numbers, AB III judge a conversion, or to a gemischte Zahl that needs shortening.
 * Stufe 3 (order mixed and unechte Brüche; place on the line, from 2 Ganze on, so the Ganze are worth finding): AB I order three with one Nenner, or place an unechter Bruch, AB II read an arrow
 * with the ends labelled, or order four with related Nenner, AB III order four with unrelated Nenner up to a common Nenner of 24, or place a Bruch whose Nenner is not on the line, so it is shortened first.
 */
import { frac } from '../../core/format';
import type { Bug, ChoiceOption, NumberLineAnswer, SkillDef, Step, Visual, VisualOf } from '../../core/types';
import { build, fractionAnswer, fractionBugs, makeChoice, numberBugs, pickPerson, type MaybeBug } from '../shared';
import { byStufeAndAb, compareFrac, isLowest, lcm, lineWords, mixedOf, mixedText, orderBugs, orderWith, partsDative, partsName, range, speak, wholesAre, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.gemischt', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-bedeutung'];
const KMK_PICTURE = [...KMK, 'PK.darstellen'];

/** A gemischte Zahl: whole, Zähler, Nenner, in lowest terms. */
type Mixed = readonly [w: number, n: number, d: number];

const mixedList = (wholes: readonly number[], nenner: readonly number[]): readonly Mixed[] => nenner.flatMap((d) => range(1, d - 1).filter((n) => isLowest(n, d)).flatMap((n) => wholes.map((w): Mixed => [w, n, d])));

const mixedFrac = ([w, n, d]: Mixed) => frac(n, d, w);
const improperOf = ([w, n, d]: Mixed): Frac => [w * d + n, d];

const inGanze = 'Der Wert stimmt. Trage die Ganzen in das Feld „Ganze“ ein.';

/** Circles for a gemischte Zahl: at most 4 Ganze can be drawn. */
const circles = ([w, n, d]: Mixed): VisualOf<'fractionModel'> => ({ type: 'fractionModel', form: 'circle', parts: d, filled: w * d + n, wholes: w + 1 });

function toImproperBugs(m: Mixed): Bug[] {
  const [w, n, d] = m;
  const [total] = improperOf(m);
  const told = `${wholesAre(w)} ${w * d} ${partsName(d)}. Dazu kommt noch ${frac(n, d)}.`;
  return fractionBugs([
    { id: 'gemischt-umgewandelt', match: { numerator: w + n, denominator: d }, hint: told },
    { id: 'gemischt-umgewandelt', match: { numerator: w * 10 + n, denominator: d }, hint: told },
    { id: 'bruch-vergessen', match: { numerator: w * d, denominator: d }, hint: `Das sind nur die Ganzen. Dazu kommt noch ${frac(n, d)}.` },
    { id: 'mal-statt-plus', match: { numerator: w * d * n, denominator: d }, hint: 'Rechne die Ganzen in Teile um. Addiere dann den Zähler.' },
    { id: 'form-bleibt', match: { whole: w, numerator: n, denominator: d }, hint: `Das ist die Zahl aus der Aufgabe. Schreibe alles als ${partsName(d)}.` },
    { id: 'anderer-nenner', match: { numerator: 2 * total, denominator: 2 * d }, hint: 'Der Wert passt. Bleib beim Nenner aus der Aufgabe.' },
  ], { numerator: total, denominator: d });
}

function toMixedBugs(m: Mixed): Bug[] {
  const [w, n, d] = m;
  const [total] = improperOf(m);
  return fractionBugs([
    { id: 'ganze-fehlt', match: { numerator: total, denominator: d }, hint: inGanze },
    w >= 2 && { id: 'noch-ein-ganzes', match: { whole: w - 1, numerator: n + d, denominator: d }, hint: 'Im Bruch steckt noch ein Ganzes. Der Zähler ist größer als der Nenner.' },
    n !== w && { id: 'ganze-rest-getauscht', match: { whole: n, numerator: w, denominator: d }, hint: 'Vorn stehen die Ganzen: Wie oft passt der Nenner in den Zähler?' },
    { id: 'nur-rest', match: { numerator: n, denominator: d }, hint: 'Das ist nur der Rest. Die Ganzen fehlen noch.' },
  ], { whole: w, numerator: n, denominator: d });
}

const improperAnswer = (m: Mixed) => fractionAnswer(improperOf(m)[0], m[2], { accept: 'exact', allowMixed: true });
const mixedAnswer = ([w, n, d]: Mixed) => fractionAnswer(n, d, { whole: w, accept: 'exact', allowMixed: true });

const toImproperSteps = (m: Mixed): string[] => {
  const [w, n, d] = m;
  const [total] = improperOf(m);
  return [`${wholesAre(w)} ${w} · ${d} = ${w * d} ${partsName(d)}.`, `Dazu ${frac(n, d)}: ${w * d} + ${n} = ${total}`, `${mixedFrac(m)} = ${frac(total, d)}`];
};

const toMixedSteps = (m: Mixed): string[] => {
  const [w, n, d] = m;
  const [total] = improperOf(m);
  return [`${d} ${partsName(d)} sind 1 Ganzes.`, `${total} : ${d} = ${w} Rest ${n}`, `${frac(total, d)} = ${mixedFrac(m)}`];
};

/** To an unechter Bruch. The circles stand in the worked steps: their description counts the shaded parts, and in the task that is the Zähler of the answer. */
function toImproper(pool: readonly Mixed[], picture: boolean): Form {
  return (rng, stufe, ab) => {
    const m = rng.pick(pool);
    const prompt = `Schreibe ${mixedFrac(m)} als unechten Bruch.`;
    return build(SKILL, stufe, {
      key: `unecht:${m.join('-')}${picture ? ':bild' : ''}`,
      ab,
      prompt,
      answer: improperAnswer(m),
      hints: [`Wie viele ${partsName(m[2])} sind ${m[0] === 1 ? '1 Ganzes' : `${m[0]} Ganze`}?`, 'Zähle den Zähler dazu. Der Nenner bleibt.'],
      steps: picture ? [{ text: toImproperSteps(m)[0], visual: circles(m) }, ...toImproperSteps(m).slice(1)] : toImproperSteps(m),
      bugs: toImproperBugs(m),
      praise: 'Du hast die Ganzen in Teile umgerechnet.',
      srText: speak(prompt),
      kmk: picture ? KMK_PICTURE : KMK,
    });
  };
}

/** To a gemischte Zahl. */
function toMixed(pool: readonly Mixed[]): Form {
  return (rng, stufe, ab) => {
    const m = rng.pick(pool);
    const [total, d] = improperOf(m);
    const prompt = `Schreibe ${frac(total, d)} als gemischte Zahl.`;
    return build(SKILL, stufe, {
      key: `gemischt:${m.join('-')}`,
      ab,
      prompt,
      answer: mixedAnswer(m),
      hints: [`Wie oft passt ${d} in ${total}? Das sind die Ganzen.`, 'Der Rest ist der neue Zähler. Der Nenner bleibt.'],
      steps: toMixedSteps(m),
      bugs: toMixedBugs(m),
      praise: 'Du hast die Ganzen aus dem Bruch herausgezogen.',
      srText: speak(prompt),
      kmk: KMK,
    });
  };
}

/** Stufe 1, AB II: read circles as a gemischte Zahl. */
const readCircles: Form = (rng, stufe, ab) => {
  const m = rng.pick(mixedList([1, 2, 3], [2, 3, 4, 6]));
  const [w, n, d] = m;
  const prompt = 'Ein Kreis ist 1 Ganzes. Welche gemischte Zahl zeigt das Bild?';
  return build(SKILL, stufe, {
    key: `kreise:${m.join('-')}`,
    ab,
    prompt,
    visual: circles(m),
    answer: mixedAnswer(m),
    hints: ['Zähle die vollen Kreise. Das sind die Ganzen.', 'Der letzte Kreis ist nur zum Teil gefärbt. Das ist der Bruch.'],
    steps: [`${w === 1 ? '1 Kreis ist' : `${w} Kreise sind`} ganz gefärbt.`, `Im nächsten Kreis ${n === 1 ? 'ist' : 'sind'} ${n} von ${d} Teilen gefärbt.`, `Das Bild zeigt ${mixedFrac(m)}.`],
    bugs: toMixedBugs(m),
    praise: 'Du hast Ganze und Bruch im Bild getrennt.',
    // In words here: the description of the picture would call the drawn circles Ganze, and the last one is only part of a Ganzes.
    srText: speak(`${prompt} Das Bild zeigt ${w + 1} Kreise mit je ${d} Teilen. ${w * d + n} Teile sind gefärbt.`),
    kmk: KMK_PICTURE,
  });
};

const ALL_RIGHT = 'Alles stimmt.';
const JUDGE_PROMPT = 'Welcher Satz passt dazu?';

/** Stufe 1, AB III: judge someone's conversion to an unechter Bruch; the numbers decide which sentence fits, and it can be right. */
const slipToImproper: Form = (rng, stufe, ab) => {
  const m = rng.pick(mixedList([1, 2, 3], [2, 3, 4, 5]));
  const [w, n, d] = m;
  const [total] = improperOf(m);
  const kind = rng.pick(['ganze', 'nenner', 'stimmt'] as const);
  const name = pickPerson(rng).name;
  const shownAs = kind === 'ganze' ? frac(w + n, d) : kind === 'nenner' ? frac(total, d + 1) : frac(total, d);
  const context = `${name} schreibt ${mixedFrac(m)} = ${shownAs}.`;
  const noWholes = `${name} hat die Ganzen nicht in ${partsName(d)} umgerechnet.`;
  const newNenner = `${name} hat den Nenner geändert.`;
  const correct = kind === 'ganze' ? noWholes : kind === 'nenner' ? newNenner : ALL_RIGHT;
  const why: Record<string, string> = {
    [noWholes]: kind === 'nenner' ? 'Der Zähler stimmt. Schau auf den Nenner.' : `Zähle nach: ${w} · ${d} + ${n} = ${total}`,
    [newNenner]: `Der Nenner ist derselbe wie in der gemischten Zahl: ${d}.`,
    [ALL_RIGHT]: kind === 'nenner' ? 'Der Nenner muss gleich bleiben.' : `Zähle nach: ${wholesAre(w)} schon ${w * d} ${partsName(d)}.`,
    add: `Das Ganze zählt in ${partsDative(d)}. Rechne die Ganzen um.`,
  };
  const others: ChoiceOption[] = [
    ...[noWholes, newNenner, ALL_RIGHT].filter((label) => label !== correct).map((label) => ({ label, whyWrong: why[label] })),
    { label: `${name} muss den Zähler und den Nenner addieren.`, whyWrong: why.add },
  ];
  return build(SKILL, stufe, {
    key: `fehler:${kind}:${m.join('-')}`,
    ab,
    context,
    prompt: JUDGE_PROMPT,
    answer: makeChoice(rng, { label: correct }, others),
    hints: [`Wie viele ${partsName(d)} sind 1 Ganzes?`, 'Rechne die Zahl selbst um. Vergleiche dann Zähler und Nenner.'],
    steps: [`${wholesAre(w)} ${w * d} ${partsName(d)}.`, `Dazu ${frac(n, d)}: ${w * d} + ${n} = ${total}`, kind === 'stimmt' ? `Alles stimmt: ${mixedFrac(m)} = ${frac(total, d)}.` : `Richtig ist ${mixedFrac(m)} = ${frac(total, d)}.`],
    praise: 'Du hast die Umrechnung der Ganzen geprüft.',
    srText: speak(`${context} ${JUDGE_PROMPT}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** Stufe 1, AB III: how many pieces, as a number. */
const howManyPieces: Form = (rng, stufe, ab) => {
  const m = rng.pick(mixedList([1, 2, 3, 4], [2, 3, 4, 5, 6, 8]));
  const [w, n, d] = m;
  const [total] = improperOf(m);
  const context = `Jedes Stück ist ${frac(1, d)} von einer Pizza. Auf dem Tisch liegen ${mixedFrac(m)} Pizzen.`;
  const prompt = 'Wie viele Stücke sind es?';
  return build(SKILL, stufe, {
    key: `stuecke:${m.join('-')}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: total, unit: 'Stücke' },
    hints: ['Wie viele Stücke hat 1 ganze Pizza?', 'Rechne die Ganzen um. Zähle dann die übrigen Stücke dazu.'],
    steps: [`1 Pizza hat ${d} Stücke.`, `${w} · ${d} = ${w * d} Stücke`, `${w * d} + ${n} = ${total} Stücke`],
    bugs: numberBugs([
      { id: 'gemischt-umgewandelt', match: w + n, hint: `1 Pizza hat ${d} Stücke. Rechne die Ganzen zuerst um.` },
      { id: 'bruch-vergessen', match: w * d, hint: `Das sind nur die ganzen Pizzen. Dazu kommt noch ${frac(n, d)}.` },
    ], total),
    praise: 'Du hast die Ganzen in Stücke umgerechnet.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

const STILL_A_WHOLE = 'Im Bruch steckt noch ein Ganzes.';
const VALUE_CHANGED = 'Der Wert hat sich geändert.';

/** Stufe 2, AB III: judge someone's conversion to a gemischte Zahl; the numbers decide which sentence fits, and it can be right. */
const slipToMixed: Form = (rng, stufe, ab) => {
  const m = rng.pick(mixedList([2, 3, 4, 5], [3, 4, 5, 6, 8, 10]));
  const [w, n, d] = m;
  const [total] = improperOf(m);
  const kind = rng.pick(['ganzes', 'wert', 'stimmt'] as const);
  const otherRest = rng.pick(range(1, d - 1).filter((x) => x !== n && isLowest(x, d)));
  const name = pickPerson(rng).name;
  const shownAs = kind === 'ganzes' ? frac(n + d, d, w - 1) : kind === 'wert' ? frac(otherRest, d, w) : mixedFrac(m);
  const context = `${name} schreibt ${frac(total, d)} = ${shownAs}.`;
  const correct = kind === 'ganzes' ? STILL_A_WHOLE : kind === 'wert' ? VALUE_CHANGED : ALL_RIGHT;
  const why: Record<string, string> = {
    [STILL_A_WHOLE]: 'Der Zähler ist kleiner als der Nenner. Im Bruch steckt kein Ganzes.',
    [VALUE_CHANGED]: 'Rechne nach: Beide Zahlen haben denselben Wert.',
    [ALL_RIGHT]: kind === 'wert' ? 'Rechne die gemischte Zahl zurück. Vergleiche dann die Zähler.' : 'Bei einer gemischten Zahl ist der Zähler kleiner als der Nenner.',
  };
  const others: ChoiceOption[] = [
    ...[STILL_A_WHOLE, VALUE_CHANGED, ALL_RIGHT].filter((label) => label !== correct).map((label) => ({ label, whyWrong: why[label] })),
    { label: 'Der Nenner muss größer sein.', whyWrong: 'Der Nenner bleibt gleich. Schau auf den Zähler.' },
  ];
  const steps = kind === 'ganzes'
    ? [`${n + d} ist größer als ${d}. Der Bruch ist größer als 1.`, `${n + d} : ${d} = 1 Rest ${n}`, `Richtig ist ${frac(total, d)} = ${mixedFrac(m)}.`]
    : kind === 'wert'
      ? [`Rechne zurück: ${w} · ${d} + ${otherRest} = ${w * d + otherRest}`, `Das ist nicht ${total}. Der Wert hat sich geändert.`, `Richtig ist ${frac(total, d)} = ${mixedFrac(m)}.`]
      : [`${total} : ${d} = ${w} Rest ${n}`, `Der Zähler ${n} ist kleiner als der Nenner ${d}.`, `Alles stimmt: ${frac(total, d)} = ${mixedFrac(m)}.`];
  return build(SKILL, stufe, {
    key: `fehler-ganze:${kind}:${m.join('-')}:${kind === 'wert' ? otherRest : n}`,
    ab,
    context,
    prompt: JUDGE_PROMPT,
    answer: makeChoice(rng, { label: correct }, others),
    hints: ['Vergleiche Zähler und Nenner der gemischten Zahl.', 'Rechne die gemischte Zahl zurück in einen Bruch.'],
    steps,
    praise: 'Du hast die Umwandlung genau geprüft.',
    srText: speak(`${context} ${JUDGE_PROMPT}`),
    kmk: [...KMK, 'PK.argumentieren'],
  });
};

/** Stufe 2, AB III: an unechter Bruch whose Rest shortens; the Ganze field and the Kürzen meet. */
const toMixedShorten: Form = (rng, stufe, ab) => {
  const m = rng.pick(mixedList([1, 2, 3, 4], [2, 3, 4, 5]));
  const [w, n, d] = m;
  // The Nenner of the task stays inside the limit of Stufe 2 (up to 10).
  const k = rng.pick([2, 3].filter((x) => d * x <= 10));
  const D = d * k;
  const total = (w * d + n) * k;
  const prompt = `Schreibe ${frac(total, D)} als gemischte Zahl und kürze.`;
  return build(SKILL, stufe, {
    key: `gemischt-kuerzen:${total}/${D}`,
    ab,
    prompt,
    answer: mixedAnswer(m),
    hints: [`Wie oft passt ${D} in ${total}?`, 'Kürze danach den Bruch, der übrig bleibt.'],
    steps: [`${total} : ${D} = ${w} Rest ${n * k}`, `Das sind ${frac(n * k, D, w)}.`, `Gekürzt mit ${k}: ${mixedFrac(m)}`],
    bugs: fractionBugs([
      { id: 'noch-kuerzen', match: { whole: w, numerator: n * k, denominator: D }, hint: 'Der Wert stimmt. Kürze den Bruch noch.' },
      { id: 'ganze-fehlt', match: { numerator: total, denominator: D }, hint: inGanze },
      { id: 'ganze-fehlt', match: { numerator: w * d + n, denominator: d }, hint: inGanze },
    ], { whole: w, numerator: n, denominator: d }),
    praise: 'Du hast die Ganzen herausgezogen und gekürzt.',
    srText: speak(prompt),
    kmk: [...KMK, 'ZO.bruch-erweitern'],
  });
};

// ─── Stufe 3 ─────────────────────────────────────────────────────────────────

/** A value in an order: shown as a gemischte Zahl or as an unechter Bruch. */
interface Shown { f: Frac; mixed: boolean }
const shownText = ({ f, mixed }: Shown) => (mixed ? frac(mixedOf(f).numerator, f[1], mixedOf(f).whole) : frac(f[0], f[1]));

const shown = (mixedForm: boolean, m: Mixed): Shown => ({ f: improperOf(m), mixed: mixedForm });

/** Distinct values, half of them in each form. */
function orderItems(rng: Parameters<Form>[0], pool: readonly Mixed[], count: number): Shown[] {
  const out: Shown[] = [];
  const shuffled = rng.shuffle(pool);
  // First one value per Nenner, so that a pool of several Nenner never ends up as one: then whatever is still needed.
  for (const m of [...shuffled.filter((x, i) => shuffled.findIndex((y) => y[2] === x[2]) === i), ...shuffled]) {
    if (out.length === count) break;
    if (out.some((s) => compareFrac(s.f, improperOf(m)) === 0)) continue;
    out.push(shown(out.length % 2 === 0, m));
  }
  return out;
}

/** The steps of an order after every value is a gemischte Zahl, as the hint says: the Ganze decide first, and only the fractions of equal Ganze are compared. */
function sameWholesSteps(values: readonly Shown[]): string[] {
  const whole = (v: Shown) => mixedOf(v.f).whole;
  const tied = values.filter((v) => values.some((o) => o !== v && whole(o) === whole(v)));
  if (!tied.length) return ['Die Ganzen sind alle verschieden. Das reicht.'];
  const parts = tied.map((v): Frac => [mixedOf(v.f).numerator, v.f[1]]);
  const common = parts.reduce((l, [, d]) => lcm(l, d), 1);
  const toExtend = parts.filter(([, d]) => d !== common);
  if (!toExtend.length) return ['Bei gleichen Ganzen entscheidet der Zähler.'];
  return [`Bei gleichen Ganzen: gemeinsamer Nenner ${common}`, toExtend.map(([n, d]) => `${frac(n, d)} = ${frac((n * common) / d, common)}`).join('; ')];
}

/** Order; the wrong orders read every unechter Bruch below every gemischte Zahl, or take the Zähler alone. */
function orderMixed(pool: readonly Mixed[], count: number, key: string, praise: string): Form {
  return (rng, stufe, ab) => {
    const values = orderItems(rng, pool, count);
    const direction = rng.pick(['aufsteigend', 'absteigend'] as const);
    const { answer, sorted, wrongOrder } = orderWith(rng, values, (a, b) => compareFrac(a.f, b.f), shownText, direction);
    const prompt = `Ordne die Zahlen von ${direction === 'aufsteigend' ? 'klein nach groß' : 'groß nach klein'}.`;
    const sign = direction === 'aufsteigend' ? ' < ' : ' > ';
    return build(SKILL, stufe, {
      key: `${key}:${direction}:${sorted.map(shownText).join()}`,
      ab,
      prompt,
      answer,
      hints: ['Schreibe alle Zahlen in derselben Form.', 'Vergleiche zuerst die Ganzen, dann die Brüche.'],
      steps: [values.filter((v) => !v.mixed).map((v) => `${shownText(v)} = ${mixedText(v.f)}`).join('; '), ...sameWholesSteps(values), sorted.map(shownText).join(sign)],
      bugs: orderBugs(answer.correct, [
        ['unecht-klein', wrongOrder((a, b) => Number(a.mixed) - Number(b.mixed) || compareFrac(a.f, b.f)), 'Ein unechter Bruch ist größer als 1. Rechne die Ganzen im Bruch aus.'],
        ['nur-zaehler-verglichen', wrongOrder((a, b) => a.f[0] - b.f[0]), 'Die Teile sind verschieden groß. Vergleiche die Werte, nicht nur die Zähler.'],
      ]),
      praise,
      srText: speak(`${prompt} ${values.map(shownText).join(', ')}.`),
      kmk: KMK,
    });
  };
}

/** Nenner of an order at AB III: unrelated, and a common Nenner of at most 24, as the topic practises. */
const UNRELATED_NENNER: readonly (readonly number[])[] = [[2, 3, 4], [3, 4, 6], [3, 4, 8], [2, 3, 8], [4, 6, 8], [3, 6, 8], [3, 4, 6, 8], [2, 4, 5], [4, 5, 10]];

/** Stufe 3, AB III. */
const orderUnrelated: Form = (rng, stufe, ab) => orderMixed(mixedList([1, 2, 3], rng.pick(UNRELATED_NENNER)), 4, 'ordnen-fremd', 'Du hast Zahlen in verschiedener Form verglichen.')(rng, stufe, ab);

const LINE_NENNER = [3, 4, 5, 6];

/** A line from 0 to 4 whose labels are gemischte Zahlen. */
const mixedLine = (d: number, onlyEnds: boolean): VisualOf<'numberLine'> => ({
  type: 'numberLine',
  min: 0,
  max: 4 * d,
  majorStep: d,
  minorStep: 1,
  labelMajor: !onlyEnds,
  ...(onlyEnds ? { labels: [0, 4 * d] } : {}),
  denominator: d,
  labelFormat: 'mixed',
});

const placing = (l: VisualOf<'numberLine'>, value: number): NumberLineAnswer => ({
  kind: 'numberline',
  min: l.min,
  max: l.max,
  majorStep: l.majorStep,
  minorStep: l.minorStep,
  step: 1,
  value,
  tolerance: 0,
  labelMajor: l.labelMajor,
  ...(l.labels ? { labels: l.labels } : {}),
  denominator: l.denominator,
  labelFormat: l.labelFormat,
});

/** From 2 Ganze on: with 5/4 a child counts 5 ticks from 0 and never needs the Ganze. */
const LINE_MIXED = mixedList([2, 3], LINE_NENNER);

const lineBugs = ([w, n, d]: Mixed, total: number, extra: MaybeBug[] = []): Bug[] => numberBugs([
  { id: 'nur-bruch-gesetzt', match: n, hint: 'Die Ganzen zählen mit. Geh zuerst zur ganzen Zahl.' },
  { id: 'nur-ganze-gesetzt', match: w * d, hint: 'Das ist nur die ganze Zahl. Der Bruch kommt noch dazu.' },
  total + d <= 4 * d && { id: 'ein-ganzes-zu-viel', match: total + d, hint: 'Der Pfeil liegt zwischen zwei ganzen Zahlen. Zähle die Ganzen noch einmal.' },
  ...extra,
], total);

const walkSteps = ([w, n]: Mixed, marked: Visual): Step[] => [`Geh von 0 zur ${w}.`, { text: `Geh ${n} ${n === 1 ? 'Abschnitt' : 'Abschnitte'} weiter.`, visual: marked }];

/** Stufe 3, AB I: place an unechter Bruch on the line: the Ganze first have to be found in it. */
const placeOnLine: Form = (rng, stufe, ab) => {
  const m = rng.pick(LINE_MIXED);
  const [, , d] = m;
  const [total] = improperOf(m);
  const l = mixedLine(d, false);
  const prompt = `Setze den Pfeil auf ${frac(total, d)}.`;
  return build(SKILL, stufe, {
    key: `setzen:${total}/${d}`,
    ab,
    prompt,
    answer: placing(l, total),
    hints: [`${d} ${partsName(d)} sind 1 Ganzes. Wie viele Ganze stecken im Bruch?`, 'Geh zu dieser ganzen Zahl. Geh dann den Rest weiter.'],
    steps: [`${frac(total, d)} = ${mixedFrac(m)}`, ...walkSteps(m, { ...l, marks: [{ value: total, label: 'A' }] })],
    bugs: lineBugs(m, total),
    praise: 'Du bist zuerst zu den Ganzen gegangen.',
    srText: speak(`${lineWords(l)} ${prompt}`),
    kmk: KMK_PICTURE,
  });
};

/** [m, k]: a value whose Bruch, extended by k, has a Nenner that is not on the line. */
const LINE_EXTENDED = mixedList([1, 2, 3], LINE_NENNER).flatMap((m) => [2, 3].filter((k) => m[2] * k <= 12).map((k) => [m, k] as const));

/** Stufe 3, AB III: the Bruch is written in smaller parts than the ticks and only the ends are labelled: no tick to count to, so it is shortened first. */
const placeShortened: Form = (rng, stufe, ab) => {
  const [m, k] = rng.pick(LINE_EXTENDED);
  const [, , d] = m;
  const [total] = improperOf(m);
  const l = mixedLine(d, true);
  const prompt = `Setze den Pfeil auf ${frac(total * k, d * k)}.`;
  return build(SKILL, stufe, {
    key: `setzen-kuerzen:${total * k}/${d * k}`,
    ab,
    prompt,
    answer: placing(l, total),
    hints: ['Die Striche passen nicht zu diesem Nenner. Kürze den Bruch zuerst.', 'Wie viele Ganze stecken im gekürzten Bruch? Geh dann den Rest weiter.'],
    steps: [`Kürze mit ${k}: ${frac(total * k, d * k)} = ${frac(total, d)}`, `${frac(total, d)} = ${mixedFrac(m)}`, ...walkSteps(m, { ...l, marks: [{ value: total, label: 'A' }] })],
    bugs: lineBugs(m, total, [total * k <= 4 * d && { id: 'nicht-gekuerzt', match: total * k, hint: 'Die Striche zeigen nicht diesen Nenner. Kürze den Bruch zuerst.' }]),
    praise: 'Du hast zuerst gekürzt und dann die Ganzen gefunden.',
    srText: speak(`${lineWords(l)} ${prompt}`),
    kmk: [...KMK_PICTURE, 'ZO.bruch-erweitern'],
  });
};

/** Stufe 3, AB II: read an arrow, with only the ends labelled, as a gemischte Zahl. */
const readOnLine: Form = (rng, stufe, ab) => {
  const m = rng.pick(LINE_MIXED);
  const [w, n, d] = m;
  const [total] = improperOf(m);
  const prompt = 'Welche gemischte Zahl gehört zum Pfeil A?';
  return build(SKILL, stufe, {
    key: `lesen:${total}/${d}`,
    ab,
    prompt,
    visual: { ...mixedLine(d, true), marks: [{ value: total, label: 'A' }] },
    answer: mixedAnswer(m),
    hints: ['Die langen Striche sind die ganzen Zahlen. Wo liegt die 1?', 'Zähle die kurzen Abschnitte von der letzten ganzen Zahl bis A.'],
    steps: [`Von Strich zu Strich sind es ${frac(1, d)}.`, `Der Pfeil liegt ${n} ${n === 1 ? 'Abschnitt' : 'Abschnitte'} rechts von ${w}.`, `A zeigt ${mixedFrac(m)}.`],
    bugs: toMixedBugs(m),
    praise: 'Du hast Ganze und Abschnitte getrennt gezählt.',
    srText: speak(prompt),
    kmk: KMK_PICTURE,
  });
};

export const gemischtSkill: SkillDef = {
  ...SKILL,
  title: 'Gemischte Zahlen',
  description: 'Du wandelst gemischte Zahlen und unechte Brüche um.',
  stufen: {
    1: 'Gemischte Zahl als unechter Bruch, kleine Nenner',
    2: 'In beide Richtungen, Nenner bis 10',
    3: 'Gemischte Zahlen und unechte Brüche ordnen und eintragen',
  },
  kmk: KMK,
  keys: { mixed: true },
  generate: byStufeAndAb({
    1: {
      1: [toImproper(mixedList([1, 2, 3], [2, 3, 4]), true)],
      2: [toImproper(mixedList([1, 2, 3, 4], [5, 6, 8]), false), readCircles],
      3: [slipToImproper, howManyPieces],
    },
    2: {
      1: [toMixed(mixedList([1, 2, 3], [2, 3, 4, 5, 6, 8, 9, 10]))],
      2: [toMixed(mixedList([4, 5, 6, 7, 8, 9], [3, 4, 5, 6, 7, 8, 9, 10])), toImproper(mixedList([4, 5, 6, 7, 8, 9], [3, 4, 5, 6, 7, 8, 9, 10]), false)],
      3: [slipToMixed, toMixedShorten],
    },
    3: {
      1: [orderMixed(mixedList([1, 2, 3], [4]), 3, 'ordnen-drei', 'Du hast Ganze und Brüche getrennt verglichen.'), orderMixed(mixedList([1, 2, 3], [5]), 3, 'ordnen-drei', 'Du hast Ganze und Brüche getrennt verglichen.'), placeOnLine],
      2: [readOnLine, orderMixed(mixedList([1, 2, 3], [2, 4, 8]), 4, 'ordnen-verwandt', 'Du hast alle Zahlen in eine Form gebracht.')],
      3: [orderUnrelated, placeShortened],
    },
  }),
};
