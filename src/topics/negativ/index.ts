/** Topic "Negative Zahlen" (docs/research.md §6), skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { aenderungSkill } from './aenderung';
import { kontextSkill } from './kontext';
import { malGeteiltSkill } from './mal-geteilt';
import { plusMinusSkill } from './plus-minus';
import { vergleichenSkill } from './vergleichen';
import { zahlengeradeSkill } from './zahlengerade';

const topic: TopicModule = {
  topicId: 'negativ',
  skills: [kontextSkill, zahlengeradeSkill, vergleichenSkill, aenderungSkill, plusMinusSkill, malGeteiltSkill],
};
export default topic;
