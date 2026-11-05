/**
 * Misconception families of the topic 'prozent'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'prozent-von-hundert': {
    'prozent.bedeutung': 'prozent-als-zahl teile-gezaehlt reihen-gezaehlt anzahl-statt-prozent',
    'prozent.prozentwert': 'prozent-als-zahl durch-prozentzahl',
    'prozent.grundwert-satz': 'prozent-als-zahl satz-wert-verwechselt',
  },
  'prozent-teil-verwechselt': {
    'prozent.bedeutung': 'rest-gezaehlt gefaerbt-gezaehlt nur-eine-farbe summe-statt-rest kleinerer-anteil',
    'prozent.umwandeln': 'teil-statt-rest',
    'prozent.prozentwert': 'rest-statt-anteil teil-statt-rest kleinerer-betrag',
    'prozent.grundwert-satz': 'rest-statt-anteil kleinerer-anteil zinsen-statt-guthaben guthaben-mit-zins',
    'prozent.dreisatz': 'teurere-packung',
    'prozent.proportional': 'nur-abgebrannt',
    'prozent.massstab': 'zwei-seiten summe-statt-differenz nur-ein-weg',
  },
  'prozent-additiv': {
    'prozent.bedeutung': 'additiv-auf-hundert',
    'prozent.grundwert-satz': 'additiv-auf-hundert',
    'prozent.dreisatz': 'additiv-statt-multiplikativ',
    'prozent.proportional': 'additiv-statt-multiplikativ',
  },
  'prozent-teil-ganzes': {
    'prozent.bedeutung': 'teil-als-ganzes',
    'prozent.grundwert-satz': 'teil-als-ganzes grundwert-vertauscht bruch-verkehrt',
  },
  'prozent-durch-hundert': {
    'prozent.prozentwert': 'hundert-vergessen nur-ein-prozent zehn-statt-fuenf',
    'prozent.grundwert-satz': 'hundert-vergessen',
  },
  'prozent-bruch-hundertstel': {
    'prozent.umwandeln': 'bruch-prozent-ziffern kehrwert-prozent nur-ein-teil',
  },
  'prozent-komma-stellen': {
    'prozent.umwandeln': 'komma-verschoben bruch-komma-ziffern',
  },
  'prozent-formen': {
    'prozent.umwandeln': 'formen-nicht-umgewandelt mitte-gerundet abstand-statt-mitte',
  },
  'prozent-neuer-preis': {
    'prozent.prozentwert': 'prozent-subtrahiert prozent-als-euro falsche-richtung neuer-preis-statt-rabatt teurerer-laden',
  },
  'prozent-dreisatz-schritte': {
    'prozent.dreisatz': 'einheit-statt-gesamt nicht-geteilt zweiter-schritt-fehlt abgerundet packung-als-bruch',
  },
  'prozent-immer-proportional': {
    'prozent.dreisatz': 'immer-proportional',
    'prozent.proportional': 'immer-proportional',
  },
  'prozent-faktor-tabelle': {
    'prozent.proportional': 'links-abgeschrieben faktor-verkehrt falscher-wert-bleibt',
  },
  'prozent-massstab-richtung': {
    'prozent.massstab': 'massstab-richtung plan-statt-massstab differenz-statt-verhaeltnis',
  },
  'prozent-massstab-einheit': {
    'prozent.massstab': 'einheit-nicht-umgerechnet meter-statt-zentimeter',
  },
};
export default families;
