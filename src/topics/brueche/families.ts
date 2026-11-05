/**
 * Misconception families of the topic 'brueche'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'brueche-nenner-zaehlt-alle': { 'brueche.anteil': 'teil-gegen-rest alle-teile-im-nenner' },
  'brueche-gesuchter-teil': {
    'brueche.anteil': 'gegenteil',
    'brueche.von-groessen': 'rest-statt-teil teil-statt-rest ganzes-statt-rest nur-nenner-rest',
    'brueche.plus-minus': 'gegessen-statt-rest',
    'brueche.mal': 'dienstag-statt-rest',
  },
  'brueche-zaehler-nenner-platz': {
    'brueche.anteil': 'vertauscht division-vertauscht',
    'brueche.zahlenstrahl': 'vertauscht',
  },
  'brueche-das-ganze': {
    'brueche.anteil': 'teil-als-ganzes nur-ein-teil nur-fehlender-teil anteil-ganzes addiert',
    'brueche.von-groessen': 'anteil-ganzes nur-ein-teil mal-nenner-ohne-teilen differenz-addiert vom-teil-gerechnet',
  },
  'brueche-volle-ganze': {
    'brueche.anteil': 'nur-letztes-ganzes',
    'brueche.zahlenstrahl': 'nur-letztes-ganzes',
  },
  'brueche-ziel-in-teilen': { 'brueche.anteil': 'gefaerbte-vergessen zaehler-als-anzahl' },
  'brueche-verteilung': { 'brueche.anteil': 'mal-personen nur-durch-nenner' },
  'brueche-von-nenner-zaehler': { 'brueche.von-groessen': 'nenner-mal nenner-abgezogen nur-zaehler zaehler-nenner-getauscht nur-nenner' },
  'brueche-strahl': { 'brueche.zahlenstrahl': 'striche-gezaehlt null-mitgezaehlt von-rechts-gezaehlt strecke-als-ganzes' },
  'brueche-erweitern': {
    'brueche.zahlenstrahl': 'nicht-erweitert',
    'brueche.erweitern-kuerzen': 'nur-zaehler-erweitert nur-nenner-erweitert erweitern-addiert',
  },
  'brueche-kuerzen': { 'brueche.erweitern-kuerzen': 'kuerzen-subtrahiert nur-zaehler-gekuerzt nur-nenner-gekuerzt' },
  'brueche-faktor': {
    'brueche.erweitern-kuerzen': 'unterschied-statt-faktor nicht-die-groesste',
    'brueche.mal': 'unterschied-statt-faktor',
  },
  'brueche-teilgroesse': { 'brueche.vergleichen': 'groesserer-nenner' },
  'brueche-werte-vergleichen': {
    'brueche.vergleichen': 'nur-zaehler-verglichen',
    'brueche.gemischt': 'nur-zaehler-verglichen',
  },
  'brueche-ganze-in-teile': { 'brueche.gemischt': 'gemischt-umgewandelt bruch-vergessen mal-statt-plus form-bleibt anderer-nenner' },
  'brueche-ganze-herausziehen': { 'brueche.gemischt': 'ganze-fehlt noch-ein-ganzes ganze-rest-getauscht nur-rest noch-kuerzen' },
  'brueche-unecht-einordnen': { 'brueche.gemischt': 'unecht-klein' },
  'brueche-gemischt-strahl': { 'brueche.gemischt': 'nur-bruch-gesetzt nur-ganze-gesetzt ein-ganzes-zu-viel nicht-gekuerzt' },
  'brueche-gleiche-nenner': { 'brueche.plus-minus': 'zaehler-nenner-addiert plausibel-kleiner nicht-erweitert nenner-abgezogen nur-zaehler-gerechnet' },
  'brueche-rechenart': {
    'brueche.plus-minus': 'nenner-mal plus-statt-minus',
    'brueche.mal': 'addiert',
  },
  'brueche-umkehrung': {
    'brueche.plus-minus': 'umkehrung-vergessen',
    'brueche.geteilt': 'umkehrung-vergessen',
  },
  'brueche-mal-zahl': { 'brueche.mal': 'nenner-auch-mal nur-nenner-mal nur-zaehler-mal nur-durch-nenner' },
  'brueche-mal-bruch': { 'brueche.mal': 'nenner-bleibt hauptnenner-mal kreuz-gerechnet' },
  'brueche-anteil-vom-anteil': { 'brueche.mal': 'anteile-addiert vom-ganzen-gerechnet' },
  'brueche-geteilt-zahl': { 'brueche.geteilt': 'zaehler-mal nenner-geteilt' },
  'brueche-kehrwert': { 'brueche.geteilt': 'kehrwert-zweite-zahl kein-kehrwert nur-zaehler-geteilt kehrwert-vergessen' },
  'brueche-wie-oft': { 'brueche.geteilt': 'teilen-macht-kleiner nur-durch-zaehler nur-durch-nenner nur-ein-ganzes aufgerundet' },
};
export default families;
