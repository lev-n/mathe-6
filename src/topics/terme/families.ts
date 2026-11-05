/**
 * Misconception families of the topic 'terme'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'terme-punkt-vor-strich': {
    'terme.rechenterm': 'links-nach-rechts strich-zuerst',
    'terme.variable-einsetzen': 'links-nach-rechts',
  },
  'terme-klammer-zuerst': {
    'terme.rechenterm': 'klammer-teilweise',
    'terme.variable-einsetzen': 'klammer-teilweise',
  },
  'terme-alle-zahlen': {
    'terme.geschickt': 'zahl-vergessen',
  },
  'terme-zerlegen': {
    'terme.geschickt': 'teil-vergessen',
  },
  'terme-umkehren': {
    'terme.platzhalter': 'umkehr-gleiche-rechnung',
    'terme.variable-einsetzen': 'umkehr-gleiche-rechnung',
    'terme.gleichung-loesen': 'umkehr-gleiche-rechnung',
  },
  'terme-rueckwaerts': {
    'terme.platzhalter': 'rueckwaerts-reihenfolge schritt-vergessen',
    'terme.variable-einsetzen': 'schritt-vergessen',
    'terme.gleichung-loesen': 'schritt-vergessen',
  },
  'terme-einsetzen': {
    'terme.variable-einsetzen': 'buchstabe-weg',
  },
  'terme-umfang': {
    'terme.variable-einsetzen': 'flaeche-statt-umfang halbe-runde',
  },
};
export default families;
