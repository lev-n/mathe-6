/**
 * Checkable text rules for 11–12-year-olds (docs/research.md §4). Words are whitespace tokens; the symbols + − · : = □ < > and numbers with
 * their unit do not count, and a fraction such as {frac:3/4} counts as one number. Pure, used by src/core/testing.ts. Each check returns its problems as text.
 */
import { TEXT_LIMITS } from './age';
import { FRAC_TOKEN } from './format';
import type { Exercise, Step, Stufe } from './types';

/** Fractions and points are numbers to the rules: they count as one number and as no word. */
const asNumbers = (text: string) => text.replace(FRAC_TOKEN, '#').replace(/\b[A-Z]\([^()|]*\|[^()|]*\)/g, '#');

/** Number with its unit, group spaces included: '1 250 000 km', '−3 °C', '90°', '3,50 €', '25 %'. */
const QUANTITY = /[−-]?\d[\d\u202F\u2009.,]*(?:[\s\u00A0]?(?:%|€|ct|mm²|cm²|dm²|km²|m²|mm³|cm³|dm³|m³|mm|cm|dm|km|m|kg|mg|g|t|ml|hl|l|min|h|s|ha|a|°C|°)(?![\p{L}\p{N}]))?/gu;

export function wordCount(text: string): number {
  return asNumbers(text)
    .replace(QUANTITY, ' ')
    .split(/\s+/)
    .filter((t) => /\p{L}/u.test(t)).length;
}

/** Sentences: text up to . ! ? followed by a space or the end. A colon does not end a sentence. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

/** T5: always banned. */
const BANNED_CONJUNCTION = /(?<![\p{L}])(obwohl|nachdem|während|falls|sofern|indem|sodass|damit)(?![\p{L}])/iu;
/** T5: at most one subordinate clause per task on Stufe 2 and 3, none on Stufe 1: these, or a relative clause. */
const WEIL_WENN_DASS = /(?<![\p{L}])(weil|wenn|dass)(?![\p{L}])/giu;

/** Words after a comma that can start a relative clause, with the rest of the clause. */
const RELATIVE = /,\s+(?:(?:in|an|auf|mit|von|zu|bei|für|aus)\s+)?(?:der|die|das|dem|den|denen|deren|dessen|welche[rsmn]?)\s+([^,.;:!?]+)/iu;
/** A clause end that is no verb: 'Der Zehner steht vorne, der Einer hinten.' */
const NO_VERB_END = /^(hinten|vorne|vorn|oben|unten|links|rechts|innen|außen|danach|davor|dabei|dazu)$/i;

/** T5 heuristic: a relative clause ends in a verb, a list has 'und'. It can miss or overreach: then the sentence is too long anyway. */
export function hasRelativeClause(text: string): boolean {
  const m = RELATIVE.exec(text);
  if (!m) return false;
  const clause = m[1].trim();
  if (/\bund\b/.test(clause)) return false;
  const last = clause.split(/\s+/).pop() ?? '';
  if (NO_VERB_END.test(last)) return false;
  return /^\p{Ll}/u.test(last) && /(t|e|en|st|n)$/.test(last);
}

/** Indirect question or free relative after a comma: 'Schau, wo Zehner und Einer gleich sind.' A comma inside a direct question stays fine. */
const INDIRECT = /,\s+(was|wie|wo|wer|wann|warum|ob|woher|wohin|woran)\s+([^,.;:!?]+)(?=[.,;:!]|$)/iu;
/** Free relative at the start of a sentence: 'Was links außen ist, kommt nach rechts außen.' */
const FREE_RELATIVE = /(?:^|:\s+)(was|wer|wo)\s+[^,?]+,[^?]*$/iu;

/** T5 heuristic: such a clause ends in a verb. 'wie ein Blatt Papier' ends in a noun, so a comparison passes. */
function indirectClause(text: string): string | null {
  const m = INDIRECT.exec(text);
  const last = m?.[2].trim().split(/\s+/).pop() ?? '';
  if (m && /^\p{Ll}/u.test(last) && !NO_VERB_END.test(last)) return m[1];
  for (const s of sentences(text)) {
    const free = FREE_RELATIVE.exec(s);
    if (free) return free[1];
  }
  return null;
}

/** T5: a word that opens a subordinate clause that is too much here (a relative clause: 'Relativsatz'); null if none. */
export function subordinateClause(text: string, stufe: Stufe = 1): string | null {
  const m = BANNED_CONJUNCTION.exec(text);
  if (m) return m[1];
  const clauses = [...text.matchAll(WEIL_WENN_DASS)].map((c) => c[1]);
  if (hasRelativeClause(text)) clauses.push('Relativsatz');
  const indirect = indirectClause(text);
  if (indirect) clauses.push(indirect);
  return clauses.length > TEXT_LIMITS.subordinateClauses[stufe] ? clauses[0] : null;
}

/** T5 on every text the child reads; on Stufe 2 and 3 one subordinate clause per text is allowed (pass the whole task as one text). */
export function clauseProblems(texts: readonly string[], stufe: Stufe = 1): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = subordinateClause(t, stufe);
    if (found) out.push(`T5: "${found}" in "${t}"`);
  }
  return out;
}

/** T9: a pronoun for a noun of an earlier sentence, or across a colon. 'es' is not checked: it is mostly impersonal ('Es sind 7.'). */
const BACK_PRONOUN = /(?<![\p{L}])(sie|er|ihn|ihm|ihnen)(?![\p{L}])/iu;
/** T9: idioms and double negatives (what a test can find). */
const IDIOM_OR_DOUBLE_NEGATIVE = /(?<![\p{L}])(kinderleicht|im handumdrehen|auf anhieb klar|ein klacks|kein problem|ein kinderspiel|nicht ohne|nicht un\p{L}+|nie nicht|kein nicht)(?![\p{L}])/iu;

export function pronounProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = t.split(/(?<=[.!?:])\s+/).slice(1).map((part) => BACK_PRONOUN.exec(part)).find(Boolean);
    if (found) out.push(`T9: "${found[1]}" in "${t}"`);
    const idiom = IDIOM_OR_DOUBLE_NEGATIVE.exec(t);
    if (idiom) out.push(`T9: "${idiom[1]}" in "${t}"`);
  }
  return out;
}

const stepText = (step: Step) => (typeof step === 'string' ? step : step.text);

/** T8: letters of a word outside the allowlist. */
export const MAX_WORD_LETTERS = 16;

/**
 * T8: the long words children may meet, for reading review with real children (docs/research.md §4): the plans' Fachwörter and the
 * names of pictures and skills. Add a word only if a simpler one would change the maths.
 */
export const LONG_WORD_ALLOWLIST: ReadonlySet<string> = new Set([
  'Bruchschreibweise',
  'Dezimalschreibweise',
  'Distributivgesetz',
  'Häufigkeitstabelle',
  'Häufigkeitstabellen',
  'Kommaschreibweise',
  'Koordinatensystem',
  'Koordinatensysteme',
  'Prozentschreibweise',
  'Quadratmillimeter',
  'Quadratzentimeter',
  'Stellenwerttafeln',
  'Verbindungsgesetz',
  'Vertauschungsgesetz',
  'achsensymmetrisch',
  'achsensymmetrische',
  'gleichschenkligen',
  'gleichschenkliges',
  'Überschlagsrechnung',
]);

/** Number words ('neunhunderteinundfünfzigtausend') are no long words. */
const NUMBER_WORD = /^((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)?hundert)?((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)und)?(eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)?(tausend)?((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)?hundert)?((ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)und)?(eine|eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)?$/iu;

/** T8: words of more than MAX_WORD_LETTERS letters outside the allowlist; a hyphen joins two words. */
export function longWords(text: string): string[] {
  const words = text.match(/\p{L}+/gu) ?? [];
  return words.filter((w) => [...w].length > MAX_WORD_LETTERS && !LONG_WORD_ALLOWLIST.has(w) && !NUMBER_WORD.test(w));
}

/** T8 on every text the child reads. */
export function longWordProblems(texts: readonly string[]): string[] {
  return texts.flatMap((t) => longWords(t).map((w) => `T8: "${w}" in "${t}"`));
}

/** T1–T4: the task text. An exercise with `context` counts as a Sachaufgabe (T2). */
export function taskTextProblems(ex: Pick<Exercise, 'prompt' | 'context' | 'expression'>, stufe: Stufe): string[] {
  const out: string[] = [];
  const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const all = [story, ex.expression].filter(Boolean).join(' ');
  const words = wordCount(all);
  if (ex.context) {
    if (words > TEXT_LIMITS.storyWords[stufe]) out.push(`T2: ${words} words on Stufe ${stufe} (at most ${TEXT_LIMITS.storyWords[stufe]}): "${all}"`);
  } else if (words > TEXT_LIMITS.taskWords) {
    out.push(`T1: ${words} words (at most ${TEXT_LIMITS.taskWords}): "${all}"`);
  }
  const parts = sentences(story);
  if (parts.length > TEXT_LIMITS.sentences[stufe]) out.push(`T3: ${parts.length} sentences (at most ${TEXT_LIMITS.sentences[stufe]}): "${story}"`);
  for (const s of parts) {
    if (wordCount(s) > TEXT_LIMITS.sentenceWords[stufe]) out.push(`T4: ${wordCount(s)} words in a sentence on Stufe ${stufe} (at most ${TEXT_LIMITS.sentenceWords[stufe]}): "${s}"`);
  }
  return out;
}

/** Whole numbers, decimals and grouped numbers of a text; a mixed quantity ('3 € 40 ct', '1 h 25 min') and a fraction or point count as one. */
function numbersIn(text: string): number {
  const merged = asNumbers(text).replace(/\d+\s(€|km|m|cm|kg|h|min)\s\d+\s(ct|m|cm|mm|g|min|s)(?!\p{L})/gu, '#');
  return (merged.match(/#|\d[\d\u202F\u2009]*(?:[.,]\d+)?/g) ?? []).length;
}

/** T7: one question, always last; at most three numbers per sentence of the task. */
export function questionProblems(ex: Pick<Exercise, 'prompt' | 'context'>): string[] {
  const out: string[] = [];
  const story = [ex.context, ex.prompt].filter(Boolean).join(' ');
  const questions = (story.match(/\?/g) ?? []).length;
  if (questions > 1) out.push(`T7: ${questions} questions: "${story}"`);
  if (questions === 1 && !story.trim().endsWith('?')) out.push(`T7: the question must come last: "${story}"`);
  for (const s of sentences(story)) {
    const count = numbersIn(s);
    if (count > TEXT_LIMITS.sentenceNumbers) out.push(`T7: ${count} numbers in a sentence (at most ${TEXT_LIMITS.sentenceNumbers}): "${s}"`);
  }
  return out;
}

/** T10: a number word before a unit: digits for quantities. 'fünf Personen' is fine (T16), 'fünf cm' and 'drei Euro' are not. */
const WORD_QUANTITY = /(?<![\p{L}])(zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)[\s\u00A0]+(€|Euro|Cent|ct|mm|cm|dm|km|m|Meter|Zentimeter|Kilometer|kg|Kilogramm|g|Gramm|l|Liter|ml|Milliliter|%|Prozent)(?![\p{L}\p{N}²³])/iu;

/**
 * T10, T11: number format. Digits for quantities; thin-space groups from 5 digits and none below; decimal comma; a space before units ('3,50 €', '12 cm²', '25 %'), but '90°'; money with two
 * decimals; fractions as {frac:3/4}, never 3/4; · and : for mal and geteilt; points as P(3 | 5); minus as U+2212; a negative second operand in brackets, 5 − (−3).
 */
export function numberFormatProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of texts) {
    const t = raw.replace(FRAC_TOKEN, '#');
    const problem = (what: string, rule = 'T10') => out.push(`${rule}: ${what} in "${raw}"`);
    if (/(?<![\d\u202F\u2009.,])\d{5,}(?![\d,]*[\u202F\u2009])/.test(t.replace(/,\d+/g, ''))) problem('5 or more digits without thin-space groups');
    if (/(?<![\d\u202F\u2009,])\d[\u202F\u2009]\d{3}(?![\d\u202F\u2009])/.test(t)) problem('a thin space in a 4-digit number');
    if (/(?<![\d.,])\d{1,3}(?:[. \u00A0]\d{3})+(?![\d.,])/.test(t)) problem('groups need a thin space');
    if (/(?<![\d.])\d+\.\d+(?![\d.])(?![\s\u00A0]*Uhr)/.test(t)) problem('a decimal point (use a comma; clock times need "Uhr")');
    if (WORD_QUANTITY.test(t)) problem('a number word for a quantity (use digits)');
    if (/\d%/.test(t)) problem('a space before %');
    if (/(^|[\s(=])-\d/.test(t) || /\d\s-\s\d/.test(t)) problem('a hyphen as a minus (use U+2212)', 'T11');
    if (/[\d)#]\s*[+\u2212\u00B7:]\s*\u2212[\d#]/.test(t)) problem('a negative after an operator needs brackets', 'T11');
    if (/\d\s*[*×÷xX]\s*\d/.test(t)) problem('use · and : for mal and geteilt', 'T11');
    if (/\b[A-Z]\s?\(\s*[−-]?[\d,]+\s*[;/]\s*[−-]?[\d,]+\s*\)/.test(t) || /\b[A-Z]\s\(\s*[−-]?[\d,]+\s*\|/.test(t) || /\b[A-Z]\(\s*[−-]?[\d,]+\|/.test(t) || /\b[A-Z]\(\s*[−-]?[\d,]+[\s\u00A0]*\|[−\d]/.test(t)) problem('a point is written P(3 | 5)', 'T11');
    if (/\d\s*\/\s*\d/.test(t)) problem('a fraction belongs in {frac:3/4}', 'T11');
    if (/\d(?:€|ct|mm|cm|dm|km|kg|mg|ml|min|°C)(?![\p{L}\p{N}])/u.test(t) || /\d(?:m|g|l|h|s|t)(?![\p{L}\p{N}²³])/u.test(t)) problem('a space before the unit');
    if (/\d[\s\u00A0]°(?!C)/.test(t)) problem('no space before ° in an angle');
    if (/\d°C/.test(t)) problem('a space before °C');
    for (const m of t.matchAll(/\d,(\d+)[\s\u00A0]?€(?!\p{L})/gu)) if (m[1].length !== 2) problem('money with two decimals');
  }
  return out;
}

/** T13: without a plan one term per concept: Dezimalzahl, Volumen, Oberfläche; Zahlenstrahl for positive numbers, Zahlengerade with negatives (`withNegatives`, undefined: no line in this task). */
export function termProblems(texts: readonly string[], withNegatives?: boolean): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const alias = /(?<![\p{L}])(Dezimalbr(?:uch|üche|üchen)|Rauminhalt\p{L}*|Oberflächeninhalt\p{L}*)(?![\p{L}])/u.exec(t);
    if (alias) out.push(`T13: "${alias[1]}" in "${t}" (use Dezimalzahl, Volumen, Oberfläche)`);
    if (withNegatives === true && /(?<![\p{L}])Zahlenstrahl/u.test(t)) out.push(`T13: "Zahlenstrahl" with negative numbers in "${t}" (use Zahlengerade)`);
    if (withNegatives === false && /(?<![\p{L}])Zahlengerade/u.test(t)) out.push(`T13: "Zahlengerade" with positive numbers in "${t}" (use Zahlenstrahl)`);
  }
  return out;
}

/** T12: Grundwert, Prozentwert, Prozentsatz only inside percent-calculation skills. */
const PERCENT_TERMS = /(?<![\p{L}])(Grundwert|Prozentwert|Prozentsatz)/u;
export function percentTermProblems(skillId: string, texts: readonly string[]): string[] {
  if (['prozent.prozentwert', 'prozent.grundwert-satz'].includes(skillId)) return [];
  return texts.flatMap((t) => {
    const m = PERCENT_TERMS.exec(t);
    return m ? [`T12: "${m[1]}" outside the percent-calculation skills in "${t}"`] : [];
  });
}

/** The method setting: the words of the two subtraction methods never meet in one written exercise. */
export function methodWordProblems(texts: readonly string[]): string[] {
  const all = texts.join(' ');
  return /entbünd/i.test(all) && /erweiter/i.test(all) ? [`Method: "Entbündeln" and "Erweitern" in one exercise: "${all}"`] : [];
}

/** Catalogue: Rest in full, with a Probe line in the worked steps; never 'R' and never two Rest results chained with '='. */
export function restProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    if (/\d\s*R\s*\d/.test(t)) out.push(`Rest: write "Rest" out: "${t}"`);
    if (/Rest\s*\d+\s*=[^.!?]*Rest/.test(t)) out.push(`Rest: two Rest results chained with "=": "${t}"`);
  }
  return out;
}

/** §7.2: a catchphrase as a rule on its own. Hints name the step. */
const CATCHPHRASE = /minus\s+mal\s+minus|aus\s+minus\s+wird\s+plus|zwei\s+minus\s+(?:ergeben|geben)\s+plus/iu;

/** T19: one hint (strategy hint, bug hint or whyWrong). */
export function hintProblems(hint: string): string[] {
  const out: string[] = [];
  if (wordCount(hint) > TEXT_LIMITS.hintWords) out.push(`T19: ${wordCount(hint)} words in a hint (at most ${TEXT_LIMITS.hintWords}): "${hint}"`);
  if (sentences(hint).length > TEXT_LIMITS.hintSentences) out.push(`T19: ${sentences(hint).length} sentences in a hint (at most ${TEXT_LIMITS.hintSentences}): "${hint}"`);
  if (CATCHPHRASE.test(hint)) out.push(`§7.2: a catchphrase instead of a step: "${hint}"`);
  return out;
}

/** T19: praise and worked steps. */
export function praiseAndStepProblems(ex: Pick<Exercise, 'praise' | 'steps'>): string[] {
  const out: string[] = [];
  if (wordCount(ex.praise) > TEXT_LIMITS.praiseWords) out.push(`T19: ${wordCount(ex.praise)} words of praise (at most ${TEXT_LIMITS.praiseWords}): "${ex.praise}"`);
  if (ex.steps.length > TEXT_LIMITS.steps) out.push(`T19: ${ex.steps.length} worked steps (at most ${TEXT_LIMITS.steps})`);
  for (const step of ex.steps) {
    const text = stepText(step);
    if (/\n/.test(text)) out.push(`T19: a worked step with a line break: "${text}"`);
    if (wordCount(text) > TEXT_LIMITS.stepWords) out.push(`T19: ${wordCount(text)} words in a worked step (at most ${TEXT_LIMITS.stepWords}): "${text}"`);
  }
  return out;
}

/** T6: 'würde, hätte, wäre', past forms, and 'wird/werden' with a participle. 'Der Hunderter wird größer.' stays fine, and so does the fixed price phrase 'wird um 20 % gesenkt'. */
const SUBJUNCTIVE = /(?<![\p{L}])(wurde|wurden|würde|würden|hätte|hätten|wäre|wären)(?![\p{L}])/iu;
const PASSIVE = /(?<![\p{L}])(wird|werden)(?![\p{L}])[^.!?,;:]*(?<![\p{L}])(?:ge|be|ver|er|zer|ent)\p{L}{3,}(?:t|en)(?![\p{L}])/iu;
const PRICE_PHRASE = /(?<![\p{L}])wird um [\d\s\u00A0,]+(?:%|€|ct) (?:gesenkt|reduziert|erhöht)(?![\p{L}])/giu;

/** T6 on every text the child reads. */
export function passiveProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const found = SUBJUNCTIVE.exec(t) ?? PASSIVE.exec(t.replace(PRICE_PHRASE, ''));
    if (found) out.push(`T6: "${found[0]}" in "${t}"`);
  }
  return out;
}

/** T16, §7.1, §7.2 word list: 'Kinder' and 'Kids' in any form, baby talk, hero and pro titles, 'Super', 'wir' as a fake teacher voice, rhyme openers. */
const TONE_WORDS = /(?<![\p{L}])(kinder\p{L}*|kids?|aufgäbchen|zählerchen|nennerchen|zahlenfreund\p{L}*|\p{L}*-?held\p{L}*|rechenkünstler\p{L}*|mathefuchs|\p{L}*-?profi\p{L}*|meister|superstar|super|wir|uns|unser\p{L}*|na,)(?![\p{L}])/iu;
const EMOJI = /\p{Extended_Pictographic}/u;
/** T15: banned contexts; dice and spinners only as a game or experiment. */
const BANNED_CONTEXT = /(?<![\p{L}])(diät\p{L}*|abnehmen|übergewicht\p{L}*|körpergewicht\p{L}*|alkohol\p{L}*|bier|wein|sekt|casino|lotto|wetteinsatz|gehalt)(?![\p{L}])/iu;

/** T15, T16: the word lists, emoji, and more than one exclamation mark per screen (`texts`: what one screen shows). */
export function toneProblems(texts: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const word = TONE_WORDS.exec(t);
    if (word) out.push(`T16: "${word[1]}" in "${t}"`);
    const context = BANNED_CONTEXT.exec(t);
    if (context) out.push(`T15: "${context[1]}" in "${t}"`);
    if (EMOJI.test(t.replace(/[\u00A9\u00AE]/g, ''))) out.push(`T16: an emoji in "${t}"`);
  }
  const marks = texts.join(' ').match(/!/g)?.length ?? 0;
  if (marks > 1) out.push(`T16: ${marks} exclamation marks on one screen: "${texts.join(' ')}"`);
  return out;
}

/** T4–T6, T8, T9 and T16 on a text outside the generators (badges, phrases, privacy text). */
export function childTextProblems(text: string): string[] {
  const out = [...clauseProblems([text], 2), ...longWordProblems([text]), ...pronounProblems([text]), ...passiveProblems([text]), ...toneProblems([text])];
  for (const s of sentences(text)) {
    if (wordCount(s) > TEXT_LIMITS.sentenceWords[1]) out.push(`T4: ${wordCount(s)} words in a sentence: "${s}"`);
  }
  return out;
}
