/**
 * Misconception families of the topic 'daten'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'daten-achse-schritt': { 'daten.diagramm': 'achse-schritt' },
  'daten-wert-finden': { 'daten.diagramm': 'nachbar-wert groesster-kleinster nur-ein-wert ein-wert-vergessen' },
  'daten-diagramm-rechnung': { 'daten.diagramm': 'summe-statt-differenz differenz-statt-summe ziel-ohne-summe' },
  'daten-strichliste': { 'daten.haeufigkeit': 'fuenfer-buendel nur-buendel' },
  'daten-gesamtzahl': {
    'daten.haeufigkeit': 'anteil-zum-rest bruch-umgedreht nenner-andere-zeile',
    'daten.chancen': 'anteil-zum-rest bruch-umgedreht nenner-sechs erwartung-sechstel erwartung-ereignis gesamt-nicht-neu nur-alte-gewinner',
  },
  'daten-anteil-anzahl': { 'daten.haeufigkeit': 'nur-durch-nenner rest-statt-anteil anzahl-statt-anteil prozent-als-anzahl' },
  'daten-schreibweise': { 'daten.haeufigkeit': 'prozent-statt-dezimal dezimal-als-prozent' },
  'daten-rest-bis-eins': { 'daten.haeufigkeit': 'summe-nicht-eins' },
  'daten-absolut-relativ': { 'daten.haeufigkeit': 'absolut-relativ kleinerer-anteil gleiche-anzahl gleicher-abstand' },
  'daten-kreis-gesamtzahl': { 'daten.kreisdiagramm': 'kreis-gesamtzahl rest-statt-teil' },
  'daten-kreis-rest': { 'daten.kreisdiagramm': 'summe-statt-rest' },
  'daten-kreis-ganzes': { 'daten.kreisdiagramm': 'teil-von-teil prozent-plus-anzahl' },
  'daten-kreis-winkel': { 'daten.kreisdiagramm': 'kreis-sektor-winkel rest-zum-ganzen' },
  'daten-mittel-teilen': { 'daten.mittelwert': 'mittel-anzahl' },
  'daten-mittel-null': { 'daten.mittelwert': 'mittel-ohne-null' },
  'daten-mittel-einzelwert': { 'daten.mittelwert': 'mittel-groesster-haeufigster' },
  'daten-mittel-zurueck': { 'daten.mittelwert': 'mittel-statt-summe plus-statt-mal fehlwert-mittel fehlwert-gesamt fehlwert-anzahl' },
  'daten-mittel-vergleich': { 'daten.mittelwert': 'ausreisser-neu ausreisser-alt' },
  'daten-rand-werte': { 'daten.kennwerte': 'min-max-verwechselt erster-wert alter-rand neuer-wert' },
  'daten-spannweite': { 'daten.kennwerte': 'spannweite-erster-letzter spannweite-maximum spannweite-summe spannweite-richtung' },
  'daten-median': { 'daten.kennwerte': 'median-ungeordnet median-mittelwert median-stelle' },
};
export default families;
