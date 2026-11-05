// @vitest-environment jsdom
/**
 * Integration smoke tests across all topics, the real registry, the real store and the real UI:
 *  1. <App/> renders the main routes (home, topic pages, practice for every plan mode, worksheets) without crashing,
 *     and every skill of every topic is reachable from its topic page (registry → topic page → practice link).
 *  2. 30 exercises for EVERY skill × Stufe render their visual, worked-solution visuals and answer input
 *     (interactive, marked-wrong, revealed and print modes) without throwing or showing "undefined"/"NaN".
 */
import { Fragment, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAnswer, correctResponse, pointTargets, responseForBug } from './core/check';
import { DEFAULT_CONTEXT } from './core/generate';
import { createRng } from './core/rng';
import { placeNameAt, writtenPlaces } from './core/written';
import type { Answer, CheckResult, Exercise, GenContext, Response, SkillDef, TopicModule, Visual } from './core/types';
import { STUFEN } from './core/types';
import { store } from './state/store';
import { PLAN_OPTIONS } from './data/plans';
import { DEFAULT_SETTINGS } from './state/types';
import { TOPICS, loadAllTopics } from './topics/registry';
import AnswerInput from './ui/answers/AnswerInput';
import App from './ui/app/App';
import { navigate } from './ui/app/router';
import { practicePath } from './ui/app/routes';
import { StepList } from './ui/practice/WorkedExample';
import { gridGeometry } from './ui/visuals/CoordinateGridVisual';
import VisualView from './ui/visuals/Visual';
import PracticePage from './ui/practice/PracticePage';

let modules: TopicModule[] = [];
const errors: unknown[][] = [];
const originalError = console.error;

/** The optional question has its own test below; everywhere else it is answered. */
const TEST_SETTINGS = DEFAULT_SETTINGS;

beforeAll(async () => {
  modules = await loadAllTopics();
  store.updateSettings(TEST_SETTINGS);
});

beforeEach(() => {
  errors.length = 0;
  console.error = (...args: unknown[]) => {
    // Updates outside act() are test-harness noise, not app errors.
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act(')) return;
    errors.push(args);
  };
  window.history.replaceState(null, '', '/');
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.print = vi.fn();
});

afterEach(() => {
  cleanup();
  console.error = originalError;
  store.updateSettings(TEST_SETTINGS);
  document.documentElement.className = '';
});

afterAll(() => {
  console.error = originalError;
});

/** 'unter null' is a temperature. A raw {frac:…} token is a text that skipped MathText. */
const SUSPICIOUS = /\bundefined\b|\bNaN\b|\[object |\bInfinity\b|(?<!unter |über )\bnull\b|\{frac:/;

function expectNoSuspiciousText(root: HTMLElement, where: string) {
  expect(SUSPICIOUS.test(root.textContent ?? ''), `${where}: suspicious text "${root.textContent}"`).toBe(false);
  for (const el of root.querySelectorAll('[aria-label]')) {
    const label = el.getAttribute('aria-label') ?? '';
    expect(SUSPICIOUS.test(label), `${where}: suspicious aria-label "${label}"`).toBe(false);
  }
}

function expectNoConsoleErrors(where: string) {
  expect(errors.map((e) => e.map(String).join(' ')), `${where}: console.error`).toEqual([]);
}

async function renderAt(path: string) {
  window.history.replaceState(null, '', path);
  const utils = render(<App />);
  // Let lazy chunks and topic modules resolve.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return utils;
}

const h1 = () => screen.getByRole('heading', { level: 1 });

// ─── 1. App routes ───────────────────────────────────────────────────────────

describe('App smoke test (real topics, real store)', () => {
  it('registry: every topic module has skills with unique ids matching its topic', () => {
    const ids = new Set<string>();
    expect(modules.map((m) => m.topicId)).toEqual(TOPICS.map((t) => t.id));
    for (const m of modules) {
      expect(m.skills.length, m.topicId).toBeGreaterThan(0);
      for (const s of m.skills) {
        expect(s.topicId).toBe(m.topicId);
        expect(s.id.startsWith(`${m.topicId}.`)).toBe(true);
        expect(ids.has(s.id), `duplicate skill id ${s.id}`).toBe(false);
        ids.add(s.id);
      }
    }
  });

  it('renders the home page at /', async () => {
    const { container } = await renderAt('/');
    expect(h1().textContent).toBe('Was möchtest du heute üben?');
    for (const t of TOPICS) expect(screen.getByRole('link', { name: new RegExp(t.title) })).toBeTruthy();
    expectNoSuspiciousText(container, '/');
    expectNoConsoleErrors('/');
  });

  it.each(PLAN_OPTIONS.map((o) => o.id))('every skill is reachable from its topic page, plan %s (nothing is locked)', async (plan) => {
    store.updateSettings({ ...TEST_SETTINGS, plan });
    for (const m of modules) {
      const { container, unmount } = await renderAt(`/thema/${m.topicId}`);
      await waitFor(() => expect(container.querySelector(`a[href="${practicePath(m.skills[0].id, 1)}"]`)).not.toBeNull());
      for (const s of m.skills) {
        for (const stufe of STUFEN) expect(container.querySelector(`a[href="${practicePath(s.id, stufe)}"]`), `${s.id} Stufe ${stufe}`).not.toBeNull();
      }
      expectNoSuspiciousText(container, `/thema/${m.topicId}`);
      unmount();
    }
    store.updateSettings(TEST_SETTINGS);
    expectNoConsoleErrors('topic pages');
  });

  it('the plan never reaches a URL or a worksheet', async () => {
    store.updateSettings({ ...TEST_SETTINGS, plan: 'bm' });
    const { unmount } = await renderAt('/arbeitsblatt');
    await waitFor(() => expect(h1().textContent).toBe('Arbeitsblätter'));
    fireEvent.click(screen.getByRole('radio', { name: TOPICS[0].title }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Arbeitsblatt erstellen' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.change(screen.getByLabelText('Blatt-Nummer'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Arbeitsblatt erstellen' }));
    const sheet = await screen.findByTestId('worksheet');
    expect(sheet.textContent).not.toMatch(/Mittelschule|Bayern|Lehrplan/);
    expect(window.location.href).not.toMatch(/\bbm\b|plan/);
    unmount();
    store.updateSettings(TEST_SETTINGS);
    expectNoConsoleErrors('plan');
  });

  it('renders /thema/brueche and navigates into practice from a Stufe link', async () => {
    const { container } = await renderAt('/thema/brueche');
    const first = modules.find((m) => m.topicId === 'brueche')!.skills[0];
    const link = await waitFor(() => {
      const a = container.querySelector<HTMLAnchorElement>(`a[href="${practicePath(first.id, 1)}"]`);
      expect(a).not.toBeNull();
      return a!;
    });
    fireEvent.click(link);
    expect(window.location.pathname).toBe(practicePath(first.id, 1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Beenden' })).toBeTruthy());
    await waitFor(() => expect(screen.queryByText('Die Aufgaben werden vorbereitet …')).toBeNull());
    expectNoConsoleErrors('topic → practice');
  });

  for (const topic of TOPICS) {
    it(`practice route works for a skill of ${topic.id} (all Stufen)`, async () => {
      const m = modules.find((x) => x.topicId === topic.id)!;
      const skill = m.skills[Math.floor(m.skills.length / 2)];
      for (const stufe of STUFEN) {
        const { container, unmount } = await renderAt(practicePath(skill.id, stufe));
        await waitFor(() => expect(screen.queryByText('Die Aufgaben werden vorbereitet …')).toBeNull());
        await waitFor(() => expect(screen.getByRole('button', { name: /Prüfen|Jetzt selbst probieren|Los geht/ })).toBeTruthy());
        expect(screen.queryByText('Diese Übung gibt es hier noch nicht.')).toBeNull();
        expect(h1().textContent).toContain(skill.title);
        expectNoSuspiciousText(container, `${skill.id} Stufe ${stufe}`);
        unmount();
      }
      expectNoConsoleErrors(`practice ${topic.id}`);
    });
  }

  it('practice: an item can be checked, retried, revealed and the next item appears', async () => {
    // any skill whose tasks are typed in (the text field is what this test uses)
    const typed = (s: SkillDef) => Array.from({ length: 40 }, (_, i) => s.generate(createRng(i + 1), 1, CONTEXTS[0])).every((ex) => ex.answer.kind === 'number');
    const skill = modules.flatMap((m) => m.skills).find(typed)!;
    await renderAt(practicePath(skill.id, 1));
    // A new skill+Stufe opens directly on the first item (the worked example is shown on demand or after a miss).
    await waitFor(() => expect(screen.getByRole('button', { name: 'Prüfen' })).toBeTruthy());
    expect(screen.getAllByText(/Aufgabe 1 von/).length).toBeGreaterThan(0);
    // Answer (probably wrongly) until the item is finished: solved or solution shown.
    for (let attempt = 0; attempt < 4 && !screen.queryByRole('button', { name: 'Weiter' }); attempt++) {
      const field = screen.getAllByRole('textbox')[0] as HTMLInputElement;
      fireEvent.change(field, { target: { value: String(attempt + 1) } });
      fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));
    }
    fireEvent.click(await screen.findByRole('button', { name: 'Weiter' }));
    await waitFor(() => expect(screen.getAllByText(/Aufgabe 2 von/).length).toBeGreaterThan(0));
    expectNoConsoleErrors('answer flow');
  });

  for (const topic of TOPICS) {
    it(`mixed round works for ${topic.id}`, async () => {
      const { container } = await renderAt(`/mix/${topic.id}`);
      // (generous timeouts: the topic chunk and ten items are prepared while other test files run in parallel)
      await waitFor(() => expect(screen.queryByText('Die Aufgaben werden vorbereitet …')).toBeNull(), { timeout: 5000 });
      // getAll: an ordering task also shows 'Zurücksetzen', which matches /Zurück/
      await waitFor(() => expect(screen.getAllByRole('button', { name: /Prüfen|Zurück|Startseite/ }).length).toBeGreaterThan(0), { timeout: 5000 });
      expect(screen.queryByText('Diese Übung gibt es hier noch nicht.')).toBeNull();
      expectNoSuspiciousText(container, `/mix/${topic.id}`);
      expectNoConsoleErrors(`mix ${topic.id}`);
    }, 20_000); // the two 5 s waits above must fit inside the test's own timeout
  }

  it('no question before a minus skill: the method is Abziehen by default, the adult page changes it', async () => {
    store.updateSettings(DEFAULT_SETTINGS);
    expect(store.get().settings.subtractionMethod).toBe('abziehen');
    const skill = modules.find((m) => m.topicId === 'dezimal')!.skills[0];
    const view = await renderAt(practicePath(skill.id, 1));
    await screen.findByRole('button', { name: 'Prüfen' });
    expect(screen.queryByRole('heading', { name: /Wie rechnest du Minus/ })).toBeNull();
    view.unmount();
    const adults = await renderAt('/erwachsene');
    fireEvent.click(screen.getByRole('radio', { name: /Ergänzen/ }));
    expect(store.get().settings.subtractionMethod).toBe('ergaenzen');
    store.updateSettings(TEST_SETTINGS);
    adults.unmount();
    expectNoConsoleErrors('method setting');
  }, 20_000);

  it('review round (nothing due) renders a calm message', async () => {
    const { container } = await renderAt('/wiederholen');
    await waitFor(() => expect(screen.queryByText('Die Aufgaben werden vorbereitet …')).toBeNull());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Beenden' })).toBeTruthy());
    expect(screen.queryByText('Diese Übung gibt es hier noch nicht.')).toBeNull();
    expectNoSuspiciousText(container, '/wiederholen');
    expectNoConsoleErrors('review');
  });

  it('review round with due items from every topic', async () => {
    const day = '2020-01-01';
    const entry = { attempts: 12, recent: Array(10).fill(true), practiceDays: 3, state: 'sicher', sicherSince: day, box: 2, due: day, checks: [], last: day };
    const skills = Object.fromEntries(modules.map((m) => [`${m.skills[0].id}#2`, entry]));
    const seeded = { app: 'mathe6', version: 1, skills, days: [day], badges: {}, totals: { answered: 40, firstTry: 30, rounds: 4, checksPassed: 0 }, settings: TEST_SETTINGS };
    const res = store.importJson(JSON.stringify(seeded));
    expect(res).toEqual({ ok: true });
    try {
      const home = await renderAt('/');
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Heute wiederholen' })).toBeTruthy());
      expect(home.container.querySelector('a[href="/wiederholen"]')).not.toBeNull();
      home.unmount();

      const review = await renderAt('/wiederholen');
      await waitFor(() => expect(screen.queryByText('Die Aufgaben werden vorbereitet …')).toBeNull());
      await waitFor(() => expect(screen.getAllByText(/Aufgabe 1 von/).length).toBeGreaterThan(0));
      expect(screen.getByRole('button', { name: /Prüfen|Jetzt selbst probieren/ })).toBeTruthy();
      expectNoSuspiciousText(review.container, '/wiederholen (due)');
      review.unmount();
    } finally {
      act(() => store.reset());
    }
    expectNoConsoleErrors('review with progress');
  });

  it('worksheet works for every topic and Stufe', async () => {
    store.updateSettings(TEST_SETTINGS);
    const { container } = await renderAt('/arbeitsblatt');
    await waitFor(() => expect(h1().textContent).toBe('Arbeitsblätter'));
    for (const t of TOPICS) {
      fireEvent.click(screen.getByRole('radio', { name: t.title }));
      const create = screen.getByRole('button', { name: 'Arbeitsblatt erstellen' });
      await waitFor(() => expect((create as HTMLButtonElement).disabled).toBe(false));
      // Select every skill.
      for (const box of within(container.querySelector('.check-list')!).getAllByRole('checkbox')) {
        if (!(box as HTMLInputElement).checked) fireEvent.click(box);
      }
      for (const stufe of STUFEN) {
        fireEvent.click(screen.getByRole('radio', { name: `Stufe ${stufe}` }));
        fireEvent.click(screen.getByRole('radio', { name: '15' }));
        fireEvent.change(screen.getByLabelText('Blatt-Nummer'), { target: { value: String(1000 + stufe) } });
        fireEvent.click(create);
        const sheet = await waitFor(() => {
          const s = screen.getByTestId('worksheet');
          expect(within(s).getByRole('heading', { level: 2 }).textContent).toBe(t.title);
          return s;
        });
        expect(sheet.querySelectorAll('.ws-task').length, `${t.id} Stufe ${stufe}`).toBe(15);
        expect(screen.queryByText(/nicht erstellt werden/)).toBeNull();
        expect(screen.getByTestId('answer-key').querySelectorAll('.key-item').length).toBe(15);
        expectNoSuspiciousText(sheet, `worksheet ${t.id} Stufe ${stufe}`);
      }
    }
    expectNoConsoleErrors('worksheet');
  }, 60_000);

  it('other pages render', async () => {
    for (const path of ['/fortschritt', '/abzeichen', '/erwachsene', '/datenschutz', '/impressum', '/gibt-es-nicht']) {
      const { container, unmount } = await renderAt(path);
      expect(h1().textContent?.length).toBeGreaterThan(0);
      expectNoSuspiciousText(container, path);
      unmount();
    }
    expectNoConsoleErrors('pages');
  });

  it('client-side navigation between routes keeps working', async () => {
    await renderAt('/');
    act(() => navigate('/thema/geometrie'));
    await waitFor(() => expect(h1().textContent).toBe('Winkel, Figuren, Koordinaten'));
    act(() => navigate('/arbeitsblatt'));
    await waitFor(() => expect(h1().textContent).toBe('Arbeitsblätter'));
    expectNoConsoleErrors('navigation');
  });
});

describe('PracticePage opens for every skill × Stufe', () => {
  it.each(TOPICS.map((t) => t.id))('topic %s', async (topicId) => {
    store.updateSettings(TEST_SETTINGS);
    const m = modules.find((x) => x.topicId === topicId)!;
    for (const skill of m.skills) {
      for (const stufe of STUFEN) {
        const view = render(<PracticePage plan={{ mode: 'skill', skillId: skill.id, stufe }} onExit={noop} onNavigate={noop} />);
        // No forced intro example: the first item (with its Prüfen button) is shown directly.
        await screen.findByRole('button', { name: 'Prüfen' });
        expect(screen.getAllByText(/Aufgabe 1 von/).length, `${skill.id} Stufe ${stufe}`).toBeGreaterThan(0);
        expectNoSuspiciousText(view.container, `practice ${skill.id} Stufe ${stufe}`);
        view.unmount();
      }
    }
    expectNoConsoleErrors(`practice pages ${topicId}`);
  }, 120_000);
});

// ─── 2. Every skill × Stufe renders ──────────────────────────────────────────

const CONTEXTS: GenContext[] = [
  DEFAULT_CONTEXT,
  { subtractionMethod: 'ergaenzen' },
];
const SAMPLES = 30;
const noop = () => {};

function wrongResponse(ex: Exercise): { response: Response; result: CheckResult } | null {
  const bug = ex.bugs?.[0];
  let response: Response | null = bug ? responseForBug(ex.answer, bug) : null;
  if (!response) {
    const a: Answer = ex.answer;
    switch (a.kind) {
      case 'number':
        response = { kind: 'number', text: String((a.value ?? 0) + 1) };
        break;
      case 'choice':
        response = { kind: 'choice', index: (a.correct + 1) % a.options.length };
        break;
      case 'multi':
        response = { kind: 'multi', values: Object.fromEntries(a.fields.map((f, i) => [f.id, String(i === 0 ? f.value + 1 : f.value)])) };
        break;
      case 'cells':
        response = { kind: 'cells', cells: a.solution.slice(1) };
        break;
      case 'numberline':
        response = { kind: 'numberline', value: a.value === a.min ? a.max : a.min };
        break;
      case 'order':
        response = { kind: 'order', order: [...a.correct].reverse() };
        break;
      case 'fraction':
        response = { kind: 'fraction', numerator: String(a.numerator + 1), denominator: String(a.denominator), ...(a.whole !== undefined ? { whole: String(a.whole) } : {}) };
        break;
      case 'point':
        response = { kind: 'point', points: [{ x: a.target[0] === a.xMin ? a.xMax : a.xMin, y: a.target[1] }] };
        break;
    }
  }
  if (!response) return null;
  const result = checkAnswer(ex.answer, response, ex.bugs);
  return result.correct ? null : { response, result };
}

function stepVisuals(ex: Exercise): Visual[] {
  return ex.steps.flatMap((s) => (typeof s === 'string' || !s.visual ? [] : [s.visual]));
}

function ExerciseHarness({ ex }: { ex: Exercise }) {
  const correct = correctResponse(ex.answer);
  const correctResult = checkAnswer(ex.answer, correct, ex.bugs);
  const wrong = wrongResponse(ex);
  const base = { answer: ex.answer, onChange: noop, onSubmit: noop, keypad: false } as const;
  return (
    <Fragment>
      {ex.visual && <VisualView visual={ex.visual} />}
      {ex.visual && <VisualView visual={ex.visual} print />}
      <AnswerInput {...base} response={null} disabled={false} result={null} reveal={false} idBase="t-empty" />
      <AnswerInput {...base} keypad response={null} disabled={false} result={null} reveal={false} idBase="t-keypad" />
      {wrong && <AnswerInput {...base} response={wrong.response} disabled={false} result={wrong.result} reveal={false} idBase="t-wrong" />}
      <AnswerInput {...base} response={correct} disabled result={correctResult} reveal={false} idBase="t-right" />
      <AnswerInput {...base} response={wrong?.response ?? null} disabled result={wrong?.result ?? null} reveal idBase="t-reveal" />
      <AnswerInput {...base} response={null} disabled result={null} reveal={false} idBase="t-print" print />
      <StepList steps={ex.steps} />
    </Fragment>
  );
}

describe('every skill × Stufe renders 30 exercises', () => {
  // Skill list must be known at collection time: import the modules eagerly through the registry above.
  it.each(TOPICS.map((t) => t.id))('topic %s', async (topicId) => {
    const m = modules.find((x) => x.topicId === topicId) ?? (await loadAllTopics()).find((x) => x.topicId === topicId)!;
    let rendered = 0;
    for (const skill of m.skills as SkillDef[]) {
      for (const stufe of STUFEN) {
        for (let i = 0; i < SAMPLES; i++) {
          const ctx = CONTEXTS[i % CONTEXTS.length];
          const seed = 104_729 * (i + 1) + stufe * 31 + skill.id.length;
          let ex: Exercise;
          try {
            ex = skill.generate(createRng(seed), stufe, ctx);
          } catch (err) {
            throw new Error(`${skill.id} Stufe ${stufe} seed ${seed}: generate threw: ${String(err)}`);
          }
          const where = `${ex.key} (seed ${seed})`;
          let view: ReturnType<typeof render>;
          try {
            view = render(<ExerciseHarness ex={ex} />);
          } catch (err) {
            throw new Error(`${where}: render threw: ${err instanceof Error ? err.stack : String(err)}`);
          }
          expectNoSuspiciousText(view.container, where);
          // Option visuals and step visuals must also be present when the exercise defines them.
          const svgCount = view.container.querySelectorAll('svg, table').length;
          const expectedVisuals = (ex.visual ? 2 : 0) + stepVisuals(ex).length;
          expect(svgCount, `${where}: visuals missing`).toBeGreaterThanOrEqual(expectedVisuals);
          view.unmount();
          rendered++;
        }
      }
    }
    expect(rendered).toBe(m.skills.length * STUFEN.length * SAMPLES);
    expectNoConsoleErrors(`render sweep ${topicId}`);
  }, 300_000);
});

// ─── 3. Entering the correct answer through the real input components is accepted ──────

/** Controlled host for one answer input; exposes the latest emitted response. */
function InputHost({ ex, sink }: { ex: Exercise; sink: { response: Response | null } }) {
  const [response, setResponse] = useState<Response | null>(null);
  return (
    <AnswerInput
      answer={ex.answer}
      response={response}
      onChange={(r) => {
        sink.response = r;
        setResponse(r);
      }}
      onSubmit={noop}
      disabled={false}
      result={null}
      reveal={false}
      idBase="rt"
      keypad={false}
    />
  );
}

function enterCorrect(ex: Exercise, root: HTMLElement): void {
  const a = ex.answer;
  const q = within(root);
  switch (a.kind) {
    case 'number': {
      if (a.value === null) {
        fireEvent.click(q.getByRole('button', { name: /Nicht lösbar/ }));
        return;
      }
      const text = (correctResponse(a) as Extract<Response, { kind: 'number' }>).text;
      fireEvent.change(root.querySelector('input[type="text"]')!, { target: { value: text } });
      return;
    }
    case 'choice':
      fireEvent.click(q.getAllByRole('radio')[a.correct]);
      return;
    case 'multi': {
      const values = (correctResponse(a) as Extract<Response, { kind: 'multi' }>).values;
      for (const f of a.fields) {
        const input = root.querySelector<HTMLInputElement>(`#rt-multi-${CSS.escape(f.id)}`);
        expect(input, `multi field ${f.id}`).not.toBeNull();
        fireEvent.change(input!, { target: { value: values[f.id] } });
      }
      return;
    }
    case 'written': {
      // Right to left, as on paper; the Überschlag field is required where the task has one.
      const places = writtenPlaces(a);
      if (a.op === 'div') {
        const digits = String(a.result).padStart(places + 1, '0');
        const boxes = q.getAllByLabelText(/^Ergebnis, /);
        const from = places > 0 ? boxes.length - digits.length : 0;
        digits.split('').forEach((digit, i) => fireEvent.change(boxes[from + i], { target: { value: digit } }));
        String(a.remainder || '').split('').forEach((digit, i) => fireEvent.change(q.getByLabelText(`Rest, ${i + 1}. Ziffer`), { target: { value: digit } }));
      } else {
        const comma = a.op === 'mul' && places > 0;
        String(a.result).split('').reverse().forEach((digit, place) => {
          fireEvent.change(q.getByLabelText(`Ergebnis, ${comma ? `Stelle ${place + 1} von rechts` : placeNameAt(place, places)}`), { target: { value: digit } });
        });
        if (comma) for (let i = 0; i < places; i++) fireEvent.click(q.getByRole('button', { name: /Komma nach links/ }));
      }
      if (a.ueberschlag !== undefined) fireEvent.change(q.getByLabelText('Überschlag'), { target: { value: String(a.ueberschlag) } });
      return;
    }
    case 'cells':
      for (const [x, y] of a.solution) {
        const btn = root.querySelector<HTMLButtonElement>(`button[aria-label^="Kästchen Spalte ${x + 1}, Zeile ${y + 1}"]`);
        expect(btn, `cell ${x},${y}`).not.toBeNull();
        fireEvent.click(btn!);
      }
      return;
    case 'numberline': {
      const slider = q.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'Home' });
      const steps = Math.round((a.value - a.min) / a.step);
      for (let i = 0; i < steps; i++) fireEvent.keyDown(slider, { key: 'ArrowRight' });
      // Home on an untouched slider may not emit; make sure a value was set at all.
      if (steps === 0) {
        fireEvent.keyDown(slider, { key: 'ArrowRight' });
        fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      }
      return;
    }
    case 'order': {
      const buttons = q.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
      expect(buttons.length).toBe(a.items.length);
      for (const idx of a.correct) fireEvent.click(buttons[idx]);
      return;
    }
    case 'fraction': {
      fireEvent.change(q.getByLabelText('Zähler'), { target: { value: String(a.numerator) } });
      fireEvent.change(q.getByLabelText('Nenner'), { target: { value: String(a.denominator) } });
      if (a.whole !== undefined && a.allowMixed) fireEvent.click(q.getByRole('button', { name: 'Ganze' }));
      if (a.whole !== undefined) fireEvent.change(q.getByLabelText('Ganze'), { target: { value: String(a.whole) } });
      if (a.negative) fireEvent.click(q.getByRole('button', { name: 'Vorzeichen: Minus' }));
      return;
    }
    case 'point': {
      const area = root.querySelector<HTMLElement>('.pt-input__area')!;
      if (a.targets) {
        // Several points are tapped: a marker cannot step onto a point already set, so a walk by arrow keys can get stuck where a hand does not.
        const svg = area.querySelector('svg')!;
        const geo = gridGeometry({ xMin: a.xMin, xMax: a.xMax, yMin: a.yMin, yMax: a.yMax, step: a.step, labelStep: a.labelStep ?? a.step, axisNames: a.axisNames });
        svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: geo.W, height: geo.H }) as DOMRect;
        for (const [x, y] of pointTargets(a)) {
          const at = { clientX: geo.xOf(x), clientY: geo.yOf(y) };
          fireEvent.pointerDown(svg, at);
          fireEvent.pointerUp(svg, at);
        }
        return;
      }
      // The first arrow key sets the marker at the origin, or as near to it as the grid allows.
      fireEvent.keyDown(area, { key: 'ArrowRight' });
      const startX = Math.min(a.xMax, Math.max(a.xMin, 0));
      const startY = Math.min(a.yMax, Math.max(a.yMin, 0));
      const dx = Math.round((a.target[0] - startX) / a.step);
      const dy = Math.round((a.target[1] - startY) / a.step);
      for (let i = 0; i < Math.abs(dx); i++) fireEvent.keyDown(area, { key: dx > 0 ? 'ArrowRight' : 'ArrowLeft' });
      for (let i = 0; i < Math.abs(dy); i++) fireEvent.keyDown(area, { key: dy > 0 ? 'ArrowUp' : 'ArrowDown' });
      return;
    }
  }
}

describe('entering the correct answer through each input is accepted', () => {
  it.each(TOPICS.map((t) => t.id))('topic %s', async (topicId) => {
    const m = modules.find((x) => x.topicId === topicId) ?? (await loadAllTopics()).find((x) => x.topicId === topicId)!;
    for (const skill of m.skills) {
      for (const stufe of STUFEN) {
        for (let i = 0; i < 8; i++) {
          const ctx = CONTEXTS[i % CONTEXTS.length];
          const seed = 7_919 * (i + 3) + stufe * 101 + skill.id.length;
          const ex = skill.generate(createRng(seed), stufe, ctx);
          const sink: { response: Response | null } = { response: null };
          const view = render(<InputHost ex={ex} sink={sink} />);
          enterCorrect(ex, view.container);
          expect(sink.response, `${ex.key}: no response emitted`).not.toBeNull();
          const res = checkAnswer(ex.answer, sink.response!, ex.bugs);
          expect(res.correct, `${ex.key} (seed ${seed}): UI response ${JSON.stringify(sink.response)} → ${JSON.stringify(res)}`).toBe(true);
          view.unmount();
        }
      }
    }
    expectNoConsoleErrors(`round trip ${topicId}`);
  }, 300_000);
});
