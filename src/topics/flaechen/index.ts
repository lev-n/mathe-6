/** Topic "Fläche und Volumen" (docs/research.md §6), in teaching order. */
import type { TopicModule } from '../../core/types';
import { dreieckSkill } from './dreieck';
import { einheitenSkill } from './einheiten';
import { netzSkill } from './netz';
import { oberflaecheSkill } from './oberflaeche';
import { parallelogrammSkill } from './parallelogramm';
import { rechteckSkill } from './rechteck';
import { vieleckSkill } from './vieleck';
import { volumeneinheitenSkill } from './volumeneinheiten';
import { volumenSkill } from './volumen';

const topic: TopicModule = {
  topicId: 'flaechen',
  skills: [rechteckSkill, einheitenSkill, parallelogrammSkill, dreieckSkill, vieleckSkill, netzSkill, oberflaecheSkill, volumenSkill, volumeneinheitenSkill],
};
export default topic;
