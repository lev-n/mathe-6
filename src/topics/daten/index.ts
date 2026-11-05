/** Topic "Daten und Zufall" (docs/research.md §6): the skills in teaching order. */
import type { TopicModule } from '../../core/types';
import { chancenSkill } from './chancen';
import { diagrammSkill } from './diagramm';
import { haeufigkeitSkill } from './haeufigkeit';
import { kennwerteSkill } from './kennwerte';
import { kreisdiagrammSkill } from './kreisdiagramm';
import { kritischSkill } from './kritisch';
import { mittelwertSkill } from './mittelwert';

const topic: TopicModule = { topicId: 'daten', skills: [diagrammSkill, kritischSkill, haeufigkeitSkill, kreisdiagrammSkill, mittelwertSkill, kennwerteSkill, chancenSkill] };
export default topic;
