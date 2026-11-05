/**
 * Phrases of the misconception families of the topic 'terme':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'terme-punkt-vor-strich': { phrase: { object: 'Punkt vor Strich', participle: 'beachtet' } },
  'terme-klammer-zuerst': { phrase: { object: 'die Klammer zuerst', participle: 'ausgerechnet' } },
  'terme-alle-zahlen': { phrase: { object: 'alle Zahlen eines Terms', participle: 'mitgerechnet' } },
  'terme-zerlegen': { phrase: { object: 'beide Teile einer Zerlegung', participle: 'mitgerechnet' } },
  'terme-umkehren': { phrase: { object: 'die passende Umkehrung', participle: 'gewählt' } },
  'terme-rueckwaerts': { phrase: { object: 'alle Schritte rückwärts', participle: 'gerechnet' } },
  'terme-einsetzen': { phrase: { object: 'die Zahl für die Variable', participle: 'richtig eingesetzt' } },
  'terme-umfang': { phrase: { object: 'den Umfang als ganze Runde', participle: 'gerechnet' } },
};
export default phrases;
