/**
 * Phrases of the misconception families of the topic 'geometrie':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'geometrie-skala': { phrase: { object: 'die passende Skala', participle: 'gewählt' } },
  'geometrie-strich': { phrase: { object: 'die Striche am Geodreieck', participle: 'genau gezählt' } },
  'geometrie-rest': { phrase: { object: 'den Rest', participle: 'nach dem Ablesen ausgerechnet' } },
  'geometrie-nebenwinkel': { phrase: { object: 'den Nebenwinkel', participle: 'von 180° aus berechnet' } },
  'geometrie-scheitelwinkel': { phrase: { object: 'den Scheitelwinkel', participle: 'an der Lage erkannt' } },
  'geometrie-winkelsumme': { phrase: { object: 'die Winkelsumme im Dreieck', participle: 'richtig genutzt' } },
  'geometrie-stufenwinkel': { phrase: { object: 'den Stufenwinkel', participle: 'an parallelen Geraden erkannt' } },
  'geometrie-basiswinkel': { phrase: { object: 'die Basiswinkel', participle: 'richtig berechnet' } },
  'geometrie-seiten': { phrase: { object: 'die fehlenden Seiten', participle: 'am richtigen Platz eingetragen' } },
  'geometrie-radius-durchmesser': { phrase: { object: 'Radius und Durchmesser', participle: 'richtig unterschieden' } },
  'geometrie-kreise': { phrase: { object: 'den Abstand zweier Kreise', participle: 'aus den Radien bestimmt' } },
  'geometrie-koord-getauscht': { phrase: { object: 'x und y', participle: 'in der richtigen Reihenfolge genutzt' } },
  'geometrie-koord-ab-eins': { phrase: { object: 'die Schritte', participle: 'ab dem Ursprung gezählt' } },
  'geometrie-vorzeichen': { phrase: { object: 'die Vorzeichen der Koordinaten', participle: 'beachtet' } },
  'geometrie-ecke': { phrase: { object: 'die fehlende Ecke', participle: 'richtig bestimmt' } },
  'geometrie-weg': { phrase: { object: 'den Weg von Punkt zu Punkt', participle: 'richtig gerechnet' } },
  'geometrie-spiegel-abstand': { phrase: { object: 'den Abstand', participle: 'auf beiden Seiten gleich gehalten' } },
  'geometrie-achse-finden': { phrase: { object: 'die Achse', participle: 'in der Mitte gefunden' } },
  'geometrie-schraege-achse': { phrase: { object: 'an der schrägen Achse', participle: 'richtig gespiegelt' } },
  'geometrie-symmetrieachsen': { phrase: { object: 'die Symmetrieachsen', participle: 'richtig gezählt' } },
  'geometrie-verschieben': { phrase: { object: 'den Punkt', participle: 'richtig verschoben' } },
  'geometrie-punktspiegelung': { phrase: { object: 'am Punkt', participle: 'richtig gespiegelt' } },
};
export default phrases;
