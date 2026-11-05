/**
 * Misconception families of the topic 'negativ'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'negativ-vorzeichen': {
    'negativ.kontext': 'vorzeichen-vergessen vorzeichen-umgekehrt',
    'negativ.zahlengerade': 'vorzeichen-vergessen vorzeichen-umgekehrt',
    'negativ.aenderung': 'vorzeichen-vergessen',
    'negativ.plus-minus': 'vorzeichen-vergessen',
  },
  'negativ-strichwert': {
    'negativ.kontext': 'strich-zaehlt',
    'negativ.zahlengerade': 'strich-zaehlt',
  },
  'negativ-ablesen': {
    'negativ.kontext': 'null-mitgezaehlt',
    'negativ.zahlengerade': 'null-mitgezaehlt links-gezaehlt ganze-vergessen mitte-rand',
  },
  'negativ-richtung': {
    'negativ.kontext': 'minus-richtung',
    'negativ.zahlengerade': 'richtung',
    'negativ.aenderung': 'minus-richtung',
    'negativ.plus-minus': 'minus-richtung',
  },
  'negativ-lage': {
    'negativ.vergleichen': 'betrag-groesser negative-umgedreht',
  },
  'negativ-erste-zahl': {
    'negativ.aenderung': 'vorzeichen-ignoriert',
    'negativ.plus-minus': 'vorzeichen-ignoriert',
  },
  'negativ-ueber-null': {
    'negativ.zahlengerade': 'abstand-ohne-null',
    'negativ.aenderung': 'ueber-null bei-null',
    'negativ.plus-minus': 'ueber-null',
  },
  'negativ-weg': {
    'negativ.aenderung': 'aenderung-betrag',
  },
  'negativ-stelle': {
    'negativ.kontext': 'andere-stelle',
  },
  'negativ-alle-schritte': {
    'negativ.kontext': 'zwischenstand',
    'negativ.aenderung': 'zwischenstand',
    'negativ.plus-minus': 'zwischenstand',
  },
  'negativ-umkehr': {
    'negativ.aenderung': 'umkehr-gleiche',
    'negativ.plus-minus': 'umkehr-gleiche',
  },
  'negativ-zweite-zahl': {
    'negativ.plus-minus': 'zeichen-verwechselt',
  },
  'negativ-bruch': {
    'negativ.plus-minus': 'zaehler-nenner-addiert',
    'negativ.mal-geteilt': 'nenner-bleibt bruch-addiert kehrwert-erste kehrwert-fehlt',
  },
  'negativ-produkt': {
    'negativ.mal-geteilt': 'produkt-vorzeichen',
  },
  'negativ-rechenart': {
    'negativ.mal-geteilt': 'plus-statt-mal rechenart',
  },
  'negativ-komma': {
    'negativ.mal-geteilt': 'komma-stellen komma-nicht-verschoben',
  },
};
export default families;
