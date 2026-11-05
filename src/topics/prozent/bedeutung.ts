/**
 * Was heißt Prozent? (docs/research.md §6)
 * Stufe 1: Hunderterfeld, so many of 100 cells. Stufe 2: Prozentstreifen with 10 parts, 10 % steps. Stufe 3: the same share with other totals, 3 of 20.
 */
import { fmtPercent as pct } from '../../core/format';
import type { Ab, Rng, SkillDef, Visual } from '../../core/types';
import { pickTwo, speak } from '../shared';
import { barUnit, drawUntil, field, firstCells, fitBugs, fromForms, num, type Form } from './helpers';

const KMK = ['ZO.prozent', 'PK.darstellen'];

const FULL_ROW = 'Eine volle Reihe hat 10 Kästchen.';

// ─── Stufe 1: Hunderterfeld ──────────────────────────────────────────────────

const lesen: Form = (rng) => {
  const k = rng.int(11, 95);
  return {
    key: `lesen:${k}`,
    prompt: 'Wie viel Prozent des Hunderterfelds sind gefärbt?',
    visual: field(100, k),
    answer: num(k, '%'),
    hints: ['Das Hunderterfeld hat 100 Kästchen. Zähle die gefärbten Kästchen.', FULL_ROW],
    steps: [`${k} von 100 Kästchen sind gefärbt.`, `${k} von 100 sind ${pct(k)}.`],
    bugs: fitBugs([
      { id: 'rest-gezaehlt', match: 100 - k, hint: 'Das sind die weißen Kästchen. Gefragt sind die gefärbten.' },
      { id: 'reihen-gezaehlt', match: Math.floor(k / 10), hint: 'Das sind die vollen Reihen. Jedes Kästchen zählt 1 %.' },
    ], k),
    praise: 'Du hast die gefärbten Kästchen von 100 gezählt.',
  };
};

/** From percent to cells, with a step in between: 'p % are how many cells?' alone is answered by copying the number. A subtraction on top of the reading, so not the most direct form of the Stufe. */
const fehlen: Form = (rng) => {
  const [k, p] = drawUntil(() => [rng.int(11, 60), rng.int(5, 19) * 5], ([x, y]) => y - x >= 3 && y - x !== x);
  const missing = p - k;
  return {
    key: `fehlen:${k}:${p}`,
    prompt: `Im Hunderterfeld sind ${k} Kästchen gefärbt. Es sollen ${pct(p)} gefärbt sein. Wie viele Kästchen fehlen noch?`,
    visual: field(100, k),
    answer: num(missing, 'Kästchen'),
    hints: ['Prozent heißt: von 100.', 'Ein Kästchen sind 1 %.'],
    steps: [`${pct(p)} heißt ${p} von 100.`, `${p} − ${k} = ${missing}`, `Es fehlen ${missing} Kästchen.`],
    bugs: fitBugs([
      { id: 'summe-statt-rest', match: p, hint: 'Das ist die Zahl aus der Aufgabe. Gefragt sind die fehlenden Kästchen.' },
      { id: 'rest-gezaehlt', match: 100 - k, hint: 'Das sind alle weißen Kästchen. Gefragt sind nur die fehlenden.' },
      { id: 'gefaerbt-gezaehlt', match: k, hint: 'Das sind die gefärbten Kästchen. Gefragt sind die fehlenden.' },
    ], missing),
    praise: 'Du hast Prozent als Kästchen von 100 gelesen.',
  };
};

const rest: Form = (rng) => {
  const k = rng.int(11, 89);
  return {
    key: `rest:${k}`,
    prompt: 'Wie viel Prozent des Hunderterfelds sind weiß?',
    visual: field(100, k),
    answer: num(100 - k, '%'),
    hints: ['Das ganze Feld sind 100 %.', 'Zähle die weißen Kästchen oder rechne von 100 aus.'],
    steps: [`${k} Kästchen sind gefärbt.`, `100 − ${k} = ${100 - k}`, `${pct(100 - k)} sind weiß.`],
    bugs: fitBugs([{ id: 'gefaerbt-gezaehlt', match: k, hint: 'Das sind die gefärbten Kästchen. Gefragt sind die weißen.' }], 100 - k),
    praise: 'Du hast den weißen Teil des Feldes bestimmt.',
  };
};

/** No picture: the grid has one fill, so it could not show two colours, and it would show the sum that is asked. */
const zweiFarben: Form = (rng) => {
  const [a, b] = drawUntil(() => [rng.int(11, 60), rng.int(11, 35)], ([x, y]) => x !== y && x + y <= 88);
  return {
    key: `zwei:${a}:${b}`,
    prompt: `Im Hunderterfeld sind ${a} Kästchen rot und ${b} Kästchen blau. Wie viel Prozent sind gefärbt?`,
    answer: num(a + b, '%'),
    hints: ['Jedes Kästchen zählt 1 %.', 'Beide Farben gehören zum gefärbten Teil.'],
    steps: [`${a} + ${b} = ${a + b}`, `${a + b} von 100 sind ${pct(a + b)}.`],
    bugs: fitBugs([
      { id: 'nur-eine-farbe', match: a, hint: 'Das ist nur eine Farbe. Zähle beide Farben.' },
      { id: 'nur-eine-farbe', match: b, hint: 'Das ist nur eine Farbe. Zähle beide Farben.' },
      { id: 'rest-gezaehlt', match: 100 - a - b, hint: 'Das sind die weißen Kästchen. Gefragt sind die gefärbten.' },
    ], a + b),
    praise: 'Du hast beide Farben zusammengezählt.',
  };
};

const BEETE = [['Salat', 'wächst', 'Möhren'], ['Bohnen', 'wachsen', 'Kräuter'], ['Tomaten', 'wachsen', 'Radieschen']] as const;

const beete: Form = (rng) => {
  const [x, grows, y] = rng.pick(BEETE);
  const [a, b] = drawUntil(() => [rng.int(12, 55), rng.int(11, 35)], ([p, q]) => p !== q && p + q <= 85);
  const left = 100 - a - b;
  return {
    key: `beete:${x}:${a}:${b}`,
    context: `Der Schulgarten hat 100 gleich große Beete. Auf ${a} Beeten ${grows} ${x}, auf ${b} Beeten wachsen ${y}.`,
    prompt: 'Wie viel Prozent der Beete sind frei?',
    answer: num(left, '%'),
    hints: ['Alle Beete zusammen sind 100 %.', 'Rechne zuerst aus: Wie viele Beete sind bepflanzt?'],
    steps: [`Bepflanzt: ${a} + ${b} = ${a + b}`, `Frei: 100 − ${a + b} = ${left}`, `${left} von 100 sind ${pct(left)}.`],
    bugs: fitBugs([
      { id: 'summe-statt-rest', match: a + b, hint: 'Das sind die bepflanzten Beete. Gefragt sind die freien.' },
      { id: 'nur-eine-farbe', match: 100 - a, hint: 'Ziehe beide Pflanzen von 100 ab.' },
      { id: 'nur-eine-farbe', match: 100 - b, hint: 'Ziehe beide Pflanzen von 100 ab.' },
    ], left),
    praise: 'Du hast zuerst die bepflanzten Beete zusammengezählt.',
  };
};

const umkehr: Form = (rng) => {
  const k = drawUntil(() => rng.int(12, 88), (x) => x !== 50);
  return {
    key: `umkehr:${k}`,
    prompt: `Im Hunderterfeld sind ${pct(k)} gefärbt. Wie viele Kästchen sind weiß?`,
    answer: num(100 - k, 'Kästchen'),
    hints: ['Prozent heißt: von 100.', 'Gefärbte und weiße Kästchen ergeben zusammen das ganze Feld.'],
    steps: [`${pct(k)} heißt ${k} von 100 Kästchen.`, `Weiß: 100 − ${k} = ${100 - k}`, `${100 - k} Kästchen sind weiß.`],
    bugs: fitBugs([{ id: 'gefaerbt-gezaehlt', match: k, hint: 'Das sind die gefärbten Kästchen. Gefragt sind die weißen.' }], 100 - k),
    praise: 'Du hast von Prozent auf Kästchen zurückgerechnet.',
  };
};

// ─── Stufe 2: Prozentstreifen mit 10 Teilen ───────────────────────────────────

/** Ten parts with k marked. The value scale counts parts, and there is no percent scale: with one, the □ would only be the gap between two labels. */
const stripe = (k: number): Visual => ({ type: 'percentBar', total: 10, percent: k * 10, ticks: 10, labels: 'value', unknown: 'p' });
/** The scale counts parts and names no percent: with percent labels the child only finds the label and counts up to it. */
const emptyStripe: Visual = { type: 'percentBar', total: 10, ticks: 10, labels: 'value' };

const streifenLesen: Form = (rng) => {
  const k = rng.int(2, 9);
  const p = k * 10;
  return {
    key: `streifen:${k}`,
    prompt: 'Der Streifen hat 10 gleich große Teile. Wie viel Prozent sind markiert?',
    visual: stripe(k),
    srText: speak(`Der Streifen hat 10 gleich große Teile. Am Prozentstreifen sind ${k} Teile markiert. Wie viel Prozent sind markiert?`),
    answer: num(p, '%'),
    hints: ['Der ganze Streifen sind 100 %.', 'Ein Teil sind 10 %. Zähle die markierten Teile.'],
    steps: ['100 % verteilen sich auf 10 Teile, also ist ein Teil 10 %.', `${k} Teile sind markiert: ${k} · 10 = ${p}`, `Markiert sind ${pct(p)}.`],
    bugs: fitBugs([
      { id: 'teile-gezaehlt', match: k, hint: 'Das ist die Zahl der Teile. Ein Teil sind 10 %.' },
      { id: 'rest-gezaehlt', match: 100 - p, hint: 'Das ist der freie Teil. Gefragt ist der markierte.' },
    ], p),
    praise: 'Du hast in Schritten von 10 % gezählt.',
  };
};

const streifenFaerben: Form = (rng) => {
  const k = rng.int(2, 9);
  const p = k * 10;
  return {
    key: `faerben:${k}`,
    prompt: `Das Feld hat 10 gleich große Kästchen. Male ${pct(p)} an, von links oben Reihe für Reihe.`,
    answer: { kind: 'cells', width: 5, height: 2, given: [], solution: firstCells(5, k) },
    hints: ['Das ganze Feld sind 100 %.', 'Ein Kästchen sind 10 %.'],
    steps: ['100 % verteilen sich auf 10 Kästchen, also ist ein Kästchen 10 %.', `${p} : 10 = ${k}`, `Du malst ${k} Kästchen an.`],
    praise: `Du hast ${pct(p)} in Kästchen umgerechnet.`,
  };
};

const streifenTeile: Form = (rng) => {
  const k = rng.int(2, 9);
  const p = k * 10;
  return {
    key: `teile:${k}`,
    prompt: `Der Streifen hat 10 gleich große Teile. Wie viele Teile sind ${pct(p)}?`,
    visual: emptyStripe,
    answer: num(k, 'Teile'),
    hints: ['Ein Teil sind 10 %.', 'Wie oft passen 10 % hinein?'],
    steps: ['Ein Teil sind 10 %.', `${p} : 10 = ${k}`, `${pct(p)} sind ${k} Teile.`],
    bugs: fitBugs([{ id: 'prozent-als-zahl', match: p, hint: 'Der Streifen hat nur 10 Teile. Ein Teil sind 10 %.' }], k),
    praise: 'Du hast gezählt, wie oft 10 % hineinpassen.',
  };
};

const UNITS = ['€', 'm', 'kg', 'Personen'] as const;
const UNIT_WORD: Record<(typeof UNITS)[number], string> = { '€': 'Euro', m: 'Meter', kg: 'Kilogramm', Personen: 'Personen' };

const streifenWert: Form = (rng) => {
  const unit = rng.pick(UNITS);
  const [m, k] = drawUntil(() => [rng.int(3, 20), rng.int(2, 9)], ([x, y]) => x !== 10 && x * y !== 10 && x * y !== 100);
  const total = m * 10;
  const p = k * 10;
  const value = m * k;
  return {
    key: `wert:${unit}:${total}:${k}`,
    prompt: `Der ganze Streifen steht für ${total} ${unit}. Wie viele ${UNIT_WORD[unit]} sind ${pct(p)}?`,
    visual: { type: 'percentBar', total, percent: p, ticks: 10, labels: 'both', unknown: 'W', ...barUnit(unit) },
    answer: num(value, unit),
    hints: ['10 % sind ein Teil des Streifens.', 'Wie viel ist ein Teil? Teile das Ganze durch 10.'],
    steps: [`Ein Teil: ${total} : 10 = ${m}`, `${pct(p)} sind ${k} Teile: ${k} · ${m} = ${value}`, `${pct(p)} sind ${value} ${unit}.`],
    bugs: fitBugs([
      { id: 'prozent-als-zahl', match: p, hint: `${pct(p)} heißt ${p} von 100. Hier steht das Ganze aber für ${total}.` },
      { id: 'rest-gezaehlt', match: total - value, hint: 'Das ist der freie Teil. Gefragt ist der markierte.' },
      { id: 'teile-gezaehlt', match: m, hint: 'Das ist erst ein Teil, also 10 %.' },
    ], value),
    praise: 'Du hast den Wert von einem Teil benutzt.',
  };
};

/** Asks for a value and not for parts: the free parts are drawn, so a number of parts could be counted without any percent. */
const streifenRest: Form = (rng) => {
  const unit = rng.pick(UNITS);
  const [m, k] = drawUntil(() => [rng.int(3, 20), rng.int(2, 8)], ([x, y]) => x !== 10 && x * (10 - y) !== y * 10 && x * (10 - y) !== 100);
  const total = m * 10;
  const p = k * 10;
  const left = m * (10 - k);
  return {
    key: `frei:${unit}:${total}:${k}`,
    prompt: `Der ganze Streifen steht für ${total} ${unit}. ${pct(p)} sind markiert. Wie viele ${UNIT_WORD[unit]} sind nicht markiert?`,
    visual: { type: 'percentBar', total, percent: p, ticks: 10, labels: 'percent' },
    answer: num(left, unit),
    hints: ['Wie viel ist ein Teil? Teile das Ganze durch 10.', 'Wie viele Teile sind nicht markiert?'],
    steps: [`Ein Teil: ${total} : 10 = ${m}`, `Nicht markiert: 10 − ${k} = ${10 - k}`, `${10 - k} · ${m} = ${left}`, `Nicht markiert sind ${left} ${unit}.`],
    bugs: fitBugs([
      { id: 'gefaerbt-gezaehlt', match: m * k, hint: 'Das ist der markierte Teil. Gefragt ist der andere.' },
      { id: 'prozent-als-zahl', match: 100 - p, hint: `Das ist der freie Teil in Prozent. Gefragt sind ${UNIT_WORD[unit]}.` },
      { id: 'teile-gezaehlt', match: 10 - k, hint: `Das ist die Zahl der Teile. Ein Teil steht für ${m} ${unit}.` },
    ], left),
    praise: 'Du hast den freien Teil vom Ganzen berechnet.',
  };
};

const streifenGanzes: Form = (rng) => {
  const unit = rng.pick(UNITS);
  const [m, k] = drawUntil(() => [rng.int(3, 20), rng.int(2, 9)], ([x, y]) => x !== 10 && x !== y);
  const total = m * 10;
  const p = k * 10;
  const value = m * k;
  return {
    key: `ganzes:${unit}:${total}:${k}`,
    prompt: `${pct(p)} des Streifens stehen für ${value} ${unit}. Für wie viele ${UNIT_WORD[unit]} steht der ganze Streifen?`,
    visual: { type: 'percentBar', total, percent: p, ticks: 10, labels: 'both', unknown: 'G', ...barUnit(unit) },
    answer: num(total, unit),
    hints: [`${pct(p)} sind ${k} Teile. Wie viel ist ein Teil?`, 'Der ganze Streifen hat 10 Teile.'],
    steps: [`${pct(p)} sind ${k} Teile.`, `Ein Teil: ${value} : ${k} = ${m}`, `Ganzer Streifen: 10 · ${m} = ${total}`, `Der ganze Streifen steht für ${total} ${unit}.`],
    bugs: fitBugs([
      { id: 'teil-als-ganzes', match: value, hint: 'Das ist erst der markierte Teil. Gesucht ist der ganze Streifen.' },
      { id: 'additiv-auf-hundert', match: value + 100 - p, hint: 'Rechne über einen Teil, nicht mit plus bis 100.' },
    ], total),
    praise: 'Du hast vom Teil auf das Ganze geschlossen.',
  };
};

/** The same two percents as in the Beete of Stufe 1, but the result counts Seiten: a step more, on the scale of 10 parts. The bar is empty, as a mark would show the sum that is asked first. */
const buch: Form = (rng) => {
  const [a, b] = drawUntil(() => [rng.int(2, 6) * 10, rng.int(1, 5) * 10], ([x, y]) => x !== y && x + y <= 90 && 100 - x - y !== x && 100 - x - y !== y);
  const person = rng.pick(['Mia', 'Tom', 'Elif', 'Omar']);
  const left = 100 - a - b;
  const g = drawUntil(() => rng.int(8, 30) * 10, (x) => ![a, b].includes((x * left) / 100) && x !== 100);
  const value = (g * left) / 100;
  return {
    key: `buch:${person}:${g}:${a}:${b}`,
    context: `${person} liest ein Buch mit ${g} Seiten. Am Montag schafft ${person} ${pct(a)} des Buches, am Dienstag ${pct(b)}.`,
    prompt: 'Wie viele Seiten bleiben noch?',
    visual: { type: 'percentBar', total: g, ticks: 10, labels: 'percent' },
    answer: num(value, 'Seiten'),
    hints: ['Zähle zuerst beide Tage in Prozent zusammen.', 'Wie viele Seiten ist ein Teil des Streifens?'],
    steps: [`Gelesen: ${a} + ${b} = ${a + b}`, `Rest: 100 − ${a + b} = ${left}`, `Ein Teil: ${g} : 10 = ${g / 10}`, `${left / 10} · ${g / 10} = ${value}`, `Es bleiben ${value} Seiten.`],
    bugs: fitBugs([
      { id: 'summe-statt-rest', match: (g * (a + b)) / 100, hint: 'Das sind die gelesenen Seiten. Gefragt ist, was noch bleibt.' },
      { id: 'prozent-als-zahl', match: left, hint: 'Das ist der Rest in Prozent. Gefragt sind Seiten.' },
      { id: 'nur-eine-farbe', match: (g * (100 - a)) / 100, hint: 'Ziehe beide Tage vom ganzen Buch ab.' },
      { id: 'nur-eine-farbe', match: (g * (100 - b)) / 100, hint: 'Ziehe beide Tage vom ganzen Buch ab.' },
    ], value),
    praise: 'Du hast erst Prozent und dann Seiten berechnet.',
  };
};

// ─── Stufe 3: andere Gesamtzahlen ─────────────────────────────────────────────

const TOTALS = [20, 25, 50] as const;

function share(rng: Rng, totals: readonly number[] = TOTALS): { total: number; n: number; f: number; p: number } {
  const total = rng.pick(totals);
  const f = 100 / total;
  const n = drawUntil(() => rng.int(2, total - 2), (x) => x * f !== 10 && x * f !== 50 && x * f !== total);
  return { total, n, f, p: n * f };
}

function shareBugs(n: number, total: number, p: number) {
  return fitBugs([
    { id: 'anzahl-statt-prozent', match: n, hint: `${n} ist die Anzahl. Rechne den Anteil auf 100 um.` },
    { id: 'additiv-auf-hundert', match: n + 100 - total, hint: `Auf 100 kommst du mit mal, nicht mit plus.` },
    { id: 'rest-gezaehlt', match: 100 - p, hint: 'Das ist der andere Teil. Gefragt ist der genannte.' },
  ], p);
}

function shareSteps(total: number, n: number, f: number, p: number): string[] {
  return [`Auf 100 kommst du mit ${total} · ${f} = 100.`, `Genauso: ${n} · ${f} = ${p}`, `${n} von ${total} sind ${p} von 100, also ${pct(p)}.`];
}

const SHARE_HINTS = (total: number) => [`Wie kommst du von ${total} auf 100?`, 'Rechne dann die Anzahl genauso um.'];

const anteilLesen: Form = (rng) => {
  const { total, n, f, p } = share(rng);
  return {
    key: `anteil:${n}:${total}`,
    prompt: `${n} von ${total} Kästchen sind gefärbt. Wie viel Prozent sind das?`,
    visual: field(total, n),
    answer: num(p, '%'),
    hints: SHARE_HINTS(total),
    steps: shareSteps(total, n, f, p),
    bugs: shareBugs(n, total, p),
    praise: `Du hast von ${total} auf 100 umgerechnet.`,
  };
};

const luecke: Form = (rng) => {
  const { total, n, f, p } = share(rng);
  return {
    key: `luecke:${n}:${total}`,
    prompt: 'Der Anteil ist auf beiden Seiten gleich. Welche Zahl gehört in die Lücke?',
    expression: `${n} von ${total} = □ von 100`,
    answer: num(p),
    hints: SHARE_HINTS(total),
    steps: shareSteps(total, n, f, p),
    bugs: shareBugs(n, total, p),
    praise: 'Du hast beide Zahlen mit demselben Faktor verändert.',
  };
};

const anteilFaerben: Form = (rng) => {
  const total = rng.pick([20, 25] as const);
  const f = 100 / total;
  const n = rng.int(2, total - 2);
  const p = n * f;
  return {
    key: `faerben3:${n}:${total}`,
    prompt: `Das Feld hat ${total} Kästchen. Male ${pct(p)} an, von links oben Reihe für Reihe.`,
    answer: { kind: 'cells', width: 5, height: total / 5, given: [], solution: firstCells(5, n) },
    hints: [`100 % sind ${total} Kästchen. Wie viel Prozent ist ein Kästchen?`, 'Teile dann die Prozent durch diesen Wert.'],
    steps: [`Ein Kästchen: 100 : ${total} = ${f}, also ${pct(f)}.`, `${p} : ${f} = ${n}`, `Du malst ${n} Kästchen an.`],
    praise: 'Du hast ausgerechnet, wie viel Prozent ein Kästchen ist.',
  };
};

/** Each group with the sizes it can have: a class has no 50 Personen. */
const GRUPPEN = [
  ['In der Klasse 6b', 'Personen', 'spielen ein Instrument', 'der Klasse', [20, 25]],
  ['Im Sportverein', 'Mitglieder', 'spielen Handball', 'des Vereins', [25, 50]],
  ['Im Schulchor', 'Personen', 'singen im Sopran', 'des Chors', [20, 25, 50]],
  ['In der Klasse 6c', 'Personen', 'kommen mit dem Fahrrad', 'der Klasse', [20, 25]],
] as const;

const gruppe: Form = (rng) => {
  const [place, noun, verb, of, totals] = rng.pick(GRUPPEN);
  const { total, n, f, p } = share(rng, totals);
  return {
    key: `gruppe:${place}:${n}:${total}`,
    context: `${place} sind ${total} ${noun}. ${n} ${noun} ${verb}.`,
    prompt: `Wie viel Prozent ${of} sind das?`,
    answer: num(p, '%'),
    hints: SHARE_HINTS(total),
    steps: shareSteps(total, n, f, p),
    bugs: shareBugs(n, total, p),
    praise: 'Du hast den Anteil auf 100 umgerechnet.',
  };
};

const lueckeUmkehr: Form = (rng) => {
  const { total, n, f, p } = share(rng);
  return {
    key: `umkehr3:${n}:${total}`,
    prompt: 'Der Anteil ist auf beiden Seiten gleich. Welche Zahl gehört in die Lücke?',
    expression: `□ von ${total} = ${p} von 100`,
    answer: num(n),
    hints: [`Wie kommst du von 100 auf ${total}?`, 'Rechne die andere Zahl genauso um.'],
    steps: [`100 : ${f} = ${total}`, `Genauso: ${p} : ${f} = ${n}`, `${n} von ${total} sind ${p} von 100.`],
    bugs: fitBugs([
      { id: 'prozent-als-zahl', match: p, hint: `${p} gilt für 100. Hier sind es nur ${total}.` },
      { id: 'additiv-auf-hundert', match: p - 100 + total, hint: `Von 100 auf ${total} kommst du mit geteilt, nicht mit minus.` },
    ], n),
    praise: 'Du hast von 100 zurück auf die andere Gesamtzahl gerechnet.',
  };
};

const vergleich: Form = (rng) => {
  const [x, y] = pickTwo(rng);
  const [a, b] = drawUntil(() => [rng.int(7, 18), rng.int(7, 23)], ([s, t]) => s * 5 !== t * 4);
  const pa = a * 5;
  const pb = b * 4;
  const high = Math.max(pa, pb);
  return {
    key: `vergleich:${a}:${b}:${x.name}:${y.name}`,
    context: `${x.name} trifft ${a} von 20 Würfen. ${y.name} trifft ${b} von 25 Würfen.`,
    prompt: 'Rechne beide Anteile in Prozent um. Gib den größeren Anteil an.',
    answer: num(high, '%'),
    hints: ['Die Zahl der Würfe ist verschieden. Vergleiche die Anteile.', 'Rechne jeden Anteil auf 100 um.'],
    steps: [`${x.name}: ${a} · 5 = ${pa}, also ${pct(pa)}.`, `${y.name}: ${b} · 4 = ${pb}, also ${pct(pb)}.`, `Der größere Anteil ist ${pct(high)}.`],
    bugs: fitBugs([
      { id: 'kleinerer-anteil', match: Math.min(pa, pb), hint: 'Das ist der kleinere der beiden Anteile.' },
      { id: 'anzahl-statt-prozent', match: Math.max(a, b), hint: 'Das ist eine Anzahl. Rechne beide Anteile in Prozent um.' },
    ], high),
    praise: 'Du hast Anteile verglichen, nicht die Anzahlen.',
  };
};

const FORMS: Record<1 | 2 | 3, Record<Ab, Form[]>> = {
  1: { 1: [lesen, rest], 2: [fehlen, zweiFarben], 3: [beete, umkehr] },
  2: { 1: [streifenLesen, streifenFaerben, streifenTeile], 2: [streifenWert, streifenRest], 3: [streifenGanzes, buch] },
  3: { 1: [anteilLesen, luecke], 2: [anteilFaerben, gruppe], 3: [lueckeUmkehr, vergleich] },
};

export const bedeutungSkill: SkillDef = {
  id: 'prozent.bedeutung',
  topicId: 'prozent',
  title: 'Was heißt Prozent?',
  description: 'Du verstehst Prozent als Anteil von 100.',
  stufen: {
    1: 'Hunderterfeld: wie viele von 100 Kästchen',
    2: 'Prozentstreifen mit 10 Teilen, in Schritten von 10 %',
    3: 'Gleicher Anteil bei anderen Gesamtzahlen, zum Beispiel 3 von 20',
  },
  kmk: KMK,
  generate: fromForms('prozent.bedeutung', KMK, FORMS),
};
