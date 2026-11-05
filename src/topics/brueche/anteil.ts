/**
 * Anteile als Bruch: a share of a picture, of several Ganze, of an unknown Ganzes, and the Bruch as a division.
 * Stufe 1 (bar or circle, Nenner 2, 3, 4, 5, 6, 8, 10): AB I read the shaded share, AB II the unshaded share or the picture of a fraction, AB III test a claim about a picture.
 * Stufe 2 (unsorted parts, several Ganze): AB I scattered cells, AB II several Ganze, AB III how many more cells reach a share, or the picture of an unechter Bruch.
 * Stufe 3 (the Ganzes from a part, the Bruch as a division): AB I share 3 : 4 fairly, or the Ganzes from a part 1/n, AB II the Ganzes from a part n/d, or share 7 : 3,
 * AB III from a share back to the number of things, or another share of the same Ganzes.
 */
import { frac } from '../../core/format';
import type { Bug, Cell, SkillDef, Visual, VisualOf } from '../../core/types';
import { build, fractionAnswer, makeChoice, numberBugs, pickPerson } from '../shared';
import { byStufeAndAb, countIs, fracOf, gcd, isLowest, lowest, pictureChoice, range, speak, valueBugs, type Form, type Frac } from './helpers';

const SKILL = { id: 'brueche.anteil', topicId: 'brueche' } as const;
const KMK = ['ZO.bruch-bedeutung'];
const KMK_PICTURE = [...KMK, 'PK.darstellen'];

const NENNER = [2, 3, 4, 5, 6, 8, 10];
const SHARES: readonly Frac[] = NENNER.flatMap((d) => range(1, d - 1).map((n): Frac => [n, d]));

const model = (form: 'bar' | 'circle', parts: number, filled: number): VisualOf<'fractionModel'> => ({ type: 'fractionModel', form, parts, filled });

const shareBugs = (n: number, d: number): Bug[] => valueBugs([
  { id: 'teil-gegen-rest', match: { numerator: n, denominator: d - n }, hint: 'Der Nenner zählt alle Teile, auch die anderen.' },
  { id: 'gegenteil', match: { numerator: d - n, denominator: d }, hint: 'Das ist der andere Anteil. Lies die Frage noch einmal.' },
  { id: 'vertauscht', match: { numerator: d, denominator: n }, hint: 'Unten steht der Nenner: In so viele Teile ist das Ganze geteilt.' },
], { numerator: n, denominator: d });

/** Stufe 1, AB I. */
const readShare: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(SHARES);
  const form = rng.pick(['bar', 'circle'] as const);
  const prompt = 'Welcher Anteil ist gefärbt?';
  return build(SKILL, stufe, {
    key: `lesen:${form}:${n}/${d}`,
    ab,
    prompt,
    visual: model(form, d, n),
    answer: fractionAnswer(n, d, { accept: 'equivalent' }),
    hints: ['Zähle alle Teile. Das ist der Nenner.', 'Zähle die gefärbten Teile. Das ist der Zähler.'],
    steps: [`Das Ganze hat ${d} gleich große Teile. Das ist der Nenner.`, `${countIs(n, 'Teil', 'Teile')} gefärbt. Das ist der Zähler.`, `Der Anteil ist ${frac(n, d)}.`],
    bugs: shareBugs(n, d),
    praise: 'Du hast alle Teile im Nenner gezählt.',
    srText: speak(prompt),
    kmk: KMK_PICTURE,
  });
};

/** Stufe 1, AB II: the other part of the picture. */
const readRest: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(SHARES);
  const form = rng.pick(['bar', 'circle'] as const);
  const prompt = 'Welcher Anteil ist nicht gefärbt?';
  return build(SKILL, stufe, {
    key: `rest:${form}:${n}/${d}`,
    ab,
    prompt,
    visual: model(form, d, n),
    answer: fractionAnswer(d - n, d, { accept: 'equivalent' }),
    hints: ['Zähle alle Teile. Das ist der Nenner.', 'Zähle jetzt nur die weißen Teile.'],
    steps: [`Das Ganze hat ${d} gleich große Teile.`, `${countIs(n, 'Teil', 'Teile')} gefärbt. Es bleiben ${d} − ${n} = ${d - n}.`, `Nicht gefärbt ist ${frac(d - n, d)}.`],
    bugs: valueBugs([
      { id: 'gegenteil', match: { numerator: n, denominator: d }, hint: 'Das ist der gefärbte Anteil. Gefragt ist der andere Anteil.' },
      { id: 'teil-gegen-rest', match: { numerator: d - n, denominator: n }, hint: 'Der Nenner zählt alle Teile, auch die gefärbten.' },
    ], { numerator: d - n, denominator: d }),
    praise: 'Du hast die weißen Teile gegen alle Teile gestellt.',
    srText: speak(prompt),
    kmk: KMK_PICTURE,
  });
};

/** Stufe 1, AB II: from the fraction to its picture. */
const pickPicture: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(SHARES.filter(([x, y]) => y >= 3 && x + y <= 24));
  const prompt = `Welches Bild zeigt ${frac(n, d)}?`;
  return build(SKILL, stufe, {
    key: `bild:${n}/${d}`,
    ab,
    prompt,
    answer: pictureChoice(rng, model('bar', d, n), [
      { visual: model('bar', d, d - n), whyWrong: 'In diesem Bild ist der andere Anteil gefärbt.' },
      { visual: model('bar', n + d, n), whyWrong: 'Dieses Bild hat zu viele Teile. Der Nenner zählt alle Teile.' },
      { visual: { ...model('bar', d, n), unequal: true }, whyWrong: 'Die Teile in diesem Bild sind verschieden groß.' },
    ]),
    hints: ['Der Nenner sagt: So viele gleich große Teile hat das Ganze.', 'Der Zähler sagt: So viele Teile sind gefärbt.'],
    steps: [`Der Nenner ist ${d}: Das Bild hat ${d} gleich große Teile.`, `Der Zähler ist ${n}: ${countIs(n, 'Teil', 'Teile')} gefärbt.`],
    praise: 'Du hast Zähler und Nenner im Bild wiedergefunden.',
    srText: speak(prompt),
    kmk: KMK_PICTURE,
  });
};

const CLAIM_RIGHT = 'Ja, das stimmt.';
const CLAIM_UNEQUAL = 'Nein, die Teile sind verschieden groß.';
const CLAIM_COUNT = 'Nein, der Nenner muss alle Teile zählen.';

/** Stufe 1, AB III: a claim about a picture; it can be right. */
const testClaim: Form = (rng, stufe, ab) => {
  const kind = rng.pick(['stimmt', 'ungleich', 'nenner'] as const);
  const person = pickPerson(rng);
  const pool = SHARES.filter(([n, d]) => d >= 3 && d <= 8 && (kind !== 'nenner' || n < d - n) && isLowest(n, d));
  const [n, d] = rng.pick(pool);
  const claimed: Frac = kind === 'nenner' ? [n, d - n] : [n, d];
  const prompt = `${person.name} sagt: Das Bild zeigt ${fracOf(claimed)}. Stimmt das?`;
  const correct = kind === 'stimmt' ? CLAIM_RIGHT : kind === 'ungleich' ? CLAIM_UNEQUAL : CLAIM_COUNT;
  const why: Record<string, string> = {
    [CLAIM_RIGHT]: kind === 'ungleich' ? 'Vergleiche die Größe der Teile im Bild.' : 'Zähle alle Teile im Bild. Vergleiche mit dem Nenner.',
    [CLAIM_UNEQUAL]: 'Lege die Teile im Kopf aufeinander. Alle Teile sind gleich groß.',
    [CLAIM_COUNT]: kind === 'stimmt' ? `Der Nenner ist ${d}, und das Bild hat ${d} Teile.` : 'Die Zahl der Teile passt zum Nenner. Schau auf die Größe der Teile.',
  };
  const labels = [CLAIM_RIGHT, CLAIM_UNEQUAL, CLAIM_COUNT];
  return build(SKILL, stufe, {
    key: `aussage:${kind}:${n}/${d}`,
    ab,
    prompt,
    visual: { ...model('bar', d, n), ...(kind === 'ungleich' ? { unequal: true } : {}) },
    answer: makeChoice(rng, { label: correct }, labels.filter((l) => l !== correct).map((label) => ({ label, whyWrong: why[label] })), { order: labels }),
    hints: ['Sind alle Teile gleich groß?', 'Zähle alle Teile. Vergleiche die Zahl mit dem Nenner.'],
    steps: kind === 'stimmt'
      ? [`Das Bild hat ${d} gleich große Teile.`, `${countIs(n, 'Teil', 'Teile')} gefärbt.`, `Der Bruch ${fracOf(claimed)} passt also.`]
      : kind === 'ungleich'
        ? ['Ein Bruch zählt gleich große Teile.', 'Die Teile im Bild sind verschieden groß.', `Der Bruch ${fracOf(claimed)} passt also nicht.`]
        : [`Das Bild hat ${d} Teile, nicht ${d - n}.`, `Der Nenner muss ${d} sein.`, `Das Bild zeigt ${frac(n, d)}.`],
    praise: 'Du hast Größe und Zahl der Teile geprüft.',
    srText: speak(prompt),
    kmk: [...KMK_PICTURE, 'PK.argumentieren'],
  });
};

const GRIDS: readonly (readonly [w: number, h: number])[] = [[2, 3], [2, 4], [3, 3], [2, 5], [3, 4], [2, 6]];

/** n cells of a grid, never a tidy block from the start: 'unsorted parts' is what this form practises. */
function scatter(rng: Parameters<Form>[0], w: number, h: number, n: number): Cell[] {
  const all = range(0, h - 1).flatMap((y) => range(0, w - 1).map((x): Cell => [x, y]));
  const chosen = new Set(rng.sample(range(0, all.length - 1), n));
  if (range(0, n - 1).every((i) => chosen.has(i))) {
    chosen.delete(n - 1);
    chosen.add(all.length - 1);
  }
  return [...chosen].map((i) => all[i]);
}

/** Stufe 2, AB I. */
const scattered: Form = (rng, stufe, ab) => {
  const [w, h] = rng.pick(GRIDS);
  const d = w * h;
  const n = rng.int(2, d - 2);
  const prompt = 'Welcher Anteil ist gefärbt?';
  return build(SKILL, stufe, {
    key: `verstreut:${w}x${h}:${n}`,
    ab,
    prompt,
    visual: { type: 'grid', width: w, height: h, cells: scatter(rng, w, h, n) },
    answer: fractionAnswer(n, d, { accept: 'equivalent' }),
    hints: ['Die gefärbten Kästchen liegen verstreut. Zähle jedes einzeln.', 'Zähle dann alle Kästchen. Das ist der Nenner.'],
    steps: [`Das Ganze hat ${w} · ${h} = ${d} Kästchen.`, `${countIs(n, 'Kästchen', 'Kästchen')} gefärbt.`, `Der Anteil ist ${frac(n, d)}.`],
    bugs: shareBugs(n, d),
    praise: 'Du hast die verstreuten Kästchen einzeln gezählt.',
    srText: speak(prompt),
    kmk: KMK_PICTURE,
  });
};

/** Several Ganze: n parts of d each. */
const WHOLES: readonly (readonly [n: number, d: number, wholes: number])[] = [2, 3, 4, 5, 6].flatMap((d) => [2, 3].flatMap((wholes) => range(d + 1, wholes * d).filter((n) => n % d !== 0 && n > (wholes - 1) * d).map((n) => [n, d, wholes] as const)));

/** Stufe 2, AB II. */
const severalWholes: Form = (rng, stufe, ab) => {
  const [n, d, wholes] = rng.pick(WHOLES);
  const form = rng.pick(['bar', 'circle'] as const);
  const shape = form === 'bar' ? 'Streifen' : 'Kreis';
  const prompt = `Ein ${shape} ist 1 Ganzes. Welcher Bruch zeigt den gefärbten Teil?`;
  return build(SKILL, stufe, {
    key: `ganze:${form}:${n}/${d}:${wholes}`,
    ab,
    prompt,
    visual: { type: 'fractionModel', form, parts: d, filled: n, wholes },
    answer: fractionAnswer(n, d, { accept: 'equivalent' }),
    hints: [`Der Nenner kommt von 1 Ganzen: Wie viele Teile hat 1 ${shape}?`, 'Der Zähler darf größer sein als der Nenner.'],
    steps: [`1 ${shape} hat ${d} Teile. Der Nenner ist ${d}.`, `Gefärbt sind ${n} Teile. Der Zähler ist ${n}.`, `Der Bruch ist ${frac(n, d)}.`],
    bugs: valueBugs([
      { id: 'alle-teile-im-nenner', match: { numerator: n, denominator: wholes * d }, hint: `Der Nenner zählt die Teile von nur 1 ${shape}.` },
      { id: 'nur-letztes-ganzes', match: { numerator: n % d, denominator: d }, hint: n < 2 * d ? `Zähle auch die gefärbten Teile im vollen ${shape}.` : `Zähle auch die gefärbten Teile in den vollen ${form === 'bar' ? 'Streifen' : 'Kreisen'}.` },
      { id: 'vertauscht', match: { numerator: d, denominator: n }, hint: 'Unten steht der Nenner: So viele Teile hat 1 Ganzes.' },
    ], { numerator: n, denominator: d }),
    praise: 'Du hast den Nenner an 1 Ganzen abgelesen.',
    srText: speak(prompt),
    kmk: KMK_PICTURE,
  });
};

/** Stufe 2, AB III: from a shaded grid to a target share. */
const moreCells: Form = (rng, stufe, ab) => {
  const [w, h] = rng.pick(GRIDS);
  const d = w * h;
  const targets = range(2, d - 1).filter((x) => gcd(x, d) > 1).map((x) => lowest([x, d])).filter(([, y]) => y > 2);
  const [a, b] = rng.pick(targets);
  const goal = (a * d) / b;
  const shaded = rng.int(1, goal - 1);
  const prompt = `${frac(a, b)} der Kästchen sollen gefärbt sein. Wie viele Kästchen fehlen noch?`;
  return build(SKILL, stufe, {
    key: `ziel:${w}x${h}:${a}/${b}:${shaded}`,
    ab,
    prompt,
    visual: { type: 'grid', width: w, height: h, cells: scatter(rng, w, h, shaded) },
    answer: { kind: 'number', value: goal - shaded, unit: 'Kästchen' },
    hints: [`Wie viele Kästchen sind ${frac(1, b)} des Ganzen?`, 'Zähle die gefärbten Kästchen. Diese Kästchen gehören schon dazu.'],
    steps: [`Das Ganze hat ${d} Kästchen.`, `${frac(1, b)} sind ${d} : ${b} = ${d / b} Kästchen.`, `${frac(a, b)} sind ${a} · ${d / b} = ${goal} Kästchen.`, `Gefärbt sind ${shaded}. Es fehlen ${goal} − ${shaded} = ${goal - shaded}.`],
    bugs: numberBugs([
      { id: 'gefaerbte-vergessen', match: goal, hint: 'Einige Kästchen sind schon gefärbt. Zähle diese Kästchen mit.' },
      a > shaded && { id: 'zaehler-als-anzahl', match: a - shaded, hint: `Der Zähler ist nicht die Zahl der Kästchen. Wie viele sind ${frac(1, b)}?` },
    ], goal - shaded),
    praise: 'Du hast zuerst das Ziel in Kästchen bestimmt.',
    srText: speak(prompt),
    kmk: [...KMK_PICTURE, 'PK.problemloesen'],
  });
};

/** Stufe 2, AB III: the picture of an unechter Bruch. */
const pickWholes: Form = (rng, stufe, ab) => {
  const [n, d, wholes] = rng.pick(WHOLES.filter(([x, y, z]) => x * 2 !== y * z));
  const prompt = `Ein Streifen ist 1 Ganzes. Welches Bild zeigt ${frac(n, d)}?`;
  const of = (parts: number, filled: number, w: number): Visual => ({ type: 'fractionModel', form: 'bar', parts, filled, wholes: w });
  return build(SKILL, stufe, {
    key: `ganze-bild:${n}/${d}`,
    ab,
    prompt,
    answer: pictureChoice(rng, of(d, n, wholes), [
      { visual: of(d, wholes * d - n, wholes), whyWrong: 'In diesem Bild ist der andere Anteil gefärbt.' },
      { visual: of(wholes * d, n, 1), whyWrong: 'Dieses Bild zeigt weniger als 1 Ganzes. Der Bruch ist größer als 1.' },
      { visual: of(d + 1, n, wholes), whyWrong: `In diesem Bild hat 1 Ganzes zu viele Teile. Der Nenner ist ${d}.` },
    ]),
    hints: ['Der Zähler ist größer als der Nenner. Es ist also mehr als 1 Ganzes.', `Der Nenner sagt: 1 Streifen hat ${d} Teile.`],
    steps: [`1 Streifen hat ${d} Teile. Das sagt der Nenner.`, `Gefärbt sind ${n} Teile. Das sagt der Zähler.`, `Das sind mehr als ${d} Teile, also mehr als 1 Streifen.`],
    praise: 'Du hast gesehen: Der Bruch ist größer als 1 Ganzes.',
    srText: speak(prompt),
    kmk: KMK_PICTURE,
  });
};

const THINGS = [
  { many: 'Pizzen', one: 'Pizza', each: 'jeder Pizza' },
  { many: 'Kuchen', one: 'Kuchen', each: 'jedem Kuchen' },
  { many: 'Tafeln Schokolade', one: 'Schokolade', each: 'jeder Tafel' },
] as const;

/** Stufe 3, AB I (a share below 1) and AB II (above 1). The persons come first, so the Bruch does not stand in reading order. */
function shareFairly(improper: boolean): Form {
  return (rng, stufe, ab) => {
    const pairs = range(2, 9).flatMap((n) => range(2, 8).filter((d) => n !== d && (improper ? n > d : n < d) && isLowest(n, d)).map((d): Frac => [n, d]));
    const [n, d] = rng.pick(pairs);
    const t = rng.pick(THINGS);
    const context = `${d} Personen aus der Klasse 6b teilen sich ${n} ${t.many} gerecht. Schreibe das Ergebnis als Bruch.`;
    const prompt = `Wie viel ${t.one} bekommt jede Person?`;
    return build(SKILL, stufe, {
      key: `teilen:${t.one}:${n}:${d}`,
      ab,
      context,
      prompt,
      answer: fractionAnswer(n, d, { accept: 'equivalent' }),
      hints: [`Von ${t.each} bekommt jede Person ein gleich großes Stück.`, 'Wie groß ist ein Stück? Wie viele solche Stücke hat jede Person?'],
      steps: [`Jede Person bekommt ${frac(1, d)} von ${t.each}.`, `Das sind ${n} · ${frac(1, d)}.`, `${n} : ${d} = ${frac(n, d)}`],
      bugs: valueBugs([{ id: 'division-vertauscht', match: { numerator: d, denominator: n }, hint: 'Oben steht das, was du teilst. Unten steht die Zahl der Personen.' }], { numerator: n, denominator: d }),
      praise: 'Du hast die Division als Bruch geschrieben.',
      srText: speak(`${context} ${prompt}`),
      kmk: [...KMK, 'PK.modellieren'],
    });
  };
}

/** A part as a full block of exactly `count` cells, as square as it goes, up to 6 wide: an empty cell would belong to nothing the task states. */
const partCells = (count: number): VisualOf<'grid'> => {
  const width = range(1, 6).find((w) => count % w === 0 && w * w >= count)!;
  const height = count / width;
  return { type: 'grid', width, height, cells: range(0, count - 1).map((i): Cell => [i % width, Math.floor(i / width)]) };
};

/** Stufe 3, AB I: the Ganzes from a part 1/d. */
const wholeFromUnit: Form = (rng, stufe, ab) => {
  const m = rng.int(2, 6);
  const d = rng.int(2, 6);
  const prompt = `Das Bild zeigt ${frac(1, d)} von einem Ganzen. Wie viele Kästchen hat das Ganze?`;
  const whole = m * d;
  return build(SKILL, stufe, {
    key: `ganzes-eins:${m}:${d}`,
    ab,
    prompt,
    visual: partCells(m),
    answer: { kind: 'number', value: whole, unit: 'Kästchen' },
    hints: [`Das Ganze besteht aus ${d} solchen Teilen.`, 'Zähle die Kästchen im Bild. Nimm die Zahl dann mal den Nenner.'],
    steps: [`Das Bild zeigt ${frac(1, d)}: ${m} Kästchen.`, `Das Ganze hat ${d} solche Teile.`, `${d} · ${m} = ${whole} Kästchen`],
    bugs: numberBugs([
      { id: 'teil-als-ganzes', match: m, hint: `Das Bild zeigt nur ${frac(1, d)}. Gesucht ist das Ganze.` },
      { id: 'addiert', match: m + d, hint: `Das Ganze besteht aus ${d} gleichen Teilen. Rechne mit mal.` },
    ], whole),
    praise: 'Du hast vom Teil auf das Ganze geschlossen.',
    srText: speak(prompt),
    kmk: KMK_PICTURE,
  });
};

const PART_SHARES: readonly Frac[] = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8]];

/** Stufe 3, AB II: the Ganzes from a part n/d. m starts at 2: with 1 the answer would stand in the prompt, as the Nenner. */
const wholeFromPart: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(PART_SHARES);
  const m = rng.int(2, 4);
  const part = n * m;
  const whole = d * m;
  const prompt = `Das Bild zeigt ${frac(n, d)} von einem Ganzen. Wie viele Kästchen hat das Ganze?`;
  return build(SKILL, stufe, {
    key: `ganzes:${n}/${d}:${m}`,
    ab,
    prompt,
    visual: partCells(part),
    answer: { kind: 'number', value: whole, unit: 'Kästchen' },
    hints: [`Wie viele Kästchen sind ${frac(1, d)}? Teile dazu durch den Zähler.`, `Das Ganze hat ${d} solche Teile.`],
    steps: [`${frac(n, d)} sind ${part} Kästchen.`, `${frac(1, d)} sind ${part} : ${n} = ${m} Kästchen.`, `Das Ganze: ${d} · ${m} = ${whole} Kästchen`],
    bugs: numberBugs([
      (part * n) % d === 0 && { id: 'anteil-ganzes', match: (part * n) / d, hint: `Gesucht ist das Ganze. Das Bild zeigt schon ${frac(n, d)} davon.` },
      { id: 'nur-ein-teil', match: m, hint: `Das ist erst ${frac(1, d)}. Das Ganze hat mehr Teile.` },
      { id: 'teil-als-ganzes', match: part, hint: `Das Bild zeigt nur ${frac(n, d)}. Gesucht ist das Ganze.` },
      { id: 'nur-fehlender-teil', match: m * (d - n), hint: 'Das ist nur der fehlende Teil. Zähle die gezeigten Kästchen dazu.' },
    ], whole),
    praise: 'Du bist über einen Teil zum Ganzen gegangen.',
    srText: speak(prompt),
    kmk: [...KMK_PICTURE, 'PK.problemloesen'],
  });
};

/** Stufe 3, AB III: from a share per person back to the number of things. */
const shareBack: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5], [5, 6], [3, 8]] as const);
  const k = rng.int(2, 6);
  const people = d * k;
  const context = `Bei der Klassenfahrt bekommt jede Person ${frac(n, d)} von einer Pizza. Es sind ${people} Personen.`;
  const prompt = 'Wie viele Pizzen braucht die Klasse?';
  return build(SKILL, stufe, {
    key: `zurueck:${n}/${d}:${k}`,
    ab,
    context,
    prompt,
    answer: { kind: 'number', value: n * k, unit: 'Pizzen' },
    hints: [`Der Bruch ${frac(n, d)} ist auch die Division ${n} : ${d}.`, `Wie viele Personen teilen sich ${n} ${n === 1 ? 'Pizza' : 'Pizzen'}?`],
    steps: [`${frac(n, d)} Pizza pro Person heißt: ${n} ${n === 1 ? 'Pizza' : 'Pizzen'} für ${d} Personen.`, `${people} Personen sind ${people} : ${d} = ${k} solche Gruppen.`, `${k} · ${n} = ${n * k} Pizzen`],
    bugs: numberBugs([
      { id: 'nur-durch-nenner', match: k, hint: 'Du hast durch den Nenner geteilt. Nimm das Ergebnis noch mal den Zähler.' },
      { id: 'mal-personen', match: people * n, hint: 'Teile die Zahl der Personen zuerst durch den Nenner.' },
    ], n * k),
    praise: 'Du hast aus dem Bruch die Verteilung abgelesen.',
    srText: speak(`${context} ${prompt}`),
    kmk: [...KMK, 'PK.modellieren'],
  });
};

/** Stufe 3, AB III: another share of the same Ganzes. m starts at 2: with 1 the answer would stand in the prompt, as the Zähler. */
const otherShare: Form = (rng, stufe, ab) => {
  const [n, d] = rng.pick(PART_SHARES.filter(([, y]) => y === 5 || y === 8));
  const a = rng.pick(range(2, d - 1).filter((x) => x !== n && isLowest(x, d)));
  const m = rng.pick([2, 3, 4].filter((x) => a * x !== n));
  const part = n * m;
  const prompt = `Das Bild zeigt ${frac(n, d)} von einem Ganzen. Wie viele Kästchen sind ${frac(a, d)} des Ganzen?`;
  return build(SKILL, stufe, {
    key: `anderer:${n}/${d}:${a}:${m}`,
    ab,
    prompt,
    visual: partCells(part),
    answer: { kind: 'number', value: a * m, unit: 'Kästchen' },
    hints: [`Wie viele Kästchen sind ${frac(1, d)}?`, `Nimm diese Zahl dann mal ${a}.`],
    steps: [`${frac(n, d)} sind ${part} Kästchen.`, `${frac(1, d)} sind ${part} : ${n} = ${m} Kästchen.`, `${frac(a, d)} sind ${a} · ${m} = ${a * m} Kästchen.`],
    bugs: numberBugs([
      { id: 'nur-ein-teil', match: m, hint: `Das ist erst ${frac(1, d)}. Gefragt ist ${frac(a, d)}.` },
      { id: 'teil-als-ganzes', match: d * m, hint: `Das ist schon das Ganze. Gefragt ist ${frac(a, d)} davon.` },
    ], a * m),
    praise: 'Du bist über einen einzelnen Teil gegangen.',
    srText: speak(prompt),
    kmk: [...KMK_PICTURE, 'PK.problemloesen'],
  });
};

export const anteilSkill: SkillDef = {
  ...SKILL,
  title: 'Anteile als Bruch',
  description: 'Du siehst einen Anteil und schreibst ihn als Bruch.',
  stufen: {
    1: 'Streifen oder Kreis mit Nenner 2 bis 10',
    2: 'Verstreute Teile bis Nenner 12, mehrere Ganze',
    3: 'Das Ganze aus einem Teil, der Bruch als Division',
  },
  kmk: KMK,
  generate: byStufeAndAb({
    1: { 1: [readShare], 2: [readRest, pickPicture], 3: [testClaim] },
    2: { 1: [scattered], 2: [severalWholes], 3: [moreCells, pickWholes] },
    3: { 1: [shareFairly(false), wholeFromUnit], 2: [wholeFromPart, shareFairly(true)], 3: [shareBack, otherShare] },
  }),
};
