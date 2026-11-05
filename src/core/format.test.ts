import { describe, expect, it } from 'vitest';
import { fmt, fmtDuration, fmtMoney, fmtQty, fmtTime, keepTermsTogether, numberWord, ordinalWord, speak, spokenWords, toSpeech } from './format';

const N = ' ';

describe('keepTermsTogether', () => {
  it('breaks a line only between the pieces of a task', () => {
    expect(keepTermsTogether('8 · 2 = 16, also 9 · 2 = □')).toBe(`8${N}·${N}2 = 16, also 9${N}·${N}2${N}=${N}□`);
    expect(keepTermsTogether('24 : 5 = □ Rest □')).toBe(`24${N}:${N}5${N}=${N}□${N}Rest${N}□`);
    expect(keepTermsTogether('Mach zuerst: 3 + 4')).toBe('Mach zuerst: 3 + 4');
    expect(keepTermsTogether('Setze B(−4|−6).')).toBe('Setze B(−4|\u2060−6).');
    expect(keepTermsTogether('Eine Packung wiegt 1 kg. Ein Heft kostet 3,40 €.')).toBe(`Eine Packung wiegt 1${N}kg. Ein Heft kostet 3,40${N}€.`);
    expect(keepTermsTogether('7 kg + ½ kg = □ g')).toBe(`7${N}kg + ½${N}kg${N}=${N}□${N}g`);
    expect(keepTermsTogether('Es sind 3 mal 2 Hefte')).toBe('Es sind 3 mal 2 Hefte');
  });
});

describe('fmt', () => {
  it('writes whole numbers without grouping and uses the minus sign U+2212', () => {
    expect(fmt(7)).toBe('7');
    expect(fmt(2500)).toBe('2500');
    expect(fmt(-3)).toBe('−3');
  });
  it('rejects non-finite numbers', () => {
    expect(() => fmt(NaN)).toThrow();
  });
});

describe('quantities', () => {
  it('formats money, quantities, clock times and durations', () => {
    expect(fmtMoney(340)).toBe(`3,40${N}€`);
    expect(fmtMoney(300)).toBe(`3,00${N}€`);
    expect(fmtMoney(5)).toBe(`0,05${N}€`);
    expect(fmtMoney(0)).toBe(`0,00${N}€`);
    expect(fmtQty(5, 'cm')).toBe(`5${N}cm`);
    expect(fmtTime(14, 5)).toBe(`14.05${N}Uhr`);
    expect(fmtTime(8, 30, false)).toBe('8.30');
    expect(fmtDuration(85)).toBe(`1${N}h 25${N}min`);
    expect(fmtDuration(60)).toBe(`1${N}h`);
    expect(fmtDuration(45)).toBe(`45${N}min`);
  });
});

describe('numberWord', () => {
  it.each([
    [0, 'null'],
    [1, 'eins'],
    [11, 'elf'],
    [16, 'sechzehn'],
    [17, 'siebzehn'],
    [21, 'einundzwanzig'],
    [30, 'dreißig'],
    [99, 'neunundneunzig'],
    [100, 'einhundert'],
    [101, 'einhunderteins'],
    [215, 'zweihundertfünfzehn'],
    [305, 'dreihundertfünf'],
    [1000, 'eintausend'],
    [2500, 'zweitausendfünfhundert'],
  ])('%i → %s', (n, word) => {
    expect(numberWord(n)).toBe(word);
  });
  it('rejects out-of-range input', () => {
    expect(() => numberWord(1e15)).toThrow();
    expect(() => numberWord(-1)).toThrow();
    expect(() => numberWord(2.5)).toThrow();
  });
});

describe('toSpeech', () => {
  it('spells out operators', () => {
    expect(toSpeech('7 · 8 = □')).toBe('7 mal 8 gleich Lücke');
    expect(toSpeech('56 : 7 = 8')).toBe('56 geteilt durch 7 gleich 8');
    expect(toSpeech('900 − 1')).toBe('900 minus 1');
    expect(toSpeech('14.30 Uhr')).toBe('14.30 Uhr');
  });
  it('never reads a clock time as a division', () => {
    expect(toSpeech('21 : 0 Uhr')).toBe('21.00 Uhr');
    expect(toSpeech('Die Lösung ist 11 : 15\u00A0Uhr.')).toBe('Die Lösung ist 11.15 Uhr.');
    expect(toSpeech('21.00\u00A0Uhr')).toBe('21.00 Uhr');
    expect(toSpeech('48 : 6 = 8')).toBe('48 geteilt durch 6 gleich 8');
  });
  it('leaves no space before punctuation', () => {
    expect(toSpeech('Das sind etwa 1 □.')).toBe('Das sind etwa 1 Lücke.');
    expect(toSpeech('□, □ und □ .')).toBe('Lücke, Lücke und Lücke.');
    expect(toSpeech('3 · 4 = □ ?')).toBe('3 mal 4 gleich Lücke?');
  });
});

describe('speak', () => {
  it('names the units of Klasse 6', () => {
    expect(speak(`3${N}€ 40${N}ct`)).toBe('3 Euro 40 Cent');
    expect(speak(`1${N}h 25${N}min`)).toBe('1 Stunde 25 Minuten');
    expect(speak(`2${N}m 15${N}cm`)).toBe('2 Meter 15 Zentimeter');
  });
});

describe('spokenWords: what the read-aloud voice gets', () => {
  it('turns numbers into words', () => {
    expect(spokenWords('34 + 8 = □')).toBe('vierunddreißig plus acht gleich Lücke');
    expect(spokenWords('3 · 4 = □')).toBe('drei mal vier gleich Lücke');
    expect(spokenWords('3 · 1 = □')).toBe('drei mal eins gleich Lücke');
    expect(spokenWords('1 · 5 = □')).toBe('eins mal fünf gleich Lücke');
    expect(spokenWords('56 : 7 = 8')).toBe('sechsundfünfzig geteilt durch sieben gleich acht');
    expect(spokenWords('Wie viel ist 100 − 1?')).toBe('Wie viel ist einhundert minus eins?');
  });
  it('reads units, place values and clock times as spoken', () => {
    expect(spokenWords(`3${N}€ 40${N}ct`)).toBe('drei Euro vierzig Cent');
    expect(spokenWords('2 Z 14 E')).toBe('zwei Zehner vierzehn Einer');
    expect(spokenWords(`8:30${N}Uhr`)).toBe('acht Uhr dreißig');
    expect(spokenWords(`9:00${N}Uhr`)).toBe('neun Uhr');
    expect(spokenWords('Die Uhr zeigt 14:15.')).toBe('Die Uhr zeigt vierzehn Uhr fünfzehn.');
  });
  it('reads dates as ordinals and 1-mal as einmal (T16)', () => {
    expect(spokenWords('Heute ist der 8. In 6 Tagen ist das Fest.')).toBe('Heute ist der achte. In sechs Tagen ist das Fest.');
    expect(spokenWords('Das Fest ist am 26.')).toBe('Das Fest ist am sechsundzwanzigsten.');
    expect(spokenWords('Welcher Wochentag ist der 19.?')).toBe('Welcher Wochentag ist der neunzehnte?');
    expect(spokenWords('Heute ist der 1.')).toBe('Heute ist der erste.');
    expect(spokenWords('1 · 9 heißt 1-mal die 9.')).toBe('eins mal neun heißt einmal die neun.');
    expect(ordinalWord(3, 'en')).toBe('dritten');
    expect(ordinalWord(7, 'e')).toBe('siebte');
    expect(ordinalWord(31, 'en')).toBe('einunddreißigsten');
  });
  it('leaves a 1 before a word to the voice, and words as they are', () => {
    expect(spokenWords('1 Münze und 2 Scheine')).toBe('1 Münze und zwei Scheine');
    expect(spokenWords(`1${N}€`)).toBe('1 Euro');
    expect(spokenWords('vierunddreißig')).toBe('vierunddreißig');
  });
});

describe('T16: what a task needs said', () => {
  it('numberWord: a group ending in 01 takes the feminine singular', () => {
    expect(numberWord(1e6)).toBe('eine Million');
    expect(numberWord(101e6)).toBe('einhunderteine Million');
    expect(numberWord(501104008)).toBe('fünfhunderteine Million einhundertviertausendacht');
    expect(numberWord(7301000000)).toBe('sieben Milliarden dreihunderteine Million');
    expect(numberWord(21e6)).toBe('einundzwanzig Millionen');
    expect(numberWord(101)).toBe('einhunderteins');
  });
  it('says a power as hoch, and leaves a unit for speak()', () => {
    expect(toSpeech('10⁶ = □')).toBe('10 hoch 6 gleich Lücke');
    expect(toSpeech('□² = 49')).toBe('Lücke hoch 2 gleich 49');
    expect(toSpeech('(−2)³')).toBe('Klammer auf minus 2 Klammer zu hoch 3');
    expect(speak('5 m²')).toBe('5 Quadratmeter');
  });
  it('says a bracket around a term, not around a sign or a remark', () => {
    expect(toSpeech('(8 + 4) · 3')).toBe('Klammer auf 8 plus 4 Klammer zu mal 3');
    expect(toSpeech('15 − (2 + (9 − 3))')).toBe('15 minus Klammer auf 2 plus Klammer auf 9 minus 3 Klammer zu Klammer zu');
    expect(toSpeech('5 − (−3)')).toBe('5 minus, minus 3');
    expect(toSpeech('P(3 | 2)')).toBe('Punkt P mit den Koordinaten 3 und 2');
    expect(toSpeech('Der größte Teiler (ggT)')).toBe('Der größte Teiler (ggT)');
    expect(toSpeech('ggT(25, 15) = □')).toBe('ggT von 25 und 15 gleich Lücke');
  });
  it('says a Maßstab as zu, and a division as a division', () => {
    expect(toSpeech('1 : 100')).toBe('1 zu 100');
    expect(toSpeech('5 : 1')).toBe('5 zu 1');
    expect(toSpeech('1 : □')).toBe('1 zu Lücke');
    expect(toSpeech('56 : 7 = □')).toBe('56 geteilt durch 7 gleich Lücke');
  });
  it('says the signs of parallel and senkrecht, and a Roman numeral letter by letter', () => {
    expect(toSpeech('g ∥ h')).toBe('g ist parallel zu h');
    expect(toSpeech('g ⊥ h')).toBe('g ist senkrecht zu h');
    expect(toSpeech('MMDCCCXCVI = □')).toBe('M M D C C C X C V I gleich Lücke');
    expect(toSpeech('Mi und Do')).toBe('Mi und Do');
  });
  it('a fraction takes its spoken form before a unit or as a noun', () => {
    expect(speak('{frac:1/2} h')).toBe('eine halbe Stunde');
    expect(speak('{frac:1 1/2} h')).toBe('eineinhalb Stunden');
    expect(speak('{frac:1/2} der Murmeln')).toBe('die Hälfte der Murmeln');
    expect(speak('{frac:3/4} kg')).toBe('drei Viertel Kilogramm');
  });
  it('literalComma keeps the comma where it is the task', () => {
    expect(speak('7,08 €')).toBe('7 Euro 8');
    expect(speak('7,08 €', { literalComma: true })).toBe('7 Komma 0 8 Euro');
  });
  it('the voice: no ordinal after a word ending in der, a letter apart from its number, 1 before a gap', () => {
    expect(spokenWords('Busse 55 und Räder 35.')).toBe('Busse fünfundfünfzig und Räder fünfunddreißig.');
    expect(spokenWords('Am 3. und der 19.')).toContain('der neunzehnte');
    expect(spokenWords('In der 5b sind 22 Kinder.')).toBe('In der fünf b sind zweiundzwanzig Kinder.');
    expect(spokenWords('1 □ 0 4')).toBe('eins Lücke null vier');
    expect(spokenWords('1 Münze')).toBe('1 Münze');
    expect(spokenWords('801 Millionen')).toBe('achthunderteine Million');
    expect(spokenWords('Maßstab 1 : 100')).toBe('Maßstab eins zu einhundert');
  });
});

