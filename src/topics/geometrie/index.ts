/**
 * Topic "Winkel, Figuren, Koordinaten". Teaching order as in the catalogue (docs/research.md §6): Winkel first, then Dreiecke, Vierecke and the Kreis, then the Koordinatensystem and what
 * builds on it, Spiegeln and Kongruenz. Which skills count as optional is decided by src/data/plans.ts.
 */
import type { TopicModule } from '../../core/types';
import { dreieckeSkill } from './dreiecke';
import { koordinatenSkill } from './koordinaten';
import { kongruenzSkill } from './kongruenz';
import { kreisSkill } from './kreis';
import { spiegelnSkill } from './spiegeln';
import { viereckeSkill } from './vierecke';
import { winkelArtenSkill } from './winkel-arten';
import { winkelBeziehungenSkill } from './winkel-beziehungen';
import { winkelMessenSkill } from './winkel-messen';

const topic: TopicModule = {
  topicId: 'geometrie',
  skills: [winkelArtenSkill, winkelMessenSkill, winkelBeziehungenSkill, dreieckeSkill, viereckeSkill, kreisSkill, koordinatenSkill, spiegelnSkill, kongruenzSkill],
};
export default topic;
