import { describe, expect, it } from 'vitest';
import { MAX_WORD_LETTERS, childTextProblems, clauseProblems, hasRelativeClause, hintProblems, longWordProblems, longWords, numberFormatProblems, passiveProblems, percentTermProblems, praiseAndStepProblems, pronounProblems, questionProblems, sentences, subordinateClause, taskTextProblems, termProblems, toneProblems, wordCount } from './textRules';

describe('wordCount', () => {
  it('counts whitespace tokens without the maths symbols and numbers with their unit', () => {
    expect(wordCount('34 + 8 = □')).toBe(0);
    expect(wordCount('3 · 4 : 2 − 1')).toBe(0);
    expect(wordCount('Mia hat 3 € 40 ct.')).toBe(2);
    expect(wordCount('Es sind −3 °C und 90° und 1\u202F250\u202F000 km.')).toBe(4);
    expect(wordCount('{frac:3/4} von P(3 | 5)')).toBe(1);
    expect(wordCount('')).toBe(0);
  });
});

describe('sentences', () => {
  it('splits at . ! ?, not at a colon', () => {
    expect(sentences('Fast! Rechne erst zur 10: 3 + 7, dann noch 2.')).toEqual(['Fast!', 'Rechne erst zur 10: 3 + 7, dann noch 2.']);
    expect(sentences('Wie viele? ')).toEqual(['Wie viele?']);
  });
});

describe('T1–T4', () => {
  const words = (n: number, every = 8) => Array.from({ length: n }, (_, i) => (i % every === every - 1 ? 'wort.' : 'wort')).join(' ');
  it('T1: a task without a story has at most 18 words', () => {
    expect(taskTextProblems({ prompt: 'Rechne.', expression: '34 + 8 = □' }, 1)).toEqual([]);
    expect(taskTextProblems({ prompt: words(18) }, 1).some((p) => p.startsWith('T1'))).toBe(false);
    expect(taskTextProblems({ prompt: words(19) }, 1).some((p) => p.startsWith('T1'))).toBe(true);
  });

  it('T2: an exercise with context may have 30, 40 or 50 words', () => {
    const at = (n: number) => ({ context: words(n - 2), prompt: 'Wie viele?' });
    expect(taskTextProblems(at(31), 1).some((p) => p.startsWith('T2'))).toBe(true);
    expect(taskTextProblems(at(30), 1).some((p) => p.startsWith('T2'))).toBe(false);
    expect(taskTextProblems(at(41), 2).some((p) => p.startsWith('T2'))).toBe(true);
    expect(taskTextProblems(at(40), 2).some((p) => p.startsWith('T2'))).toBe(false);
    expect(taskTextProblems(at(51), 3).some((p) => p.startsWith('T2'))).toBe(true);
    expect(taskTextProblems(at(50), 3).some((p) => p.startsWith('T2'))).toBe(false);
  });

  it('T3: at most 4 sentences with the question, 5 on Stufe 3', () => {
    const ex = { context: 'Mia hat 3 Äpfel. Ali hat 2 Äpfel. Ben hat 4 Äpfel. Ida hat 1 Apfel.', prompt: 'Wie viele sind es?' };
    expect(taskTextProblems(ex, 2).some((p) => p.startsWith('T3'))).toBe(true);
    expect(taskTextProblems(ex, 3).some((p) => p.startsWith('T3'))).toBe(false);
  });

  it('T4: at most 14 words per sentence, 18 on Stufe 3', () => {
    const s = { context: 'Mia und Ali und Ben und Ida und Lena gehen heute sehr gerne zur Schule.', prompt: 'Wer fehlt?' };
    expect(taskTextProblems(s, 2).some((p) => p.startsWith('T4'))).toBe(true);
    expect(taskTextProblems(s, 3).some((p) => p.startsWith('T4'))).toBe(false);
  });
});

describe('T5', () => {
  it('Stufe 1: no subordinate clause; Stufe 2 and 3: one with wenn, weil or dass', () => {
    for (const w of ['weil', 'wenn', 'dass']) {
      expect(subordinateClause(`Mia lacht, ${w} es regnet.`, 1)).toBe(w);
      expect(subordinateClause(`Mia lacht, ${w} es regnet.`, 2)).toBeNull();
      expect(subordinateClause(`Mia lacht, ${w} es regnet, ${w} es schneit.`, 3)).toBe(w);
    }
    expect(subordinateClause('Wenn es regnet, bleibt Mia hier.')).toBe('Wenn');
    expect(subordinateClause('Das Wetter ist schön.')).toBeNull();
  });

  it('always bans obwohl, nachdem, während, sodass, damit', () => {
    for (const w of ['obwohl', 'nachdem', 'während', 'damit', 'sodass']) expect(subordinateClause(`Mia lacht, ${w} es regnet.`, 3)).toBe(w);
  });

  it('finds relative clauses, not lists or short second parts', () => {
    expect(hasRelativeClause('Das ist der Ball, den Tom hat.')).toBe(true);
    expect(hasRelativeClause('Mia hat einen Hund, der gerne spielt.')).toBe(true);
    expect(hasRelativeClause('Mia sieht den Ball, die Puppe und den Bär.')).toBe(false);
    expect(hasRelativeClause('Hör genau hin: Der Zehner steht vorne, der Einer hinten.')).toBe(false);
    expect(hasRelativeClause('Schau zuerst auf die Zehner.')).toBe(false);
    expect(clauseProblems(['Rechne.', 'Das ist der Ball, den Tom hat.'])).toHaveLength(1);
  });

  it('finds indirect questions and free relatives', () => {
    expect(subordinateClause('Zähle, was draufsteht.')).toBe('was');
    expect(subordinateClause('Die Zahl sagt, wie viele Felder du gehst.')).toBe('wie');
    expect(subordinateClause('Schau, wo Zehner und Einer gleich sind.')).toBe('wo');
    expect(subordinateClause('Das Bild klappt um. Was links außen ist, kommt nach rechts außen.')).toBe('Was');
  });

  it('leaves comparisons and direct questions alone', () => {
    expect(subordinateClause('Ein Rechteck hat 4 rechte Ecken, wie ein Blatt Papier.')).toBeNull();
    expect(subordinateClause('Würfel, Quader und Kugel. Was rollt, was kippt?')).toBeNull();
    expect(subordinateClause('Was kommt zuerst?')).toBeNull();
    expect(subordinateClause('Schau auf die Achse: Wie viel zählt ein Kästchen?')).toBeNull();
  });
});

describe('T9', () => {
  it('finds a pronoun across sentences or a colon', () => {
    expect(pronounProblems(['Eine Zahl passt nicht. Wie muss sie heißen?'])).toHaveLength(1);
    expect(pronounProblems(['Ein Kreis ist rund: Er hat keine Ecke.'])).toHaveLength(1);
    expect(pronounProblems(['Der Zehner zählt mit. Zähle ihn dazu.'])).toHaveLength(1);
  });

  it('allows a repeated noun, one sentence and the impersonal es', () => {
    expect(pronounProblems(['Eine Zahl passt nicht. Wie muss die Zahl heißen?', 'Es sind 7. Es bleiben 3.', 'Wer ist er?'])).toEqual([]);
  });
});

describe('T6, T7', () => {
  it('T6: no passive and no Konjunktiv, except the fixed price phrase', () => {
    expect(passiveProblems(['Die Zahl wird gerundet.'])).toHaveLength(1);
    expect(passiveProblems(['Der Hunderter wird größer.'])).toEqual([]);
    expect(passiveProblems(['Das wäre schön.'])).toHaveLength(1);
    expect(passiveProblems(['Der Preis wird um 20\u00A0% gesenkt.'])).toEqual([]);
  });
  it('T7: one question, last; at most three numbers a sentence', () => {
    expect(questionProblems({ prompt: 'Wie viele? Wie lang?' })[0]).toContain('2 questions');
    expect(questionProblems({ prompt: 'Wie viele sind es? Rechne.' })[0]).toContain('last');
    expect(questionProblems({ prompt: 'Mia hat 1, 2, 3 und 4 Karten.' })[0]).toContain('4 numbers');
    expect(questionProblems({ prompt: 'Es kostet 3 € 40 ct.' })).toEqual([]);
  });
});

describe('T8', () => {
  it('allows Fachwörter of the list and number words, and finds other long words', () => {
    expect(longWords('Die Stellenwerttafel und das Koordinatensystem')).toEqual([]);
    expect(longWords('Dezimalschreibweise, Flächeninhalt')).toEqual([]);
    expect(longWords('neunhunderteinundfünfzigtausend')).toEqual([]);
    expect(longWords('Donaudampfschifffahrt')).toEqual(['Donaudampfschifffahrt']);
    expect(longWordProblems(['Donaudampfschifffahrt'])[0]).toContain('T8');
  });
});

describe('T10', () => {
  const ok = (t: string) => expect(numberFormatProblems([t]), t).toEqual([]);
  const bad = (t: string, what: RegExp) => expect(numberFormatProblems([t]).join(), t).toMatch(what);
  it('accepts the forms of T10', () => {
    ['1\u202F250\u202F000', '2500', '12\u202F500', '3,5', '5 − (−3)', '−3 °C', '90°', 'P(3 | 5)', 'P(3\u00A0|\u00A05)', 'A(−2 | 3)', '3,50 €', '{frac:3/4} von 20', '7 · 8 : 2', '13.50 Uhr', '4\u00A0kg'].forEach(ok);
  });
  it('thin-space groups from 5 digits, none below', () => {
    bad('12500 Menschen', /without thin-space/);
    bad('2\u202F500 Menschen', /4-digit/);
    bad('1.250.000', /thin space/);
    bad('12 500', /thin space/);
  });
  it('decimal comma, minus as U+2212, brackets after an operator', () => {
    bad('3.5 kg', /decimal point/);
    bad('-3', /hyphen/);
    bad('5 - 3', /hyphen/);
    bad('5 − −3', /brackets/);
    bad('5 + −3', /brackets/);
    bad('2 · −3', /brackets/);
  });
  it('· and :, points, no 3/4 in text, units', () => {
    bad('3 x 4', /· and :/);
    bad('3 * 4', /· and :/);
    bad('P(3;2)', /P\(3 \| 5\)/);
    bad('P(3|5)', /P\(3 \| 5\)/);
        bad('P (3 | 5)', /P\(3 \| 5\)/);
    bad('Nimm 3/4 davon.', /frac/);
    bad('5km', /before the unit/);
    bad('5 °', /no space before °/);
    bad('−3°C', /space before °C/);
    bad('3,5 €', /two decimals/);
  });
});

describe('T15', () => {
  it('limits hints to 14 words and 2 sentences', () => {
    expect(hintProblems('Der Stift beginnt bei 3. Wie viele Zentimeter bis 9?')).toEqual([]);
    expect(hintProblems('Eins. Zwei. Drei.').join()).toContain('3 sentences');
    expect(hintProblems(Array.from({ length: 15 }, () => 'wort').join(' ')).join()).toContain('15 words');
  });

  it('bans a catchphrase as a rule on its own (§7.2)', () => {
    expect(hintProblems('Minus mal minus gibt plus.').join()).toContain('catchphrase');
    expect(hintProblems('Zwei negative Faktoren: Das Ergebnis ist positiv.')).toEqual([]);
  });

  it('limits praise to 10 words, worked steps to 5 lines', () => {
    expect(praiseAndStepProblems({ praise: 'Du hast die Zehner zuerst angeschaut.', steps: ['35 + 5 = 40', '40 + 3 = 43'] })).toEqual([]);
    expect(praiseAndStepProblems({ praise: 'eins zwei drei vier fünf sechs sieben acht neun zehn elf', steps: ['a'] }).join()).toContain('of praise');
    expect(praiseAndStepProblems({ praise: 'Gut.', steps: ['a', 'b', 'c', 'd', 'e'] })).toEqual([]);
    expect(praiseAndStepProblems({ praise: 'Gut.', steps: ['a', 'b', 'c', 'd', 'e', 'f'] }).join()).toContain('6 worked steps');
    expect(praiseAndStepProblems({ praise: 'Gut.', steps: [{ text: 'a\nb' }] }).join()).toContain('line break');
  });
});

describe('T16', () => {
  it('finds baby talk, a fake teacher voice and emoji', () => {
    for (const t of ['Ein Aufgäbchen.', 'Hallo Kids', 'Na, was haben wir denn hier?', 'Du bist ein Mathe-Held.', 'Super 🎉']) expect(toneProblems([t]).join(), t).toContain('T16');
    expect(toneProblems(['Du hast zuerst die Klammer gerechnet.'])).toEqual([]);
  });
  it('allows one exclamation mark per screen', () => {
    expect(toneProblems(['Richtig!', 'Rechne weiter.'])).toEqual([]);
    expect(toneProblems(['Richtig!', 'Gut!']).join()).toContain('2 exclamation marks');
  });
});

describe('childTextProblems', () => {
  it('holds for texts outside the generators', () => {
    expect(childTextProblems('Du kannst 3 Übungen sicher.')).toEqual([]);
    expect(childTextProblems('Das ist die Aufgabe. Sie ist neu.').join()).toContain('T9');
    expect(childTextProblems('Die Aufgabe wird gelöst.').join()).toContain('T6');
    expect(childTextProblems('Wir rechnen jetzt.').join()).toContain('T16');
  });
});

describe('Klasse 6 additions', () => {
  it('T5: falls, sofern and indem are banned; one relative clause above Stufe 1 is allowed, none on Stufe 1', () => {
    for (const word of ['falls', 'sofern', 'indem']) expect(clauseProblems([`Rechne, ${word} es geht.`], 2).join()).toContain(word);
    expect(clauseProblems(['Die Zahl, die fehlt, ist klein.'], 1)).toHaveLength(1);
    expect(clauseProblems(['Die Zahl, die fehlt, ist klein.'], 2)).toEqual([]);
    expect(clauseProblems(['Die Zahl, die fehlt, ist klein, wenn es geht.'], 3)).toHaveLength(1);
  });
  it('T8: words of up to 16 letters pass, longer ones outside the list do not', () => {
    expect(MAX_WORD_LETTERS).toBe(16);
    expect(longWords('Sechzehnbuchstab')).toEqual([]);
    expect(longWords('Siebzehnbuchstabe')).toEqual(['Siebzehnbuchstabe']);
    expect(longWords('Quadratzentimeter Überschlagsrechnung')).toEqual([]);
  });
  it('T10: digits for quantities, a space before %', () => {
    expect(numberFormatProblems(['Das sind drei cm.']).join()).toContain('number word');
    expect(numberFormatProblems(['Das kostet fünf Euro.']).join()).toContain('number word');
    expect(numberFormatProblems(['Fünf Personen fahren mit.'])).toEqual([]);
    expect(numberFormatProblems(['25%']).join()).toContain('space before %');
    expect(numberFormatProblems(['25\u00A0% von 200'])).toEqual([]);
  });
  it('T11: minus as U+2212, a negative second operand in brackets, also before a fraction', () => {
    expect(numberFormatProblems(['5 − −3']).join()).toContain('brackets');
    expect(numberFormatProblems(['5 − (−3)'])).toEqual([]);
    expect(numberFormatProblems(['{frac:1/2} + −{frac:1/4}']).join()).toContain('brackets');
    expect(numberFormatProblems(['3 -2']).join()).toContain('T11');
  });
  it('T13: the default terms, and Zahlenstrahl for positive numbers, Zahlengerade with negatives', () => {
    expect(termProblems(['Der Dezimalbruch 0,5.']).join()).toContain('Dezimalbruch');
    expect(termProblems(['Der Rauminhalt ist 8 cm³.']).join()).toContain('Rauminhalt');
    expect(termProblems(['Der Oberflächeninhalt ist groß.']).join()).toContain('Oberflächeninhalt');
    expect(termProblems(['Die Dezimalzahl 0,5 hat ein Volumen.'])).toEqual([]);
    expect(termProblems(['Am Zahlenstrahl.'], true).join()).toContain('Zahlengerade');
    expect(termProblems(['An der Zahlengerade.'], false).join()).toContain('Zahlenstrahl');
    expect(termProblems(['An der Zahlengerade.'], true)).toEqual([]);
  });
  it('T12: Grundwert, Prozentwert, Prozentsatz only inside percent-calculation skills', () => {
    expect(percentTermProblems('prozent.bedeutung', ['Der Grundwert ist 200.']).join()).toContain('T12');
    expect(percentTermProblems('prozent.grundwert-satz', ['Der Grundwert ist 200.'])).toEqual([]);
    expect(percentTermProblems('prozent.prozentwert', ['Der Prozentsatz ist 20.'])).toEqual([]);
  });
  it('T16: no Kinder or Kids, no titles, and T15: no banned context', () => {
    for (const t of ['Die Kinder rechnen.', 'Für Kids.', 'Du Mathe-Held.', 'Der Bruch-Profi.', 'Super!', 'Der Meister.']) expect(toneProblems([t]).join(), t).toContain('T16');
    for (const t of ['Eine Diät.', 'Das Bier kostet 3 €.', 'Im Casino.']) expect(toneProblems([t]).join(), t).toContain('T15');
    expect(toneProblems(['Die Klasse 6b fährt los. Fünf Personen fehlen.'])).toEqual([]);
  });
  it('T19 replaces the word limits of hints and worked steps', () => {
    expect(hintProblems('Eins. Zwei. Drei.').join()).toContain('T19');
    expect(praiseAndStepProblems({ praise: 'Du hast wirklich an alle Zehner und auch an alle Einer gedacht.', steps: ['1'] }).join()).toContain('T19');
  });
  it('T6: only the fixed price phrase may be passive', () => {
    expect(passiveProblems(['Der Preis wird um 20\u00A0% gesenkt.'])).toEqual([]);
    expect(passiveProblems(['Der Preis wird gesenkt.'])).toHaveLength(1);
  });
});
