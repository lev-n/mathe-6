/**
 * Misconception families of the topic 'dezimal'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'dezimal-stellen': { 'dezimal.stellenwert': 'andere-stelle einer-statt-stelle reihenfolge stelle-daneben ohne-komma stelle-zu-weit stelle-zu-frueh' },
  'dezimal-null-stelle': { 'dezimal.stellenwert': 'null-ignoriert' },
  'dezimal-buendeln': { 'dezimal.stellenwert': 'ueberlauf stelle-weg einfach-addiert einer-vergessen' },
  'dezimal-bruch-direkt': { 'dezimal.bruch-umwandeln': 'zehner-bruch-direkt nenner-durch-zaehler' },
  'dezimal-nenner-stellen': { 'dezimal.bruch-umwandeln': 'stelle-zu-weit stelle-zu-frueh null-ignoriert' },
  'dezimal-erweitern': { 'dezimal.bruch-umwandeln': 'nur-nenner' },
  'dezimal-laenge': { 'dezimal.vergleichen': 'laenger-groesser kuerzer-groesser' },
  'dezimal-dazwischen': { 'dezimal.vergleichen': 'rand-getroffen', 'dezimal.zahlenstrahl': 'rand-getroffen' },
  'dezimal-strahl-schritt': { 'dezimal.zahlenstrahl': 'strich-gezaehlt striche-gesamt null-eingefuegt strich-als-zehntel strich-als-tausendstel' },
  'dezimal-strahl-richtung': { 'dezimal.zahlenstrahl': 'von-rechts falsche-richtung' },
  'dezimal-runden': {
    'dezimal.bruch-umwandeln': 'nicht-gerundet runden-abschneiden',
    'dezimal.runden': 'aufgerundet runden-abschneiden nicht-gerundet grenze-daneben',
    'dezimal.geteilt': 'runden-abschneiden nicht-gerundet',
  },
  'dezimal-runden-stelle': { 'dezimal.runden': 'falsche-stelle einheit-gewechselt' },
  'dezimal-runden-sinn': { 'dezimal.runden': 'nach-regel-gerundet', 'dezimal.geteilt': 'nach-regel-gerundet' },
  'dezimal-ueberschlag': { 'dezimal.runden': 'genau-gerechnet' },
  // A written item sets its comma itself (WrittenInput), so komma-rechtsbuendig counts as working the columns: only a typed result lets the child set the comma.
  'dezimal-komma-unter-komma': { 'dezimal.plus-minus': 'ohne-komma' },
  'dezimal-stelle-fuer-stelle': { 'dezimal.plus-minus': 'komma-rechtsbuendig ohne-uebertrag kleinere-ziffer nicht-vermindert ganze-ignoriert' },
  'dezimal-rechenart': { 'dezimal.plus-minus': 'plus-statt-minus' },
  'dezimal-umkehr': { 'dezimal.plus-minus': 'umkehr-gleiche-rechnung', 'dezimal.geteilt': 'umkehr-gleiche-rechnung' },
  'dezimal-geld-schritte': { 'dezimal.plus-minus': 'rueckgeld-vergessen rest-vergessen alles-ausgegeben' },
  'dezimal-komma-rueckt': { 'dezimal.mal': 'falsche-richtung null-angehaengt stellen-zu-viel stellen-zu-wenig', 'dezimal.geteilt': 'falsche-richtung stellen-zu-viel stellen-zu-wenig' },
  'dezimal-komma-produkt': { 'dezimal.mal': 'ohne-komma komma-zu-weit nur-erste-ziffer mal-groesser komma-wie-plus' },
  'dezimal-einruecken': { 'dezimal.mal': 'einruecken-vergessen' },
  'dezimal-komma-teilen': { 'dezimal.geteilt': 'ohne-komma komma-nicht-verschoben' },
  'dezimal-null-ergebnis': { 'dezimal.geteilt': 'null-uebersprungen' },
  'dezimal-rest-weiter': { 'dezimal.geteilt': 'rest-als-komma' },
  'dezimal-einheit': { 'dezimal.groessen': 'einheit-falsch null-ignoriert einheit-100-1000 einheit-nicht-umgerechnet' },
  'dezimal-einheit-gleich': { 'dezimal.groessen': 'einheit-ignoriert' },
};
export default families;
