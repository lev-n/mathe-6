// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OPERATOR_PLACEHOLDER } from '../../config/operator';
import { BANNED_PHRASES, IMPROVEMENT_BANNED_PHRASES } from '../../core/testing';
import { toneProblems } from '../../core/textRules';
import type { TopicId } from '../../core/types';
import { dueReviews, practisedTopics, weekProgress } from '../../state/selectors';
import type { AnswerEvent, Consent, ProgressState } from '../../state/types';
import { getTopicMeta, loadTopic } from '../../topics/registry';
import BadgesPage, { earnedBadges } from './BadgesPage';
import { continueStufe, lastPractisedSkillId, reviewRoundSize } from '../app/progress';
import HomePage from './HomePage';
import ImprintPage from './ImprintPage';
import NotFoundPage from './NotFoundPage';
import { createStore } from '../../state/store';
import PrivacyPage, { KIDS_PRIVACY } from './PrivacyPage';
import ProgressPage from './ProgressPage';
import { fakeSkill, progress, stateWith } from './testFixtures';
import TopicPage, { isSkillSicher } from './TopicPage';
import { weekGoalText } from './WeekGoal';
import AdultsPage from './AdultsPage';

const current = vi.hoisted(() => ({ state: null as unknown as ProgressState, consent: 'unknown' as Consent }));

vi.mock('../../state/useProgress', () => ({
  useProgress: () => current.state,
  useSettings: () => current.state.settings,
  useConsent: () => current.consent,
  useSaveStatus: () => 'ok',
}));

vi.mock('../../state/selectors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../state/selectors')>();
  return {
    ...actual,
    dueReviews: vi.fn(() => []),
    weekProgress: vi.fn((s: ProgressState) => ({ days: 0, goal: s.settings.weeklyGoal, reached: false })),
  };
});

vi.mock('../../state/badges', () => {
  const BADGES = [
    { id: 'brueche-sicher', title: 'Brüche: Sicher', description: 'Du kannst eine Stufe aus diesem Thema sicher.' },
    { id: 'behalten', title: 'Gut behalten', description: 'Du hast Tage später etwas auf Anhieb gelöst.' },
    { id: 'geheim', title: 'Noch offenes Abzeichen', description: 'Noch nicht bekommen.' },
  ];
  return { BADGES, badgeById: (id: string) => BADGES.find((b) => b.id === id), evaluateBadges: () => [] };
});

vi.mock('../../topics/errorPhrases', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../topics/errorPhrases')>();
  // fixed test phrases, so these tests do not depend on the families of any topic
  const fixture: Record<string, { object: string; participle: string }> = {
    'test-plain': { object: 'den Übertrag', participle: 'richtig beachtet' },
    'test-anderes': { object: 'die Zahlen', participle: 'richtig geordnet' },
    'test-an': { object: 'an alle Rechenschritte', participle: 'gedacht' },
    'test-auch': { object: 'auch die großen Quadrate', participle: 'mitgezählt' },
  };
  return { ...actual, familyPhrase: (tag: string) => fixture[tag] ?? actual.familyPhrase(tag) };
});

vi.mock('../../topics/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../topics/registry')>();
  const { fakeModule } = await import('./testFixtures');
  return { ...actual, loadTopic: vi.fn((id: TopicId) => Promise.resolve(fakeModule(id))) };
});

beforeEach(() => {
  current.state = stateWith();
  current.consent = 'unknown';
  vi.mocked(dueReviews).mockReturnValue([]);
  vi.mocked(weekProgress).mockImplementation((s) => ({ days: 0, goal: s.settings.weeklyGoal, reached: false }));
});
afterEach(cleanup);

describe('HomePage', () => {
  it('shows 8 topic cards in the fixed order and no review card when nothing is due', async () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Was möchtest du heute üben?');
    const list = document.querySelector<HTMLElement>('.topic-grid')!;
    expect(within(list).getAllByRole('link')).toHaveLength(8);
    expect(screen.queryByText('Heute wiederholen')).toBeNull();
    expect(screen.getByText('Dein Wochenziel: an 3 Tagen üben.')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText('Noch nicht geübt')).toHaveLength(8));
    expect(document.querySelector('.topic-card__title')!.textContent).toBe(getTopicMeta('brueche').title);
  });

  it('a topic practised only in Extras never says "Noch nicht geübt"', async () => {
    current.state = stateWith({ 'brueche.gemischt#1': progress('geuebt', { attempts: 20 }) });
    render(<HomePage />);
    const card = (id: TopicId) => screen.getByRole('link', { name: new RegExp(`^${getTopicMeta(id).title}`) });
    await waitFor(() => expect(card('brueche').textContent).toContain('Schon geübt'));
    expect(card('brueche').textContent).not.toContain('Noch nicht geübt');
    cleanup();
    // nothing of the plan in this topic at all: the same words, no bar
    current.state = stateWith({ 'negativ.kontext#1': progress('sicher') }, { settings: { ...stateWith().settings, plan: 'bb' } });
    render(<HomePage />);
    await waitFor(() => expect(card('negativ').textContent).toContain('Schon geübt'));
    expect(card('negativ').querySelector('.bar')).toBeNull();
    expect(card('daten').textContent).toContain('Noch nicht geübt');
  });

  it('the plan choice is a small line, never a gate and never at first start; no school label afterwards', async () => {
    const { store } = await import('../../state/store');
    const update = vi.spyOn(store, 'updateSettings').mockImplementation(() => {});
    render(<HomePage />);
    // practice is not gated: the topic cards are there, and the options are not
    expect(document.querySelectorAll('.topic-card').length).toBe(8);
    expect(screen.queryByTestId('plan-choice')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Passt das zu deinem Unterricht? Lehrplan wählen' }));
    const q = screen.getByTestId('plan-choice');
    expect(q.querySelector('legend')!.textContent).toBe('Welcher Lehrplan passt?');
    expect(q.textContent).toContain('Wenn du unsicher bist, frag jemanden aus deiner Klasse oder zu Hause.');
    expect(within(q).getAllByRole('radio').map((r) => r.closest('label')!.textContent)).toEqual(['Bayern Gymnasium', 'Bayern Mittelschule', 'Bayern Realschule', 'Berlin/Brandenburg Klasse 6', 'NRW Gesamtschule, Hauptschule, Realschule, Sekundarschule', 'NRW Gymnasium', 'Anderes Land oder weiß nicht']);
    fireEvent.click(within(q).getByRole('radio', { name: 'Bayern Mittelschule' }));
    fireEvent.click(within(q).getByRole('button', { name: 'Übernehmen' }));
    expect(update).toHaveBeenLastCalledWith({ plan: 'bm' });
    // the store is mocked here: the same screen with the plan set
    current.state = stateWith({}, { settings: { ...stateWith().settings, plan: 'bm' } });
    cleanup();
    render(<HomePage />);
    const set = screen.getByTestId('plan-set');
    expect(set.textContent).toContain('Lehrplan: eingestellt');
    expect(document.body.textContent).not.toMatch(/Mittelschule|Bayern/);
    fireEvent.click(within(set).getByRole('button', { name: 'Ändern' }));
    expect((screen.getByRole('radio', { name: 'Bayern Mittelschule' }) as HTMLInputElement).checked).toBe(true);
    update.mockRestore();
  });

  it('marking a radio changes nothing until Übernehmen, and the focus moves with the swap (WCAG 3.2.2, 2.4.3)', async () => {
    const { store } = await import('../../state/store');
    const update = vi.spyOn(store, 'updateSettings').mockImplementation(() => {});
    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Passt das zu deinem Unterricht? Lehrplan wählen' }));
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Anderes Land oder weiß nicht' }));
    fireEvent.click(screen.getByRole('radio', { name: 'NRW Gymnasium' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Bayern Gymnasium' }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByTestId('plan-choice')).toBeTruthy();
    expect((screen.getByRole('radio', { name: 'Bayern Gymnasium' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenLastCalledWith({ plan: 'bg' });
    expect(screen.queryByTestId('plan-choice')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ändern' }));
    update.mockRestore();
  });

  it('Übernehmen on the plan that is already set (the default, too) confirms it and closes the list', async () => {
    const { store } = await import('../../state/store');
    const update = vi.spyOn(store, 'updateSettings').mockImplementation(() => {});
    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Passt das zu deinem Unterricht? Lehrplan wählen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));
    expect(screen.queryByTestId('plan-choice')).toBeNull();
    expect(screen.getByTestId('plan-set').textContent).toContain('Lehrplan: eingestellt');
    expect(document.body.textContent).not.toMatch(/Mittelschule|Bayern/);
    update.mockRestore();
  });

  it('puts "Heute wiederholen" first when reviews are due', () => {
    vi.mocked(dueReviews).mockReturnValue([
      { skillId: 'brueche.anteil', stufe: 1, due: '2026-10-01' },
      { skillId: 'brueche.anteil', stufe: 2, due: '2026-10-02' },
    ]);
    render(<HomePage />);
    const card = screen.getByRole('region', { name: 'Heute wiederholen' });
    expect(card.textContent).toContain('4 Aufgaben von früher');
    expect(within(card).getByRole('link', { name: /Wiederholen/ }).getAttribute('href')).toBe('/wiederholen');
    // the review card comes before the topics
    const topics = document.querySelector('.topic-grid')!;
    expect(card.compareDocumentPosition(topics) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('announces exactly as many review tasks as the review round contains: 3 to 5', () => {
    const st = stateWith();
    // 1 due skill-Stufe → the smallest warm-up
    vi.mocked(dueReviews).mockReturnValue([{ skillId: 'brueche.anteil', stufe: 1, due: '2026-10-01' }]);
    expect(reviewRoundSize(st, '2026-10-18', [])).toBe(3);
    render(<HomePage />);
    expect(screen.getByRole('region', { name: 'Heute wiederholen' }).textContent).toContain('3 Aufgaben von früher');
    cleanup();
    // many due skill-Stufen → capped at the warm-up's 5
    vi.mocked(dueReviews).mockReturnValue(
      Array.from({ length: 12 }, (_, i) => ({ skillId: `brueche.von-groessen${i}`, stufe: 1 as const, due: '2026-10-01' })),
    );
    expect(reviewRoundSize(st, '2026-10-18', [])).toBe(5);
  });

  it('offers "Weiter üben" for the most recently practised skill at its suggested Stufe', async () => {
    current.state = stateWith({
      'brueche.zahlenstrahl#1': progress('geuebt', { last: '2026-10-10' }),
      'brueche.anteil#1': progress('sicher', { last: '2026-10-15' }),
    });
    expect(lastPractisedSkillId(current.state)).toBe('brueche.anteil');
    render(<HomePage />);
    const tile = await screen.findByRole('link', { name: /Weiter üben/ });
    expect(tile.textContent).toContain('Anteile als Bruch – Stufe 2');
    expect(tile.getAttribute('href')).toBe('/ueben/brueche.anteil/2');
  });

  it('shows the weekly goal and lifetime days', () => {
    current.state = stateWith({}, { days: ['2026-10-01', '2026-10-02', '2026-10-05'] });
    vi.mocked(weekProgress).mockReturnValue({ days: 2, goal: 3, reached: false });
    render(<HomePage />);
    expect(screen.getByText('Übungstage diese Woche: 2 von 3')).toBeTruthy();
    expect(screen.getByText('Du hast schon an 3 Tagen geübt.')).toBeTruthy();
  });

  it('loads topic modules only for practised topics', async () => {
    vi.mocked(loadTopic).mockClear();
    current.state = stateWith({ 'daten.diagramm#1': progress('geuebt') });
    expect(practisedTopics(current.state)).toEqual(['daten']);
    render(<HomePage />);
    expect(await screen.findByRole('link', { name: /Weiter üben/ })).toBeTruthy();
    expect(vi.mocked(loadTopic).mock.calls.map((c) => c[0])).toEqual(['daten']);
  });

  it('words the weekly goal gently', () => {
    expect(weekGoalText(0, 3, false)).toBe('Dein Wochenziel: an 3 Tagen üben.');
    expect(weekGoalText(0, 1, false)).toBe('Dein Wochenziel: an einem Tag üben.');
    expect(weekGoalText(2, 3, false)).toBe('Übungstage diese Woche: 2 von 3');
    expect(weekGoalText(3, 3, true)).toBe('Übungstage diese Woche: 3 von 3. Wochenziel geschafft.');
    expect(weekGoalText(4, 3, true)).toBe('Übungstage diese Woche: 4. Wochenziel geschafft.');
  });
});

describe('"Weiter üben" (lastPractisedSkillId)', () => {
  const answer = (skillId: string, stufe: 1 | 2 | 3): AnswerEvent => ({
    skillId,
    topicId: skillId.split('.')[0] as TopicId,
    stufe,
    firstTry: true,
    solved: true,
    usedHint: false,
    purpose: 'practice',
    day: '2026-10-18',
  });

  it('points to the skill-Stufe answered last in a practice round, also after a reload or an import', () => {
    const s = createStore(null);
    s.recordAnswer(answer('brueche.zahlenstrahl', 1));
    s.recordAnswer(answer('brueche.anteil', 1));
    s.recordAnswer(answer('brueche.zahlenstrahl', 3));
    // The stored days tie; without lastPlayed the entry added last (Runden) would win.
    expect(s.get().lastPlayed).toEqual({ skillId: 'brueche.zahlenstrahl', stufe: 3 });
    expect(lastPractisedSkillId(s.get())).toBe('brueche.zahlenstrahl');
    expect(continueStufe(s.get(), 'brueche.zahlenstrahl')).toBe(3);
    // review and mixed answers do not change it
    s.recordAnswer({ ...answer('brueche.anteil', 1), purpose: 'review' });
    s.recordAnswer({ ...answer('brueche.anteil', 1), purpose: 'mixed' });
    expect(lastPractisedSkillId(s.get())).toBe('brueche.zahlenstrahl');
    // it survives the stored document (reload) and comes with an imported backup
    const reloaded = createStore(null);
    expect(reloaded.importJson(s.exportJson())).toEqual({ ok: true });
    expect(reloaded.get().lastPlayed).toEqual({ skillId: 'brueche.zahlenstrahl', stufe: 3 });
    const other = createStore(null);
    other.recordAnswer(answer('daten.diagramm', 1));
    other.recordAnswer(answer('brueche.anteil', 2));
    expect(s.importJson(other.exportJson())).toEqual({ ok: true });
    expect(lastPractisedSkillId(s.get())).toBe('brueche.anteil');
    expect(continueStufe(s.get(), 'brueche.anteil')).toBe(2);
  });

});

describe('TopicPage', () => {
  it('lists skills with three Stufe links, stars, state words and "Empfohlen"', async () => {
    current.state = stateWith({ 'brueche.anteil#1': progress('gemeistert'), 'brueche.anteil#2': progress('geuebt') });
    render(<TopicPage topicId="brueche" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(getTopicMeta('brueche').title);
    await screen.findByRole('heading', { name: 'Anteile als Bruch' });
    const runden = screen.getByRole('list', { name: 'Anteile als Bruch' });
    const links = within(runden).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/ueben/brueche.anteil/1', '/ueben/brueche.anteil/2', '/ueben/brueche.anteil/3']);
    expect(links[0].textContent).toContain('Gemeistert');
    expect(within(links[0]).getByRole('img', { name: '3 von 3 Marken' })).toBeTruthy();
    expect(links[1].textContent).toContain('Empfohlen');
    expect(links[1].textContent).toContain('Geübt');
    expect(links[1].textContent).toContain('Anteile als Bruch mittel');
    expect(links[2].textContent).toContain('Noch nicht geübt');
    expect(links[0].textContent).not.toContain('Empfohlen');
  });

  it('nothing is locked: "Extra" opens every skill and warns about nothing; the plan moves a skill into the list', async () => {
    render(<TopicPage topicId="brueche" />);
    const more = (await screen.findByText(/^Extra \(/)).closest('details')!;
    expect(within(more).getByRole('heading', { name: /Gemischte Zahlen/ }).textContent).toContain('Extra');
    expect(more.textContent).toContain('Das kommt in manchen Plänen später. Du kannst es trotzdem üben.');
    expect(screen.getByRole('heading', { name: 'Anteile als Bruch' }).closest('details')).toBeNull();
    cleanup();
    current.state = stateWith({}, { settings: { ...stateWith().settings, plan: 'bg' } });
    render(<TopicPage topicId="brueche" />);
    const moved = await screen.findByRole('heading', { name: 'Gemischte Zahlen' });
    expect(moved.closest('details')).toBeNull();
    expect(screen.queryByText(/^Extra \(/)).toBeNull();
  });

  it('a restricted Stufe stays one tap away, and a hidden core skill goes under "Extra"', async () => {
    current.state = stateWith({}, { settings: { ...stateWith().settings, plan: 'bb' } });
    render(<TopicPage topicId="brueche" />);
    const gemischt = (await screen.findByRole('heading', { name: 'Gemischte Zahlen' })).closest('.skill-card') as HTMLElement;
    const inPlan = within(gemischt).getAllByRole('link').filter((l) => !l.closest('details') && /^Stufe/.test(l.textContent ?? ''));
    expect(inPlan).toHaveLength(1);
    const rest = gemischt.querySelector('details')!;
    expect(rest.textContent).toContain('Weitere Stufen (2)');
    expect(within(rest).getAllByRole('link')).toHaveLength(2);
    cleanup();
    render(<TopicPage topicId="negativ" />);
    const hidden = (await screen.findByRole('heading', { name: /Negative Zahlen im Alltag/ }));
    expect(hidden.closest('details')?.textContent).toContain('Extra');
  });

  it('Haben wir noch nicht goes through the store and moves the skill to the bottom of its list', async () => {
    const { store } = await import('../../state/store');
    const update = vi.spyOn(store, 'updateSettings').mockImplementation(() => {});
    render(<TopicPage topicId="brueche" />);
    const first = (await screen.findByRole('heading', { name: 'Anteile als Bruch' })).closest('.skill-card') as HTMLElement;
    fireEvent.click(within(first).getByRole('button', { name: 'Haben wir noch nicht' }));
    expect(update).toHaveBeenLastCalledWith({ notYet: ['brueche.anteil'] });
    update.mockRestore();
    current.state = stateWith({}, { settings: { ...stateWith().settings, notYet: ['brueche.anteil'] } });
    cleanup();
    render(<TopicPage topicId="brueche" />);
    await screen.findByRole('heading', { name: 'Anteile als Bruch' });
    const list = [...document.querySelectorAll('.skill-list')][0];
    const titles = within(list as HTMLElement).getAllByRole('heading').map((h) => h.textContent);
    expect(titles[titles.length - 1]).toBe('Anteile als Bruch');
    expect(within(list as HTMLElement).getAllByRole('button', { name: 'Haben wir noch nicht' }).at(-1)!.getAttribute('aria-pressed')).toBe('true');
  });

  it('offers the short round of 5 items on each skill, at the suggested Stufe', async () => {
    render(<TopicPage topicId="brueche" />);
    const first = (await screen.findByRole('heading', { name: 'Anteile als Bruch' })).closest('.skill-card') as HTMLElement;
    expect(within(first).getByRole('link', { name: 'Kurze Runde: 5 Aufgaben' }).getAttribute('href')).toBe('/ueben/brueche.anteil/1/kurz');
  });

  it('the recommended Stufe never depends on the plan: Stufe 1 for a new skill', async () => {
    current.state = stateWith({}, { settings: { ...stateWith().settings, plan: 'bg' } });
    render(<TopicPage topicId="brueche" />);
    await screen.findByRole('heading', { name: 'Anteile als Bruch' });
    const links = within(screen.getByRole('list', { name: 'Anteile als Bruch' })).getAllByRole('link');
    expect(links[0].textContent).toContain('Empfohlen');
    expect(links[1].textContent).not.toContain('Empfohlen');
  });

  it('disables "Gemischte Runde" with a visible reason until 2 skills are sicher', async () => {
    current.state = stateWith({ 'brueche.anteil#2': progress('sicher') });
    render(<TopicPage topicId="brueche" />);
    const button = await screen.findByRole('button', { name: 'Gemischte Runde starten' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Das geht, sobald du in 2 Übungen „Sicher“ bist\. Jetzt: 1 von 2\./)).toBeTruthy();
    cleanup();
    current.state = stateWith({ 'brueche.anteil#2': progress('sicher'), 'brueche.zahlenstrahl#1': progress('gemeistert') });
    render(<TopicPage topicId="brueche" />);
    const link = await screen.findByRole('link', { name: 'Gemischte Runde starten' });
    expect(link.getAttribute('href')).toBe('/mix/brueche');
  });

  it('counts Sicher Extras: a topic of Extras only can open "Gemischte Runde" (default plan)', async () => {
    vi.mocked(loadTopic).mockResolvedValueOnce({ topicId: 'brueche', skills: [fakeSkill('brueche.von-groessen', 'Brüche im Alltag'), fakeSkill('brueche.anteil', 'Anteile erkennen')] });
    current.state = stateWith({ 'brueche.von-groessen#1': progress('sicher'), 'brueche.anteil#1': progress('sicher') });
    render(<TopicPage topicId="brueche" />);
    const link = await screen.findByRole('link', { name: 'Gemischte Runde starten' });
    expect(link.getAttribute('href')).toBe('/mix/brueche');
    cleanup();
    // one skill in the plan and one Extra of the same topic
    current.state = stateWith({ 'brueche.anteil#1': progress('sicher'), 'brueche.gemischt#1': progress('sicher') });
    render(<TopicPage topicId="brueche" />);
    expect(await screen.findByRole('link', { name: 'Gemischte Runde starten' })).toBeTruthy();
  });

  it('counts a skill as sicher when any Stufe is sicher or gemeistert', () => {
    expect(isSkillSicher(stateWith({ 'a.b#3': progress('gemeistert') }), 'a.b')).toBe(true);
    expect(isSkillSicher(stateWith({ 'a.b#1': progress('geuebt') }), 'a.b')).toBe(false);
  });
});

describe('ProgressPage', () => {
  it('shows a skills × Stufen table only for practised topics', async () => {
    current.state = stateWith({ 'brueche.anteil#1': progress('sicher') }, { days: ['2026-10-17'] });
    render(<ProgressPage />);
    expect(screen.getByText('Du hast schon an einem Tag geübt.')).toBeTruthy();
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Übung', 'Stufe 1', 'Stufe 2', 'Stufe 3']);
    const row = within(table).getByRole('row', { name: /Anteile als Bruch/ });
    expect(row.textContent).toContain('Sicher');
    expect(screen.getAllByText(/Noch nicht geübt\./)).toHaveLength(7);
    expect(screen.getByRole('link', { name: /Meine Abzeichen/ }).getAttribute('href')).toBe('/abzeichen');
  });

  it('"Ja, auf diesem Gerät merken" hands the focus on to the note that replaces the button', async () => {
    const { store } = await import('../../state/store');
    const grant = vi.spyOn(store, 'setConsent').mockImplementation(() => {
      current.consent = 'granted';
    });
    render(<ProgressPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Ja, auf diesem Gerät merken' }));
    expect(grant).toHaveBeenCalledWith('granted');
    expect(document.activeElement?.textContent).toContain('Dein Fortschritt bleibt nur auf diesem Gerät.');
    grant.mockRestore();
  });

  it('never compares with other children', () => {
    render(<ProgressPage />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/Rangliste|andere Kinder|besser als|Platz \d/);
  });
});

describe('ProgressPage: "So hast du dich verbessert"', () => {
  const T = Array(10).fill(true);
  /** Runden: Stufe 1 went from 4 of 10 to 9 of 10; Stufe 2 became 'Sicher' after a hard start and was kept in a review. */
  function improvedState(): ProgressState {
    const s = stateWith({
      'brueche.anteil#1': progress('geuebt', { recent: [true, true, true, true, false, true, true, true, true, true] }),
      'brueche.anteil#2': progress('sicher', { recent: T }),
      'brueche.zahlenstrahl#1': progress('geuebt', { recent: [true, false, false, false, false, false, false, false, false, false] }),
      'dezimal.plus-minus#1': progress('sicher', { recent: T }),
    });
    s.growth = {
      stufen: {
        'brueche.anteil#1': { earlyN: 10, earlyOk: 4, earlyWrong: 6, earlyDay: '2026-10-10', after: 10, best: 9 },
        'brueche.anteil#2': { earlyN: 10, earlyOk: 4, earlyWrong: 6, earlyDay: '2026-11-12', after: 4, kept: 1 },
        // got worse: never shown
        'brueche.zahlenstrahl#1': { earlyN: 10, earlyOk: 5, earlyWrong: 5, earlyDay: '2026-10-12', after: 10, best: 1 },
      },
      // stored tags are misconception families (src/topics/errorFamilies.ts)
      errors: { 'dezimal.plus-minus': { 'test-plain': { day: '2026-10-12', seen: 2, run: 5, done: '2026-10-14' }, 'test-anderes': { day: '2026-10-13', seen: 2, run: 2 } } },
    };
    return s;
  }

  /** The block under a topic: an h3 named "So hast du dich verbessert: <topic>" (no extra landmark). */
  async function growthIn(topic: RegExp): Promise<HTMLElement> {
    const region = await screen.findByRole('region', { name: topic });
    const heading = await within(region).findByRole('heading', { level: 3, name: /^So hast du dich verbessert/ });
    return heading.closest<HTMLElement>('.progress-growth')!;
  }
  const linesOf = (block: HTMLElement) => [...block.querySelectorAll('.progress-growth__lines li')].map((li) => li.textContent);

  it('lists only improvements per skill, positively worded, under the topic', async () => {
    current.state = improvedState();
    render(<ProgressPage />);
    const growth = await growthIn(/^Brüche/);
    // the heading names the topic for screen readers (headings list), like the table caption does
    expect(within(growth).getByRole('heading', { level: 3 }).textContent).toMatch(/^So hast du dich verbessert: Brüche/);
    expect(screen.queryByRole('region', { name: /So hast du dich verbessert/ })).toBeNull();
    const skills = [...growth.querySelectorAll('.progress-growth__skill')];
    expect(skills.map((li) => li.querySelector('.progress-growth__name')!.textContent)).toEqual(['Anteile als Bruch']);
    expect(linesOf(growth)).toEqual([
      'Stufe 1: Am Anfang 4 von 10 auf Anhieb, später 9 von 10.',
      'Stufe 2: Am Anfang 4 von 10 auf Anhieb – jetzt ist die Stufe „Sicher“.',
      'Stufe 2: Das war vorher noch knifflig. In der Wiederholung hast du es auf Anhieb gelöst.',
    ]);
    // Stellenwerte got worse: nothing is said about it.
    expect(growth.textContent).not.toContain('Brüche am Zahlenstrahl');
    const lines = linesOf(await growthIn(/^Dezimalzahlen/));
    expect(lines).toContain('Du hast den Übertrag fünfmal richtig beachtet.');
    // not yet overcome: nothing is said about it
    expect(lines.join(' ')).not.toMatch(/geordnet/i);
  });

  it('never says "0 von 10"', async () => {
    const s = stateWith({ 'brueche.anteil#2': progress('sicher') });
    s.growth = {
      stufen: { 'brueche.anteil#2': { earlyN: 10, earlyOk: 0, earlyWrong: 10, earlyDay: '2026-10-10', after: 10, best: 7 } },
      errors: {},
    };
    current.state = s;
    render(<ProgressPage />);
    expect(linesOf(await growthIn(/^Brüche/))).toEqual(['Stufe 2: Am Anfang war das noch knifflig – später 7 von 10 auf Anhieb.']);
  });

  it('a tag without a family still gets a calm, positive line (said once)', async () => {
    const st = stateWith({ 'dezimal.plus-minus#1': progress('sicher', { recent: T }) });
    const done = { day: '2026-10-12', seen: 2, run: 5, done: '2026-10-14' };
    st.growth = { stufen: {}, errors: { 'dezimal.plus-minus': { 'neu.fehler': done, 'noch-neuer': { ...done, done: '2026-10-15' } } } };
    current.state = st;
    render(<ProgressPage />);
    expect(linesOf(await growthIn(/^Dezimalzahlen/))).toEqual(['Du hast die knifflige Stelle in diesen Aufgaben fünfmal richtig gelöst.']);
  });

  it('shows nothing (no empty box, no pressure) without improvement', async () => {
    current.state = stateWith({ 'brueche.anteil#1': progress('geuebt', { recent: [true, false] }) });
    render(<ProgressPage />);
    await screen.findByRole('table');
    expect(screen.queryByRole('heading', { name: /So hast du dich verbessert/ })).toBeNull();
    expect(document.querySelector('.progress-growth')).toBeNull();
  });

  it('the view is plain text in headings and lists: nothing to operate, the topic link stays reachable by keyboard', async () => {
    current.state = improvedState();
    render(<ProgressPage />);
    const growth = await growthIn(/^Brüche/);
    expect(growth.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
    // reading order: table, then the improvements, then "Weiter üben"
    const link = screen.getByRole('link', { name: 'Weiter üben: Brüche' });
    expect(growth.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const text = document.body.textContent ?? '';
    for (const banned of IMPROVEMENT_BANNED_PHRASES) expect(text.toLowerCase(), banned).not.toContain(banned);
    expect(text).not.toMatch(/schneller|schlau|0 von 10/i);
  });
});

describe('BadgesPage', () => {
  it('lists only earned badges (newest first) and keeps the rest a surprise', () => {
    current.state = stateWith({}, { badges: { 'brueche-sicher': '2026-10-01', 'behalten': '2026-10-12', 'unbekannt': '2026-10-13' } });
    render(<BadgesPage />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Gut behalten');
    expect(items[0].textContent).toContain('Bekommen am 12.\u00A0Oktober 2026');
    expect(items[1].textContent).toContain('Brüche: Sicher');
    expect(screen.queryByText('Noch offenes Abzeichen')).toBeNull();
    // No teaser for badges still to come (M6/M8: no list of rewards to chase).
    expect(document.body.textContent).not.toMatch(/noch mehr|entdecken|freischalten|sammle/i);
    expect(earnedBadges({}).length).toBe(0);
  });
});

describe('Legal pages', () => {
  it('Datenschutz: says the stored Kürzel tells Land and Schulart, and that Hosting logs also serve usage analysis', () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/lässt also auf das Bundesland und, außer bei bb und offen, auf die Schulart schließen/);
    for (const code of ['bg, bm und br für Bayern und je eine Schulart', 'bb für Berlin oder Brandenburg', 'ng und nr für NRW', 'offen für ein anderes Land']) expect(text.replace(/\s+/g, ' ')).toContain(code);
    expect(text).toMatch(/Haben wir noch nicht/);
    expect(text).not.toMatch(/keine Klasse, keine Schule/);
    expect(text).toMatch(/Auswertungen zur Nutzung/);
  });

  it('Für Erwachsene: maps each Kürzel to its answer', () => {
    render(<AdultsPage />);
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('„bm“ für „Bayern Mittelschule“');
    expect(text).toContain('„Richtig. Du hast an den Übertrag gedacht.“');
    expect(text).not.toContain('Richtig!');
  });

  it('Datenschutz: child layer of 5–7 short sentences, then the full text with placeholders', () => {
    render(<PrivacyPage />);
    expect(KIDS_PRIVACY.length).toBeGreaterThanOrEqual(5);
    expect(KIDS_PRIVACY.length).toBeLessThanOrEqual(7);
    for (const s of KIDS_PRIVACY) {
      for (const sentence of s.split(/(?<=\.)\s+/)) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(15);
    }
    const kids = screen.getByRole('region', { name: 'Kurz erklärt' });
    expect(within(kids).getAllByRole('listitem')).toHaveLength(KIDS_PRIVACY.length);
    const text = document.body.textContent ?? '';
    for (const needle of ['Google Ireland Limited', 'Art. 6 Abs. 1 lit. f DSGVO', 'Data Privacy Framework', 'Standardvertragsklauseln', 'mathe6.v1', 'Art. 77', 'Art. 15', 'Art. 21', 'keine Cookies']) {
      expect(text, needle).toContain(needle);
    }
    // every way to agree is named, and so is the day a Stufe became "Sicher" (the list says "nur")
    for (const needle of ['„Ja, merken“', '„Ja, auf diesem Gerät merken“', '„Fortschritt auf diesem Gerät merken“', 'Stufe „Sicher“']) expect(text, needle).toContain(needle);
    expect(screen.getAllByText(OPERATOR_PLACEHOLDER).length).toBeGreaterThan(0);
  });

  it('Datenschutz: names the data of the improvement badges (days only, error types)', () => {
    render(<PrivacyPage />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('für die Abzeichen fürs Besserwerden');
    expect(text).toContain('typischen Fehlerarten');
    expect(text).not.toContain('Einmaleins');
    expect(text).toContain('„Welcher Lehrplan passt?“');
    expect(text).toContain('nur das Datum, ohne Uhrzeit');
  });

  it('Datenschutz: localStorage rests on the § 25 Abs. 2 Nr. 2 TDDDG exemption only, never on consent (P1/P2)', () => {
    render(<PrivacyPage />);
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('§ 25 Abs. 2 Nr. 2 TDDDG');
    // A DSGVO consent of a child would trigger Art. 8 – the design avoids relying on consent.
    expect(text).not.toMatch(/Einwilligung|Art\. [78](?!\d)|§ 25 Abs\. 1(?!\d)/);
    expect(text).toContain('„Nicht mehr merken“');
    expect(text).toContain('der Betreiber erhält sie nicht');
  });

  it('Impressum: § 5 DDG with placeholders while the operator config is empty', () => {
    render(<ImprintPage />);
    expect(screen.getByRole('heading', { name: 'Angaben gemäß § 5 DDG' })).toBeTruthy();
    expect(screen.getAllByText(OPERATOR_PLACEHOLDER).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole('link', { name: /@/ })).toBeNull();
  });
});

describe('tone (T16)', () => {
  it('home, topic, progress and badges keep the plain tone: no baby talk, no emoji, at most one exclamation mark on a screen', async () => {
    current.state = stateWith({ 'brueche.anteil#1': progress('sicher') }, { badges: { 'brueche-sicher': '2026-10-01' }, days: ['2026-10-01'] });
    for (const page of [<HomePage key="h" />, <TopicPage key="t" topicId="brueche" />, <ProgressPage key="p" />, <BadgesPage key="b" />]) {
      render(page);
      await new Promise((r) => setTimeout(r, 0));
      // "Haben wir noch nicht" keeps its exact wording from §2.5: the class speaks here, not a fake teacher voice.
      document.querySelectorAll('.skill-card__not-yet').forEach((el) => el.remove());
      expect(toneProblems([document.body.textContent ?? '']), String(page.key)).toEqual([]);
      cleanup();
    }
  });
});

describe('language', () => {
  it('no page uses banned phrases or ×/÷', async () => {
    current.state = stateWith({ 'brueche.anteil#1': progress('sicher') }, { badges: { 'brueche-sicher': '2026-10-01' }, days: ['2026-10-01'] });
    const pages = [<HomePage key="h" />, <TopicPage key="t" topicId="brueche" />, <ProgressPage key="p" />, <BadgesPage key="b" />, <AdultsPage key="a" />, <PrivacyPage key="d" />, <ImprintPage key="i" />, <NotFoundPage key="n" />];
    for (const page of pages) {
      render(page);
      await new Promise((r) => setTimeout(r, 0));
      // The adult page names the school types in its plan table and in its notes on purpose (§2.5); the privacy page says what the stored code reveals. Nothing for the child does.
      document.querySelectorAll('[data-testid="plan-choice"]').forEach((el) => el.remove());
      const lower = (document.body.textContent ?? '').toLowerCase();
      // The page for adults names the plans; the school types stay away from every page a child reads.
      const banned = BANNED_PHRASES.filter((b) => page.key !== 'a' || !/gymnas|schul/.test(b));
      for (const b of banned) {
        const re = new RegExp(`(^|[^a-zäöüß])${b}([^a-zäöüß]|$)`);
        expect(re.test(lower), `"${b}" on ${String(page.key)}`).toBe(false);
      }
      expect(lower.includes('×') || lower.includes('÷')).toBe(false);
      cleanup();
    }
  });
});
