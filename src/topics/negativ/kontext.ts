/**
 * Negative Zahlen im Alltag (docs/research.md §6). Stufe 1: read a thermometer, −20 to 20. Stufe 2: Konto, Stockwerke, Meereshöhe, the number to a text. Stufe 3: which statement fits, Gegenzahl in context.
 * AB varies the scale (Stufe 1), how directly the text gives the number (Stufe 2) and how much has to be followed (Stufe 3). A Konto has no owner: a stand, never the debts of a person or family.
 */
import { fmt, fmtQty, fmtTemp, ordinalWord } from '../../core/format';
import type { Ab, Bug, ChoiceOption, Rng, SkillDef, Stufe, VisualOf } from '../../core/types';
import { makeChoice, numberBugs, signedNumber, targetAb } from '../shared';
import { assemble, bug, type Form, KMK_ZAHLEN, say, thermometerInWords } from './helpers';

const SKILL = { id: 'negativ.kontext', topicId: 'negativ' } as const;

// ─── Stufe 1: read a thermometer ─────────────────────────────────────────────

function readThermometer(v: number, min: number, max: number, step: number, extra: Bug | false = false): Form {
  const visual: VisualOf<'thermometer'> = { type: 'thermometer', min, max, step, value: v, unit: '°C' };
  const prompt = 'Welche Temperatur zeigt das Thermometer?';
  const side = v < 0 ? 'unter' : 'über';
  return {
    key: `thermometer:${min}:${max}:${step}:${v}`,
    prompt,
    visual,
    answer: signedNumber(v, { unit: '°C' }),
    hints: ['Such zuerst die 0 am Thermometer.', step === 1 ? 'Zähle von der 0 aus die Striche.' : 'Wie viel zählt ein Strich? Zähle von der 0 aus.'],
    steps: [`Ein Strich zählt ${step} Grad.`, `Der Stand liegt ${Math.abs(v)} Grad ${side} der 0.`, `Das Thermometer zeigt ${fmtTemp(v)}.`],
    bugs: numberBugs([
      bug('vorzeichen-vergessen', -v, v < 0 ? 'Der Stand liegt unter der 0. Dort steht ein Minus.' : 'Der Stand liegt über der 0. Dort steht kein Minus.'),
      // with the value of the tick this hint and bug would state the answer one tick from the 0
      step > 1 && bug('strich-zaehlt', v / step, 'Das sind die Striche. Wie viel zählt ein Strich?'),
      extra,
    ], v, true),
    praise: 'Du hast die Grad von der 0 aus gezählt.',
    srText: say(thermometerInWords(visual), prompt),
  };
}

/** Reversed: from the temperature to the picture. The wrong thermometers show the mirror image and a neighbouring level. */
function whichThermometer(rng: Rng): Form {
  const n = 5 * rng.int(1, 3);
  const v = -n;
  const near = rng.chance(0.5) && n < 15 ? v - 5 : v + 5;
  const thermo = (value: number): VisualOf<'thermometer'> => ({ type: 'thermometer', min: -20, max: 20, step: 5, value, unit: '°C' });
  const order = rng.shuffle([v, n, near]);
  const labels = ['A', 'B', 'C'];
  const option = (value: number): ChoiceOption => ({ label: labels[order.indexOf(value)], visual: thermo(value) });
  const prompt = `Welches Thermometer zeigt ${fmtTemp(v)}?`;
  return {
    key: `welches:${order.join('_')}`,
    prompt,
    answer: makeChoice(rng, option(v), [
      { ...option(n), whyWrong: 'Dieser Stand liegt über der 0. Gesucht ist ein Stand unter der 0.' },
      { ...option(near), whyWrong: 'Ein Strich zählt 5 Grad. Zähle die Striche von der 0 aus.' },
    ], { layout: 'grid', order: labels }),
    hints: ['Das Minus heißt: Der Stand liegt unter der 0.', 'Ein Strich zählt 5 Grad. Zähle von der 0 nach unten.'],
    steps: [`${fmtTemp(v)} liegt ${n} Grad unter der 0.`, `Ein Strich zählt 5 Grad: ${n / 5} ${n === 5 ? 'Strich' : 'Striche'} nach unten.`, `Thermometer ${labels[order.indexOf(v)]} zeigt ${fmtTemp(v)}.`],
    praise: 'Du hast von der Zahl zum Bild gedacht.',
    srText: say(prompt),
  };
}

/** Reversed: a distance to the 0, so the field holds a number without a minus although the level has one. */
function toZero(rng: Rng): Form {
  const v = -2 * rng.int(1, 9);
  const visual: VisualOf<'thermometer'> = { type: 'thermometer', min: -20, max: 20, step: 2, value: v, unit: '°C' };
  const prompt = `Wie viel Grad fehlen bis ${fmtTemp(0)}?`;
  return {
    key: `bis-null:${v}`,
    prompt,
    visual,
    answer: signedNumber(-v, { unit: 'Grad' }),
    hints: ['Lies zuerst die Temperatur ab.', 'Zähle dann die Grad bis zur 0.'],
    steps: [`Das Thermometer zeigt ${fmtTemp(v)}.`, `Bis zur 0 fehlen ${-v} Grad.`],
    bugs: numberBugs([
      bug('vorzeichen-umgekehrt', v, 'Das ist die Temperatur. Gesucht ist der Abstand zur 0.'),
      bug('strich-zaehlt', -v / 2, 'Das sind die Striche. Wie viel zählt ein Strich?'),
    ], -v, true),
    praise: 'Du hast den Abstand zur 0 bestimmt.',
    srText: say(thermometerInWords(visual), prompt),
  };
}

function stufe1(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    const min = rng.pick([-12, -10, -8]);
    const max = min + 15;
    const v = rng.chance(0.8) ? rng.int(min + 1, -1) : rng.int(1, max - 1);
    return readThermometer(v, min, max, 1, v < 0 && bug('null-mitgezaehlt', v - 1, 'Die 0 ist der Start. Zähle die Striche ab dort.'));
  }
  if (ab === 2) {
    // every second tick has a label, on the multiples of 4: these values lie between two labels
    const v = rng.chance(0.8) ? -rng.pick([2, 6, 10, 14, 18]) : rng.pick([2, 6, 10, 14, 18]);
    return readThermometer(v, -20, 20, 2);
  }
  return rng.chance(0.5) ? whichThermometer(rng) : toZero(rng);
}

// ─── Stufe 2: the number to a text ───────────────────────────────────────────

interface Statement {
  id: string;
  text: string;
  value: number;
  unit?: string;
  /** The words that decide the sign. */
  cue: string;
  /** A sentence that has to come before this one. */
  frame?: string;
  /** The place behind 'gehört', when the text holds two places. */
  who?: string;
}

const STOCK_ZERO = 'Das Erdgeschoss hat die Zahl 0.';

function direct(rng: Rng): Statement {
  const neg = rng.chance(0.7);
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const n = 5 * rng.int(1, 16);
    return neg
      ? { id: 'meer', text: `Ein Taucher ist ${fmtQty(n, 'm')} unter dem Meeresspiegel.`, value: -n, unit: 'm', cue: 'unter dem Meeresspiegel' }
      : { id: 'meer', text: `Eine Möwe fliegt ${fmtQty(n, 'm')} über dem Meeresspiegel.`, value: n, unit: 'm', cue: 'über dem Meeresspiegel' };
  }
  if (kind === 1) {
    const n = rng.int(1, 5);
    return neg
      ? { id: 'stock', text: `${STOCK_ZERO} Der Aufzug hält im ${ordinalWord(n, 'en')} Untergeschoss.`, value: -n, cue: 'Untergeschoss' }
      : { id: 'stock', text: `${STOCK_ZERO} Der Aufzug hält im ${ordinalWord(n, 'en')} Stock.`, value: n, cue: 'Stock' };
  }
  const n = 5 * rng.int(2, 18);
  return neg
    ? { id: 'konto', text: `Ein Konto zeigt ${fmtQty(n, '€')} Schulden.`, value: -n, unit: '€', cue: 'Schulden' }
    : { id: 'konto', text: `Ein Konto zeigt ${fmtQty(n, '€')} Guthaben.`, value: n, unit: '€', cue: 'Guthaben' };
}

const shown = (s: Pick<Statement, 'unit'>, value: number) => (s.unit ? fmtQty(value, s.unit) : fmt(value));

const cueLine = (s: Statement) => `„${s.cue}“ heißt: Der Wert liegt ${s.value < 0 ? 'unter' : 'über'} 0.`;

/** AB I: the words say over or under, and the number is chosen from a list. */
function chooseNumber(rng: Rng): Form {
  const s = direct(rng);
  const prompt = 'Welche Zahl passt dazu?';
  const n = Math.abs(s.value);
  const sign = s.value < 0 ? -1 : 1;
  const gap = s.id === 'stock' ? 1 : 10;
  return {
    key: `waehlen:${s.id}:${s.value}`,
    context: s.text,
    prompt,
    answer: makeChoice(rng, { label: shown(s, s.value) }, [
      { label: shown(s, -s.value), whyWrong: `${cueLine(s)} Prüfe das Vorzeichen.` },
      { label: shown(s, sign * (n + gap)), whyWrong: 'Prüfe die Zahl. Die Zahl steht in der Aufgabe.' },
      { label: shown(s, -sign * (n + gap)), whyWrong: 'Prüfe zuerst die Zahl, dann das Vorzeichen.' },
    ]),
    hints: ['Such die Wörter für die Richtung: über 0 oder unter 0?', 'Werte unter 0 bekommen ein Minus.'],
    steps: [cueLine(s), `Die Zahl ist ${shown(s, s.value)}.`],
    praise: `Du hast auf „${s.cue}“ geachtet.`,
    srText: say(s.text, prompt),
  };
}

const inMinus = (n: number, name = 'Das Konto'): Statement => ({ id: 'minus', text: `${name} steht mit ${fmtQty(n, '€')} im Minus.`, value: -n, unit: '€', cue: 'im Minus' });
const inWreck = (n: number): Statement => ({ id: 'wrack', text: `Das Wrack liegt ${fmtQty(n, 'm')} tief im Meer.`, value: -n, unit: 'm', cue: 'tief im Meer' });
const inCellar = (n: number): Statement => ({ id: 'keller', frame: STOCK_ZERO, text: `Das Parkdeck liegt ${n} ${n === 1 ? 'Stockwerk' : 'Stockwerke'} unter dem Erdgeschoss.`, value: -n, cue: 'unter dem Erdgeschoss' });

/** One place below 0. */
function indirect(rng: Rng): Statement {
  const kind = rng.int(0, 2);
  if (kind === 0) return inMinus(10 * rng.int(3, 60));
  if (kind === 1) return inWreck(10 * rng.int(4, 90));
  return inCellar(rng.int(1, 5));
}

/** A place above 0 and a place below it. A number above 0 alone would only be copied from the text, with no sign to decide, so it only comes with a place below 0 beside it. */
function twoPlaces(rng: Rng): [Statement, Statement] {
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const n = 10 * rng.int(3, 60);
    return [
      { id: 'konten', who: 'zu Konto A', text: `Konto A steht mit ${fmtQty(n, '€')} im Plus.`, value: n, unit: '€', cue: 'im Plus' },
      { ...inMinus(10 * rng.int(3, 60), 'Konto B'), id: 'konten', who: 'zu Konto B' },
    ];
  }
  if (kind === 1) {
    const n = 100 * rng.int(9, 29);
    return [
      { id: 'hoehen', who: 'zum Gipfel', text: `Der Gipfel liegt ${fmtQty(n, 'm')} über dem Meer.`, value: n, unit: 'm', cue: 'über dem Meer' },
      { ...inWreck(10 * rng.int(4, 90)), id: 'hoehen', who: 'zum Wrack' },
    ];
  }
  const n = rng.int(1, 5);
  return [
    { id: 'etagen', who: 'zum Büro', text: `Das Büro liegt im ${ordinalWord(n, 'en')} Stock.`, value: n, cue: `im ${ordinalWord(n, 'en')} Stock` },
    { ...inCellar(rng.int(1, 5)), id: 'etagen', who: 'zum Parkdeck' },
  ];
}

/** AB II: the words are less direct, and the number is typed. Half of the items hold two places, mostly with the one above 0 asked for: the place and the sign are both to find. */
function typeNumber(rng: Rng): Form {
  let places = rng.chance(0.5) ? twoPlaces(rng) : null;
  // two numbers with the same digits would leave only the sign to tell them apart
  while (places && places[0].value === -places[1].value) places = twoPlaces(rng);
  const askAbove = rng.chance(0.7);
  const s = places ? places[askAbove ? 0 : 1] : indirect(rng);
  const other = places && places[askAbove ? 1 : 0];
  const context = [(places?.[1] ?? s).frame, ...(places ?? [s]).map((p) => p.text)].filter(Boolean).join(' ');
  const prompt = other ? `Welche Zahl gehört ${s.who}?` : 'Welche Zahl gehört dazu?';
  return {
    key: `tippen:${s.id}:${s.value}${other ? `:${other.value}` : ''}`,
    context,
    prompt,
    answer: signedNumber(s.value, s.unit ? { unit: s.unit } : {}),
    hints: ['Such die Wörter für die Richtung: über 0 oder unter 0?', 'Werte unter 0 bekommen ein Minus.'],
    steps: [cueLine(s), `Die Zahl ist ${shown(s, s.value)}.`],
    bugs: numberBugs([
      s.value < 0
        ? bug('vorzeichen-vergessen', -s.value, `„${s.cue}“ heißt: unter 0. Schreib ein Minus vor die Zahl.`)
        : bug('vorzeichen-umgekehrt', -s.value, `„${s.cue}“ heißt: über 0. Diese Zahl ist positiv.`),
      other && bug('andere-stelle', other.value, 'Das ist die Zahl der anderen Stelle. Lies die Frage noch einmal.'),
    ], s.value, true),
    praise: `Du hast auf „${s.cue}“ geachtet.`,
    srText: say(context, prompt),
  };
}

/** A way from a first place to a second one. */
interface Way {
  id: string;
  base: number;
  move: number;
  unit?: string;
  /** The first place and the way to the second one, as sentences. */
  context: string;
  /** The second place behind 'gehört': 'zu Konto B'. */
  who: string;
}

const floors = (m: number) => `${m} ${m === 1 ? 'Stockwerk' : 'Stockwerke'}`;

/**
 * Every way holds a negative number, as the first place or as the second one: positive numbers only would be a plain sum, easier than AB II. The way goes back up towards the 0, or over it either way, and so
 * neither the side of the first place nor the words decide the sign. The number of the second place is never in the text: the first number is neither the double nor the half of the step's.
 */
function wayFromPlace(rng: Rng): Way {
  const kind = rng.int(0, 2);
  const shape = rng.pick(['zurueck', 'zurueck', 'ueber-hoch', 'ueber-hoch', 'ueber-tief'] as const);
  /** What is left over the 0 after the way: k steps, but never the first number again. */
  const beyond = (first: number, top: number) => rng.pick(Array.from({ length: top }, (_, i) => i + 1).filter((k) => k !== first));
  /** The way back towards the 0: less than the first number, and not half of it. */
  const back = (first: number) => rng.pick(Array.from({ length: first - 1 }, (_, i) => i + 1).filter((k) => 2 * k !== first));
  if (kind === 0) {
    const n = rng.int(3, 60);
    if (shape === 'zurueck') {
      const d = back(n);
      return { id: 'konto', base: -10 * n, move: 10 * d, unit: '€', context: `Konto A steht mit ${fmtQty(10 * n, '€')} im Minus. Konto B zeigt ${fmtQty(10 * d, '€')} mehr als Konto A.`, who: 'zu Konto B' };
    }
    const d = n + beyond(n, 30);
    return shape === 'ueber-hoch'
      ? { id: 'konto', base: -10 * n, move: 10 * d, unit: '€', context: `Konto A steht mit ${fmtQty(10 * n, '€')} im Minus. Konto B zeigt ${fmtQty(10 * d, '€')} mehr als Konto A.`, who: 'zu Konto B' }
      : { id: 'konto', base: 10 * n, move: -10 * d, unit: '€', context: `Konto A steht mit ${fmtQty(10 * n, '€')} im Plus. Konto B zeigt ${fmtQty(10 * d, '€')} weniger als Konto A.`, who: 'zu Konto B' };
  }
  if (kind === 1) {
    const n = rng.int(3, 12);
    if (shape === 'zurueck') {
      const d = back(n);
      return { id: 'meer', base: -10 * n, move: 10 * d, unit: 'm', context: `Ein Wrack liegt ${fmtQty(10 * n, 'm')} tief im Meer. Ein Taucher ist ${fmtQty(10 * d, 'm')} über dem Wrack.`, who: 'zum Taucher' };
    }
    const d = n + beyond(n, 8);
    return shape === 'ueber-hoch'
      ? { id: 'meer', base: -10 * n, move: 10 * d, unit: 'm', context: `Ein Wrack liegt ${fmtQty(10 * n, 'm')} tief im Meer. Eine Möwe fliegt ${fmtQty(10 * d, 'm')} über dem Wrack.`, who: 'zur Möwe' }
      : { id: 'meer', base: 10 * n, move: -10 * d, unit: 'm', context: `Ein Hügel liegt ${fmtQty(10 * n, 'm')} über dem Meer. Ein Taucher ist ${fmtQty(10 * d, 'm')} unter dem Hügel.`, who: 'zum Taucher' };
  }
  const n = rng.int(3, 5);
  if (shape === 'zurueck') {
    const d = back(n);
    return { id: 'stock', base: -n, move: d, context: `${STOCK_ZERO} Ein Parkdeck liegt ${floors(n)} unter dem Erdgeschoss. Ein Lager liegt ${floors(d)} über dem Parkdeck.`, who: 'zum Lager' };
  }
  const d = n + beyond(n, 5);
  return shape === 'ueber-hoch'
    ? { id: 'stock', base: -n, move: d, context: `${STOCK_ZERO} Ein Parkdeck liegt ${floors(n)} unter dem Erdgeschoss. Ein Büro liegt ${floors(d)} über dem Parkdeck.`, who: 'zum Büro' }
    : { id: 'stock', base: n, move: -d, context: `${STOCK_ZERO} Ein Büro liegt im ${ordinalWord(n, 'en')} Stock. Ein Parkdeck liegt ${floors(d)} unter dem Büro.`, who: 'zum Parkdeck' };
}

/** AB III, reasoning: the number of one place to a second place that the text only gives from the first. Over and under now point away from that place and not from the 0. */
function fromReference(rng: Rng): Form {
  const scene = wayFromPlace(rng);
  const { base, move } = scene;
  const r = base + move;
  const prompt = `Welche Zahl gehört ${scene.who}?`;
  return {
    key: `bezug:${scene.id}:${base}:${move}`,
    context: scene.context,
    prompt,
    answer: signedNumber(r, scene.unit ? { unit: scene.unit } : {}),
    hints: ['Schreib zuerst die bekannte Zahl mit Vorzeichen auf.', 'Geh von dort nach oben oder nach unten.'],
    steps: [`Die bekannte Zahl ist ${shown(scene, base)}.`, `${fmt(base)} ${move > 0 ? '+' : '−'} ${fmt(Math.abs(move))} = ${fmt(r)}`, `Die gesuchte Zahl ist ${shown(scene, r)}.`],
    bugs: numberBugs([
      r < 0
        ? bug('vorzeichen-vergessen', -r, 'Die Zahl liegt unter 0. Dort steht ein Minus.')
        : bug('vorzeichen-umgekehrt', -r, 'Die Zahl liegt über 0. Dort steht kein Minus.'),
      bug('minus-richtung', base - move, `Prüfe die Richtung: Von ${shown(scene, base)} geht es nach ${move > 0 ? 'oben' : 'unten'}.`),
      bug('zwischenstand', base, 'Das ist die bekannte Zahl. Geh von dort noch weiter.'),
    ], r, true),
    praise: 'Du hast die Zahl von einem anderen Wert aus bestimmt.',
    srText: say(scene.context, prompt),
  };
}

// ─── Stufe 3: which statement fits; Gegenzahl in context ─────────────────────

function stories(n: number) {
  return [
    { id: 'wetter', unit: '°C', neg: `Es sind ${n} Grad unter null.`, pos: `Es sind ${n} Grad über null.`, change: `Die Temperatur fällt um ${n} Grad.` },
    { id: 'meer', unit: 'm', neg: `Ein Taucher ist ${fmtQty(n, 'm')} unter dem Meeresspiegel.`, pos: `Eine Möwe fliegt ${fmtQty(n, 'm')} über dem Meeresspiegel.`, change: `Ein Taucher taucht ${fmtQty(n, 'm')} tiefer.` },
    { id: 'konto', unit: '€', neg: `Ein Konto zeigt ${fmtQty(n, '€')} Schulden.`, pos: `Ein Konto zeigt ${fmtQty(n, '€')} Guthaben.`, change: `Von einem Konto gehen ${fmtQty(n, '€')} ab.` },
  ];
}

const POSITIVE_STORY = 'Diese Aussage gehört zu einer positiven Zahl. Such einen Wert unter 0.';

function whichStatement(rng: Rng): Form {
  const n = rng.int(4, 40);
  const all = rng.shuffle(stories(n));
  const pick = all[0];
  // −n also fits a change downwards (negativ.aenderung), so the task says which of the two it asks for
  const context = 'Gesucht ist ein Stand, keine Änderung.';
  const prompt = `Welche Aussage passt zu ${fmtQty(-n, pick.unit)}?`;
  return {
    key: `aussage:${pick.id}:${n}`,
    context,
    prompt,
    answer: makeChoice(rng, { label: pick.neg }, [
      { label: pick.pos, whyWrong: POSITIVE_STORY },
      { label: pick.change, whyWrong: 'Das ist eine Änderung. Gesucht ist ein Stand.' },
      { label: all[1].neg, whyWrong: 'Schau auf die Einheit. Diese Aussage hat eine andere.' },
    ]),
    hints: ['Prüfe zuerst die Einheit.', 'Ein Stand nennt einen Wert. Eine Änderung nennt einen Weg.'],
    steps: [`Die Einheit ist ${pick.unit}, und der Wert liegt unter 0.`, `Das passt: ${pick.neg}`],
    praise: 'Du hast Stand und Änderung getrennt.',
    srText: say(context, prompt),
    kmk: ['PK.modellieren'],
  };
}

const GEGENZAHL = 'Die Gegenzahl liegt gleich weit von der 0, auf der anderen Seite.';

function gegenzahl(rng: Rng): Form {
  const kind = rng.int(0, 3);
  const scene = kind === 0
    ? (() => {
      const n = 5 * rng.int(2, 30);
      return { id: 'konto', n, value: n, unit: '€', context: `Ein Konto zeigt ${fmtQty(-n, '€')}.`, prompt: `Wie viel Euro bringen das Konto genau auf ${fmtQty(0, '€')}?`, end: `Es kommen ${fmtQty(n, '€')} dazu.` };
    })()
    : kind === 1
      ? (() => {
        // from morning to midday the temperature changes by less than 20 Grad
        const n = rng.int(3, 9);
        return { id: 'wetter', n, value: n, unit: '°C', context: `Am Morgen sind es ${fmtTemp(-n)}. Die Temperatur am Mittag ist die Gegenzahl davon.`, prompt: 'Wie warm ist es am Mittag?', end: `Am Mittag sind es ${fmtTemp(n)}.` };
      })()
      : kind === 2
        ? (() => {
          const n = 5 * rng.int(2, 20);
          return { id: 'meer', n, value: -n, unit: 'm', context: `Eine Möwe fliegt ${fmtQty(n, 'm')} über dem Meeresspiegel. Ein Fisch schwimmt genauso weit darunter.`, prompt: 'Welche Zahl gehört zum Fisch?', end: `Zum Fisch gehört ${fmtQty(-n, 'm')}.` };
        })()
        : (() => {
          const n = rng.int(2, 6);
          return { id: 'aufzug', n, value: -n, unit: undefined, context: `Der Aufzug hält im ${ordinalWord(n, 'en')} Stock. Das nächste Ziel hat die Gegenzahl.`, prompt: 'Welche Zahl hat das nächste Ziel?', end: `Das Ziel hat die Zahl ${fmt(-n)}.` };
        })();
  return {
    key: `gegenzahl:${scene.id}:${scene.n}`,
    context: scene.context,
    prompt: scene.prompt,
    answer: signedNumber(scene.value, scene.unit ? { unit: scene.unit } : {}),
    hints: [GEGENZAHL, 'Überlege zuerst: Welche Seite der 0 ist gesucht?'],
    steps: [GEGENZAHL, `Die Gegenzahl von ${fmt(-scene.value)} ist ${fmt(scene.value)}.`, scene.end],
    bugs: numberBugs([
      scene.value > 0
        ? bug('vorzeichen-umgekehrt', -scene.value, 'Das ist der Stand vom Anfang. Die Gegenzahl liegt auf der anderen Seite der 0.')
        : bug('vorzeichen-vergessen', -scene.value, 'Das ist der Wert vom Anfang. Die Gegenzahl liegt auf der anderen Seite der 0.'),
    ], scene.value, true),
    praise: 'Du hast die Gegenzahl in der Sache gefunden.',
    srText: say(scene.context, scene.prompt),
    kmk: ['PK.modellieren'],
  };
}

/**
 * AB III: both cells of this Stufe at once, on more than Stufe 2 AB III asks. A way to a second place, as there, and then the Gegenzahl of that place in a third one, and only one statement about it holds. Each
 * option is the third place with a number: two signs and two sizes, so neither alone finds it. The other size comes from the way in the other direction.
 */
function whichClaim(rng: Rng): Form {
  const kind = rng.int(0, 2);
  const prompt = 'Welche Aussage stimmt?';
  // the second place lands on either side of the 0, by `left`; the first number does not come back as the answer
  const way = (nMin: number, nMax: number, top: number) => {
    const n = rng.int(nMin, nMax);
    const left = rng.pick(Array.from({ length: top }, (_, i) => i + 1).filter((k) => k !== n));
    const shape = rng.int(0, 2);
    // towards the 0 and stopping before it, over it upwards, over it downwards
    if (shape === 0 && left < n && 2 * left !== n) return { base: -n, move: n - left };
    if (shape === 2) return { base: n, move: -(n + left) };
    return { base: -n, move: n + left };
  };
  const scene = (() => {
    if (kind === 0) {
      // the towns stay in one weather: under 20 Grad apart
      const { base, move } = way(3, 9, 9);
      const walk = `In Stadt B ist es ${Math.abs(move)} Grad ${move > 0 ? 'wärmer' : 'kälter'} als in Stadt A.`;
      return { id: 'wetter', base, move, unit: '°C', text: `In Stadt A sind es ${fmtTemp(base)}. ${walk} In Stadt C ist die Temperatur die Gegenzahl davon.`, claim: (v: number) => `In Stadt C sind es ${fmtTemp(v)}.`, second: 'Stadt B' };
    }
    if (kind === 1) {
      const { base, move } = way(3, 40, 30);
      const m = { base: 10 * base, move: 10 * move };
      return { id: 'konto', ...m, unit: '€', text: `Konto A steht mit ${fmtQty(Math.abs(m.base), '€')} im ${m.base < 0 ? 'Minus' : 'Plus'}. Konto B zeigt ${fmtQty(Math.abs(m.move), '€')} ${m.move > 0 ? 'mehr' : 'weniger'} als Konto A. Konto C zeigt die Gegenzahl davon.`, claim: (v: number) => `Konto C zeigt ${fmtQty(v, '€')}.`, second: 'Konto B' };
    }
    const { base, move } = way(3, 12, 8);
    const m = { base: 10 * base, move: 10 * move };
    const first = m.base < 0 ? `Ein Wrack liegt ${fmtQty(-m.base, 'm')} tief im Meer. Punkt B liegt ${fmtQty(m.move, 'm')} über dem Wrack.` : `Ein Hügel liegt ${fmtQty(m.base, 'm')} über dem Meer. Punkt B liegt ${fmtQty(-m.move, 'm')} unter dem Hügel.`;
    return { id: 'meer', ...m, unit: 'm', text: `${first} Zu Punkt C gehört die Gegenzahl davon.`, claim: (v: number) => `Zu Punkt C gehört ${fmtQty(v, 'm')}.`, second: 'Punkt B' };
  })();
  const { base, move, unit, claim } = scene;
  const second = base + move;
  const answer = -second;
  const otherWay = Math.abs(base - move);
  const shownValue = (v: number) => (unit === '°C' ? fmtTemp(v) : fmtQty(v, unit));
  return {
    key: `stimmt:${scene.id}:${base}:${move}`,
    context: scene.text,
    prompt,
    answer: makeChoice(rng, { label: claim(answer) }, [
      { label: claim(second), whyWrong: `Das ist der Wert von ${scene.second}. Gesucht ist die Gegenzahl davon.` },
      { label: claim(otherWay), whyWrong: 'Prüfe die Richtung von der ersten Zahl aus.' },
      { label: claim(-otherWay), whyWrong: 'Prüfe die Richtung von der ersten Zahl aus.' },
    ]),
    hints: ['Schreib zuerst die erste Zahl mit Vorzeichen auf.', 'Rechne den Weg zum zweiten Wert. Nimm dann die Gegenzahl.'],
    steps: [`Die erste Zahl ist ${shownValue(base)}.`, `${fmt(base)} ${move > 0 ? '+' : '−'} ${fmt(Math.abs(move))} = ${fmt(second)}`, `Die Gegenzahl von ${fmt(second)} ist ${fmt(answer)}.`, `Also stimmt: ${claim(answer)}`],
    praise: 'Du hast den Weg und die Gegenzahl verbunden.',
    srText: say(scene.text, prompt),
    kmk: ['PK.argumentieren'],
  };
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = {
  1: stufe1,
  2: (rng, ab) => (ab === 1 ? chooseNumber(rng) : ab === 2 ? typeNumber(rng) : fromReference(rng)),
  3: (rng, ab) => (ab === 1 ? whichStatement(rng) : ab === 2 ? gegenzahl(rng) : whichClaim(rng)),
};

export const kontextSkill: SkillDef = {
  ...SKILL,
  title: 'Negative Zahlen im Alltag',
  description: 'Du beschreibst Temperatur, Konto und Höhe mit negativen Zahlen.',
  stufen: { 1: 'Thermometer ablesen, −20 °C bis 20 °C', 2: 'Konto, Stockwerke, Meereshöhe: Welche Zahl passt?', 3: 'Welche Aussage passt? Gegenzahl in der Sache' },
  kmk: [...KMK_ZAHLEN, 'PK.modellieren', 'PK.argumentieren'],
  keys: { minus: true },
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_ZAHLEN, FORMS[stufe](rng, ab));
  },
};
