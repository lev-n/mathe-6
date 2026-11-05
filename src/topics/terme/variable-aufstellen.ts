/**
 * terme.variable-aufstellen: a Zusammenhang as a term with a variable, by choice (§6). The text always says what x is (F7: "x ist die Anzahl"), never "a = Apfel". Stufe 1: x Hefte zu je 2 €. Stufe 2: Umfang of a figure, choose or
 * complete. Stufe 3: Muster in Zahlenfolgen, equal Terme. AB varies the demand: the term of a plain case, a fixed part or a gap in the term, then the meaning of a term, a figure for a term, or terms compared.
 */
import { BOX, MINUS, TIMES } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, FigurePoint, Rng, SkillDef, Stufe, Visual } from '../../core/types';
import { build, makeChoice, pickPerson, targetAb } from '../shared';
import { other, say } from './helpers';

const SKILL = { id: 'terme.variable-aufstellen', topicId: 'terme' } as const;
const KMK = ['SF.variablen', 'PK.modellieren'];
const KMK_REASON = ['SF.variablen', 'PK.argumentieren'];

const NUMBER_NOT_THING = 'Die Variable steht für eine Zahl, nicht für einen Gegenstand.';

function pick(rng: Rng, stufe: Stufe, ab: Ab, key: string, fields: { context?: string; prompt: string; expression?: string; visual?: Visual; correct: string; wrongs: ChoiceOption[]; hints: string[]; steps: string[]; praise: string; kmk?: string[]; sayFigure?: string }): Exercise {
  return build(SKILL, stufe, {
    key,
    ab,
    ...(fields.context ? { context: fields.context } : {}),
    prompt: fields.prompt,
    ...(fields.expression ? { expression: fields.expression } : {}),
    ...(fields.visual ? { visual: fields.visual } : {}),
    answer: makeChoice(rng, { label: fields.correct }, fields.wrongs),
    hints: fields.hints,
    steps: fields.steps,
    praise: fields.praise,
    srText: say(fields.context, fields.sayFigure, fields.prompt, fields.expression),
    kmk: fields.kmk ?? KMK,
  });
}

// ─── Stufe 1: x Hefte zu je 2 € ──────────────────────────────────────────────

/** Things that cost the same each, with the word for x, a price that fits them, and what is sensibly bought once on top. */
const ITEMS: readonly { sentence: (p: number) => string; plural: string; thing: string; price: readonly [number, number]; once: { text: (f: number) => string; word: string; price: readonly [number, number] } }[] = [
  { sentence: (p) => `Ein Heft kostet ${p} €.`, plural: 'Hefte', thing: 'Heft', price: [2, 4], once: { text: (f) => `Dazu kommt einmal eine Mappe für ${f} €.`, word: 'Die Mappe', price: [2, 5] } },
  { sentence: (p) => `Ein Stift kostet ${p} €.`, plural: 'Stifte', thing: 'Stift', price: [2, 5], once: { text: (f) => `Dazu kommt einmal ein Etui für ${f} €.`, word: 'Das Etui', price: [3, 9] } },
  { sentence: (p) => `Eine Karte für das Konzert kostet ${p} €.`, plural: 'Karten', thing: 'Karte', price: [12, 40], once: { text: (f) => `Dazu kommt einmal eine Gebühr von ${f} €.`, word: 'Die Gebühr', price: [2, 5] } },
  { sentence: (p) => `Ein Ticket für den Bus kostet ${p} €.`, plural: 'Tickets', thing: 'Ticket', price: [2, 5], once: { text: (f) => `Dazu kommt einmal ein Fahrplan für ${f} €.`, word: 'Der Fahrplan', price: [2, 3] } },
  { sentence: (p) => `Ein Schlauch für das Fahrrad kostet ${p} €.`, plural: 'Schläuche', thing: 'Schlauch', price: [5, 12], once: { text: (f) => `Dazu kommt einmal eine Pumpe für ${f} €.`, word: 'Die Pumpe', price: [9, 18] } },
  { sentence: (p) => `Ein Block kostet ${p} €.`, plural: 'Blöcke', thing: 'Block', price: [2, 6], once: { text: (f) => `Dazu kommt einmal ein Lineal für ${f} €.`, word: 'Das Lineal', price: [2, 4] } },
];

/** Things in equal groups, next to the prices of AB I: x is still the Anzahl, but the term gives another total than a price. */
const GROUPS: readonly { sentence: (p: number) => string; plural: string; thing: string; question: string; each: readonly number[] }[] = [
  { sentence: (p) => `Jede Packung enthält ${p} Stifte.`, plural: 'Packungen', thing: 'Packung', question: 'Welcher Term gibt die Anzahl der Stifte an?', each: [6, 8, 10, 12] },
  { sentence: (p) => `Jede Reihe hat ${p} Stühle.`, plural: 'Reihen', thing: 'Reihe', question: 'Welcher Term gibt die Anzahl der Stühle an?', each: [8, 9, 10, 12, 14, 15] },
  { sentence: (p) => `Jeder Bus hat ${p} Plätze.`, plural: 'Busse', thing: 'Bus', question: 'Welcher Term gibt die Anzahl der Plätze an?', each: [30, 35, 40, 45, 50, 55] },
  { sentence: (p) => `In jedem Kasten sind ${p} Flaschen.`, plural: 'Kästen', thing: 'Kasten', question: 'Welcher Term gibt die Anzahl der Flaschen an?', each: [6, 12, 20, 24] },
  { sentence: (p) => `Jedes Team hat ${p} Personen.`, plural: 'Teams', thing: 'Team', question: 'Welcher Term gibt die Anzahl der Personen an?', each: [5, 6, 7, 9, 11] },
  { sentence: (p) => `Eine Runde auf dem Sportplatz ist ${p} m lang.`, plural: 'Runden', thing: 'Runde', question: 'Welcher Term gibt den Weg in m an?', each: [200, 300, 400] },
];

const GROWS = 'Ein größeres x gibt einen größeren Wert. Beim Teilen wird der Wert kleiner.';

/** A wrong term with a sum or a difference: the child checks it with a number, the reason does not name the operation. */
const tryNumber = (plural: string) => `Stell dir 3 ${plural} vor. Passt dieser Term dann?`;

/** x Hefte zu je 2 €, or x Reihen zu je 8 Stühlen. The correct term and the wrong ones change their form, so that no shape of an option marks the right one. */
function eachTerm(rng: Rng, ab: Ab): Exercise {
  const priced = rng.chance(0.5);
  const item = priced ? rng.pick(ITEMS) : null;
  const group = rng.pick(GROUPS);
  const p = item ? rng.int(item.price[0], item.price[1]) : rng.pick(group.each);
  const [plural, thing] = item ? [item.plural, item.thing] : [group.plural, group.thing];
  const context = `${item ? item.sentence(p) : group.sentence(p)} x ist die Anzahl der ${plural}.`;
  const correct = rng.chance(0.3) ? `x ${TIMES} ${p}` : `${p} ${TIMES} x`;
  return pick(rng, 1, ab, `je:${thing}:${correct}`, {
    context,
    prompt: item ? 'Welcher Term gibt den Preis in € an?' : group.question,
    correct,
    wrongs: rng.shuffle([
      { label: `${p} + x`, whyWrong: tryNumber(plural) },
      { label: `x ${MINUS} ${p}`, whyWrong: tryNumber(plural) },
      { label: `x : ${p}`, whyWrong: GROWS },
      { label: `${p} : x`, whyWrong: GROWS },
      { label: `${p} ${TIMES} ${thing}`, whyWrong: NUMBER_NOT_THING },
    ]),
    hints: [`Stell dir eine Zahl vor: 3 ${plural}.`, 'Dann steht x an der Stelle der 3.'],
    steps: [`Für 3 ${plural}: ${p} ${TIMES} 3 = ${p * 3}`, `Für x ${plural}: ${correct}`],
    praise: 'Du hast den passenden Term gewählt.',
  });
}

/** A fixed part on top, or money left. */
function fixedPart(rng: Rng, ab: Ab): Exercise {
  const item = rng.pick(ITEMS);
  const p = rng.int(item.price[0], item.price[1]);
  const f = rng.int(item.once.price[0], item.once.price[1]);
  if (rng.chance(0.5)) {
    const context = `${item.sentence(p)} ${item.once.text(f)} x ist die Anzahl der ${item.plural}.`;
    return pick(rng, 1, ab, `fest:${item.thing}:${p}:${f}`, {
      context,
      prompt: 'Welcher Term gibt den ganzen Preis in € an?',
      correct: `${p} ${TIMES} x + ${f}`,
      wrongs: [
        { label: `${p} + x + ${f}`, whyWrong: tryNumber(item.plural) },
        { label: `(${p} + ${f}) ${TIMES} x`, whyWrong: `So zahlst du ${f} € für jedes Stück. ${item.once.word} kommt nur einmal dazu.` },
        { label: `${p} ${TIMES} ${f} + x`, whyWrong: 'Die Anzahl x gehört zum Preis der Stücke.' },
      ],
      hints: ['Was kostet jedes Stück? Was kommt nur einmal dazu?', 'Probiere es mit einer Zahl: Wie viel kosten 3 Stück?'],
      steps: [`Für x Stück: ${p} ${TIMES} x`, `Einmal dazu: ${p} ${TIMES} x + ${f}`],
      praise: 'Du hast den festen Teil im Term erkannt.',
    });
  }
  const name = pickPerson(rng).name;
  const start = rng.int(Math.max(20, 3 * p + 1), Math.max(60, 6 * p));
  const context = `${name} hat ${start} € und kauft ${item.plural}. ${item.sentence(p)} x ist die Anzahl der ${item.plural}.`;
  return pick(rng, 1, ab, `rest:${item.thing}:${p}:${start}:${name}`, {
    context,
    prompt: `Welcher Term gibt den Rest von ${name} in € an?`,
    correct: `${start} ${MINUS} ${p} ${TIMES} x`,
    wrongs: [
      { label: `${start} + ${p} ${TIMES} x`, whyWrong: 'Beim Kaufen wird das Geld weniger.' },
      { label: `${p} ${TIMES} x ${MINUS} ${start}`, whyWrong: 'Prüfe die Reihenfolge: Wovon geht der Preis ab?' },
      { label: `(${start} ${MINUS} ${p}) ${TIMES} x`, whyWrong: 'Mit dieser Klammer gehört auch das Geld mal x.' },
    ],
    hints: ['Wie viel kosten x Stück?', 'Das ziehst du vom Geld ab.'],
    steps: [`x Stück kosten ${p} ${TIMES} x`, `Der Rest: ${start} ${MINUS} ${p} ${TIMES} x`],
    praise: 'Du hast den passenden Term für den Rest gewählt.',
  });
}

/** What does the term mean? A letter as a number, not as a thing (F7, §5 buchstabe-als-wort). The price of all, a story with its fixed part, or the money left. */
function meaning(rng: Rng, ab: Ab): Exercise {
  const item = rng.pick(ITEMS);
  const p = rng.int(item.price[0], item.price[1]);
  const anzahl = `x ist die Anzahl der ${item.plural}.`;
  const noCount = { label: `Die Anzahl der ${item.plural}`, whyWrong: 'Die Anzahl ist x. Rechne den Term einmal mit x = 3 aus.' };
  const form = rng.pick(['preis', 'geschichte', 'rest'] as const);
  if (form === 'preis') {
    return pick(rng, 1, ab, `bedeutung:${item.thing}:${p}`, {
      context: `${item.sentence(p)} ${anzahl}`,
      prompt: 'Was bedeutet dieser Term?',
      expression: `${p} ${TIMES} x`,
      correct: `Der Preis aller ${item.plural} in €`,
      wrongs: [
        { label: item.thing === 'Karte' ? 'x ist eine Karte' : `x ist ein ${item.thing}`, whyWrong: NUMBER_NOT_THING },
        { label: `${p} ${item.plural}`, whyWrong: `${p} ist der Preis von einem Stück, nicht die Anzahl.` },
        noCount,
      ],
      hints: ['Setze für x eine Zahl ein: 3 Stück.', 'Was rechnest du dann aus?'],
      steps: [`Mit x = 3: ${p} ${TIMES} 3 = ${p * 3} €`, 'Das ist der Preis von 3 Stück. Also: der Preis von x Stück.'],
      praise: 'Du hast x als Zahl gelesen.',
      kmk: KMK_REASON,
    });
  }
  if (form === 'geschichte') {
    const f = other(rng, item.once.price[0], item.once.price[1], p);
    return pick(rng, 1, ab, `geschichte:${item.thing}:${p}:${f}`, {
      context: anzahl,
      prompt: 'Welche Geschichte passt zu diesem Term?',
      expression: `${p} ${TIMES} x + ${f}`,
      correct: `${item.sentence(p)} ${item.once.text(f)}`,
      wrongs: [
        { label: `${item.sentence(f)} ${item.once.text(p)}`, whyWrong: 'Die Zahl bei x gilt für jedes Stück. Prüfe den Preis.' },
        { label: item.sentence(p + f), whyWrong: `${f} steht nicht bei x. Dieser Teil kommt nur einmal dazu.` },
        { label: `${item.sentence(p)} Es gibt ${f} € Rabatt.`, whyWrong: 'Im Term steht plus. Rabatt macht den Preis kleiner.' },
      ],
      hints: ['Welche Zahl steht bei x? Diese Zahl gilt für jedes Stück.', 'Welche Zahl kommt nur einmal dazu?'],
      steps: [`${p} ${TIMES} x: Jedes Stück kostet ${p} €.`, `+ ${f}: Einmal kommen ${f} € dazu.`],
      praise: 'Du hast den festen Teil im Term erkannt.',
      kmk: KMK_REASON,
    });
  }
  const name = pickPerson(rng).name;
  const start = rng.int(Math.max(20, 3 * p + 1), Math.max(60, 6 * p));
  return pick(rng, 1, ab, `rest-bedeutung:${item.thing}:${p}:${start}:${name}`, {
    context: `${name} hat ${start} € und kauft ${item.plural}. ${item.sentence(p)} ${anzahl}`,
    prompt: 'Was bedeutet dieser Term?',
    expression: `${start} ${MINUS} ${p} ${TIMES} x`,
    correct: `Das Geld von ${name} nach dem Kauf in €`,
    wrongs: [
      { label: `Der Preis aller ${item.plural} in €`, whyWrong: `Der Preis allein ist der Teil mit x. Hier geht ${p} ${TIMES} x von etwas ab.` },
      { label: `Das Geld von ${name} vor dem Kauf in €`, whyWrong: `Vor dem Kauf sind es ${start} €. Der Term rechnet noch weiter.` },
      noCount,
    ],
    hints: ['Setze für x eine Zahl ein: 3 Stück.', 'Was bleibt am Ende übrig?'],
    steps: [`Mit x = 3: ${start} ${MINUS} ${p} ${TIMES} 3 = ${start - 3 * p} €`, 'Das bleibt nach dem Kauf von 3 Stück. Also: das Geld nach dem Kauf.'],
    praise: 'Du hast den Term als Geld nach dem Kauf gelesen.',
    kmk: KMK_REASON,
  });
}

// ─── Stufe 2: Umfang of a figure ─────────────────────────────────────────────

interface FigureCase {
  name: string;
  visual: Visual;
  /** The Umfang with the sides in order. */
  term: string;
  wrongs: ChoiceOption[];
  hint: string;
  sides: string;
  /** A picture that says it only by its tick marks: the same in words, for the screen reader. */
  sayFigure?: string;
}

const RECT: FigurePoint[] = [{ x: 30, y: 30 }, { x: 270, y: 30 }, { x: 270, y: 170 }, { x: 30, y: 170 }];
const SQUARE: FigurePoint[] = [{ x: 70, y: 20 }, { x: 230, y: 20 }, { x: 230, y: 180 }, { x: 70, y: 180 }];
// Every drawing fits its marks: sides marked equal are drawn equal, and sides with different labels are not. Side i runs from point i to point i + 1.
const ISOSCELES: FigurePoint[] = [{ x: 150, y: 20 }, { x: 260, y: 180 }, { x: 40, y: 180 }];
const EQUILATERAL: FigurePoint[] = [{ x: 150, y: 20 }, { x: 250, y: 193 }, { x: 50, y: 193 }];
const SCALENE: FigurePoint[] = [{ x: 110, y: 20 }, { x: 270, y: 180 }, { x: 30, y: 180 }];
const PARALLEL: FigurePoint[] = [{ x: 80, y: 30 }, { x: 280, y: 30 }, { x: 220, y: 170 }, { x: 20, y: 170 }];
const HEXAGON: FigurePoint[] = [{ x: 100, y: 13 }, { x: 200, y: 13 }, { x: 250, y: 100 }, { x: 200, y: 187 }, { x: 100, y: 187 }, { x: 50, y: 100 }];

const ONE_SIDE = 'Hier steht x nur einmal. Zähle die Seiten der Figur.';
const howOften = (side: string) => `Zähle nach: Wie oft gibt es die Seite ${side}?`;

function rectangle(b: number): FigureCase {
  return {
    name: 'Rechteck',
    visual: { type: 'figure', points: RECT, sides: ['x cm', `${b} cm`, 'x cm', `${b} cm`], rightAngles: [0, 1, 2, 3] },
    term: `2 ${TIMES} x + 2 ${TIMES} ${b}`,
    wrongs: [
      { label: `2 ${TIMES} x + ${b}`, whyWrong: howOften(`mit ${b} cm`) },
      { label: `x + ${b}`, whyWrong: 'Das ist erst eine halbe Runde.' },
      { label: `x ${TIMES} ${b}`, whyWrong: 'Das ist die Fläche. Der Umfang ist der Weg um die Figur.' },
    ],
    hint: 'Gehe einmal um das Rechteck. Jede Seite gibt es zweimal.',
    sides: `x, ${b}, x und ${b}`,
  };
}

function squareCase(): FigureCase {
  return {
    name: 'Quadrat',
    visual: { type: 'figure', points: SQUARE, sides: ['x cm', null, null, null], rightAngles: [0, 1, 2, 3], equalMarks: [[0, 1, 2, 3]] },
    term: `4 ${TIMES} x`,
    wrongs: [
      { label: 'x + 4', whyWrong: ONE_SIDE },
      { label: `x ${TIMES} x`, whyWrong: 'Das ist die Fläche. Der Umfang ist der Weg um die Figur.' },
      { label: `2 ${TIMES} x`, whyWrong: 'Das ist erst eine halbe Runde.' },
    ],
    hint: 'Die Striche zeigen: Alle Seiten sind gleich lang.',
    sides: 'x, x, x und x',
    sayFigure: 'Die Figur ist ein Quadrat. Alle 4 Seiten sind gleich lang.',
  };
}

function equilateral(): FigureCase {
  return {
    name: 'Dreieck',
    visual: { type: 'figure', points: EQUILATERAL, sides: ['x cm', null, null], equalMarks: [[0, 1, 2]] },
    term: `3 ${TIMES} x`,
    wrongs: [
      { label: 'x + 3', whyWrong: ONE_SIDE },
      { label: `x ${TIMES} x ${TIMES} x`, whyWrong: 'Beim Umfang addierst du die Seiten.' },
      { label: `2 ${TIMES} x`, whyWrong: 'Das Dreieck hat drei Seiten.' },
    ],
    hint: 'Die Striche zeigen: Alle Seiten sind gleich lang.',
    sides: 'x, x und x',
    sayFigure: 'Die Figur ist ein Dreieck. Alle 3 Seiten sind gleich lang.',
  };
}

function scalene(b: number, c: number): FigureCase {
  return {
    name: 'Dreieck',
    visual: { type: 'figure', points: SCALENE, sides: ['x cm', `${b} cm`, `${c} cm`] },
    term: `x + ${b} + ${c}`,
    wrongs: [
      { label: `x + ${b}`, whyWrong: 'Das Dreieck hat drei Seiten. Eine fehlt noch.' },
      { label: `3 ${TIMES} x`, whyWrong: 'Nur eine Seite ist x cm lang.' },
      { label: `x ${TIMES} ${b} ${TIMES} ${c}`, whyWrong: 'Beim Umfang addierst du die Seiten.' },
    ],
    hint: 'Gehe einmal um das Dreieck. Addiere die drei Seiten.',
    sides: `x, ${b} und ${c}`,
  };
}

function isosceles(b: number): FigureCase {
  return {
    name: 'Dreieck',
    visual: { type: 'figure', points: ISOSCELES, sides: ['x cm', `${b} cm`, 'x cm'], equalMarks: [[0, 2]] },
    term: `2 ${TIMES} x + ${b}`,
    wrongs: [
      { label: `x + ${b}`, whyWrong: howOften('x') },
      { label: `3 ${TIMES} x`, whyWrong: `Die dritte Seite ist ${b} cm lang.` },
      { label: `2 ${TIMES} (x + ${b})`, whyWrong: `Die Seite mit ${b} cm gibt es nur einmal.` },
    ],
    hint: 'Zwei Seiten sind gleich lang. Die dritte hat eine Zahl.',
    sides: `x, x und ${b}`,
  };
}

function parallelogram(b: number): FigureCase {
  return {
    name: 'Parallelogramm',
    visual: { type: 'figure', points: PARALLEL, sides: ['x cm', `${b} cm`, 'x cm', `${b} cm`], parallelMarks: [[0, 2], [1, 3]] },
    term: `2 ${TIMES} x + 2 ${TIMES} ${b}`,
    wrongs: [
      { label: `2 ${TIMES} x + ${b}`, whyWrong: howOften(`mit ${b} cm`) },
      { label: `x + ${b}`, whyWrong: 'Das ist erst eine halbe Runde.' },
      { label: `x ${TIMES} ${b}`, whyWrong: 'Beim Umfang addierst du die Seiten.' },
    ],
    hint: 'Die Seiten gegenüber sind gleich lang.',
    sides: `x, ${b}, x und ${b}`,
  };
}

function hexagon(): FigureCase {
  return {
    name: 'Sechseck',
    visual: { type: 'figure', points: HEXAGON, sides: ['x cm', null, null, null, null, null], equalMarks: [[0, 1, 2, 3, 4, 5]] },
    term: `6 ${TIMES} x`,
    wrongs: [
      { label: 'x + 6', whyWrong: ONE_SIDE },
      { label: `4 ${TIMES} x`, whyWrong: 'Zähle die Seiten des Sechsecks.' },
      { label: `x ${TIMES} x`, whyWrong: 'Beim Umfang addierst du die Seiten.' },
    ],
    hint: 'Die Striche zeigen: Alle Seiten sind gleich lang.',
    sides: 'sechsmal x',
    sayFigure: 'Die Figur ist ein Sechseck. Alle 6 Seiten sind gleich lang.',
  };
}

const CONTEXT = 'x steht für eine Länge in cm.';
const CONTEXT_U = `${CONTEXT} u ist der Umfang in cm.`;

function chooseUmfang(rng: Rng, ab: Ab, c: FigureCase): Exercise {
  return pick(rng, 2, ab, `umfang:${c.name}:${c.term}`, {
    context: CONTEXT,
    prompt: 'Welcher Term gibt den Umfang in cm an?',
    visual: c.visual,
    correct: c.term,
    wrongs: c.wrongs,
    hints: [c.hint, 'Der Umfang ist der Weg um die ganze Figur.'],
    steps: [`Die Seiten: ${c.sides}`, `Der Umfang: ${c.term}`],
    praise: 'Du hast den passenden Term für den Umfang gewählt.',
    ...(c.sayFigure ? { sayFigure: c.sayFigure } : {}),
  });
}

/** Complete the term: which number belongs in the gap? */
function completeUmfang(rng: Rng, ab: Ab): Exercise {
  const b = rng.int(3, 25);
  const figure = rng.chance(0.5) ? rectangle(b) : parallelogram(b);
  const double = 2 * b;
  return pick(rng, 2, ab, `ergaenzen:${figure.name}:${b}`, {
    context: CONTEXT_U,
    prompt: 'Welche Zahl gehört in die Lücke?',
    expression: `u = 2 ${TIMES} x + ${BOX}`,
    visual: figure.visual,
    correct: `${double}`,
    wrongs: [
      { label: `${b}`, whyWrong: howOften(`mit ${b} cm`) },
      { label: `${b + 2}`, whyWrong: 'Hier gehört die Länge der beiden anderen Seiten zusammen hin.' },
      { label: `${b * b}`, whyWrong: 'Beim Umfang addierst du die Seiten.' },
    ],
    hints: ['Der Term nennt die beiden Seiten x. Welche fehlen noch?', figure.hint],
    steps: [`Es fehlen die beiden anderen Seiten mit je ${b} cm.`, `${b} + ${b} = ${double}`, `u = 2 ${TIMES} x + ${double}`],
    praise: 'Du hast die passende Zahl für die Lücke gewählt.',
  });
}

/** Which figure belongs to this term? And which term has the same value? */
function umfangReason(rng: Rng, ab: Ab): Exercise {
  const b = rng.int(3, 25);
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const c = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((v) => v !== b));
    const expr = `x + ${b} + ${c}`;
    return pick(rng, 2, ab, `welche-figur:${b}:${c}`, {
      context: CONTEXT,
      prompt: 'Zu welcher Figur passt dieser Term für den Umfang in cm?',
      expression: expr,
      correct: `Dreieck mit den Seiten x, ${b} und ${c}`,
      wrongs: [
        { label: `Dreieck mit den Seiten x, x und ${b}`, whyWrong: 'Für diese Figur steht x zweimal im Term.' },
        { label: `Rechteck mit den Seiten ${b} und ${c}`, whyWrong: 'Beim Rechteck gibt es jede Seite zweimal.' },
        { label: 'Quadrat mit der Seite x', whyWrong: `Beim Quadrat steht im Term keine Zahl, nur 4 ${TIMES} x.` },
      ],
      hints: ['Wie oft kommt x im Term vor?', 'Wie viele Zahlen stehen noch im Term?'],
      steps: [`x: eine Seite ist x lang.`, `+ ${b} + ${c}: zwei Seiten haben diese Längen.`, `Das passt zum Dreieck mit den Seiten x, ${b} und ${c}.`],
      praise: 'Du hast den Term Seite für Seite gelesen.',
      kmk: KMK_REASON,
    });
  }
  if (kind === 1) {
    const expr = `2 ${TIMES} x + ${b}`;
    return pick(rng, 2, ab, `welche-figur:${b}`, {
      context: CONTEXT,
      prompt: 'Zu welcher Figur passt dieser Term für den Umfang in cm?',
      expression: expr,
      correct: `Dreieck mit den Seiten x, x und ${b}`,
      wrongs: [
        { label: `Rechteck mit den Seiten x und ${b}`, whyWrong: `Beim Rechteck gibt es auch die Seite ${b} zweimal.` },
        { label: 'Quadrat mit der Seite x', whyWrong: `Beim Quadrat steht im Term keine Zahl, nur 4 ${TIMES} x.` },
        { label: `Dreieck mit den Seiten x, ${b} und ${b}`, whyWrong: `Für diese Figur steht ${b} zweimal im Term.` },
      ],
      hints: ['Wie oft kommt x im Term vor?', 'Wie oft kommt die Zahl vor?'],
      steps: [`2 ${TIMES} x: zwei Seiten sind x lang.`, `+ ${b}: eine Seite ist ${b} lang.`, `Das passt zum Dreieck mit den Seiten x, x und ${b}.`],
      praise: 'Du hast den Term Seite für Seite gelesen.',
      kmk: KMK_REASON,
    });
  }
  const figure = rectangle(b);
  return pick(rng, 2, ab, `gleicher-umfang:${b}`, {
    context: CONTEXT,
    prompt: 'Welcher Term gibt den Umfang in cm auch an?',
    expression: figure.term,
    visual: figure.visual,
    correct: `2 ${TIMES} (x + ${b})`,
    wrongs: [
      { label: `2 ${TIMES} x + ${b}`, whyWrong: howOften(`mit ${b} cm`) },
      { label: `2 ${TIMES} x ${TIMES} ${b}`, whyWrong: 'Beim Umfang addierst du die Seiten.' },
      { label: `(2 + x) ${TIMES} ${b}`, whyWrong: 'Probiere x = 2. Der Wert ist dann ein anderer.' },
    ],
    hints: ['Eine halbe Runde ist x plus die andere Seite.', 'Zwei halbe Runden sind eine ganze Runde.'],
    steps: [`Eine halbe Runde: x + ${b}`, `Die ganze Runde: 2 ${TIMES} (x + ${b})`],
    praise: 'Du hast zwei Terme mit gleichem Wert erkannt.',
    kmk: KMK_REASON,
  });
}

// ─── Stufe 3: Muster and equal Terme ─────────────────────────────────────────

/** A Zahlenfolge as a table: position x, then its number. */
function sequenceVisual(a: number, b: number, xs: readonly number[]): Visual {
  return { type: 'table', header: ['Platz x', ...xs.map(String)], rows: [['Zahl', ...xs.map((x) => String(a * x + b))]] };
}

const onlyFirst = 'Dieser Term passt nur für x = 1. Probiere x = 2.';

/** The term of a Zahlenfolge, always with a fixed part: a plain 2, 4, 6, 8 would ask no more than Stufe 1. AB II skips places, so that the step per place has to be worked out. */
function pattern(rng: Rng, ab: Ab): Exercise {
  const skips = ab !== 1;
  const xs = skips ? [1, 3, 5, 7] : [1, 2, 3, 4];
  const a = skips ? rng.int(3, 15) : rng.int(2, 9);
  const b = skips ? rng.int(1, 20) : rng.int(1, 9);
  const first = a + b;
  const correct = `${a} ${TIMES} x + ${b}`;
  const wrongs: ChoiceOption[] = rng.shuffle([
    { label: `${first} ${TIMES} x`, whyWrong: onlyFirst },
    { label: `x + ${first - 1}`, whyWrong: onlyFirst },
    { label: `${a} ${TIMES} x`, whyWrong: 'Die Schritte stimmen. Prüfe den Term für x = 1.' },
    ...(b === 1 ? [] : [{ label: `${b} ${TIMES} x + ${a}`, whyWrong: onlyFirst }]),
  ]);
  return pick(rng, 3, ab, `muster:${skips ? 'luecke:' : ''}${correct}`, {
    context: 'Die Tabelle zeigt eine Zahlenfolge. x ist die Nummer des Platzes.',
    prompt: 'Welcher Term gibt die Zahl auf Platz x an?',
    visual: sequenceVisual(a, b, xs),
    correct,
    wrongs,
    hints: [skips ? 'Die Plätze springen um 2. Um wie viel wächst die Zahl dabei?' : 'Um wie viel wächst die Zahl von Platz zu Platz?', `Probiere deinen Term für x = 1 und x = ${xs[1]}.`],
    steps: [`Die Zahl wächst pro Platz um ${a}: Der Term hat ${a} ${TIMES} x.`, `Für x = 1: ${a} ${TIMES} 1 = ${a}. Es fehlen noch ${b}.`, `Der Term: ${correct}`],
    praise: 'Du hast den passenden Term zum Muster gewählt.',
  });
}

/** A term and one of the same value for every x. */
function equalTerm(rng: Rng, ab: Ab): Exercise {
  const prompt = 'Welcher Term hat für jede Zahl x denselben Wert?';
  const kind = rng.pick(['zusammen', 'klammer', 'drei-mal'] as const);
  if (kind === 'zusammen') {
    const [a, b] = [rng.int(2, 9), rng.int(2, 9)];
    const expr = `${a} ${TIMES} x + ${b} ${TIMES} x`;
    return pick(rng, 3, ab, `gleich:${expr}`, {
      prompt,
      expression: expr,
      correct: `${a + b} ${TIMES} x`,
      wrongs: [
        { label: `${a * b} ${TIMES} x`, whyWrong: `Du hast ${a} und ${b} malgenommen. Zähle die x zusammen.` },
        { label: `${a + b} + x`, whyWrong: 'Probiere x = 2. Der Wert ist dann ein anderer.' },
        { label: `${a} + ${b} ${TIMES} x`, whyWrong: `Auch ${a} gehört mal x.` },
      ],
      hints: [`Zähle zusammen: ${a}-mal x und ${b}-mal x.`, 'Probiere es mit x = 2.'],
      steps: [`${a}-mal x und ${b}-mal x sind ${a + b}-mal x.`, `Mit x = 2: ${a} ${TIMES} 2 + ${b} ${TIMES} 2 = ${(a + b) * 2} und ${a + b} ${TIMES} 2 = ${(a + b) * 2}`],
      praise: 'Du hast den Term mit demselben Wert erkannt.',
      kmk: KMK_REASON,
    });
  }
  if (kind === 'klammer') {
    const [a, b] = [rng.int(2, 9), rng.int(2, 9)];
    const expr = `${a} ${TIMES} (x + ${b})`;
    return pick(rng, 3, ab, `gleich:${expr}`, {
      prompt,
      expression: expr,
      correct: `${a} ${TIMES} x + ${a * b}`,
      wrongs: [
        { label: `${a} ${TIMES} x + ${b}`, whyWrong: `Auch ${b} gehört mal ${a}.` },
        { label: `${a} + x + ${b}`, whyWrong: 'Die Klammer gehört mal der Zahl davor.' },
        { label: `${a + b} ${TIMES} x`, whyWrong: 'Probiere x = 1. Der Wert ist dann ein anderer.' },
      ],
      hints: ['Beide Teile der Klammer gehören mal die Zahl davor.', 'Probiere es mit x = 2.'],
      steps: [`${a} ${TIMES} x und ${a} ${TIMES} ${b} = ${a * b}`, `Der Term: ${a} ${TIMES} x + ${a * b}`],
      praise: 'Du hast den Term mit demselben Wert erkannt.',
      kmk: KMK_REASON,
    });
  }
  const [c, d] = [rng.int(2, 9), rng.int(2, 9)];
  const expr = `x + x + x + ${c} + ${d}`;
  return pick(rng, 3, ab, `gleich:${expr}`, {
    prompt,
    expression: expr,
    correct: `3 ${TIMES} x + ${c + d}`,
    wrongs: [
      { label: `3 + x + ${c + d}`, whyWrong: 'Hier steht x nur einmal. Zähle die x im Term oben.' },
      { label: `${3 + c + d} ${TIMES} x`, whyWrong: 'Zahlen und x zählst du getrennt zusammen.' },
      { label: `x ${TIMES} x ${TIMES} x + ${c + d}`, whyWrong: 'Das Plus wird hier zu einem Mal. Der Wert ändert sich.' },
    ],
    hints: ['Fasse die x zusammen. Fasse die Zahlen zusammen.', 'Probiere es mit x = 2.'],
    steps: [`x + x + x = 3 ${TIMES} x`, `${c} + ${d} = ${c + d}`, `Der Term: 3 ${TIMES} x + ${c + d}`],
    praise: 'Du hast den Term mit demselben Wert erkannt.',
    kmk: KMK_REASON,
  });
}

/** One value alike does not make the terms equal. Every option names a value, so that the numbers do not mark the right one. */
function oneValue(rng: Rng, ab: Ab): Exercise {
  const a = rng.int(2, 6);
  const b = rng.int(1, 9);
  // a · x + b and x + (a · k + b − k) agree at x = k only.
  const k = rng.int(1, 2);
  const other2 = a * k + b - k;
  const t = other(rng, 1, 4, k);
  const expr = `${a} ${TIMES} x + ${b}   und   x + ${other2}`;
  const [left, right] = [a * t + b, t + other2];
  const alike = a * k + b;
  return pick(rng, 3, ab, `ein-wert:${a}:${b}:${k}:${t}`, {
    context: `Für x = ${k} haben beide Terme den Wert ${alike}.`,
    prompt: 'Sind die Terme deshalb für jede Zahl x gleich?',
    expression: expr,
    correct: `Nein. Für x = ${t} kommen ${left} und ${right} heraus.`,
    wrongs: [
      { label: `Ja. Für x = ${t} kommt bei beiden ${left} heraus.`, whyWrong: `Rechne den zweiten Term mit x = ${t} noch einmal.` },
      { label: `Ja. Für x = ${t} kommt bei beiden ${right} heraus.`, whyWrong: `Rechne den ersten Term mit x = ${t} noch einmal.` },
      { label: `Nein. Für x = ${k} kommen ${alike} und ${alike + 1} heraus.`, whyWrong: `Für x = ${k} haben beide Terme denselben Wert. Probiere eine andere Zahl.` },
    ],
    hints: ['Setze eine weitere Zahl für x ein.', `Probiere es mit x = ${t}.`],
    steps: [`Mit x = ${t}: ${a} ${TIMES} ${t} + ${b} = ${left}`, `Mit x = ${t}: ${t} + ${other2} = ${right}`, 'Die Werte sind verschieden. Die Terme sind nicht gleich.'],
    praise: 'Du hast erkannt: Ein Wert reicht nicht als Beweis.',
    kmk: KMK_REASON,
  });
}

// ─── The skill ───────────────────────────────────────────────────────────────

function figureCase(rng: Rng, plain: boolean): FigureCase {
  const b = rng.int(3, 25);
  if (!plain) return rng.pick([isosceles(b), isosceles(b), parallelogram(b), parallelogram(b), hexagon()]);
  // The square and the equilateral triangle have no number: they stay the rare cases, or a round would repeat them.
  const k = rng.int(1, 10);
  if (k <= 5) return rectangle(b);
  if (k <= 8) {
    const third = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((v) => v !== b));
    return scalene(b, third);
  }
  return k === 9 ? squareCase() : equilateral();
}

function stufe2(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return chooseUmfang(rng, ab, figureCase(rng, true));
  if (ab === 2) return rng.chance(0.5) ? chooseUmfang(rng, ab, figureCase(rng, false)) : completeUmfang(rng, ab);
  return umfangReason(rng, ab);
}

function stufe3(rng: Rng, ab: Ab): Exercise {
  if (ab === 1) return pattern(rng, ab);
  if (ab === 2) return rng.chance(0.6) ? pattern(rng, ab) : equalTerm(rng, ab);
  return rng.chance(0.6) ? equalTerm(rng, ab) : oneValue(rng, ab);
}

export const variableAufstellenSkill: SkillDef = {
  ...SKILL,
  title: 'Term aufstellen',
  description: 'Du beschreibst einen Zusammenhang mit einer Variablen.',
  stufen: { 1: 'x Hefte zu je 2 €: den Term wählen', 2: 'Umfang einer Figur: wählen oder ergänzen', 3: 'Muster in Zahlenfolgen, gleiche Terme' },
  kmk: ['SF.variablen', 'PK.modellieren', 'PK.argumentieren'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? eachTerm(rng, ab) : ab === 2 ? fixedPart(rng, ab) : meaning(rng, ab);
    return stufe === 2 ? stufe2(rng, ab) : stufe3(rng, ab);
  },
};
