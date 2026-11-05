/**
 * Topic metadata (always loaded) and lazy loaders for the topic modules (one chunk per topic).
 */
import type { TopicId, TopicMeta, TopicModule } from '../core/types';

export const TOPICS: readonly TopicMeta[] = [
  { id: 'brueche', title: 'Brüche', shortTitle: 'Brüche', description: 'Anteile, Erweitern und Kürzen, vergleichen und rechnen', color: 'brueche' },
  { id: 'dezimal', title: 'Dezimalzahlen', shortTitle: 'Dezimalzahlen', description: 'Stellen nach dem Komma, runden, alle vier Rechenarten, Größen', color: 'dezimal' },
  { id: 'negativ', title: 'Negative Zahlen', shortTitle: 'Negative Zahlen', description: 'Temperatur und Konto, die Zahlengerade, Stand und Änderung', color: 'negativ' },
  { id: 'prozent', title: 'Prozent und Dreisatz', shortTitle: 'Prozent', description: 'Prozent verstehen und umwandeln, Prozentrechnung, Dreisatz und Maßstab', color: 'prozent' },
  { id: 'terme', title: 'Terme und Gleichungen', shortTitle: 'Terme', description: 'Rechenterme, geschickt rechnen, Platzhalter und Variablen', color: 'terme' },
  { id: 'geometrie', title: 'Winkel, Figuren, Koordinaten', shortTitle: 'Geometrie', description: 'Winkel messen, Dreiecke und Vierecke, Kreis, Koordinaten, Spiegeln', color: 'geometrie' },
  { id: 'flaechen', title: 'Fläche und Volumen', shortTitle: 'Fläche und Volumen', description: 'Flächen berechnen, Einheiten, Netz, Oberfläche und Volumen', color: 'flaechen' },
  { id: 'daten', title: 'Daten und Zufall', shortTitle: 'Daten', description: 'Diagramme lesen und prüfen, Häufigkeit, Mittelwert, Chancen', color: 'daten' },
];

const LOADERS: Record<TopicId, () => Promise<{ default: TopicModule }>> = {
  brueche: () => import('./brueche'),
  dezimal: () => import('./dezimal'),
  negativ: () => import('./negativ'),
  prozent: () => import('./prozent'),
  terme: () => import('./terme'),
  geometrie: () => import('./geometrie'),
  flaechen: () => import('./flaechen'),
  daten: () => import('./daten'),
};

const cache = new Map<TopicId, Promise<TopicModule>>();
const loaded = new Map<TopicId, TopicModule>();

export function isTopicId(id: string): id is TopicId {
  return Object.prototype.hasOwnProperty.call(LOADERS, id);
}

export function getTopicMeta(id: TopicId): TopicMeta {
  const meta = TOPICS.find((t) => t.id === id);
  if (!meta) throw new Error(`Unknown topic ${id}`);
  return meta;
}

export function loadTopic(id: TopicId): Promise<TopicModule> {
  let p = cache.get(id);
  if (!p) {
    p = LOADERS[id]().then((m) => {
      loaded.set(id, m.default);
      return m.default;
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

/** The module if loadTopic() has already delivered it, else undefined (no loading starts). */
export function loadedTopic(id: TopicId): TopicModule | undefined {
  return loaded.get(id);
}

export function loadAllTopics(): Promise<TopicModule[]> {
  return Promise.all(TOPICS.map((t) => loadTopic(t.id)));
}

/** Skill ids are `${topicId}.${slug}`. */
export function topicOfSkill(skillId: string): TopicId {
  const id = skillId.split('.')[0];
  if (!isTopicId(id)) throw new Error(`Skill id without valid topic prefix: ${skillId}`);
  return id;
}

