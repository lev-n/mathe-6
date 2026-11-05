/**
 * Phrases of the misconception families of the topic 'flaechen':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'flaechen-umfang-flaeche': { phrase: { object: 'Umfang und Fläche', participle: 'richtig getrennt' } },
  'flaechen-alle-seiten': { phrase: { object: 'alle Seiten einer Figur', participle: 'mitgerechnet' } },
  'flaechen-rueckwaerts': { phrase: { object: 'eine fehlende Größe', participle: 'richtig rückwärts gerechnet' } },
  'flaechen-komma': { phrase: { object: 'das Komma', participle: 'richtig gesetzt' } },
  'flaechen-zerlegen': { phrase: { object: 'zusammengesetzte Formen', participle: 'richtig zerlegt' } },
  'flaechen-gleiche-flaeche': { phrase: { object: 'gleiche Flächen mit anderem Umfang', participle: 'richtig gerechnet' } },
  'flaechen-faktor-hundert': { phrase: { object: 'den Faktor 100 bei Flächeneinheiten', participle: 'richtig genutzt' } },
  'flaechen-richtung': { phrase: { object: 'die Richtung beim Umrechnen', participle: 'beachtet' } },
  'flaechen-zwei-schritte': { phrase: { object: 'beide Schritte beim Umrechnen', participle: 'geschafft' } },
  'flaechen-gemischte-einheiten': { phrase: { object: 'zwei verschiedene Einheiten', participle: 'zuerst umgerechnet' } },
  'flaechen-einheit-ordnen': { phrase: { object: 'die Einheiten beim Ordnen', participle: 'beachtet' } },
  'flaechen-schraege-seite': { phrase: { object: 'Grundseite und Höhe', participle: 'richtig gewählt' } },
  'flaechen-formel': { phrase: { object: 'die Rechnung für die Fläche', participle: 'richtig aufgestellt' } },
  'flaechen-andere-hoehe': { phrase: { object: 'die passende Höhe zu einer Seite', participle: 'gefunden' } },
  'flaechen-dreieck-halb': { phrase: { object: 'die Hälfte beim Dreieck', participle: 'bedacht' } },
  'flaechen-kaestchen-wert': { phrase: { object: 'den Wert eines Kästchens', participle: 'beachtet' } },
  'flaechen-netz-kante': { phrase: { object: 'gleich lange Kanten im Netz', participle: 'gefunden' } },
  'flaechen-gegenueber': { phrase: { object: 'die Zahl auf der Fläche gegenüber', participle: 'richtig bestimmt' } },
  'flaechen-volumen-oberflaeche': { phrase: { object: 'Oberfläche und Volumen', participle: 'richtig getrennt' } },
  // not 'alle Flächen': this family also holds a box without a lid, k faces of a Würfel and one face from the Oberfläche
  'flaechen-alle-flaechen': { phrase: { object: 'die Zahl der Flächen eines Körpers', participle: 'richtig bedacht' } },
  'flaechen-innen-aussen': { phrase: { object: 'Flächen innen und außen', participle: 'richtig unterschieden' } },
  'flaechen-lagen': { phrase: { object: 'alle Lagen eines Quaders', participle: 'mitgerechnet' } },
  'flaechen-doppelte-kante': { phrase: { object: 'eine längere Kante beim Volumen', participle: 'richtig bedacht' } },
  'flaechen-volumen-faktor': { phrase: { object: 'den Faktor 1000 bei Volumeneinheiten', participle: 'richtig genutzt' } },
  'flaechen-gleiche-einheit': { phrase: { object: 'gleich große Einheiten', participle: 'erkannt' } },
  'flaechen-ablesen': { phrase: { object: 'die Striche auf der Skala', participle: 'richtig gelesen' } },
};
export default phrases;
