/**
 * Phrases of the misconception families of the topic 'negativ':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'negativ-vorzeichen': { phrase: { object: 'das Vorzeichen', participle: 'richtig gesetzt' } },
  'negativ-strichwert': { phrase: { object: 'den Wert eines Strichs', participle: 'richtig genutzt' } },
  'negativ-ablesen': { phrase: { object: 'die Stellen auf der Zahlengeraden', participle: 'richtig gefunden' } },
  'negativ-richtung': { phrase: { object: 'die Richtung auf der Zahlengeraden', participle: 'richtig gewählt' } },
  'negativ-lage': { phrase: { object: 'negative Zahlen', participle: 'nach ihrer Lage geordnet' } },
  'negativ-erste-zahl': { phrase: { object: 'das Vorzeichen der ersten Zahl', participle: 'mitgerechnet' } },
  'negativ-ueber-null': { phrase: { object: 'den Weg über die 0', participle: 'ganz gerechnet' } },
  'negativ-weg': { phrase: { object: 'den Weg von Stand zu Stand', participle: 'richtig bestimmt' } },
  'negativ-stelle': { phrase: { object: 'die gefragte Stelle', participle: 'richtig gefunden' } },
  'negativ-alle-schritte': { phrase: { object: 'alle Schritte bis zum Ergebnis', participle: 'gerechnet' } },
  'negativ-umkehr': { phrase: { object: 'die Umkehrung', participle: 'richtig genutzt' } },
  'negativ-zweite-zahl': { phrase: { object: 'Plus und Minus mit einer negativen Zahl', participle: 'richtig gerechnet' } },
  'negativ-bruch': { phrase: { object: 'Brüche mit Vorzeichen', participle: 'richtig gerechnet' } },
  'negativ-produkt': { phrase: { object: 'das Vorzeichen beim Mal und Geteilt', participle: 'richtig bestimmt' } },
  'negativ-rechenart': { phrase: { object: 'das Rechenzeichen', participle: 'genau gelesen' } },
  'negativ-komma': { phrase: { object: 'das Komma mit Vorzeichen', participle: 'richtig gesetzt' } },
};
export default phrases;
