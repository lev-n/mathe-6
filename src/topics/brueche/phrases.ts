/**
 * Phrases of the misconception families of the topic 'brueche':
 * "Du hast <object> jetzt fünfmal <participle>." Imports types only (the texts are part of the initial chunk).
 */
import type { FamilyPhrases } from '../errorPhrases';

const phrases: Record<string, FamilyPhrases> = {
  'brueche-nenner-zaehlt-alle': { phrase: { object: 'im Nenner alle Teile', participle: 'gezählt' } },
  'brueche-gesuchter-teil': { phrase: { object: 'genau den gefragten Teil', participle: 'bestimmt' } },
  'brueche-zaehler-nenner-platz': { phrase: { object: 'Zähler und Nenner', participle: 'an den passenden Platz geschrieben' } },
  'brueche-das-ganze': { phrase: { object: 'vom Teil aus das Ganze', participle: 'bestimmt' } },
  'brueche-volle-ganze': { phrase: { object: 'auch die vollen Ganzen', participle: 'mitgezählt' } },
  'brueche-ziel-in-teilen': { phrase: { object: 'das Ziel in Kästchen', participle: 'umgerechnet' } },
  'brueche-verteilung': { phrase: { object: 'aus dem Bruch die Verteilung', participle: 'abgelesen' } },
  'brueche-von-nenner-zaehler': { phrase: { object: 'Nenner und Zähler beim Bruchteil', participle: 'beide genutzt' } },
  'brueche-strahl': { phrase: { object: 'die Abschnitte am Zahlenstrahl', participle: 'richtig gezählt' } },
  'brueche-erweitern': { phrase: { object: 'Zähler und Nenner mit derselben Zahl', participle: 'malgenommen' } },
  'brueche-kuerzen': { phrase: { object: 'Zähler und Nenner durch dieselbe Zahl', participle: 'geteilt' } },
  'brueche-faktor': { phrase: { object: 'den passenden Faktor', participle: 'gefunden' } },
  'brueche-teilgroesse': { phrase: { object: 'die Größe der Teile beim Vergleichen', participle: 'beachtet' } },
  'brueche-werte-vergleichen': { phrase: { object: 'die Werte statt nur der Zähler', participle: 'verglichen' } },
  'brueche-ganze-in-teile': { phrase: { object: 'die Ganzen in Teile', participle: 'umgerechnet' } },
  'brueche-ganze-herausziehen': { phrase: { object: 'die Ganzen aus dem Bruch', participle: 'herausgezogen' } },
  'brueche-unecht-einordnen': { phrase: { object: 'unechte Brüche', participle: 'an die passende Stelle geordnet' } },
  'brueche-gemischt-strahl': { phrase: { object: 'Ganze und Bruch am Zahlenstrahl', participle: 'richtig gesetzt' } },
  'brueche-gleiche-nenner': { phrase: { object: 'vor dem Rechnen die Nenner', participle: 'gleich gemacht' } },
  'brueche-rechenart': { phrase: { object: 'die passende Rechenart', participle: 'gewählt' } },
  'brueche-umkehrung': { phrase: { object: 'die Umkehraufgabe', participle: 'genutzt' } },
  'brueche-mal-zahl': { phrase: { object: 'beim Malnehmen mit einer Zahl den Zähler', participle: 'malgenommen' } },
  'brueche-mal-bruch': { phrase: { object: 'Zähler mal Zähler und Nenner mal Nenner', participle: 'gerechnet' } },
  'brueche-anteil-vom-anteil': { phrase: { object: 'den Anteil vom passenden Ganzen', participle: 'genommen' } },
  'brueche-geteilt-zahl': { phrase: { object: 'beim Teilen durch eine Zahl den Bruch', participle: 'verkleinert' } },
  'brueche-kehrwert': { phrase: { object: 'den Kehrwert des zweiten Bruchs', participle: 'genutzt' } },
  'brueche-wie-oft': { phrase: { object: 'die Frage „Wie oft passt?“', participle: 'richtig beantwortet' } },
};
export default phrases;
