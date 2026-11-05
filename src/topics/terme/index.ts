/** Topic "Terme und Gleichungen": the skills of docs/research.md §6, in teaching order. */
import type { TopicModule } from '../../core/types';
import { geschicktSkill } from './geschickt';
import { gleichungLoesenSkill } from './gleichung-loesen';
import { platzhalterSkill } from './platzhalter';
import { rechentermSkill } from './rechenterm';
import { textTermSkill } from './text-term';
import { variableAufstellenSkill } from './variable-aufstellen';
import { variableEinsetzenSkill } from './variable-einsetzen';

const topic: TopicModule = {
  topicId: 'terme',
  skills: [rechentermSkill, textTermSkill, geschicktSkill, platzhalterSkill, variableEinsetzenSkill, variableAufstellenSkill, gleichungLoesenSkill],
};
export default topic;
