/**
 * Maßstab (docs/research.md §6).
 * Stufe 1: 1 : 100, from the plan to the real length. Stufe 2: 1 : 25 000, both directions, with a change of unit. Stufe 3: find the Maßstab from two lengths.
 */
import { BOX, fmt, MINUS } from '../../core/format';
import type { Ab, Bug, Rng, SkillDef, Visual } from '../../core/types';
import { amount, drawUntil, exact, fitBugs, fromForms, lower, num, r3, type Form } from './helpers';

const KMK = ['GM.massstab', 'PK.modellieren'];

const DECIMALS = 3;

const scale = (s: number): string => `1 : ${fmt(s)}`;

/** A ruler under a length on the plan. */
const ruler = (cm: number): Visual => ({ type: 'ruler', maxCm: Math.min(20, Math.ceil(cm) + 1), startMm: 0, lengthMm: Math.round(cm * 10) });

/** Rooms of a house plan with the longest length that fits them, in metres. */
const ROOMS = [['Das Zimmer', 7], ['Der Flur', 12], ['Die Küche', 6], ['Das Bad', 5], ['Der Keller', 10], ['Der Schuppen', 6]] as const;

const AS_100 = '1 cm auf dem Plan sind 100 cm in echt.';

/** A room after 'zeigt': 'den Flur', 'das Zimmer', 'die Küche'. */
const accusative = (name: string): string => lower(name).replace(/^der /, 'den ');

const planBugs = (cm: number, real: number): Bug[] =>
  fitBugs([
    { id: 'massstab-richtung', match: r3(cm / 100), hint: 'Auf dem Plan ist es kleiner. In echt ist es 100-mal so lang.' },
    { id: 'einheit-nicht-umgerechnet', match: r3(cm * 100), hint: 'Das sind Zentimeter. Gefragt sind Meter.' },
  ], real, DECIMALS);

// ─── Stufe 1: 1 : 100 ─────────────────────────────────────────────────────────

/** In Millimetern on the plan: at 1 : 100, centimetres on the plan are the same number of metres, so the number in the task could simply be copied. For the same reason no ruler: it would show that number in cm. */
const planToMetres: Form = (rng) => {
  const [room, longest] = rng.pick(ROOMS);
  const cm = rng.int(4, longest * 2) / 2;
  const mm = cm * 10;
  return {
    key: `plan:${room}:${cm}`,
    context: `Auf dem Plan ist ${lower(room)} ${amount(mm, 'mm')} lang. Der Plan hat den Maßstab ${scale(100)}.`,
    prompt: `Wie viele Meter ist ${lower(room)} in echt lang?`,
    answer: num(cm, 'm', DECIMALS),
    hints: ['In echt ist alles 100-mal so lang wie auf dem Plan.', 'Rechne die Länge mal 100. Wandle dann in Meter um.'],
    steps: [`${amount(mm, 'mm')} · 100 = ${amount(mm * 100, 'mm')}`, `${amount(mm * 100, 'mm')} = ${amount(cm, 'm')}`, `${room} ist in echt ${amount(cm, 'm')} lang.`],
    bugs: fitBugs([
      ...planBugs(cm, cm),
      { id: 'einheit-nicht-umgerechnet', match: mm, hint: 'Das ist die Länge auf dem Plan. Rechne zuerst mal 100.' },
    ], cm, DECIMALS),
    praise: 'Du hast die Planlänge malgenommen und in Meter umgewandelt.',
  };
};

const planToCentimetres: Form = (rng) => {
  const [room, longest] = rng.pick(ROOMS);
  const cm = rng.int(2, longest);
  const real = cm * 100;
  return {
    key: `plancm:${room}:${cm}`,
    context: `Auf dem Plan ist ${lower(room)} ${amount(cm, 'cm')} lang. Der Plan hat den Maßstab ${scale(100)}.`,
    prompt: `Wie viele Zentimeter ist ${lower(room)} in echt lang?`,
    visual: ruler(cm),
    answer: num(real, 'cm', DECIMALS),
    hints: [AS_100, 'Rechne die Länge mal 100.'],
    steps: [AS_100, `${cm} cm · 100 = ${real} cm`, `${room} ist in echt ${amount(real, 'cm')} lang.`],
    bugs: fitBugs([
      { id: 'massstab-richtung', match: r3(cm / 100), hint: 'Auf dem Plan ist es kleiner. In echt ist es 100-mal so lang.' },
      { id: 'meter-statt-zentimeter', match: cm, hint: 'Das ist die Länge in Metern. Gefragt sind Zentimeter.' },
    ], real, DECIMALS),
    praise: 'Du hast die Planlänge mit 100 malgenommen.',
  };
};

/** The length is only in the picture. The context names the strip and not the 'Lineal': that word would stand for the whole picture in srTextWithPicture (src/ui/visuals/describe.ts), and a child who hears the task would never get the length. */
const readRuler: Form = (rng) => {
  const [room, longest] = rng.pick(ROOMS);
  const cm = rng.int(2, longest - 1) + 0.5;
  const real = cm * 100;
  return {
    key: `lineal:${room}:${cm}`,
    context: `Der Streifen zeigt ${accusative(room)} auf dem Plan. Der Plan hat den Maßstab ${scale(100)}.`,
    prompt: `Wie viele Zentimeter ist ${lower(room)} in echt lang?`,
    visual: ruler(cm),
    answer: num(real, 'cm', DECIMALS),
    hints: ['Lies die Länge am Lineal ab: Zentimeter und Millimeter.', AS_100],
    steps: [`Der Streifen endet bei ${amount(cm, 'cm')}.`, `${fmt(cm)} cm · 100 = ${fmt(real)} cm`, `${room} ist in echt ${amount(real, 'cm')} lang.`],
    bugs: fitBugs([
      { id: 'massstab-richtung', match: r3(cm / 100), hint: 'Auf dem Plan ist es kleiner. In echt ist es 100-mal so lang.' },
      { id: 'meter-statt-zentimeter', match: cm, hint: 'Das ist die Länge in Metern. Gefragt sind Zentimeter.' },
    ], real, DECIMALS),
    praise: 'Du hast genau abgelesen und dann umgerechnet.',
  };
};

/** Never 1 cm apart: then the result is the 100 cm of the first hint. */
const difference: Form = (rng) => {
  const [a, b] = drawUntil(() => [rng.int(4, 14) / 2, rng.int(4, 14) / 2], ([x, y]) => x > y && x - y !== 1);
  const diff = a - b;
  const real = diff * 100;
  return {
    key: `differenz:${a}:${b}`,
    context: `Auf dem Plan ist die Küche ${amount(a, 'cm')} lang und das Bad ${amount(b, 'cm')}. Der Plan hat den Maßstab ${scale(100)}.`,
    prompt: 'Um wie viele Zentimeter ist die Küche in echt länger als das Bad?',
    answer: num(real, 'cm', DECIMALS),
    hints: [AS_100, 'Du kannst zuerst den Unterschied auf dem Plan ausrechnen.'],
    steps: [`Auf dem Plan: ${fmt(a)} ${MINUS} ${fmt(b)} = ${fmt(diff)}`, `${fmt(diff)} cm · 100 = ${fmt(real)} cm`, `Die Küche ist ${amount(real, 'cm')} länger.`],
    bugs: fitBugs([
      { id: 'summe-statt-differenz', match: (a + b) * 100, hint: 'Du hast addiert. Gefragt ist der Unterschied.' },
      { id: 'meter-statt-zentimeter', match: diff, hint: 'Das ist der Unterschied in Metern. Gefragt sind Zentimeter.' },
      { id: 'massstab-richtung', match: r3(diff / 100), hint: 'In echt ist es 100-mal so lang, nicht kleiner.' },
    ], real, DECIMALS),
    praise: 'Du hast den Unterschied in echten Zentimetern bestimmt.',
  };
};

const perimeter: Form = (rng) => {
  const [a, b] = drawUntil(() => [rng.int(3, 12), rng.int(2, 9)], ([x, y]) => x > y);
  const u = 2 * (a + b);
  return {
    key: `umfang:${a}:${b}`,
    context: `Auf dem Plan ist der Schulgarten ${amount(a, 'cm')} lang und ${amount(b, 'cm')} breit. Der Plan hat den Maßstab ${scale(100)}.`,
    prompt: 'Wie viele Meter ist der Zaun um den ganzen Schulgarten lang?',
    answer: num(u, 'm', DECIMALS),
    hints: [AS_100, 'Der Zaun geht um alle vier Seiten.'],
    steps: [`In echt: ${a} m lang und ${b} m breit.`, `Zaun: 2 · (${a} + ${b}) = ${u}`, `Der Zaun ist ${amount(u, 'm')} lang.`],
    bugs: fitBugs([
      { id: 'zwei-seiten', match: a + b, hint: 'Das sind nur zwei Seiten. Der Zaun geht um alle vier.' },
      { id: 'einheit-nicht-umgerechnet', match: u * 100, hint: 'Das sind Zentimeter. Gefragt sind Meter.' },
    ], u, DECIMALS),
    praise: 'Du hast den Plan umgerechnet und alle Seiten gezählt.',
  };
};

// ─── Stufe 2: Karten, beide Richtungen ────────────────────────────────────────

const MAP_SCALES = [25000, 50000, 10000, 20000] as const;
const CM_PER_KM = 100_000;

const mapToReal = (drawCm: (rng: Rng) => number, tag: string): Form => (rng) => {
  const s = rng.pick(MAP_SCALES);
  const cm = drawCm(rng);
  const realCm = cm * s;
  const metres = realCm / 100;
  const inKm = rng.chance(0.5);
  const value = inKm ? r3(metres / 1000) : metres;
  return {
    key: `${tag}:${inKm ? 'km' : 'm'}:${s}:${cm}`,
    context: `Auf der Karte ist der Weg ${amount(cm, 'cm')} lang. Die Karte hat den Maßstab ${scale(s)}.`,
    prompt: `Wie viele ${inKm ? 'Kilometer' : 'Meter'} ist der Weg in echt lang?`,
    answer: num(value, inKm ? 'km' : 'm', DECIMALS),
    hints: [`1 cm auf der Karte sind in echt ${fmt(s)} cm.`, 'Wandle das Ergebnis zum Schluss um: 100 cm sind 1 m.'],
    steps: [`${fmt(cm)} cm · ${fmt(s)} = ${fmt(realCm)} cm`, `${fmt(realCm)} cm sind ${amount(metres, 'm')}.`, `Der Weg ist ${amount(value, inKm ? 'km' : 'm')} lang.`],
    bugs: fitBugs([
      { id: 'einheit-nicht-umgerechnet', match: realCm, hint: 'Das sind Zentimeter. Wandle das Ergebnis noch um.' },
      { id: 'einheit-nicht-umgerechnet', match: inKm ? metres : r3(metres / 1000), hint: inKm ? 'Das sind Meter. Gefragt sind Kilometer.' : 'Das sind Kilometer. Gefragt sind Meter.' },
      { id: 'massstab-richtung', match: exact(s / cm), hint: 'In echt ist der Weg länger. Rechne mal, nicht geteilt.' },
    ], value, DECIMALS),
    praise: 'Du hast malgenommen und dann die Einheit gewechselt.',
  };
};

/** A way in km that lands on whole or half centimetres of the map. */
function realWay(rng: Rng): { s: number; cm: number; km: number } {
  return drawUntil(() => {
    const s = rng.pick(MAP_SCALES);
    const cm = rng.int(2, 24) / 2;
    return { s, cm, km: r3((cm * s) / CM_PER_KM) };
  }, ({ s, cm, km }) => Math.abs((km * CM_PER_KM) / s - cm) < 1e-9 && (km * 100) % 5 === 0);
}

function realToMapBugs(km: number, s: number, cm: number): Bug[] {
  return fitBugs([
    { id: 'massstab-richtung', match: km * s, hint: 'Auf der Karte ist der Weg kleiner. Teile durch die große Zahl.' },
    { id: 'einheit-nicht-umgerechnet', match: exact((km * 1000) / s), hint: `Rechne den Weg zuerst in Zentimeter um: 1 km sind ${fmt(CM_PER_KM)} cm.` },
  ], cm, DECIMALS);
}

const realToMap: Form = (rng) => {
  const { s, cm, km } = realWay(rng);
  return {
    key: `zurkarte:${s}:${cm}`,
    context: `Der Weg ist in echt ${amount(km, 'km')} lang. Die Karte hat den Maßstab ${scale(s)}.`,
    prompt: 'Wie viele Zentimeter ist der Weg auf der Karte lang?',
    answer: num(cm, 'cm', DECIMALS),
    hints: ['Rechne den Weg zuerst in Zentimeter um.', 'Teile dann durch die große Zahl im Maßstab.'],
    steps: [`${amount(km, 'km')} sind ${fmt(r3(km * CM_PER_KM))} cm.`, `${fmt(r3(km * CM_PER_KM))} : ${fmt(s)} = ${fmt(cm)}`, `Auf der Karte sind es ${amount(cm, 'cm')}.`],
    bugs: realToMapBugs(km, s, cm),
    praise: 'Du hast zuerst alles in Zentimeter umgerechnet.',
  };
};

const twoStages: Form = (rng) => {
  const s = rng.pick(MAP_SCALES);
  const [a, b] = drawUntil(() => [rng.int(3, 15) / 2, rng.int(3, 15) / 2], ([x, y]) => x !== y && ![x, y].includes(r3(((x + y) * s) / CM_PER_KM)));
  const km = r3(((a + b) * s) / CM_PER_KM);
  return {
    key: `etappen:${s}:${a}:${b}`,
    context: `Auf der Karte ist der Hinweg ${amount(a, 'cm')} lang und der Rückweg ${amount(b, 'cm')}. Die Karte hat den Maßstab ${scale(s)}.`,
    prompt: 'Wie viele Kilometer sind beide Wege zusammen in echt?',
    answer: num(km, 'km', DECIMALS),
    hints: ['Zähle die beiden Längen auf der Karte zusammen.', `1 km sind ${fmt(CM_PER_KM)} cm.`],
    steps: [`Auf der Karte: ${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}`, `${fmt(a + b)} cm · ${fmt(s)} = ${fmt((a + b) * s)} cm`, `Das sind ${amount(km, 'km')}.`],
    bugs: fitBugs([
      { id: 'einheit-nicht-umgerechnet', match: r3((a + b) * s / 100), hint: 'Das sind Meter. Gefragt sind Kilometer.' },
      { id: 'nur-ein-weg', match: r3((a * s) / CM_PER_KM), hint: 'Das ist nur der Hinweg. Zähle den Rückweg dazu.' },
      { id: 'nur-ein-weg', match: r3((b * s) / CM_PER_KM), hint: 'Das ist nur der Rückweg. Zähle den Hinweg dazu.' },
    ], km, DECIMALS),
    praise: 'Du hast beide Wege zusammengezählt und umgerechnet.',
  };
};

// ─── Stufe 3: den Maßstab finden ──────────────────────────────────────────────

/** The '1 :' in front of the field is its label, so that a screen reader says it. */
const scaleAnswer = (ratio: number) => ({ ...num(ratio, undefined, DECIMALS), before: '1 :' });

/** The gap as an expression: the voice says it as '1 zu Lücke', and the field then adds no second, wrong reading (src/ui/practice/readAloud.ts). */
const SCALE_GAP = `1 : ${BOX}`;

const SCALE_HINT = 'Schreibe beide Längen in derselben Einheit.';

/** Places with the shortest and the longest length that fit them, in metres: long enough for a Maßstab other than 1 : 100, where the two lengths would show the same digits. A Turnhalle has no 8 m. */
const PLACES = [['Der Schulhof', 30, 80], ['Der Sportplatz', 50, 120], ['Der Garten', 8, 40], ['Die Turnhalle', 20, 40]] as const;

const findPlan: Form = (rng) => {
  const [room, shortest, longest] = rng.pick(PLACES);
  const [cm, ratio] = drawUntil(() => [rng.int(2, 12), rng.pick([200, 250, 400, 500, 800, 1000, 2000])], ([c, r]) => (c * r) % 100 === 0 && c * r >= shortest * 100 && c * r <= longest * 100);
  const realCm = cm * ratio;
  const metres = realCm / 100;
  return {
    key: `finden:${room}:${cm}:${ratio}`,
    context: `Auf dem Plan ist ${lower(room)} ${amount(cm, 'cm')} lang. In echt ist ${lower(room)} ${amount(metres, 'm')} lang.`,
    prompt: 'Wie heißt der Maßstab?',
    expression: SCALE_GAP,
    visual: ruler(cm),
    answer: scaleAnswer(ratio),
    hints: [SCALE_HINT, 'Wie oft passt die Länge auf dem Plan in die echte Länge?'],
    steps: [`${amount(metres, 'm')} = ${amount(realCm, 'cm')}`, `${amount(realCm, 'cm')} : ${amount(cm, 'cm')} = ${ratio}`, `Der Maßstab ist ${scale(ratio)}.`],
    bugs: fitBugs([
      { id: 'einheit-nicht-umgerechnet', match: exact(metres / cm), hint: SCALE_HINT },
      { id: 'massstab-richtung', match: exact(cm / realCm), hint: 'Teile die echte Länge durch die Länge auf dem Plan.' },
      { id: 'differenz-statt-verhaeltnis', match: realCm - cm, hint: 'Du hast abgezogen. Der Maßstab sagt: wie oft passt die Länge hinein?' },
    ], ratio, DECIMALS),
    praise: 'Du hast beide Längen in Zentimeter geschrieben.',
  };
};

const findMap: Form = (rng) => {
  const [cm, km, ratio] = drawUntil(() => {
    const c = rng.pick([2, 2.5, 4, 5, 8, 10]);
    const k = rng.pick([0.5, 1, 1.5, 2, 3, 4, 5]);
    return [c, k, (k * CM_PER_KM) / c];
  }, ([, , r]) => Number.isInteger(r) && r !== CM_PER_KM && r % 1000 === 0);
  const realCm = km * CM_PER_KM;
  return {
    key: `findenkarte:${cm}:${km}`,
    context: `Auf der Karte ist der Weg ${amount(cm, 'cm')} lang. In echt ist der Weg ${amount(km, 'km')} lang.`,
    prompt: 'Wie heißt der Maßstab?',
    expression: SCALE_GAP,
    answer: scaleAnswer(ratio),
    hints: [`Schreibe beide Längen in Zentimeter: 1 km sind ${fmt(CM_PER_KM)} cm.`, 'Teile dann die echte Länge durch die Länge auf der Karte.'],
    steps: [`${amount(km, 'km')} sind ${fmt(realCm)} cm.`, `${fmt(realCm)} : ${fmt(cm)} = ${fmt(ratio)}`, `Der Maßstab ist ${scale(ratio)}.`],
    bugs: fitBugs([
      { id: 'einheit-nicht-umgerechnet', match: exact((km * 1000) / cm), hint: 'Du hast mit Metern gerechnet. Der Maßstab braucht beide Längen in Zentimeter.' },
      { id: 'einheit-nicht-umgerechnet', match: exact(km / cm), hint: 'Du hast mit Kilometern gerechnet. Der Maßstab braucht beide Längen in Zentimeter.' },
    ], ratio, DECIMALS),
    praise: 'Du hast Kilometer in Zentimeter umgerechnet und geteilt.',
  };
};

const twoMaps: Form = (rng) => {
  const s = rng.pick(MAP_SCALES);
  const [a, f] = drawUntil(() => [rng.pick([4, 6, 8, 10, 12]), rng.pick([2, 4])], ([x, y]) => x % y === 0);
  const b = a / f;
  const ratio = s * f;
  return {
    key: `zweikarten:${s}:${a}:${f}`,
    context: `Auf Karte A mit ${scale(s)} ist der Weg ${amount(a, 'cm')} lang. Auf Karte B ist derselbe Weg ${amount(b, 'cm')} lang.`,
    prompt: 'Wie heißt der Maßstab von Karte B?',
    expression: SCALE_GAP,
    answer: scaleAnswer(ratio),
    hints: ['Rechne zuerst den Weg in echt aus.', 'Teile dann durch die Länge auf Karte B.'],
    steps: [`In echt: ${a} cm · ${fmt(s)} = ${fmt(a * s)} cm`, `${fmt(a * s)} : ${b} = ${fmt(ratio)}`, `Der Maßstab ist ${scale(ratio)}.`],
    bugs: fitBugs([
      { id: 'massstab-richtung', match: s / f, hint: 'Der Weg ist auf Karte B kürzer. Die große Zahl im Maßstab wächst dann.' },
      { id: 'plan-statt-massstab', match: s, hint: 'Das ist der Maßstab von Karte A.' },
    ], ratio, DECIMALS),
    praise: 'Du bist über den echten Weg gegangen.',
  };
};

const FORMS: Record<1 | 2 | 3, Record<Ab, Form[]>> = {
  1: { 1: [planToMetres, planToCentimetres], 2: [readRuler], 3: [difference, perimeter] },
  2: { 1: [mapToReal((rng) => rng.int(2, 12), 'karte')], 2: [realToMap], 3: [twoStages, mapToReal((rng) => rng.int(2, 11) + 0.5, 'kartehalb')] },
  3: { 1: [findPlan], 2: [findMap], 3: [twoMaps] },
};

export const massstabSkill: SkillDef = {
  id: 'prozent.massstab',
  topicId: 'prozent',
  title: 'Maßstab',
  description: 'Du rechnest mit Maßstäben von Plänen und Karten.',
  stufen: {
    1: '1 : 100, vom Plan zur echten Länge',
    2: '1 : 25 000 in beide Richtungen, mit Wechsel der Einheit',
    3: 'Den Maßstab aus zwei Längen finden',
  },
  keys: { comma: true },
  kmk: KMK,
  generate: fromForms('prozent.massstab', KMK, FORMS),
};
