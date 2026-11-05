/**
 * Misconception families of the topic 'flaechen'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'flaechen-umfang-flaeche': {
    'flaechen.rechteck': 'umfang-flaeche',
    'flaechen.parallelogramm': 'umfang-flaeche',
    'flaechen.vieleck': 'umfang-flaeche',
  },
  'flaechen-alle-seiten': { 'flaechen.rechteck': 'halber-umfang nur-beschriftete' },
  'flaechen-rueckwaerts': {
    'flaechen.rechteck': 'umfang-nicht-halbiert seite-nicht-halbiert seite-durch-vier mal-statt-geteilt minus-statt-geteilt nur-seite',
    'flaechen.parallelogramm': 'minus-statt-geteilt dreieck-verdoppelt',
    'flaechen.dreieck': 'minus-statt-geteilt ohne-verdoppeln halb-statt-doppelt rechteck-gleich',
    'flaechen.volumen': 'minus-statt-geteilt nur-eine-kante kanten-minus',
  },
  'flaechen-komma': {
    'flaechen.rechteck': 'komma-weg',
    'flaechen.einheiten': 'komma-weg',
  },
  'flaechen-zerlegen': {
    'flaechen.rechteck': 'huelle zerlegen-doppelt',
    'flaechen.dreieck': 'huelle nur-rechteck ecke-addiert',
    'flaechen.vieleck': 'huelle nur-rechteck nur-ein-dreieck dach-gesamthoehe',
    'flaechen.volumen': 'huelle ausschnitt-addiert nur-ausschnitt nur-ein-quader',
  },
  'flaechen-gleiche-flaeche': { 'flaechen.rechteck': 'gleicher-umfang nur-laenge' },
  'flaechen-faktor-hundert': { 'flaechen.einheiten': 'flaecheneinheit-zehn laengen-faktor' },
  'flaechen-richtung': {
    'flaechen.einheiten': 'richtung',
    'flaechen.volumeneinheiten': 'richtung',
  },
  'flaechen-zwei-schritte': { 'flaechen.einheiten': 'ein-schritt' },
  'flaechen-gemischte-einheiten': {
    'flaechen.einheiten': 'ohne-umrechnen',
    'flaechen.volumeneinheiten': 'ohne-umrechnen ziffern-ohne-null',
  },
  'flaechen-einheit-ordnen': {
    'flaechen.einheiten': 'nach-zahl',
    'flaechen.volumeneinheiten': 'nach-zahl',
  },
  'flaechen-schraege-seite': {
    'flaechen.parallelogramm': 'schraege-seite hoehe-mal-seite',
    'flaechen.dreieck': 'schraege-seite schraege-ohne-halb fuss-dazu',
  },
  'flaechen-formel': {
    'flaechen.rechteck': 'seiten-plus',
    'flaechen.parallelogramm': 'seiten-plus halbiert dreieck-dazu dreieck-flaeche-dazu dreieck-flaeche-weg',
    'flaechen.dreieck': 'seiten-plus',
    'flaechen.vieleck': 'seiten-plus',
  },
  'flaechen-andere-hoehe': { 'flaechen.parallelogramm': 'gleiche-hoehe nur-flaeche paar-gemischt' },
  'flaechen-dreieck-halb': {
    'flaechen.dreieck': 'dreieck-ohne-halb',
    'flaechen.vieleck': 'dreieck-ohne-halb',
  },
  'flaechen-kaestchen-wert': { 'flaechen.vieleck': 'kaestchen-wert kaestchen-seite' },
  'flaechen-netz-kante': { 'flaechen.netz': 'andere-kante nur-teil-des-netzes' },
  'flaechen-gegenueber': { 'flaechen.netz': 'partner-zahl andere-flaeche' },
  'flaechen-volumen-oberflaeche': {
    'flaechen.oberflaeche': 'volumen-oberflaeche',
    'flaechen.volumen': 'volumen-oberflaeche',
  },
  'flaechen-alle-flaechen': { 'flaechen.oberflaeche': 'eine-flaeche oberflaeche-drei-flaechen vier-flaechen kanten-summe mit-deckel ohne-boden nur-ein-paar paar-statt-flaeche nur-ein-wuerfel alle-sechs' },
  'flaechen-innen-aussen': { 'flaechen.oberflaeche': 'beruehrflaeche eine-klebeflaeche ecke-abgezogen ecke-sechs ecke-addiert' },
  'flaechen-lagen': { 'flaechen.volumen': 'eine-lage kanten-plus sichtbare-flaechen nur-volle-kiste' },
  'flaechen-doppelte-kante': { 'flaechen.volumen': 'alle-kanten plus-zwei nur-erster' },
  'flaechen-volumen-faktor': { 'flaechen.volumeneinheiten': 'volumeneinheit-zehn volumeneinheit-hundert' },
  'flaechen-gleiche-einheit': { 'flaechen.volumeneinheiten': 'einheit-tausend einheit-zehn' },
  'flaechen-ablesen': { 'flaechen.volumeneinheiten': 'striche-gezaehlt naechste-zahl' },
};
export default families;
