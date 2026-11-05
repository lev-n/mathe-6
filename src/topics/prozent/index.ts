/** Topic "Prozent und Dreisatz" (docs/research.md §6): skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { bedeutungSkill } from './bedeutung';
import { umwandelnSkill } from './umwandeln';
import { prozentwertSkill } from './prozentwert';
import { grundwertSatzSkill } from './grundwert-satz';
import { dreisatzSkill } from './dreisatz';
import { proportionalSkill } from './proportional';
import { massstabSkill } from './massstab';

const topic: TopicModule = {
  topicId: 'prozent',
  skills: [bedeutungSkill, umwandelnSkill, prozentwertSkill, grundwertSatzSkill, dreisatzSkill, proportionalSkill, massstabSkill],
};
export default topic;
