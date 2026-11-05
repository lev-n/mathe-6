# Contributing to Mathe 6

Thanks for helping! Bug reports, content corrections (maths, German wording, curriculum fit) and pull requests are welcome.

## Before you start

- For larger changes (new skills, new answer types, design or learning-flow changes), please open an issue first.
- The design follows the research in [`docs/research.md`](docs/research.md). Every change must pass the banned-patterns checklist in §7.2: no timers, no streaks, leaderboards, currencies or pop-ups during a round, no "Falsch!" feedback, no third-party requests, no storage before opt-in.
- Student-facing text is German, du-form, short, factual and respectful (`docs/research.md` §4, §7.1). Code, comments and docs are English.
- The content has been checked by automated tests and AI review, not by teachers. Corrections from teachers are especially welcome.

## Setup

Requirements: Node.js 22.22+, 24.15+ or 26+ (CI uses 26) and npm.

```bash
npm ci
npm run dev         # http://localhost:5173
npm run typecheck
npm test
npm run build
```

CI runs `npm run typecheck`, `npm test` and `npm run build` on every push and pull request. All three must pass.

## Guidelines

- **Generators stay pure.** A skill's `generate(rng, stufe, ctx)` uses only `rng` for randomness and the formatting helpers for numbers. Never rename a skill id, because progress is stored by id. See "Adding a skill" in the README.
- **Tests.** Every new skill gets a `<slug>.test.ts` with `describeSkill(skill)`. UI changes need jsdom tests, including keyboard use.
- **Privacy.** Keep the app free of tracking, analytics, ads, cookies, external fonts and CDNs. `scripts/check-dist.mjs` fails the build on third-party hosts and inline scripts. Do not add runtime dependencies without discussing it first.
- **Accessibility.** Keep WCAG 2.2 AA: contrast from `src/styles/tokens.css`, touch targets ≥ 48 px (keypad and primary buttons ≥ 56 px), full keyboard support, visible focus, screen-reader text for every task.
- **Operator data.** Do not put real names or addresses into `src/config/operator.ts` in a pull request. Each deployment fills in its own.

## License

Mathe 6 is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). By submitting a contribution, you agree that it is licensed under the same terms (`AGPL-3.0-or-later`).
