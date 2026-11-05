/**
 * Phrases of the misconception families of the topic 'dezimal':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'dezimal-stellen': { phrase: { object: 'die Stellen nach dem Komma', participle: 'richtig zugeordnet' } },
  'dezimal-null-stelle': { phrase: { object: 'die 0 als leere Stelle', participle: 'mitgeschrieben' } },
  'dezimal-buendeln': { phrase: { object: 'Zehntel und Hundertstel', participle: 'richtig gebündelt' } },
  'dezimal-bruch-direkt': { phrase: { object: 'Brüche als Division', participle: 'richtig gelesen' } },
  'dezimal-nenner-stellen': { phrase: { object: 'die Nullen im Nenner', participle: 'richtig als Stellen genutzt' } },
  'dezimal-erweitern': { phrase: { object: 'Zähler und Nenner beim Erweitern', participle: 'beide geändert' } },
  'dezimal-laenge': { phrase: { object: 'verschieden lange Dezimalzahlen', participle: 'Stelle für Stelle verglichen' } },
  'dezimal-dazwischen': { phrase: { object: 'eine Zahl zwischen zwei anderen', participle: 'richtig gefunden' } },
  'dezimal-strahl-schritt': { phrase: { object: 'die kleinen Schritte am Zahlenstrahl', participle: 'richtig gezählt' } },
  'dezimal-strahl-richtung': { phrase: { object: 'die Richtung am Zahlenstrahl', participle: 'richtig gewählt' } },
  'dezimal-runden': { phrase: { object: 'beim Runden die nächste Stelle', participle: 'richtig beachtet' } },
  'dezimal-runden-stelle': { phrase: { object: 'die passende Stelle zum Runden', participle: 'gewählt' } },
  'dezimal-runden-sinn': { phrase: { object: 'Zahlen in Geschichten', participle: 'sinnvoll gerundet' } },
  'dezimal-ueberschlag': { phrase: { object: 'den Überschlag', participle: 'mit gerundeten Zahlen gemacht' } },
  'dezimal-komma-unter-komma': { phrase: { object: 'das Komma beim Plus und Minus', participle: 'richtig gesetzt' } },
  'dezimal-stelle-fuer-stelle': { phrase: { object: 'schriftliche Aufgaben', participle: 'Stelle für Stelle gerechnet' } },
  'dezimal-rechenart': { phrase: { object: 'die passende Rechenart', participle: 'gewählt' } },
  'dezimal-umkehr': { phrase: { object: 'die Umkehraufgabe', participle: 'richtig genutzt' } },
  'dezimal-geld-schritte': { phrase: { object: 'alle Schritte einer Geldaufgabe', participle: 'gerechnet' } },
  'dezimal-komma-rueckt': { phrase: { object: 'das Komma in die richtige Richtung', participle: 'verschoben' } },
  'dezimal-komma-produkt': { phrase: { object: 'das Komma im Ergebnis', participle: 'richtig gesetzt' } },
  // The boxes of the partial products stand in fixed columns and are not graded, so the phrase names the result of the columns, not an indent.
  'dezimal-einruecken': { phrase: { object: 'die Teilprodukte beim schriftlichen Malnehmen', participle: 'richtig addiert' } },
  'dezimal-komma-teilen': { phrase: { object: 'das Komma beim Teilen', participle: 'richtig verschoben' } },
  'dezimal-null-ergebnis': { phrase: { object: 'die 0 im Ergebnis', participle: 'mitgeschrieben' } },
  'dezimal-rest-weiter': { phrase: { object: 'hinter dem Komma', participle: 'weitergeteilt' } },
  'dezimal-einheit': { phrase: { object: 'Größen mit Komma', participle: 'richtig umgewandelt' } },
  'dezimal-einheit-gleich': { phrase: { object: 'verschiedene Einheiten', participle: 'richtig zusammengebracht' } },
};
export default phrases;
