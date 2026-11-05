/** Topic "Brüche" (docs/research.md §6), skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { anteilSkill } from './anteil';
import { erweiternKuerzenSkill } from './erweitern-kuerzen';
import { gemischtSkill } from './gemischt';
import { geteiltSkill } from './geteilt';
import { malSkill } from './mal';
import { plusMinusSkill } from './plus-minus';
import { vergleichenSkill } from './vergleichen';
import { vonGroessenSkill } from './von-groessen';
import { zahlenstrahlSkill } from './zahlenstrahl';

const topic: TopicModule = {
  topicId: 'brueche',
  skills: [anteilSkill, vonGroessenSkill, zahlenstrahlSkill, erweiternKuerzenSkill, vergleichenSkill, gemischtSkill, plusMinusSkill, malSkill, geteiltSkill],
};
export default topic;
