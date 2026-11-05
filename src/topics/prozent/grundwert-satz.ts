/**
 * Prozentsatz und Grundwert (docs/research.md §6).
 * Stufe 1: the Prozentsatz, 15 von 50. Stufe 2: the Grundwert, 20 % sind 12. Stufe 3: Grundwert, Prozentwert and Prozentsatz in a story, simple Zins.
 * Out of scope (§2.6): prozentuale Veränderung, vermehrter and verminderter Grundwert, Zins solved backwards.
 * 20 % sind 12 read the wrong way gives 2,4, so the comma key belongs to the whole skill (§5, §7.1).
 */
import { fmt, fmtPercent as pct, MINUS } from '../../core/format';
import type { Ab, Bug, MultiField, Rng, SkillDef, Visual } from '../../core/types';
import { multiBugs, pickPerson, pickTwo } from '../shared';
import { amount, barUnit, drawUntil, fitBugs, fromForms, partsToMark, placesOf, quantity, r3, type Form } from './helpers';

const KMK = ['ZO.prozent', 'PK.modellieren'];

/** Bug values a child would type have at most two places (fitBugs). */
const DECIMALS = 2;

// ─── Stufe 1: der Prozentsatz ─────────────────────────────────────────────────

function satzBugs(w: number, g: number, p: number): Bug[] {
  return fitBugs([
    { id: 'satz-wert-verwechselt', match: w, hint: `${w} ist der Anteil. Rechne den Anteil auf 100 um.` },
    { id: 'additiv-auf-hundert', match: w + 100 - g, hint: 'Auf 100 kommst du mit mal, nicht mit plus.' },
    { id: 'bruch-verkehrt', match: r3((g * 100) / w), hint: `Teile den Anteil durch das Ganze, nicht das Ganze durch den Anteil.` },
    { id: 'rest-statt-anteil', match: 100 - p, hint: 'Das ist der andere Teil. Gefragt ist der genannte.' },
  ], p, DECIMALS);
}

function satzSteps(w: number, g: number, p: number, unit = ''): string[] {
  const f = 100 / g;
  const shown = (x: number) => (unit ? amount(x, unit) : fmt(x));
  return Number.isInteger(f)
    ? [`${shown(w)} von ${shown(g)} sind ${w} · ${f} = ${p} von 100.`, `Der Prozentsatz ist ${pct(p)}.`]
    : [`1 % von ${shown(g)} sind ${shown(r3(g / 100))}.`, `${w} : ${fmt(r3(g / 100))} = ${p}`, `Der Prozentsatz ist ${pct(p)}.`];
}

const SATZ_HINTS = (g: number) => [`Wie kommst du von ${g} auf 100?`, 'Rechne dann den Anteil genauso um.'];

/** A share of a whole with a whole percent, not a number the hints or the task name. */
function satzPair(rng: Rng, totals: readonly number[]): { w: number; g: number; p: number } {
  return drawUntil(() => {
    const g = rng.pick(totals);
    const p = rng.int(1, 19) * 5;
    return { w: (g * p) / 100, g, p };
  }, ({ w, g, p }) => Number.isInteger(w) && w !== p && g !== 100 && p !== g && w > 1);
}

/** No percent scale: with one, the □ would only be the gap between two labels. Without it the child has the share and the whole, and the mark stays on a tick so that its value is drawn. */
const satzDirekt: Form = (rng) => {
  const { w, g, p } = drawUntil(() => satzPair(rng, [10, 20, 25, 50]), (x) => x.p >= 10 && x.p <= 90);
  return {
    key: `satz:${w}:${g}`,
    prompt: `${w} von ${g} sind wie viel Prozent?`,
    visual: { type: 'percentBar', total: g, percent: p, ticks: partsToMark(p), labels: 'value', unknown: 'p' },
    answer: quantity(p, '%'),
    hints: SATZ_HINTS(g),
    steps: satzSteps(w, g, p),
    bugs: satzBugs(w, g, p),
    praise: `Du hast von ${g} auf 100 umgerechnet.`,
  };
};

/** Each story with the wholes it can have: a Klassenfahrt has no 500 Personen, and nobody throws 500 Bälle. */
const SATZ_STORIES = [
  { id: 'aufgaben', totals: [20, 25, 40, 50, 80], text: (w: number, g: number) => `Mia löst ${w} von ${g} Aufgaben.`, ask: 'Wie viel Prozent der Aufgaben löst Mia?' },
  { id: 'bus', totals: [40, 50, 60, 80, 120], text: (w: number, g: number) => `Von ${g} Personen der Klassenfahrt reisen ${w} Personen mit dem Bus.`, ask: 'Wie viel Prozent reisen mit dem Bus?' },
  { id: 'wuerfe', totals: [20, 40, 50, 80], text: (w: number, g: number) => `Ben wirft ${g} Bälle auf den Korb. ${w} Bälle treffen.`, ask: 'Wie viel Prozent der Bälle treffen?' },
  { id: 'noten', totals: [40, 80, 120, 200], text: (w: number, g: number) => `Das Lied hat ${g} Takte. Lea spielt schon ${w} Takte.`, ask: 'Wie viel Prozent der Takte spielt Lea schon?' },
  { id: 'schule', totals: [200, 250, 400, 500], text: (w: number, g: number) => `Die Schule hat ${g} Personen. ${w} Personen kommen mit dem Rad.`, ask: 'Wie viel Prozent der Personen kommen mit dem Rad?' },
] as const;

const satzStory: Form = (rng) => {
  const s = rng.pick(SATZ_STORIES);
  const { w, g, p } = satzPair(rng, s.totals);
  return {
    key: `satzstory:${s.id}:${w}:${g}`,
    context: s.text(w, g),
    prompt: s.ask,
    answer: quantity(p, '%'),
    hints: ['Das Ganze sind 100 %.', 'Rechne zuerst 1 % aus.'],
    steps: satzSteps(w, g, p),
    bugs: satzBugs(w, g, p),
    praise: 'Du hast den Anteil auf das Ganze bezogen.',
  };
};

const satzRest: Form = (rng) => {
  const { w, g, p } = drawUntil(() => satzPair(rng, [50, 80, 120, 200, 400]), (x) => 100 - x.p !== x.g && 100 - x.p !== x.w);
  return {
    key: `satzrest:${w}:${g}`,
    context: `Von ${g} Plätzen im Saal sind ${w} Plätze besetzt.`,
    prompt: 'Wie viel Prozent der Plätze sind frei?',
    answer: quantity(100 - p, '%'),
    hints: ['Rechne zuerst die besetzten Plätze in Prozent um.', 'Alle Plätze zusammen sind 100 %.'],
    steps: [...satzSteps(w, g, p).slice(0, -1), `Frei: 100 ${MINUS} ${p} = ${100 - p}`, `Es sind ${pct(100 - p)} frei.`],
    bugs: fitBugs([
      { id: 'rest-statt-anteil', match: p, hint: 'Das ist der besetzte Teil. Gefragt ist der freie.' },
      { id: 'satz-wert-verwechselt', match: g - w, hint: 'Das ist die Anzahl der freien Plätze. Rechne diese Anzahl in Prozent um.' },
    ], 100 - p, DECIMALS),
    praise: 'Du hast den besetzten Teil von 100 % abgezogen.',
  };
};

const satzVergleich: Form = (rng) => {
  const [x, y] = pickTwo(rng);
  const [a, b] = drawUntil(() => [satzPair(rng, [20, 25, 50]), satzPair(rng, [40, 80])], ([s, t]) => s.p !== t.p && ![s.w, s.g, t.w, t.g].includes(Math.max(s.p, t.p)));
  const high = Math.max(a.p, b.p);
  return {
    key: `satzvgl:${x.name}:${y.name}:${a.w}:${a.g}:${b.w}:${b.g}`,
    context: `${x.name} trifft ${a.w} von ${a.g} Würfen. ${y.name} trifft ${b.w} von ${b.g} Würfen.`,
    prompt: 'Rechne beide Anteile in Prozent um. Gib den größeren Prozentsatz an.',
    answer: quantity(high, '%'),
    hints: ['Die Zahl der Würfe ist verschieden. Vergleiche die Anteile.', 'Rechne jeden Anteil auf 100 um.'],
    steps: [`${x.name}: ${a.w} von ${a.g} sind ${pct(a.p)}.`, `${y.name}: ${b.w} von ${b.g} sind ${pct(b.p)}.`, `Der größere Prozentsatz ist ${pct(high)}.`],
    bugs: fitBugs([
      { id: 'kleinerer-anteil', match: Math.min(a.p, b.p), hint: 'Das ist der kleinere der beiden Prozentsätze.' },
      { id: 'satz-wert-verwechselt', match: Math.max(a.w, b.w), hint: 'Das ist eine Anzahl. Rechne beide Anteile in Prozent um.' },
    ], high, DECIMALS),
    praise: 'Du hast Anteile verglichen, nicht die Anzahlen.',
  };
};

// ─── Stufe 2: der Grundwert ───────────────────────────────────────────────────

/** The bar of a Grundwert task. The value at the mark needs its tick, and with 20 parts the percent labels have no room: the task names the percent anyway. */
function grundBar(g: number, p: number, unit: string): Visual {
  const parts = partsToMark(p);
  return { type: 'percentBar', total: g, percent: p, ticks: parts, labels: parts > 10 ? 'value' : 'both', unknown: 'G', ...barUnit(unit) };
}

function grundBugs(w: number, p: number, g: number): Bug[] {
  return fitBugs([
    { id: 'grundwert-vertauscht', match: r3((w * p) / 100), hint: `Hier ist ${fmt(w)} der Teil. Gesucht ist das Ganze, also 100 %.` },
    { id: 'teil-als-ganzes', match: w, hint: 'Das ist der Teil aus der Aufgabe. Gesucht ist das Ganze.' },
    { id: 'additiv-auf-hundert', match: w + 100 - p, hint: 'Auf 100 % kommst du mit mal und geteilt, nicht mit plus.' },
    { id: 'hundert-vergessen', match: w * p, hint: `Teile den Teil durch die Prozentzahl. Rechne dann mal 100.` },
  ], g, DECIMALS);
}

function grundSteps(w: number, p: number, g: number, unit: string): string[] {
  const one = r3(w / p);
  // no 1,2 Personen: a part of a person is only a step of the calculation
  const shown = (x: number) => (unit === 'Personen' ? fmt(x) : amount(x, unit));
  return [`1 % sind ${shown(w)} : ${p} = ${shown(one)}`, `100 % sind 100 · ${shown(one)} = ${shown(g)}`, `Der Grundwert ist ${amount(g, unit)}.`];
}

function grundPair(rng: Rng, ps: readonly number[], whole: () => number): { w: number; p: number; g: number } {
  return drawUntil(() => {
    const p = rng.pick(ps);
    const g = whole();
    return { w: (g * p) / 100, p, g };
  }, ({ w, g, p }) => Number.isInteger(w) && g !== 100 && g !== p && w !== g && w > 2 && w !== p);
}

const GRUND_DIREKT = [10, 20, 25, 50];

const grundDirekt: Form = (rng) => {
  const { w, p, g } = grundPair(rng, GRUND_DIREKT, () => rng.int(2, 30) * 10);
  const unit = rng.pick(['€', 'm', 'kg', 'Personen'] as const);
  return {
    key: `grund:${w}:${p}:${unit}`,
    prompt: `${pct(p)} sind ${amount(w, unit)}. Wie groß ist der Grundwert?`,
    visual: grundBar(g, p, unit),
    answer: quantity(g, unit),
    hints: ['Der Grundwert ist das Ganze, also 100 %.', `Wie oft passen ${pct(p)} in 100 %?`],
    steps: [`${pct(p)} passen ${100 / p}-mal in 100 %.`, `${100 / p} · ${amount(w, unit)} = ${amount(g, unit)}`, `Der Grundwert ist ${amount(g, unit)}.`],
    bugs: grundBugs(w, p, g),
    praise: 'Du hast vom Teil auf das Ganze geschlossen.',
  };
};

/** Each story with the wholes it can have, and the longest part where a part has a limit of its own (one day of a Radtour). */
const GRUND_STORIES = [
  { id: 'bus', unit: 'Personen', wholes: [20, 24, 25, 28, 30, 32], maxPart: Infinity, text: (w: string, p: string) => `In der Klasse 6a fahren ${w} mit dem Bus. Das sind ${p} der Klasse.`, ask: 'Wie viele Personen sind in der Klasse?' },
  { id: 'sparen', unit: '€', wholes: [120, 160, 200, 240, 280, 300, 340, 380, 400, 440, 480, 500, 560, 600], maxPart: Infinity, text: (w: string, p: string) => `Elif hat ${w} in der Spardose. Das sind ${p} des Preises für ein Fahrrad.`, ask: 'Wie viel kostet das Fahrrad?' },
  { id: 'weg', unit: 'km', wholes: [40, 60, 80, 120, 140, 160, 180, 200, 240], maxPart: 60, text: (w: string, p: string) => `Noah fährt am ersten Tag ${w} der Radtour. Das sind ${p} der Strecke.`, ask: 'Wie lang ist die ganze Strecke?' },
  { id: 'chor', unit: 'Personen', wholes: [20, 24, 25, 30, 32, 40, 48, 60], maxPart: Infinity, text: (w: string, p: string) => `Im Chor singen ${w} im Sopran. Das sind ${p} des Chors.`, ask: 'Wie viele Personen singen im Chor?' },
] as const;

const grundStory: Form = (rng) => {
  const s = rng.pick(GRUND_STORIES);
  const { w, p, g } = drawUntil(() => grundPair(rng, [5, 15, 30, 40, 60, 75], () => rng.pick(s.wholes)), (x) => x.w <= s.maxPart);
  return {
    key: `grundstory:${s.id}:${w}:${p}`,
    context: s.text(amount(w, s.unit), pct(p)),
    prompt: s.ask,
    visual: grundBar(g, p, s.unit),
    answer: quantity(g, s.unit),
    hints: ['Gesucht ist das Ganze, also 100 %.', 'Rechne zuerst 1 % aus.'],
    steps: grundSteps(w, p, g, s.unit),
    bugs: grundBugs(w, p, g),
    praise: 'Du hast über 1 % auf das Ganze geschlossen.',
  };
};

/** Fehlerdetektiv: a fictional person read the part as the whole, 20 % sind 12 as 2,4 (§5). */
const grundDetektiv: Form = (rng) => {
  const person = pickPerson(rng);
  const unit = rng.pick(['€', 'm', 'kg'] as const);
  const { w, p, g } = grundPair(rng, GRUND_DIREKT, () => rng.int(2, 30) * 10);
  const read = r3((w * p) / 100);
  return {
    key: `grunddetektiv:${unit}:${w}:${p}:${person.name}`,
    prompt: `${person.name} rechnet: ${pct(p)} sind ${amount(w, unit)}. Das Ganze sind dann ${amount(read, unit)}. Das stimmt noch nicht. Wie groß ist das Ganze?`,
    answer: quantity(g, unit),
    hints: ['Das Ganze ist größer als der Teil.', `Wie oft passen ${pct(p)} in 100 %?`],
    steps: [`${pct(p)} passen ${100 / p}-mal in 100 %.`, `${100 / p} · ${amount(w, unit)} = ${amount(g, unit)}`, `Das Ganze ist ${amount(g, unit)}.`],
    bugs: grundBugs(w, p, g),
    praise: 'Du hast den Teil und das Ganze unterschieden.',
  };
};

const restGrund: Form = (rng) => {
  // the wholes a class can have
  const [a, g] = drawUntil(() => [rng.int(2, 8) * 10, rng.pick([20, 24, 25, 28, 30, 32])], ([x, y]) => (y * (100 - x)) % 100 === 0 && (y * (100 - x)) / 100 > 2 && (y * (100 - x)) / 100 !== x && x !== y);
  const b = (g * (100 - a)) / 100;
  return {
    key: `restgrund:${a}:${g}`,
    context: `${pct(a)} der Klasse 6c kommen mit dem Bus. Die anderen ${b} Personen kommen mit dem Rad.`,
    prompt: 'Wie viele Personen sind in der Klasse?',
    answer: quantity(g, 'Personen'),
    hints: [`Wie viel Prozent kommen mit dem Rad?`, 'Schließe dann auf 100 %.'],
    steps: [`Mit dem Rad: 100 ${MINUS} ${a} = ${100 - a} Prozent.`, `1 % sind ${b} : ${100 - a} = ${fmt(r3(g / 100))}`, `100 % sind 100 · ${fmt(r3(g / 100))} = ${g}`, `In der Klasse sind ${g} Personen.`],
    bugs: fitBugs([
      { id: 'rest-statt-anteil', match: r3((b * 100) / a), hint: `Die ${b} Personen sind nicht die ${pct(a)}. Es sind die anderen.` },
      { id: 'teil-als-ganzes', match: b, hint: 'Das sind nur die Personen mit dem Rad. Gesucht ist die Klasse.' },
    ], g, DECIMALS),
    praise: 'Du hast erst den Prozentsatz der anderen bestimmt.',
  };
};

// ─── Stufe 3: Begriffe in einer Geschichte, Zins ──────────────────────────────

/** A story that can leave out any of the three, with the wholes it can have. */
const ROLE_STORIES = [
  {
    id: 'verein', unit: 'Mitglieder', totals: [80, 120, 200], whole: (g: string) => `Der Verein hat ${g}.`, part: (w: string) => `${w} spielen Tennis.`, share: (p: string) => `${p} der Mitglieder spielen Tennis.`, of: 'des Vereins',
  },
  {
    id: 'fahrt', unit: 'Personen', totals: [40, 50, 60, 80], whole: (g: string) => `Auf der Klassenfahrt sind ${g}.`, part: (w: string) => `${w} wandern.`, share: (p: string) => `${p} der Personen wandern.`, of: 'der Klassenfahrt',
  },
  {
    id: 'kasse', unit: '€', totals: [40, 50, 60, 80], whole: (g: string) => `In der Klassenkasse sind ${g}.`, part: (w: string) => `Für Eis gehen ${w} weg.`, share: (p: string) => `${p} des Geldes gehen für Eis weg.`, of: 'der Klassenkasse',
  },
] as const;

type Role = 'G' | 'W' | 'p';

interface RoleStory {
  s: (typeof ROLE_STORIES)[number];
  role: Role;
  w: number;
  g: number;
  p: number;
  told: string;
  /** The line that computes what the story leaves out. */
  line: string;
}

/** The Stufe 3 story: two of the three are told, and nothing says which one is which. `percents` narrows the Prozentsatz for harder numbers. */
function roleStory(rng: Rng, percents: (p: number) => boolean = () => true): RoleStory {
  const s = rng.pick(ROLE_STORIES);
  const role = rng.pick(['G', 'W', 'p'] as const);
  const { w, g, p } = drawUntil(() => satzPair(rng, s.totals), (x) => x.w > 2 && x.g !== x.w && percents(x.p));
  const [whole, part] = [amount(g, s.unit), amount(w, s.unit)];
  const told = role === 'G' ? `${s.part(part)} Das sind ${pct(p)} ${s.of}.` : `${s.whole(whole)} ${role === 'W' ? s.share(pct(p)) : s.part(part)}`;
  const line = role === 'G' ? `Grundwert: ${w} · 100 : ${p} = ${g}` : role === 'W' ? `Prozentwert: ${g} · ${p} : 100 = ${w}` : `Prozentsatz: ${w} · 100 : ${g} = ${p}`;
  return { s, role, w, g, p, told, line };
}

/** Which of the three is which, and the one that is missing: a recognition alone would be easier than the Grundwert of Stufe 2. */
const rollenTabelle: Form = (rng) => {
  const { s, role, w, g, p, told, line } = roleStory(rng);
  const places = placesOf(s.unit);
  const fields: MultiField[] = [
    { id: 'grund', before: 'Grundwert:', after: s.unit, value: g, decimals: places },
    { id: 'wert', before: 'Prozentwert:', after: s.unit, value: w, decimals: places },
    { id: 'satz', before: 'Prozentsatz:', after: '%', value: p, decimals: placesOf('%') },
  ];
  return {
    key: `rollen:${s.id}:${role}:${w}:${g}`,
    context: told,
    prompt: 'Trage Grundwert, Prozentwert und Prozentsatz ein.',
    answer: { kind: 'multi', fields },
    hints: ['Der Grundwert ist das Ganze, also 100 %.', 'Der Prozentwert ist der Teil vom Ganzen.'],
    steps: [line, `Grundwert: ${amount(g, s.unit)}, Prozentwert: ${amount(w, s.unit)}, Prozentsatz: ${pct(p)}`],
    bugs: multiBugs([
      { id: 'teil-als-ganzes', match: { grund: w, wert: g }, hint: 'Der Grundwert ist das Ganze. Der Prozentwert ist der Teil.' },
      role === 'p' && { id: 'satz-wert-verwechselt', match: { satz: w }, hint: `${w} ist der Teil. Rechne den Teil in Prozent um.` },
    ], fields),
    praise: 'Du hast das Ganze und den Teil unterschieden.',
  };
};

/** Percents that are one easy step away from the whole. */
const EASY_PERCENT = [10, 20, 25, 50, 75];

/**
 * The same story without the three names: the child finds out what is missing. Neither the question nor a unit behind the field says which one it is, so only the story tells,
 * and the percent is no easy one: with the question 'Wie viel Prozent' this is the story of Stufe 1, and asked for a Prozentwert it is easier than the Grundwert of Stufe 2.
 */
const gesuchtRechnen: Form = (rng) => {
  const { s, role, w, g, p, told, line } = roleStory(rng, (x) => !EASY_PERCENT.includes(x));
  const result = role === 'G' ? g : role === 'W' ? w : p;
  const unit = role === 'p' ? '%' : s.unit;
  const bugs = role === 'G' ? grundBugs(w, p, g) : role === 'p' ? satzBugs(w, g, p) : fitBugs([
    { id: 'prozent-als-zahl', match: p, hint: `${pct(p)} heißt ${p} von 100. Wie viel ist das von ${g}?` },
    { id: 'rest-statt-anteil', match: g - w, hint: `Das ist der Rest. Gefragt sind die ${pct(p)}.` },
    { id: 'hundert-vergessen', match: g * p, hint: 'Du hast malgenommen. Teile das Ergebnis noch durch 100.' },
  ], w, DECIMALS);
  return {
    key: `gesucht:${role}:${s.id}:${w}:${g}:${p}`,
    context: told,
    prompt: 'Eine Angabe fehlt: Grundwert, Prozentwert oder Prozentsatz. Wie groß ist diese Angabe?',
    answer: quantity(result),
    hints: ['Welche Angabe fehlt in der Geschichte?', 'Der Grundwert ist das Ganze, der Prozentwert der Teil.'],
    steps: [line, `Gesucht ist also ${amount(result, unit)}.`],
    bugs,
    praise: 'Du hast erkannt, welche Angabe noch fehlt.',
  };
};

/**
 * Zinsen: Prozent von einem Betrag für ein Jahr. No multiple of 100, so that 1 % has a comma: 900 € at 2 % is easier than the Grundwert of Stufe 2.
 * 100 € would make the Zinsen the percent number.
 */
function zinsPair(rng: Rng): { k: number; p: number; z: number } {
  const k = drawUntil(() => rng.int(6, 49) * 20, (x) => x % 100 !== 0);
  const p = rng.int(2, 5);
  return { k, p, z: r3((k * p) / 100) };
}

const ZINS_NOTE = 'Zinsen sind Geld, das die Bank für dein Guthaben zahlt.';

const zinsen: Form = (rng) => {
  const person = pickPerson(rng);
  const { k, p, z } = zinsPair(rng);
  return {
    key: `zins:${person.name}:${k}:${p}`,
    context: `${person.name} hat ${amount(k, '€')} auf dem Sparbuch. Die Bank zahlt ${pct(p)} Zinsen im Jahr.`,
    prompt: `Wie viel Euro Zinsen bekommt ${person.name} nach 1 Jahr?`,
    answer: quantity(z, '€'),
    hints: [ZINS_NOTE, 'Zinsen rechnest du wie Prozent von einem Betrag.'],
    steps: [`Der Grundwert ist ${amount(k, '€')}.`, `1 % sind ${amount(r3(k / 100), '€')}.`, `${pct(p)} sind ${p} · ${amount(r3(k / 100), '€')} = ${amount(z, '€')}`, `Die Zinsen sind ${amount(z, '€')}.`],
    bugs: fitBugs([
      { id: 'prozent-als-zahl', match: p, hint: `${pct(p)} sind nicht ${amount(p, '€')}. Prozent heißt: von 100.` },
      { id: 'guthaben-mit-zins', match: r3(k + z), hint: 'Das ist das neue Guthaben. Gefragt sind nur die Zinsen.' },
      { id: 'hundert-vergessen', match: k * p, hint: 'Teile das Ergebnis noch durch 100.' },
    ], z, DECIMALS),
    praise: 'Du hast die Zinsen wie einen Prozentwert berechnet.',
  };
};

const guthaben: Form = (rng) => {
  const person = pickPerson(rng);
  const { k, p, z } = zinsPair(rng);
  const total = r3(k + z);
  return {
    key: `guthaben:${person.name}:${k}:${p}`,
    context: `${person.name} hat ${amount(k, '€')} auf dem Sparbuch. Die Bank zahlt ${pct(p)} Zinsen im Jahr.`,
    prompt: `Wie viel Geld hat ${person.name} nach 1 Jahr auf dem Sparbuch?`,
    answer: quantity(total, '€'),
    hints: [ZINS_NOTE, 'Rechne zuerst die Zinsen aus.'],
    steps: [`Zinsen: ${pct(p)} von ${amount(k, '€')} sind ${amount(z, '€')}.`, `Guthaben: ${amount(k, '€')} + ${amount(z, '€')} = ${amount(total, '€')}`, `Nach 1 Jahr sind es ${amount(total, '€')}.`],
    bugs: fitBugs([
      { id: 'zinsen-statt-guthaben', match: z, hint: 'Das sind nur die Zinsen. Gefragt ist das ganze Guthaben.' },
      { id: 'prozent-als-zahl', match: k + p, hint: `${pct(p)} sind nicht ${amount(p, '€')}. Rechne die Zinsen in Euro aus.` },
    ], total, DECIMALS),
    praise: 'Du hast die Zinsen zum Guthaben gezählt.',
  };
};

/** Still a simple Zins forward (§2.6 has no Kapital or Zinssatz backwards): two of them to compare. */
const zinsVergleich: Form = (rng) => {
  const [x, y] = pickTwo(rng);
  const [a, b] = drawUntil(() => [zinsPair(rng), zinsPair(rng)], ([s, t]) => s.z !== t.z && s.k !== t.k && s.p !== t.p && ![s.p, t.p].includes(Math.max(s.z, t.z)));
  const high = Math.max(a.z, b.z);
  return {
    key: `zinsvgl:${x.name}:${y.name}:${a.k}:${a.p}:${b.k}:${b.p}`,
    context: `${x.name} hat ${amount(a.k, '€')} auf dem Sparbuch und bekommt ${pct(a.p)} Zinsen im Jahr. ${y.name} hat ${amount(b.k, '€')} auf dem Sparbuch und bekommt ${pct(b.p)} Zinsen im Jahr.`,
    prompt: 'Rechne beide Zinsen aus. Wie viel Euro sind die höheren Zinsen nach 1 Jahr?',
    answer: quantity(high, '€'),
    hints: ['Ein höherer Prozentsatz heißt nicht immer höhere Zinsen.', 'Rechne für jede Person Prozent vom Guthaben.'],
    steps: [`${x.name}: ${pct(a.p)} von ${amount(a.k, '€')} sind ${amount(a.z, '€')}.`, `${y.name}: ${pct(b.p)} von ${amount(b.k, '€')} sind ${amount(b.z, '€')}.`, `Die höheren Zinsen sind ${amount(high, '€')}.`],
    bugs: fitBugs([
      { id: 'kleinerer-anteil', match: Math.min(a.z, b.z), hint: 'Das sind die niedrigeren Zinsen. Gefragt sind die höheren.' },
      { id: 'prozent-als-zahl', match: Math.max(a.p, b.p), hint: 'Prozent sind noch keine Euro. Rechne die Zinsen aus.' },
    ], high, DECIMALS),
    praise: 'Du hast beide Zinsen ausgerechnet und verglichen.',
  };
};

/** A Prozentsatz, a Prozentwert and the rest of the whole in one story: every number has to be put in its place first. */
const zweiAnteile: Form = (rng) => {
  const [g, p, q] = drawUntil(() => [rng.pick([80, 120, 160, 200, 240]), rng.int(2, 10) * 5, rng.int(2, 10) * 5], ([x, y, z]) => (x * y) % 100 === 0 && (x * z) % 100 === 0 && y !== z && y + z < 90 && ![y, (x * z) / 100].includes(100 - y - z));
  const w = (g * q) / 100;
  const left = 100 - p - q;
  return {
    key: `anteile:${g}:${p}:${w}`,
    context: `Der Verein hat ${g} Mitglieder. ${pct(p)} der Mitglieder spielen Tennis. ${w} Mitglieder spielen Fußball. Die übrigen Mitglieder wandern.`,
    prompt: 'Wie viel Prozent der Mitglieder wandern?',
    answer: quantity(left, '%'),
    hints: ['Der Verein ist das Ganze, also 100 %.', 'Rechne zuerst die Personen beim Fußball in Prozent um.'],
    steps: [`Fußball: ${w} · 100 : ${g} = ${q}`, `Beide Sportarten: ${p} + ${q} = ${p + q}`, `Rest: 100 ${MINUS} ${p + q} = ${left}`, `Es sind ${pct(left)}.`],
    bugs: fitBugs([
      { id: 'rest-statt-anteil', match: p + q, hint: 'Das sind Tennis und Fußball zusammen. Gefragt ist der Rest.' },
      { id: 'satz-wert-verwechselt', match: 100 - p - w, hint: `${w} ist eine Anzahl. Rechne die Anzahl zuerst in Prozent um.` },
    ], left, DECIMALS),
    praise: 'Du hast alle Angaben in Prozent gebracht.',
  };
};

const FORMS: Record<1 | 2 | 3, Record<Ab, Form[]>> = {
  1: { 1: [satzDirekt], 2: [satzStory], 3: [satzRest, satzVergleich] },
  2: { 1: [grundDirekt], 2: [grundStory], 3: [grundDetektiv, restGrund] },
  3: { 1: [rollenTabelle, zinsen], 2: [guthaben, gesuchtRechnen], 3: [zinsVergleich, zweiAnteile] },
};

export const grundwertSatzSkill: SkillDef = {
  id: 'prozent.grundwert-satz',
  topicId: 'prozent',
  title: 'Prozentsatz und Grundwert',
  description: 'Du findest den Prozentsatz oder das Ganze.',
  stufen: {
    1: 'Prozentsatz: 15 von 50 sind wie viel Prozent?',
    2: 'Grundwert: 20 % sind 12. Wie viel sind 100 %?',
    3: 'Grundwert, Prozentwert und Prozentsatz erkennen, einfache Zinsen',
  },
  keys: { comma: true },
  kmk: KMK,
  generate: fromForms('prozent.grundwert-satz', KMK, FORMS),
};
