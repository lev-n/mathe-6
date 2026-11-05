/**
 * Phrases of the misconception families of the topic 'daten':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'daten-achse-schritt': { phrase: { object: 'die Einteilung der Achse', participle: 'beachtet' } },
  'daten-wert-finden': { phrase: { object: 'den gefragten Wert im Diagramm', participle: 'gefunden' } },
  'daten-diagramm-rechnung': { phrase: { object: 'die passende Rechnung zum Diagramm', participle: 'gewählt' } },
  'daten-strichliste': { phrase: { object: 'die Bündel einer Strichliste', participle: 'richtig gezählt' } },
  'daten-gesamtzahl': { phrase: { object: 'den Anteil an der Gesamtzahl', participle: 'gebildet' } },
  'daten-anteil-anzahl': { phrase: { object: 'Anteil und Anzahl', participle: 'richtig getrennt' } },
  'daten-schreibweise': { phrase: { object: 'Dezimalzahl und Prozent', participle: 'richtig umgerechnet' } },
  'daten-rest-bis-eins': { phrase: { object: 'den Rest bis 1', participle: 'berechnet' } },
  'daten-absolut-relativ': { phrase: { object: 'Gruppen über ihren Anteil', participle: 'verglichen' } },
  'daten-kreis-gesamtzahl': { phrase: { object: 'den Anteil auf die Gesamtzahl', participle: 'übertragen' } },
  'daten-kreis-rest': { phrase: { object: 'den Rest bis 100 %', participle: 'berechnet' } },
  'daten-kreis-ganzes': { phrase: { object: 'vom Teil auf das Ganze', participle: 'geschlossen' } },
  'daten-kreis-winkel': { phrase: { object: 'Anteile und Winkel im Kreis', participle: 'richtig umgerechnet' } },
  'daten-mittel-teilen': { phrase: { object: 'durch die Anzahl aller Werte', participle: 'geteilt' } },
  'daten-mittel-null': { phrase: { object: 'die 0 als Wert', participle: 'mitgezählt' } },
  'daten-mittel-einzelwert': { phrase: { object: 'den Mittelwert statt eines einzelnen Werts', participle: 'bestimmt' } },
  'daten-mittel-zurueck': { phrase: { object: 'vom Mittelwert zurück zur Summe', participle: 'gerechnet' } },
  'daten-mittel-vergleich': { phrase: { object: 'zwei Mittelwerte', participle: 'verglichen' } },
  'daten-rand-werte': { phrase: { object: 'den kleinsten oder größten Wert', participle: 'gefunden' } },
  'daten-spannweite': { phrase: { object: 'die Spannweite', participle: 'richtig berechnet' } },
  'daten-median': { phrase: { object: 'den Median in der geordneten Liste', participle: 'gefunden' } },
};
export default phrases;
