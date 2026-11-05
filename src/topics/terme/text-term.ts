/**
 * terme.text-term: Sätze in Terme, Terme in Sätze. Stufe 1: one operation. Stufe 2: Summe, Differenz, Produkt, Quotient and two operations. Stufe 3: Klammern needed, and which
 * term fits a story. Choice only (§6). AB varies the demand: the sentence to the term, a less direct wording or a story, then the term back to a sentence, or the term that does not fit. T17: no keyword decides alone.
 */
import { MINUS, TIMES } from '../../core/format';
import type { Ab, ChoiceOption, Exercise, Rng, SkillDef, Stufe } from '../../core/types';
import { build, makeChoice, pickPerson, targetAb } from '../shared';
import { other, say } from './helpers';

const SKILL = { id: 'terme.text-term', topicId: 'terme' } as const;
const KMK = ['ZO.terme', 'PK.darstellen'];
const KMK_STORY = ['ZO.terme', 'PK.modellieren'];

type Op = '+' | '-' | '*' | ':';
const SIGN: Record<Op, string> = { '+': '+', '-': MINUS, '*': TIMES, ':': ':' };
const OPS: readonly Op[] = ['+', '-', '*', ':'];
const t = (a: number, op: Op, b: number) => `${a} ${SIGN[op]} ${b}`;

const OTHER_OP = 'Der Satz nennt eine andere Rechenart.';
const ORDER_COUNTS = 'Die Reihenfolge zählt hier. Lies den Text noch einmal.';

/** Two numbers for a task with this operation: a difference above 0, a division that ends. */
function numbers(rng: Rng, op: Op, big = false): [number, number] {
  if (op === '+') return [rng.int(big ? 12 : 3, big ? 60 : 30), rng.int(big ? 12 : 2, big ? 40 : 20)];
  if (op === '-') {
    const b = rng.int(2, big ? 25 : 12);
    return [b + rng.int(3, big ? 40 : 30), b];
  }
  if (op === '*') return [rng.int(3, 12), rng.int(2, 9)];
  const b = rng.int(2, 9);
  return [b * rng.int(2, 12), b];
}

/** The other operations, plus the swapped term where order matters. */
function wrongTerms(a: number, op: Op, b: number): ChoiceOption[] {
  const swap = op === '-' || op === ':' ? [{ label: t(b, op, a), whyWrong: ORDER_COUNTS }] : [];
  return [...swap, ...OPS.filter((o) => o !== op).map((o) => ({ label: t(a, o, b), whyWrong: OTHER_OP }))];
}

const SENTENCE: Record<Op, (a: number, b: number) => string> = {
  '+': (a, b) => `Addiere ${b} zu ${a}.`,
  '-': (a, b) => `Subtrahiere ${b} von ${a}.`,
  '*': (a, b) => `Multipliziere ${a} mit ${b}.`,
  ':': (a, b) => `Dividiere ${a} durch ${b}.`,
};

function sentenceToTerm(rng: Rng, stufe: Stufe, ab: Ab, sentence: string, correct: string, wrongs: ChoiceOption[], hint: string, kind: string): Exercise {
  const prompt = `${sentence} Welcher Term passt?`;
  return build(SKILL, stufe, {
    key: `satz:${kind}:${correct}`,
    ab,
    prompt,
    answer: makeChoice(rng, { label: correct }, wrongs),
    hints: [hint, 'Lies den Satz noch einmal. Welche Zahl steht im Term vorne?'],
    steps: [`Der Satz: ${sentence}`, `Der Term: ${correct}`],
    praise: 'Du hast den passenden Term zum Satz gewählt.',
    srText: say(prompt),
    kmk: KMK,
  });
}

function termToSentence(rng: Rng, stufe: Stufe, ab: Ab, term: string, correct: string, wrongs: ChoiceOption[], hint: string): Exercise {
  const prompt = 'Welcher Satz passt zu diesem Term?';
  return build(SKILL, stufe, {
    key: `term:${term}`,
    ab,
    prompt,
    expression: term,
    answer: makeChoice(rng, { label: correct }, wrongs),
    hints: [hint, 'Prüfe bei jedem Satz die Reihenfolge der Zahlen.'],
    steps: [`Der Term: ${term}`, `Der Satz: ${correct}`],
    praise: 'Du hast den passenden Satz zum Term gewählt.',
    srText: say(prompt, term),
    kmk: KMK,
  });
}

// ─── Stufe 1: one operation ──────────────────────────────────────────────────

function s1Direct(rng: Rng, ab: Ab): Exercise {
  const op = rng.pick(OPS);
  const [a, b] = numbers(rng, op);
  return sentenceToTerm(rng, 1, ab, SENTENCE[op](a, b), t(a, op, b), wrongTerms(a, op, b), 'Welche Rechenart nennt das Verb im Satz?', 'verb');
}

/** A wording without the name of the operation. */
function s1Wording(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(['vermehre', 'vermindere', 'verdreifache', 'halbiere', 'teile'] as const);
  const a = kind === 'halbiere' ? 2 * rng.int(6, 40) : kind === 'teile' ? 0 : rng.int(12, 60);
  if (kind === 'vermehre') {
    const b = rng.int(3, 25);
    return sentenceToTerm(rng, 1, ab, `Vermehre ${a} um ${b}.`, t(a, '+', b), wrongTerms(a, '+', b), 'Vermehren heißt: Es kommt etwas dazu.', kind);
  }
  if (kind === 'vermindere') {
    const b = rng.int(3, 11);
    return sentenceToTerm(rng, 1, ab, `Vermindere ${a} um ${b}.`, t(a, '-', b), wrongTerms(a, '-', b), 'Vermindern heißt: Es wird weniger.', kind);
  }
  if (kind === 'verdreifache') {
    const shown = rng.int(3, 15);
    return sentenceToTerm(rng, 1, ab, `Verdreifache ${shown}.`, `3 ${TIMES} ${shown}`, [{ label: `${shown} + 3`, whyWrong: 'Das sind nur 3 mehr. Dreifach ist viel mehr.' }, { label: `${shown} : 3`, whyWrong: 'Das ist ein Drittel davon. Dreifach ist mehr.' }, { label: `${shown} ${MINUS} 3`, whyWrong: 'Das ist weniger. Dreifach ist mehr.' }], 'Verdreifachen heißt: dreimal so viel.', kind);
  }
  if (kind === 'halbiere') {
    return sentenceToTerm(rng, 1, ab, `Halbiere ${a}.`, `${a} : 2`, [{ label: `${a} ${MINUS} 2`, whyWrong: 'Das sind nur 2 weniger. Die Hälfte ist viel weniger.' }, { label: `2 : ${a}`, whyWrong: ORDER_COUNTS }, { label: `${a} ${TIMES} 2`, whyWrong: 'Das ist das Doppelte. Halbieren macht kleiner.' }], 'Halbieren heißt: in 2 gleiche Teile teilen.', kind);
  }
  const b = rng.int(2, 9);
  const whole = b * rng.int(3, 12);
  return sentenceToTerm(rng, 1, ab, `Teile ${whole} in ${b} gleiche Teile.`, t(whole, ':', b), wrongTerms(whole, ':', b), 'Gleiche Teile: Hier rechnest du geteilt.', kind);
}

function s1Reverse(rng: Rng, ab: Ab): Exercise {
  const op = rng.pick(OPS);
  const [a, b] = numbers(rng, op);
  const swap = op === '-' || op === ':' ? [{ label: SENTENCE[op](b, a), whyWrong: 'Dieser Satz vertauscht die Zahlen. Schau auf die erste Zahl im Term.' }] : [];
  return termToSentence(rng, 1, ab, t(a, op, b), SENTENCE[op](a, b), [...swap, ...OPS.filter((o) => o !== op).map((o) => ({ label: SENTENCE[o](a, b), whyWrong: 'Dieser Satz nennt eine andere Rechenart.' }))], `Welches Rechenzeichen steht zwischen ${a} und ${b}?`);
}

// ─── Stufe 2: Fachwörter and two operations ──────────────────────────────────

const NAME: Record<Op, string> = { '+': 'Summe', '-': 'Differenz', '*': 'Produkt', ':': 'Quotienten' };
const ARTICLE: Record<Op, string> = { '+': 'die', '-': 'die', '*': 'das', ':': 'den' };
const fachwort = (op: Op, a: number, b: number) => `${ARTICLE[op]} ${NAME[op]} aus ${a} und ${b}`;

function s2Fachwort(rng: Rng, ab: Ab): Exercise {
  const op = rng.pick(OPS);
  const [a, b] = numbers(rng, op, true);
  const hint = { '+': 'Eine Summe entsteht beim Addieren.', '-': 'Eine Differenz entsteht beim Subtrahieren.', '*': 'Ein Produkt entsteht beim Multiplizieren.', ':': 'Ein Quotient entsteht beim Dividieren.' }[op];
  const wrongs = wrongTerms(a, op, b).map((o) => (o.whyWrong === OTHER_OP ? { ...o, whyWrong: hint } : o));
  return sentenceToTerm(rng, 2, ab, `Bilde ${fachwort(op, a, b)}.`, t(a, op, b), wrongs, hint, 'fachwort');
}

interface TwoSteps {
  sentence: string;
  term: string;
  /** Terms a child may build from the same sentence. */
  wrongs: ChoiceOption[];
}

const KLAMMER_NO = 'Hier gehört keine Klammer hin. Zuerst steht das Produkt oder der Quotient fest.';
const ORDER = 'Prüfe, was zuerst entsteht und was danach dazukommt.';

function twoSteps(rng: Rng): TwoSteps {
  const kind = rng.pick(['plus-produkt', 'minus-produkt', 'plus-quotient', 'produkt-von-zahl', 'mal-und-plus'] as const);
  const [a, b] = [rng.int(3, 12), rng.int(2, 9)];
  const c = other(rng, 3, 25, a, b);
  const p = a * b;
  switch (kind) {
    case 'plus-produkt':
      return { sentence: `Addiere ${c} zum Produkt aus ${a} und ${b}.`, term: `${a} ${TIMES} ${b} + ${c}`, wrongs: [{ label: `${a} ${TIMES} (${b} + ${c})`, whyWrong: KLAMMER_NO }, { label: `${a} + ${b} ${TIMES} ${c}`, whyWrong: ORDER }, { label: `${a} + ${b} + ${c}`, whyWrong: `Das Produkt aus ${a} und ${b} ist eine Malrechnung.` }] };
    case 'minus-produkt': {
      // Below the product: the difference stays above 0.
      const d = other(rng, 2, p - 1, a, b);
      return { sentence: `Subtrahiere ${d} vom Produkt aus ${a} und ${b}.`, term: `${a} ${TIMES} ${b} ${MINUS} ${d}`, wrongs: [{ label: `${d} ${MINUS} ${a} ${TIMES} ${b}`, whyWrong: ORDER_COUNTS }, { label: `${a} ${TIMES} (${b} ${MINUS} ${d})`, whyWrong: KLAMMER_NO }, { label: `${a} ${MINUS} ${b} ${TIMES} ${d}`, whyWrong: ORDER }] };
    }
    case 'plus-quotient':
      return { sentence: `Addiere ${c} zum Quotienten aus ${p} und ${b}.`, term: `${p} : ${b} + ${c}`, wrongs: [{ label: `${p} : (${b} + ${c})`, whyWrong: KLAMMER_NO }, { label: `${b} : ${p} + ${c}`, whyWrong: ORDER_COUNTS }, { label: `${p} ${TIMES} ${b} + ${c}`, whyWrong: 'Ein Quotient entsteht beim Dividieren.' }] };
    case 'produkt-von-zahl': {
      const big = p + rng.int(5, 40);
      return { sentence: `Subtrahiere das Produkt aus ${a} und ${b} von ${big}.`, term: `${big} ${MINUS} ${a} ${TIMES} ${b}`, wrongs: [{ label: `${a} ${TIMES} ${b} ${MINUS} ${big}`, whyWrong: ORDER_COUNTS }, { label: `(${big} ${MINUS} ${a}) ${TIMES} ${b}`, whyWrong: 'Mit dieser Klammer ziehst du nur eine Zahl ab.' }, { label: `${big} + ${a} ${TIMES} ${b}`, whyWrong: 'Subtrahieren ist eine Minusrechnung.' }] };
    }
    case 'mal-und-plus':
      return { sentence: `Multipliziere ${a} mit ${b}. Addiere danach ${c}.`, term: `${a} ${TIMES} ${b} + ${c}`, wrongs: [{ label: `${a} ${TIMES} (${b} + ${c})`, whyWrong: 'Mit dieser Klammer addierst du zuerst. Der Satz nennt zuerst die Malrechnung.' }, { label: `${a} + ${b} ${TIMES} ${c}`, whyWrong: ORDER }, { label: `${a} ${TIMES} ${c} + ${b}`, whyWrong: `Der Satz multipliziert ${a} mit ${b}.` }] };
  }
}

function s2TwoSteps(rng: Rng, ab: Ab): Exercise {
  const x = twoSteps(rng);
  return sentenceToTerm(rng, 2, ab, x.sentence, x.term, x.wrongs, 'Was entsteht zuerst? Das steht im Term als Punktrechnung.', 'zwei');
}

function s2Reverse(rng: Rng, ab: Ab): Exercise {
  const [a, b] = [rng.int(3, 12), rng.int(2, 9)];
  const c = other(rng, 3, 25, a);
  const p = a * b;
  const m = other(rng, 1, a - 1, b);
  if (rng.chance(0.5)) {
    return termToSentence(rng, 2, ab, `${a} ${TIMES} ${b} + ${c}`, `Addiere ${c} zum Produkt aus ${a} und ${b}.`, [
      { label: `Multipliziere ${a} mit der Summe aus ${b} und ${c}.`, whyWrong: 'Dafür braucht der Term eine Klammer.' },
      { label: `Addiere ${a} zum Produkt aus ${b} und ${c}.`, whyWrong: 'Prüfe im Term: Welche Zahlen stehen beim Malzeichen?' },
      { label: `Addiere ${c} zur Summe aus ${a} und ${b}.`, whyWrong: 'Zwischen den beiden ersten Zahlen steht ein Malzeichen.' },
    ], 'Punkt vor Strich: Was rechnest du zuerst? Das nennt der Satz als Fachwort.');
  }
  return termToSentence(rng, 2, ab, `${p} : ${b} ${MINUS} ${m}`, `Subtrahiere ${m} vom Quotienten aus ${p} und ${b}.`, [
    { label: `Subtrahiere den Quotienten aus ${p} und ${b} von ${m}.`, whyWrong: 'Prüfe die Reihenfolge: Welcher Teil steht im Term vorne?' },
    { label: `Dividiere ${p} durch die Differenz aus ${b} und ${m}.`, whyWrong: 'Dafür braucht der Term eine Klammer.' },
    { label: `Subtrahiere ${m} vom Produkt aus ${p} und ${b}.`, whyWrong: 'Im Term steht ein Geteiltzeichen.' },
  ], 'Punkt vor Strich: Was rechnest du zuerst? Das nennt der Satz als Fachwort.');
}

// ─── Stufe 3: Klammern and stories ───────────────────────────────────────────

const IN_BRACKET = 'Hier stehen andere Zahlen in der Klammer. Lies den Satz noch einmal.';

function s3Sentence(rng: Rng, ab: Ab): Exercise {
  const kind = rng.pick(['summe-mal', 'differenz-mal', 'summe-durch', 'mal-summe'] as const);
  // Differ from k: (a + b) · k and a · (b + k) have one value with a = k, and k · (a + b) and (k + a) · b with b = k.
  const k = rng.int(2, 9);
  const [a, b] = [other(rng, 3, 15, k), other(rng, 2, 12, k)];
  if (kind === 'summe-mal') {
    return sentenceToTerm(rng, 3, ab, `Multipliziere die Summe aus ${a} und ${b} mit ${k}.`, `(${a} + ${b}) ${TIMES} ${k}`, [
      { label: `${a} + ${b} ${TIMES} ${k}`, whyWrong: `Ohne Klammer multiplizierst du nur ${b}. Die Summe gehört zusammen.` },
      { label: `${a} ${TIMES} (${b} + ${k})`, whyWrong: IN_BRACKET },
      { label: `${a} ${TIMES} ${k} + ${b}`, whyWrong: `Hier multiplizierst du nur ${a}. Die Summe gehört zusammen.` },
    ], 'Die Summe gehört zusammen. Setze eine Klammer.', kind);
  }
  if (kind === 'differenz-mal') {
    // Also big · (b − k) keeps another value.
    let big = b + rng.int(3, 15);
    while (big * (b - k) === (big - b) * k) big += 1;
    return sentenceToTerm(rng, 3, ab, `Multipliziere die Differenz aus ${big} und ${b} mit ${k}.`, `(${big} ${MINUS} ${b}) ${TIMES} ${k}`, [
      { label: `${big} ${MINUS} ${b} ${TIMES} ${k}`, whyWrong: `Ohne Klammer multiplizierst du nur ${b}. Die Differenz gehört zusammen.` },
      { label: `(${b} ${MINUS} ${big}) ${TIMES} ${k}`, whyWrong: ORDER_COUNTS },
      { label: `${big} ${TIMES} (${b} ${MINUS} ${k})`, whyWrong: IN_BRACKET },
    ], 'Die Differenz gehört zusammen. Setze eine Klammer.', kind);
  }
  if (kind === 'summe-durch') {
    const s = k * rng.int(3, 12);
    const left = rng.int(1, s - 1);
    return sentenceToTerm(rng, 3, ab, `Dividiere die Summe aus ${left} und ${s - left} durch ${k}.`, `(${left} + ${s - left}) : ${k}`, [
      { label: `${left} + ${s - left} : ${k}`, whyWrong: `Ohne Klammer dividierst du nur ${s - left}. Die Summe gehört zusammen.` },
      { label: `${k} : (${left} + ${s - left})`, whyWrong: ORDER_COUNTS },
      { label: `(${left} + ${s - left}) ${TIMES} ${k}`, whyWrong: 'Dividieren heißt geteilt rechnen.' },
    ], 'Die Summe gehört zusammen. Setze eine Klammer.', kind);
  }
  // Also k + a · b keeps another value.
  if (k + a * b === k * (a + b)) return s3Sentence(rng, ab);
  return sentenceToTerm(rng, 3, ab, `Multipliziere ${k} mit der Summe aus ${a} und ${b}.`, `${k} ${TIMES} (${a} + ${b})`, [
    { label: `${k} ${TIMES} ${a} + ${b}`, whyWrong: `Ohne Klammer multiplizierst du nur ${a}. Die Summe gehört zusammen.` },
    { label: `${k} + ${a} ${TIMES} ${b}`, whyWrong: `Hier steht ein Produkt aus ${a} und ${b}. Der Satz nennt eine Summe.` },
    { label: `(${k} + ${a}) ${TIMES} ${b}`, whyWrong: IN_BRACKET },
  ], 'Die Summe gehört zusammen. Setze eine Klammer.', kind);
}

/** A story with its term, a second term of equal value, and terms that do not fit. */
interface Story {
  kind: string;
  context: string;
  question: string;
  term: string;
  /** Same value, other form: the term also fits. */
  equal: string;
  wrongs: ChoiceOption[];
  hint: string;
  /** The same story in one line, for term → story, and two others that fit other terms. */
  line: string;
  otherLines: ChoiceOption[];
}

function story(rng: Rng): Story {
  const name = pickPerson(rng).name;
  const kind = rng.pick(['packung', 'runden', 'rabatt', 'verteilen', 'kuchen', 'radweg', 'einkauf'] as const);
  const n = rng.int(3, 9);
  // a and b differ from n: (n + a) · b and a · (n + b) would have the value of n · (a + b) otherwise.
  const a = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((x) => x !== n));
  const b = rng.pick([2, 3, 4, 5, 6, 7, 8, 9].filter((x) => x !== n));
  switch (kind) {
    case 'packung':
      return { kind, context: `${name} kauft ${n} Packungen. In jeder Packung liegen ${a} Hefte und ${b} Stifte.`, question: 'Welcher Term passt zur Anzahl aller Teile?', term: `${n} ${TIMES} (${a} + ${b})`, equal: `${n} ${TIMES} ${a} + ${n} ${TIMES} ${b}`,
        wrongs: [{ label: `${n} ${TIMES} ${a} + ${b}`, whyWrong: 'So zählst du die Stifte nur in einer Packung.' }, { label: `${n} + ${a} + ${b}`, whyWrong: 'So zählst du jede Sorte nur einmal.' }, { label: `(${n} + ${a}) ${TIMES} ${b}`, whyWrong: 'Prüfe die Klammer: Was liegt zusammen in einer Packung?' }],
        hint: 'Was liegt in einer Packung? Das gehört zusammen.',
        line: `${n} Packungen mit je ${a} Heften und ${b} Stiften`, otherLines: [{ label: `${n} Packungen mit je ${a} Heften und dazu ${b} Stifte`, whyWrong: 'Zu dieser Geschichte passt ein Term ohne Klammer.' }, { label: `${a} Packungen mit je ${b} Heften und dazu ${n} Stifte`, whyWrong: 'Hier stehen die Zahlen an anderer Stelle.' }, { label: `${n} Hefte, ${a} Stifte und ${b} Blöcke`, whyWrong: 'Zu dieser Geschichte passt eine reine Summe.' }] };
    case 'runden':
      return { kind, context: `Die Klasse 6b trainiert an ${n} Tagen. Jeden Tag läuft die Klasse ${a} Runden vor der Pause und ${b} Runden nach der Pause.`, question: 'Welcher Term passt zur Anzahl aller Runden?', term: `${n} ${TIMES} (${a} + ${b})`, equal: `${n} ${TIMES} ${a} + ${n} ${TIMES} ${b}`,
        wrongs: [{ label: `${n} ${TIMES} ${a} + ${b}`, whyWrong: 'So zählst du die Runden nach der Pause nur einmal.' }, { label: `${n} + ${a} + ${b}`, whyWrong: 'So zählst du nur einen Tag und addierst die Tage dazu.' }, { label: `${a} ${TIMES} (${n} + ${b})`, whyWrong: 'Prüfe die Klammer: Was läuft die Klasse an einem Tag?' }],
        hint: 'Wie viele Runden läuft die Klasse an einem Tag?',
        line: `${n} Tage mit je ${a} Runden am Morgen und ${b} Runden am Abend`, otherLines: [{ label: `${n} Tage mit je ${a} Runden und am Ende noch ${b} Runden`, whyWrong: 'Zu dieser Geschichte passt ein Term ohne Klammer.' }, { label: `${a} Tage mit je ${b} Runden und am Ende noch ${n} Runden`, whyWrong: 'Hier stehen die Zahlen an anderer Stelle.' }, { label: `${n} Runden am Morgen, ${a} am Mittag und ${b} am Abend`, whyWrong: 'Zu dieser Geschichte passt eine reine Summe.' }] };
    case 'rabatt': {
      // A Karte for a Konzert costs more than a few €.
      const p = b + rng.int(10, 30);
      return { kind, context: `${name} kauft ${n} Karten für ein Konzert. Eine Karte kostet ${p} €. Auf jede Karte gibt es ${b} € Rabatt.`, question: 'Welcher Term passt zum Preis in €?', term: `${n} ${TIMES} (${p} ${MINUS} ${b})`, equal: `${n} ${TIMES} ${p} ${MINUS} ${n} ${TIMES} ${b}`,
        wrongs: [{ label: `${n} ${TIMES} ${p} ${MINUS} ${b}`, whyWrong: 'So gibt es den Rabatt nur einmal. Der Rabatt gilt für jede Karte.' }, { label: `${n} ${TIMES} ${p} + ${b}`, whyWrong: 'Rabatt macht den Preis kleiner.' }, { label: `${n} + ${p} ${MINUS} ${b}`, whyWrong: `${n} Karten kosten ${n}-mal so viel wie eine Karte.` }],
        hint: 'Wie viel kostet 1 Karte mit Rabatt?',
        line: `${n} Karten zu je ${p} € mit ${b} € Rabatt auf jede Karte`, otherLines: [{ label: `${n} Karten zu je ${p} € mit ${b} € Rabatt auf den ganzen Einkauf`, whyWrong: 'Zu dieser Geschichte passt ein Term ohne Klammer.' }, { label: `${p} Karten zu je ${n} € mit ${b} € Rabatt auf den ganzen Einkauf`, whyWrong: 'Hier stehen die Zahlen an anderer Stelle.' }, { label: `Eine Karte für ${n} € und ${p} € Rabatt auf ${b} Karten`, whyWrong: 'Hier stehen die Zahlen an anderer Stelle.' }] };
    }
    case 'verteilen': {
      const s = n * rng.int(4, 12);
      const m = rng.int(2, s - 2);
      return { kind, context: `Am Montag sammelt die Klasse 6a ${m} €. Am Dienstag sammelt die Klasse 6a ${s - m} €. Das Geld teilen ${n} Gruppen gleich auf.`, question: 'Welcher Term passt zum Anteil einer Gruppe in €?', term: `(${m} + ${s - m}) : ${n}`, equal: `${m} : ${n} + ${s - m} : ${n}`,
        wrongs: [{ label: `${m} + ${s - m} : ${n}`, whyWrong: 'So teilst du nur das Geld vom Dienstag.' }, { label: `(${m} + ${s - m}) ${TIMES} ${n}`, whyWrong: 'Beim Aufteilen bekommt jede Gruppe weniger als alle zusammen.' }, { label: `${n} : (${m} + ${s - m})`, whyWrong: ORDER_COUNTS }],
        hint: 'Wie viel Geld ist es zusammen? Das gehört in die Klammer.',
        line: `${m} € und ${s - m} € kommen zusammen und ${n} Gruppen teilen alles gleich auf`, otherLines: [{ label: `${m} € behält die Klasse und ${s - m} € teilen ${n} Gruppen auf`, whyWrong: 'Zu dieser Geschichte passt ein Term ohne Klammer.' }, { label: `${n} Gruppen bekommen je ${m} € und dazu ${s - m} €`, whyWrong: 'Hier stehen die Zahlen an anderer Stelle.' }, { label: `${m} €, ${s - m} € und ${n} € kommen zusammen`, whyWrong: 'Zu dieser Geschichte passt eine reine Summe.' }] };
    }
    case 'kuchen': {
      const [mehl, zucker] = [50 * rng.int(4, 10), 50 * rng.int(2, 5)];
      return { kind, context: `Für einen Kuchen braucht ${name} ${mehl} g Mehl und ${zucker} g Zucker. ${name} backt ${n} Kuchen.`, question: 'Welcher Term passt zu Mehl und Zucker zusammen, in g?', term: `${n} ${TIMES} (${mehl} + ${zucker})`, equal: `${n} ${TIMES} ${mehl} + ${n} ${TIMES} ${zucker}`,
        wrongs: [{ label: `${n} ${TIMES} ${mehl} + ${zucker}`, whyWrong: 'So reicht der Zucker nur für einen Kuchen.' }, { label: `${n} + ${mehl} + ${zucker}`, whyWrong: `${n} Kuchen brauchen ${n}-mal so viel wie ein Kuchen.` }, { label: `${n} ${TIMES} ${mehl} ${TIMES} ${zucker}`, whyWrong: 'Mehl und Zucker kommen zusammen. Das ist eine Summe.' }],
        hint: 'Wie viel braucht 1 Kuchen zusammen?',
        line: `${n} Kuchen mit je ${mehl} g Mehl und ${zucker} g Zucker`, otherLines: [{ label: `${n} Kuchen mit je ${mehl} g Mehl und zusammen ${zucker} g Zucker`, whyWrong: 'Zu dieser Geschichte passt ein Term ohne Klammer.' }, { label: `1 Kuchen mit ${mehl} g Mehl und ${zucker} g Zucker, dazu ${n} g Salz`, whyWrong: 'Zu dieser Geschichte passt eine reine Summe.' }, { label: `${n} Kuchen mit je ${mehl} g Mehl`, whyWrong: 'Der Term hat noch eine zweite Zahl in der Klammer.' }] };
    }
    case 'radweg':
      return { kind, context: `${name} fährt an ${n} Tagen mit dem Fahrrad. Jeden Tag fährt ${name} ${a} km zur Schule und ${b} km zum Sport.`, question: 'Welcher Term passt zum ganzen Weg in km?', term: `${n} ${TIMES} (${a} + ${b})`, equal: `${n} ${TIMES} ${a} + ${n} ${TIMES} ${b}`,
        wrongs: [{ label: `${n} ${TIMES} ${a} + ${b}`, whyWrong: 'So fährst du nur an einem Tag zum Sport.' }, { label: `${n} + ${a} + ${b}`, whyWrong: 'So zählst du nur einen Tag und addierst die Tage dazu.' }, { label: `(${n} + ${a}) ${TIMES} ${b}`, whyWrong: 'Prüfe die Klammer: Welche Wege gibt es an einem Tag?' }],
        hint: 'Wie lang ist der Weg an einem Tag?',
        line: `${n} Tage mit je ${a} km zur Schule und ${b} km zum Sport`, otherLines: [{ label: `${n} Tage mit je ${a} km und am Ende noch ${b} km`, whyWrong: 'Zu dieser Geschichte passt ein Term ohne Klammer.' }, { label: `${a} Tage mit je ${b} km und am Ende noch ${n} km`, whyWrong: 'Hier stehen die Zahlen an anderer Stelle.' }, { label: `${n} km, ${a} km und ${b} km an einem Tag`, whyWrong: 'Zu dieser Geschichte passt eine reine Summe.' }] };
    case 'einkauf': {
      // A Buch costs more than a Heft.
      const [x, y] = [rng.int(6, 18), rng.int(2, 4)];
      const start = x + y + rng.int(5, 30);
      return { kind, context: `${name} hat ${start} €. ${name} kauft ein Buch für ${x} € und ein Heft für ${y} €.`, question: 'Welcher Term passt zum Rest in €?', term: `${start} ${MINUS} (${x} + ${y})`, equal: `${start} ${MINUS} ${x} ${MINUS} ${y}`,
        wrongs: [{ label: `${start} ${MINUS} ${x} + ${y}`, whyWrong: 'So zählst du das Heft wieder dazu.' }, { label: `${start} ${MINUS} (${x} ${MINUS} ${y})`, whyWrong: 'Buch und Heft zusammen kosten mehr als das Buch allein.' }, { label: `(${start} ${MINUS} ${x}) ${TIMES} ${y}`, whyWrong: 'Beim Bezahlen bleibt weniger Geld. Hier gibt es keine Malrechnung.' }],
        hint: 'Wie viel kostet alles zusammen?',
        line: `${start} € haben, dann ein Buch für ${x} € und ein Heft für ${y} € kaufen`, otherLines: [{ label: `${start} € haben, ein Buch für ${x} € kaufen und ${y} € geschenkt bekommen`, whyWrong: 'Zu dieser Geschichte passt ein Term ohne Klammer.' }, { label: `${start} € haben und ${x} € und ${y} € dazubekommen`, whyWrong: 'Zu dieser Geschichte passt eine reine Summe.' }, { label: `${x} € haben und ${start} € ausgeben`, whyWrong: 'Hier stehen die Zahlen an anderer Stelle.' }] };
    }
  }
}

/** Story to term. */
function s3Story(rng: Rng, ab: Ab): Exercise {
  const s = story(rng);
  return build(SKILL, 3, {
    key: `geschichte:${s.kind}:${s.term}`,
    ab,
    context: s.context,
    prompt: s.question,
    answer: makeChoice(rng, { label: s.term }, s.wrongs),
    hints: [s.hint, 'Prüfe den Term: Passt jede Zahl an ihre Stelle?'],
    steps: [`Der Term: ${s.term}`, `Auch richtig: ${s.equal}`],
    praise: 'Du hast den passenden Term zur Geschichte gewählt.',
    srText: say(s.context, s.question),
    kmk: KMK_STORY,
  });
}

/** Term to story, or the one term that does not fit. */
function s3Reason(rng: Rng, ab: Ab): Exercise {
  const s = story(rng);
  if (rng.chance(0.5)) {
    const prompt = 'Welche Geschichte passt zu diesem Term?';
    return build(SKILL, 3, {
      key: `zur-geschichte:${s.kind}:${s.term}`,
      ab,
      prompt,
      expression: s.term,
      answer: makeChoice(rng, { label: s.line }, s.otherLines),
      hints: ['Was steht in der Klammer? Das gehört in der Geschichte zusammen.', 'Prüfe die Zahl außerhalb der Klammer.'],
      steps: [`Der Term: ${s.term}`, `Die Geschichte: ${s.line}`],
      praise: 'Du hast die passende Geschichte zum Term gewählt.',
      srText: say(prompt, s.term),
      kmk: KMK_STORY,
    });
  }
  const notFit = s.wrongs[0];
  const question = 'Welcher Term passt nicht zur Geschichte?';
  return build(SKILL, 3, {
    key: `passt-nicht:${s.kind}:${s.term}`,
    ab,
    context: s.context,
    prompt: question,
    answer: makeChoice(rng, { label: notFit.label }, [
      { label: s.term, whyWrong: 'Dieser Term passt. Prüfe die anderen beiden.' },
      { label: s.equal, whyWrong: 'Dieser Term passt auch. Hier stehen die Teile einzeln.' },
    ]),
    hints: ['Zwei Terme passen zur Geschichte. Beide haben denselben Wert.', s.hint],
    steps: [`Das passt: ${s.term}`, `Das passt auch: ${s.equal}`, `Nicht passend: ${notFit.label}`],
    praise: 'Du hast den unpassenden Term erkannt.',
    srText: say(s.context, question),
    kmk: ['ZO.terme', 'PK.modellieren', 'PK.argumentieren'],
  });
}

export const textTermSkill: SkillDef = {
  ...SKILL,
  title: 'Vom Text zum Term',
  description: 'Du übersetzt Sätze in Terme und Terme in Sätze.',
  stufen: { 1: 'Eine Rechenart: Addiere 3 zu 5', 2: 'Summe, Differenz, Produkt, Quotient und zwei Rechenarten', 3: 'Klammern nötig: Welcher Term passt zur Geschichte?' },
  kmk: ['ZO.terme', 'PK.darstellen', 'PK.modellieren', 'PK.argumentieren'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    if (stufe === 1) return ab === 1 ? s1Direct(rng, ab) : ab === 2 ? s1Wording(rng, ab) : s1Reverse(rng, ab);
    if (stufe === 2) return ab === 1 ? s2Fachwort(rng, ab) : ab === 2 ? s2TwoSteps(rng, ab) : s2Reverse(rng, ab);
    return ab === 1 ? s3Sentence(rng, ab) : ab === 2 ? s3Story(rng, ab) : s3Reason(rng, ab);
  },
};
