/**
 * Phrases of the misconception families of the topic 'prozent':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'prozent-von-hundert': { phrase: { object: 'Prozent als Anteil von 100', participle: 'richtig gelesen' } },
  'prozent-teil-verwechselt': { phrase: { object: 'den gefragten Wert', participle: 'richtig erkannt' } },
  'prozent-additiv': { phrase: { object: 'beide Größen', participle: 'mit demselben Faktor verändert' } },
  'prozent-teil-ganzes': { phrase: { object: 'das Ganze', participle: 'vom Teil aus gefunden' } },
  'prozent-durch-hundert': { phrase: { object: 'die Rechnung mit 100', participle: 'zu Ende geführt' } },
  'prozent-bruch-hundertstel': { phrase: { object: 'Brüche', participle: 'richtig in Prozent umgerechnet' } },
  'prozent-komma-stellen': { phrase: { object: 'das Komma beim Umwandeln', participle: 'an die richtige Stelle gesetzt' } },
  'prozent-formen': { phrase: { object: 'verschiedene Formen', participle: 'richtig in Prozent verglichen' } },
  'prozent-neuer-preis': { phrase: { object: 'geänderte Preise', participle: 'richtig berechnet' } },
  'prozent-dreisatz-schritte': { phrase: { object: 'beide Schritte über die Einheit', participle: 'zu Ende gerechnet' } },
  'prozent-immer-proportional': { phrase: { object: 'das Verhältnis', participle: 'zuerst geprüft' } },
  'prozent-faktor-tabelle': { phrase: { object: 'den Faktor einer Tabelle', participle: 'richtig benutzt' } },
  'prozent-massstab-richtung': { phrase: { object: 'die Richtung beim Maßstab', participle: 'richtig gewählt' } },
  'prozent-massstab-einheit': { phrase: { object: 'die Längen beim Maßstab', participle: 'in die richtige Einheit gebracht' } },
};
export default phrases;
