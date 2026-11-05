/**
 * The contract of a topic directory, so that each topic can be replaced on its own: src/topics/<topic>/ has
 * index.ts (default export: the TopicModule), phrases.ts and families.ts, and imports nothing from another topic's
 * directory. Generic helpers live in src/topics/shared.ts, test helpers in src/topics/test-utils.ts and step-check.ts.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOPICS, loadTopic } from './registry';

const SRC = new URL('../', import.meta.url);
const TOPIC_IDS = TOPICS.map((t) => t.id);
const isCode = (f: string) => /\.tsx?$/.test(f);
const importsOf = (url: URL) => [...readFileSync(url, 'utf8').matchAll(/(?:from\s+|import\(\s*)'([^']+)'/g)].map((m) => m[1]);

describe.each(TOPIC_IDS)('topic directory %s', (id) => {
  const dir = new URL(`topics/${id}/`, SRC);

  it('has index.ts (the module), phrases.ts and families.ts', async () => {
    const files = readdirSync(dir);
    for (const f of ['index.ts', 'phrases.ts', 'families.ts']) expect(files, f).toContain(f);
    const mod = await loadTopic(id);
    expect(mod.topicId).toBe(id);
    expect(mod.skills.length).toBeGreaterThan(0);
    for (const s of mod.skills) {
      expect(s.topicId).toBe(id);
      expect(s.id.startsWith(`${id}.`), s.id).toBe(true);
    }
  });

  it('imports nothing from another topic’s directory', () => {
    for (const f of readdirSync(dir, { recursive: true }).filter(isCode)) {
      for (const spec of importsOf(new URL(f, dir))) {
        for (const other of TOPIC_IDS.filter((t) => t !== id)) {
          expect(spec.includes(`../${other}/`) || spec === `../${other}` || spec.includes(`topics/${other}`), `${id}/${f} imports ${spec}`).toBe(false);
        }
      }
    }
  });
});

describe('code outside the topics', () => {
  it('reaches a topic only through the registry and the merged error tables', () => {
    for (const area of ['core', 'data', 'seo', 'state', 'ui']) {
      const dir = new URL(`${area}/`, SRC);
      for (const f of readdirSync(dir, { recursive: true }).filter(isCode)) {
        for (const spec of importsOf(new URL(f, dir))) {
          for (const t of TOPIC_IDS) expect(spec.includes(`topics/${t}`), `${area}/${f} imports ${spec}`).toBe(false);
        }
      }
    }
  });
});
