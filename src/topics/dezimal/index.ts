/** Topic "Dezimalzahlen" (docs/research.md §6), skills in teaching order. */
import type { TopicModule } from '../../core/types';
import bruchUmwandeln from './bruch-umwandeln';
import geteilt from './geteilt';
import groessen from './groessen';
import mal from './mal';
import plusMinus from './plus-minus';
import runden from './runden';
import stellenwert from './stellenwert';
import vergleichen from './vergleichen';
import zahlenstrahl from './zahlenstrahl';

const topic: TopicModule = { topicId: 'dezimal', skills: [stellenwert, bruchUmwandeln, vergleichen, zahlenstrahl, runden, plusMinus, mal, geteilt, groessen] };
export default topic;
