/**
 * Negative Zahlen vergleichen (docs/research.md §6). Stufe 1: one negative with one positive number, or 0. Stufe 2: two negatives. Stufe 3: order five numbers, Betrag and Gegenzahl. Choice and order only:
 * a wrong option carries its own hint, and the keypad stays out of this skill.
 */
import { BOX, fmt, fmtQty, fmtTemp } from '../../core/format';
import type { Ab, ChoiceOption, Rng, SkillDef, Stufe } from '../../core/types';
import { makeChoice, orderAnswer, targetAb } from '../shared';
import { assemble, bug, type Form, KMK_ZAHLEN, lineForMarks, say } from './helpers';

const SKILL = { id: 'negativ.vergleichen', topicId: 'negativ' } as const;

const LEFT_SMALLER = 'Links auf der Zahlengeraden ist kleiner.';
const NOT_EQUAL = 'Die beiden Zahlen liegen an verschiedenen Stellen der Zahlengeraden.';

const lower = (a: number, b: number) => Math.min(a, b);
const upper = (a: number, b: number) => Math.max(a, b);

/** The sign between two numbers: the hint names the position, with the child's numbers. */
function signForm(rng: Rng, a: number, b: number, hints: string[], praise: string): Form {
  const sign = a < b ? '<' : '>';
  const prompt = 'Welches Zeichen gehört in die Lücke?';
  const expression = `${fmt(a)} ${BOX} ${fmt(b)}`;
  const why = `Auf der Zahlengeraden liegt ${fmt(lower(a, b))} weiter links. Links ist kleiner.`;
  return {
    key: `zeichen:${a}:${b}`,
    prompt,
    expression,
    answer: makeChoice(rng, { label: sign }, [{ label: sign === '<' ? '>' : '<', whyWrong: why }, { label: '=', whyWrong: NOT_EQUAL }], { layout: 'symbols', order: ['<', '>', '='] }),
    hints,
    steps: [{ text: `${fmt(lower(a, b))} liegt links von ${fmt(upper(a, b))}.`, visual: lineForMarks(a, b) }, `${fmt(a)} ${sign} ${fmt(b)}`],
    praise,
    srText: say(prompt, expression),
  };
}

// ─── Stufe 1: one negative and one positive, or 0 ────────────────────────────

/** One negative with one positive or 0, in random order. */
function mixedPair(rng: Rng, negMax: number, posMax: number): [number, number] {
  const n = -rng.int(1, negMax);
  const p = rng.chance(0.25) ? 0 : rng.int(1, posMax);
  return rng.chance(0.5) ? [n, p] : [p, n];
}

/** AB III on Stufe 1: a claim that reads the digits only, or a claim about the 0; the child picks what holds. */
function claimStufe1(rng: Rng): Form {
  const name = rng.pick(['Nele', 'Tom', 'Elif', 'Ben', 'Lina', 'Omar']);
  if (rng.chance(0.5)) {
    const n = rng.int(11, 60);
    const p = rng.int(2, 9);
    const context = `${name} sagt: ${fmt(-n)} ist größer als ${p}. Denn ${n} ist größer als ${p}.`;
    const prompt = 'Was stimmt?';
    return {
      key: `behauptung:${n}:${p}`,
      context,
      prompt,
      answer: makeChoice(rng, { label: `${fmt(-n)} ist kleiner als ${p}. Die Zahl liegt links von der 0.` }, [
        { label: `${name} hat recht. ${n} ist größer als ${p}.`, whyWrong: `Die Aufgabe nennt ${fmt(-n)}, nicht ${n}. Schau auf das Minus.` },
        { label: `Beide Zahlen sind gleich groß.`, whyWrong: NOT_EQUAL },
      ]),
      hints: ['Stell dir beide Zahlen auf der Zahlengeraden vor.', LEFT_SMALLER],
      steps: [{ text: `${fmt(-n)} liegt links von der 0, ${p} rechts davon.`, visual: lineForMarks(-n, p) }, `Also ist ${fmt(-n)} kleiner als ${p}.`],
      praise: 'Du hast die Behauptung an der Zahlengeraden geprüft.',
      srText: say(context, prompt),
      kmk: ['PK.argumentieren'],
    };
  }
  const n = rng.int(1, 12);
  const p = rng.int(1, 12);
  const context = `${name} sagt: 0 ist die kleinste Zahl. Das stimmt nicht.`;
  const prompt = 'Welche Aussage zeigt das?';
  // the true statement about a positive number shows nothing, and the minus stands in three options: it alone does not find the answer
  return {
    key: `null:${n}:${p}`,
    context,
    prompt,
    answer: makeChoice(rng, { label: `${fmt(-n)} ist kleiner als 0.` }, [
      { label: `${p} ist größer als 0.`, whyWrong: 'Das stimmt. Es zeigt aber keine Zahl unter 0.' },
      { label: `${fmt(-n)} ist größer als 0.`, whyWrong: `${fmt(-n)} liegt links von der 0. ${LEFT_SMALLER}` },
      { label: `0 ist kleiner als ${fmt(-n)}.`, whyWrong: `Die 0 liegt rechts von ${fmt(-n)}. ${LEFT_SMALLER}` },
    ]),
    hints: ['Gesucht ist eine Zahl unter 0.', 'Such eine Zahl links von der 0.'],
    steps: [`${fmt(-n)} liegt links von der 0.`, `Also ist ${fmt(-n)} kleiner als 0.`],
    praise: 'Du hast ein Gegenbeispiel gefunden.',
    srText: say(context, prompt),
    kmk: ['PK.argumentieren'],
  };
}

function stufe1(rng: Rng, ab: Ab): Form {
  const hints = ['Stell dir beide Zahlen auf der Zahlengeraden vor.', LEFT_SMALLER];
  if (ab === 1) {
    const [a, b] = mixedPair(rng, 20, 20);
    return signForm(rng, a, b, hints, 'Du hast die Lage auf der Zahlengeraden verglichen.');
  }
  if (ab === 2) {
    // a long negative number against a short positive one or the 0: more digits do not mean more
    const n = -(100 + 5 * rng.int(1, 150));
    const p = rng.chance(0.25) ? 0 : rng.int(1, 9);
    const [a, b] = rng.chance(0.5) ? [n, p] : [p, n];
    return signForm(rng, a, b, ['Schau zuerst auf das Minus, dann auf die Ziffern.', LEFT_SMALLER], 'Du hast zuerst auf das Minus geschaut.');
  }
  return claimStufe1(rng);
}

// ─── Stufe 2: two negatives ──────────────────────────────────────────────────

function twoNegatives(rng: Rng, max: number): [number, number] {
  const a = -rng.int(1, max);
  let b = -rng.int(1, max);
  if (a === b) b = a === -1 ? -2 : a + 1;
  return [a, b];
}

function colder(rng: Rng): Form {
  const [a, b] = twoNegatives(rng, 25);
  const prompt = 'Welche Temperatur ist kälter?';
  return {
    key: `kaelter:${a}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: fmtTemp(lower(a, b)) }, [{ label: fmtTemp(upper(a, b)), whyWrong: 'Weiter unter 0 ist kälter. Schau auf den Abstand zur 0.' }]),
    hints: ['Stell dir beide Temperaturen am Thermometer vor.', 'Weiter unter 0 heißt kälter.'],
    steps: [`${fmtTemp(lower(a, b))} liegt weiter unter 0 als ${fmtTemp(upper(a, b))}.`, `Kälter ist ${fmtTemp(lower(a, b))}.`],
    praise: 'Du hast den Abstand unter null verglichen.',
    srText: say(prompt, `${fmtTemp(a)} oder ${fmtTemp(b)}`),
  };
}

function deeper(rng: Rng): Form {
  const a = -5 * rng.int(2, 60);
  let b = -5 * rng.int(2, 60);
  if (a === b) b = a - 15;
  const prompt = 'Welche Höhe liegt tiefer?';
  return {
    key: `tiefer:${a}:${b}`,
    prompt,
    answer: makeChoice(rng, { label: fmtQty(lower(a, b), 'm') }, [{ label: fmtQty(upper(a, b), 'm'), whyWrong: 'Tiefer heißt: weiter unter dem Meeresspiegel. Vergleiche den Abstand zur 0.' }]),
    hints: ['0 m ist der Meeresspiegel.', 'Weiter unter 0 heißt tiefer.'],
    steps: [`${fmtQty(lower(a, b), 'm')} liegt weiter unter 0 als ${fmtQty(upper(a, b), 'm')}.`, `Tiefer liegt ${fmtQty(lower(a, b), 'm')}.`],
    praise: 'Du hast den Abstand zum Meeresspiegel verglichen.',
    srText: say(prompt, `${fmtQty(a, 'm')} oder ${fmtQty(b, 'm')}`),
  };
}

function between(rng: Rng): Form {
  const low = -rng.int(8, 30);
  const high = low + rng.int(4, 7);
  const t = low + rng.int(1, high - low - 1);
  const prompt = `Welche Zahl liegt zwischen ${fmt(low)} und ${fmt(high)}?`;
  return {
    key: `zwischen:${low}:${high}:${t}`,
    prompt,
    answer: makeChoice(rng, { label: fmt(t) }, [
      { label: fmt(-t), whyWrong: 'Beide Grenzen sind negativ. Die gesuchte Zahl liegt auch links von der 0.' },
      { label: fmt(low - 2), whyWrong: `Diese Zahl liegt links von ${fmt(low)}.` },
      { label: fmt(high + 1 === 0 ? high + 2 : high + 1), whyWrong: `Diese Zahl liegt rechts von ${fmt(high)}.` },
    ]),
    hints: ['Stell dir beide Grenzen auf der Zahlengeraden vor.', 'Die gesuchte Zahl liegt rechts von der einen und links von der anderen.'],
    steps: [`${fmt(low)} < ${fmt(t)} < ${fmt(high)}`, `Also liegt ${fmt(t)} dazwischen.`],
    praise: 'Du hast beide Grenzen beachtet.',
    srText: say(prompt),
    kmk: ['PK.argumentieren'],
  };
}

/** AB III: a claim that compares the digits only; the child finds what holds. */
function claimStufe2(rng: Rng): Form {
  const name = rng.pick(['Mia', 'Emil', 'Sara', 'Finn', 'Lea', 'Can']);
  const [a, b] = twoNegatives(rng, 30);
  const small = lower(a, b);
  const big = upper(a, b);
  const context = `${name} sagt: ${fmt(small)} ist größer als ${fmt(big)}. Denn ${-small} ist größer als ${-big}.`;
  const prompt = 'Was stimmt?';
  return {
    key: `behauptung:${small}:${big}`,
    context,
    prompt,
    answer: makeChoice(rng, { label: `${fmt(small)} ist kleiner als ${fmt(big)}. ${fmt(small)} liegt weiter links.` }, [
      { label: `${name} hat recht. ${-small} ist größer als ${-big}.`, whyWrong: `${fmt(small)} liegt weiter links als ${fmt(big)}. Links ist kleiner.` },
      { label: `Beide Zahlen sind gleich groß.`, whyWrong: NOT_EQUAL },
      { label: `${fmt(big)} liegt weiter links als ${fmt(small)}.`, whyWrong: 'Weiter weg von der 0 heißt hier: weiter links.' },
    ]),
    hints: ['Stell dir beide Zahlen auf der Zahlengeraden vor.', 'Links von der 0 gilt: Je weiter weg, desto kleiner.'],
    steps: [{ text: `${fmt(small)} liegt weiter von der 0 entfernt als ${fmt(big)}.`, visual: lineForMarks(small, big) }, `${fmt(small)} < ${fmt(big)}`],
    praise: 'Du hast die Behauptung an der Zahlengeraden geprüft.',
    srText: say(context, prompt),
    kmk: ['PK.argumentieren'],
  };
}

function stufe2(rng: Rng, ab: Ab): Form {
  const hints = ['Welche Zahl liegt weiter links auf der Zahlengeraden?', 'Links von der 0 gilt: Je weiter weg, desto kleiner.'];
  if (ab === 1) {
    const [a, b] = twoNegatives(rng, 20);
    return signForm(rng, a, b, hints, 'Du hast den Abstand zur 0 richtig gedeutet.');
  }
  if (ab === 2) {
    const kind = rng.int(0, 2);
    if (kind === 0) {
      // digits that look alike: −19 and −91, −105 and −150
      const tens = rng.int(1, 8);
      const ones = rng.int(tens + 1, 9);
      const [a, b] = rng.chance(0.5) ? [-(10 * tens + ones), -(10 * ones + tens)] : [-(100 + 10 * tens + ones), -(100 + 10 * ones + tens)];
      const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
      return signForm(rng, x, y, ['Vergleiche zuerst die Ziffern von vorne.', 'Links von der 0 gilt: Je weiter weg, desto kleiner.'], 'Du hast Stelle für Stelle verglichen.');
    }
    return kind === 1 ? colder(rng) : deeper(rng);
  }
  return rng.chance(0.5) ? between(rng) : claimStufe2(rng);
}

// ─── Stufe 3: order five; Betrag and Gegenzahl ───────────────────────────────

/** Five distinct values with different Beträge, at least two below 0 and one above, and sometimes the 0. */
function fiveValues(rng: Rng, max: number): number[] {
  const absolutes = rng.sample(Array.from({ length: max }, (_, i) => i + 1), 5);
  const values = absolutes.map((v, i) => (i < 2 ? -v : i === 2 ? v : rng.chance(0.6) ? -v : v));
  if (rng.chance(0.25)) values[4] = 0;
  return values;
}

function orderForm(rng: Rng, values: number[], direction: 'aufsteigend' | 'absteigend'): Form {
  const answer = orderAnswer(rng, values, direction);
  const ascending = direction === 'aufsteigend';
  const asc = [...values].sort((x, y) => x - y);
  const indexOf = (v: number) => answer.items.indexOf(fmt(v));
  const sequence = (seq: number[]) => (ascending ? seq : [...seq].reverse()).map(indexOf);
  const negatives = asc.filter((v) => v < 0);
  const rest = asc.filter((v) => v >= 0);
  const byBetrag = [...values].sort((x, y) => Math.abs(x) - Math.abs(y));
  const correct = JSON.stringify(answer.correct);
  const betrag = sequence(byBetrag);
  const flipped = sequence([...[...negatives].reverse(), ...rest]);
  const prompt = ascending ? 'Ordne die Zahlen. Beginne mit der kleinsten.' : 'Ordne die Zahlen. Beginne mit der größten.';
  const shown = ascending ? asc : [...asc].reverse();
  const sign = ascending ? '<' : '>';
  return {
    key: `ordnen:${asc.join(':')}:${direction}`,
    prompt,
    answer,
    hints: ['Trenne zuerst die negativen Zahlen von den anderen.', 'Je weiter links, desto kleiner.'],
    steps: [
      `Die negativen Zahlen, von links nach rechts: ${negatives.map((v) => fmt(v)).join(' < ')}`,
      `Danach kommen die anderen: ${rest.map((v) => fmt(v)).join(' < ')}`,
      `Geordnet: ${shown.map((v) => fmt(v)).join(` ${sign} `)}`,
    ],
    bugs: [
      JSON.stringify(betrag) !== correct && bug('betrag-groesser', betrag, 'Du hast nach dem Abstand zur 0 geordnet. Schau auch auf das Minus.'),
      JSON.stringify(flipped) !== correct && JSON.stringify(flipped) !== JSON.stringify(betrag) && bug('negative-umgedreht', flipped, 'Links von der 0 gilt: Je weiter weg, desto kleiner.'),
    ].filter((b): b is ReturnType<typeof bug> => !!b),
    praise: 'Du hast Minus und Abstand zur 0 beachtet.',
    srText: say(prompt, answer.items.join(', ')),
  };
}

const GLOSS_BETRAG = 'Der Betrag ist der Abstand einer Zahl zur 0.';
const GLOSS_GEGENZAHL = 'Die Gegenzahl liegt gleich weit von der 0, auf der anderen Seite.';

/** Gegenzahl or Betrag of one number, with the mix-ups as options. */
function directTerm(rng: Rng): Form {
  const n = rng.int(3, 40);
  if (rng.chance(0.5)) {
    const v = rng.chance(0.75) ? -n : n;
    const prompt = `Welche Zahl ist die Gegenzahl von ${fmt(v)}?`;
    return {
      key: `gegenzahl:${v}`,
      prompt,
      answer: makeChoice(rng, { label: fmt(-v) }, [
        { label: fmt(v), whyWrong: 'Das ist die Zahl selbst. Die Gegenzahl liegt auf der anderen Seite der 0.' },
        // two options on each side of the 0, with two sizes: the side of the answer alone does not find it
        { label: fmt(-v + Math.sign(-v)), whyWrong: 'Die Seite stimmt. Der Abstand zur 0 muss aber gleich bleiben.' },
        { label: fmt(v + Math.sign(v)), whyWrong: GLOSS_GEGENZAHL },
      ]),
      hints: [GLOSS_GEGENZAHL, 'Der Abstand zur 0 bleibt gleich.'],
      steps: [`${fmt(v)} liegt ${n} von der 0 entfernt.`, `Die Gegenzahl von ${fmt(v)} ist ${fmt(-v)}.`],
      praise: 'Du hast die andere Seite der 0 genommen.',
      srText: say(prompt),
    };
  }
  const v = -n;
  const prompt = `Wie groß ist der Betrag von ${fmt(v)}?`;
  return {
    key: `betrag:${v}`,
    prompt,
    answer: makeChoice(rng, { label: fmt(n) }, [
      { label: fmt(-n), whyWrong: 'Ein Betrag ist ein Abstand. Ein Abstand ist nie negativ.' },
      { label: '0', whyWrong: GLOSS_BETRAG },
      { label: fmt(n + 1), whyWrong: GLOSS_BETRAG },
    ]),
    hints: [GLOSS_BETRAG, 'Ein Abstand ist nie negativ.'],
    steps: [`${fmt(v)} liegt ${n} von der 0 entfernt.`, `|${fmt(v)}| = ${n}`],
    praise: 'Du hast den Betrag als Abstand gelesen.',
    srText: say(prompt),
  };
}

/** The number with the largest Betrag is often not the largest number. */
function largestBetrag(rng: Rng): Form {
  const values = fiveValues(rng, 40).filter((v) => v !== 0).slice(0, 4);
  const top = values.reduce((best, v) => (Math.abs(v) > Math.abs(best) ? v : best), values[0]);
  const prompt = 'Welche Zahl hat den größten Betrag?';
  const maxValue = Math.max(...values);
  const options: ChoiceOption[] = values.filter((v) => v !== top).map((v) => ({ label: fmt(v), whyWrong: v === maxValue ? 'Das ist die größte Zahl. Gesucht ist der größte Abstand zur 0.' : GLOSS_BETRAG }));
  return {
    key: `groesster-betrag:${values.join(':')}`,
    prompt,
    answer: makeChoice(rng, { label: fmt(top) }, options),
    hints: [GLOSS_BETRAG, 'Vergleiche die Zahlen ohne Vorzeichen.'],
    steps: [`Abstände zur 0: ${values.map((v) => Math.abs(v)).join(', ')}`, `Den größten Abstand hat ${fmt(top)}.`],
    praise: 'Du hast die Abstände zur 0 verglichen.',
    srText: say(prompt, values.map((v) => fmt(v)).join(', ')),
  };
}

/** AB III: reasoning about Betrag and order at once. */
function reasonTerms(rng: Rng): Form {
  const kind = rng.int(0, 2);
  const prompt = 'Welche Aussage stimmt?';
  if (kind === 0) {
    const n = rng.int(5, 30);
    const p = rng.int(1, n - 1);
    return {
      key: `betrag-groesser:${n}:${p}`,
      prompt,
      expression: `${fmt(-n)} und ${p}`,
      answer: makeChoice(rng, { label: `${fmt(-n)} ist kleiner als ${p}, hat aber den größeren Betrag.` }, [
        { label: `${fmt(-n)} ist größer als ${p}. Der Betrag ist ja größer.`, whyWrong: 'Der Betrag sagt nur etwas über den Abstand zur 0.' },
        { label: `${fmt(-n)} ist kleiner als ${p} und hat den kleineren Betrag.`, whyWrong: GLOSS_BETRAG },
        { label: 'Beide Zahlen haben denselben Betrag.', whyWrong: GLOSS_BETRAG },
      ]),
      hints: ['Prüfe zuerst die Lage auf der Zahlengeraden.', 'Vergleiche dann die Abstände zur 0.'],
      steps: [`${fmt(-n)} liegt links von ${p}, also ${fmt(-n)} < ${p}.`, `|${fmt(-n)}| = ${n} und |${p}| = ${p}`, `Also hat ${fmt(-n)} den größeren Betrag.`],
      praise: 'Du hast Lage und Betrag getrennt.',
      srText: say(prompt, `${fmt(-n)} und ${p}`),
      kmk: ['PK.argumentieren'],
    };
  }
  if (kind === 1) {
    const n = rng.int(2, 30);
    const questionPrompt = `Welche zwei Zahlen haben den Betrag ${n}?`;
    return {
      key: `zwei-betraege:${n}`,
      prompt: questionPrompt,
      answer: makeChoice(rng, { label: `${fmt(-n)} und ${n}` }, [
        { label: `${n} und ${n + 1}`, whyWrong: `${n + 1} hat einen anderen Abstand zur 0.` },
        { label: `${fmt(-n)} und 0`, whyWrong: 'Die 0 hat den Betrag 0.' },
        { label: `${fmt(-n)} und ${fmt(-n - 1)}`, whyWrong: 'Eine Zahl auf jeder Seite der 0 hat diesen Abstand.' },
      ]),
      hints: [GLOSS_BETRAG, 'Geh von der 0 aus nach links und nach rechts.'],
      steps: [`${n} Schritte von der 0 aus gibt es zwei Ziele.`, `Das sind ${fmt(-n)} und ${n}.`],
      praise: 'Du hast beide Seiten der 0 gesehen.',
      srText: say(questionPrompt),
      kmk: ['PK.argumentieren'],
    };
  }
  const n = rng.int(3, 30);
  const aboutOpposite = `Welche Aussage über die Gegenzahl von ${fmt(-n)} stimmt?`;
  return {
    key: `gegenzahl-aussage:${n}`,
    prompt: aboutOpposite,
    answer: makeChoice(rng, { label: `Die Gegenzahl ${n} ist positiv und hat denselben Betrag.` }, [
      { label: `Die Gegenzahl ${fmt(-n)} ist die Zahl selbst.`, whyWrong: GLOSS_GEGENZAHL },
      { label: `Die Gegenzahl ${n} hat einen größeren Betrag.`, whyWrong: 'Beide Zahlen sind gleich weit von der 0 entfernt.' },
      { label: 'Die Gegenzahl ist 0.', whyWrong: GLOSS_GEGENZAHL },
    ]),
    hints: [GLOSS_GEGENZAHL, GLOSS_BETRAG],
    steps: [`Die Gegenzahl von ${fmt(-n)} ist ${n}.`, `Beide Zahlen haben den Betrag ${n}.`],
    praise: 'Du hast Gegenzahl und Betrag verbunden.',
    srText: say(aboutOpposite),
    kmk: ['PK.argumentieren'],
  };
}

function stufe3(rng: Rng, ab: Ab): Form {
  if (ab === 1) {
    return rng.chance(0.7) ? orderForm(rng, fiveValues(rng, 20), 'aufsteigend') : directTerm(rng);
  }
  if (ab === 2) {
    return rng.chance(0.7) ? orderForm(rng, fiveValues(rng, 200), rng.chance(0.5) ? 'absteigend' : 'aufsteigend') : largestBetrag(rng);
  }
  return reasonTerms(rng);
}

const FORMS: Record<Stufe, (rng: Rng, ab: Ab) => Form> = { 1: stufe1, 2: stufe2, 3: stufe3 };

export const vergleichenSkill: SkillDef = {
  ...SKILL,
  title: 'Negative Zahlen vergleichen',
  description: 'Du ordnest positive und negative Zahlen.',
  stufen: { 1: 'Eine negative Zahl mit einer positiven oder der 0', 2: 'Zwei negative Zahlen: −3 und −7', 3: 'Fünf Zahlen ordnen; Betrag und Gegenzahl' },
  kmk: [...KMK_ZAHLEN, 'PK.argumentieren'],
  generate(rng, stufe, ctx) {
    const ab = targetAb(rng, stufe, ctx);
    return assemble(SKILL, stufe, ab, KMK_ZAHLEN, FORMS[stufe](rng, ab));
  },
};
