/**
 * Misconception families of the topic 'geometrie'. Family id → skill id → space-separated bug keys
 * (src/topics/errorFamilies.ts). Family ids are unique across all topics; each phrase is in ./phrases.ts.
 * Choice answers name their misconception in whyWrong, so they have no Bug ids here (winkel-arten, dreiecke, kongruenz).
 */
import type { TopicFamilies } from '../errorFamilies';

const families: TopicFamilies = {
  'geometrie-skala': { 'geometrie.winkel-messen': 'skala-verwechselt' },
  'geometrie-strich': { 'geometrie.winkel-messen': 'strich-verzaehlt' },
  'geometrie-rest': { 'geometrie.winkel-messen': 'rest-abgelesen' },
  'geometrie-nebenwinkel': { 'geometrie.winkel-beziehungen': 'neben-gleich neben-voll neben-rechter neben-differenz' },
  'geometrie-scheitelwinkel': { 'geometrie.winkel-beziehungen': 'scheitel-neben scheitel-summe' },
  'geometrie-winkelsumme': { 'geometrie.winkel-beziehungen': 'dreieck-voll dreieck-summe' },
  'geometrie-stufenwinkel': { 'geometrie.winkel-beziehungen': 'stufen-neben' },
  'geometrie-basiswinkel': { 'geometrie.winkel-beziehungen': 'basis-zusammen basis-einfach' },
  'geometrie-seiten': { 'geometrie.vierecke': 'seiten-getauscht' },
  'geometrie-radius-durchmesser': { 'geometrie.kreis': 'radius-durchmesser radius-gleich' },
  'geometrie-kreise': { 'geometrie.kreis': 'kreise-differenz kreise-durchmesser' },
  'geometrie-koord-getauscht': { 'geometrie.koordinaten': 'koord-getauscht' },
  'geometrie-koord-ab-eins': { 'geometrie.koordinaten': 'koord-ab-eins' },
  'geometrie-vorzeichen': { 'geometrie.koordinaten': 'vorzeichen-vergessen' },
  'geometrie-ecke': { 'geometrie.koordinaten': 'ecke-gegenueber' },
  'geometrie-weg': { 'geometrie.koordinaten': 'weg-getauscht weg-richtung' },
  'geometrie-spiegel-abstand': { 'geometrie.spiegeln': 'spiegel-abstand' },
  'geometrie-achse-finden': { 'geometrie.spiegeln': 'achse-abstand' },
  'geometrie-schraege-achse': { 'geometrie.spiegeln': 'achse-senkrecht' },
  'geometrie-symmetrieachsen': { 'geometrie.spiegeln': 'achsen-diagonale achsen-vergessen' },
  'geometrie-verschieben': { 'geometrie.spiegeln': 'verschieben-richtung verschieben-getauscht' },
  'geometrie-punktspiegelung': { 'geometrie.spiegeln': 'punkt-nur-eine-achse zentrum-summe' },
};
export default families;
