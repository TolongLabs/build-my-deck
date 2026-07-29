# PROGRESS

> Append-only log. **PG** adds a dated entry after each task; **QA** records test/build results. Newest at the bottom.

Format:

```
## [DD/MM/YY] — <Task Name>

- What changed (brief).
- Files touched.
- Test/build status.
```

---

## [29/07/26] — Import workspace tooling from SahurHub (fast lane)

- Imported `.agents/skills/pm-workflow/` (SKILL.md, templates/, update-check.js, .version) verbatim from `/home/adam/CS/qwen/SahurHub/.agents/skills/pm-workflow/`; added `.claude/skills/pm-workflow` as a relative symlink (`../../.agents/skills/pm-workflow`).
- Imported `.agents/skills/hackathon-shared-resources/` verbatim (SKILL.md + knowledge/ 12 files + playbooks/ 4 files + templates/ 5 files = 22 files, confirmed via `find | wc -l` = 22); added `.claude/skills/hackathon-shared-resources` symlink. Grepped for QBH-specific coupling (`QBH|Qwen Brainrot|brainrot|2-hour|25 July|50/30/20`) — no hits, package is clean and repo-agnostic.
- Skipped the other hackathon-* skills (idea-generator, idea-scoring, scope-cutter, judge-simulator, demo-script, wow-detector) per acceptance criteria — out of scope for this import.
- Created `.graphifyignore` at repo root, adapted from SahurHub's: kept the `docs/*` + `!docs/prd.md` + `!docs/trd.md` re-include pattern, added `.agents/` `.claude/` `.codex/` (imported skills + agent scaffolds are reference material, not project code), and excluded scaffold/instruction files that exist in this repo (`AGENTS.md`, `CLAUDE.md`, `LICENSE`, `biome.json`, `commitlint.config.js`, `.env.example`) plus binary-asset globs. Dropped SahurHub-only entries this repo doesn't have (`GEMINI.md`, `.cursorrules`, `.windsurfrules`, `RTK.md`, `.husky/`, `bun.lock`, `package.json`).
- Copied `commitlint.config.js` verbatim (type-enum already matches `AGENTS.md`'s Conventional Commits list).
- Copied `biome.json`; `files.ignore` (`.agents/**`, `graphify-out/**`) already matches this repo's actual directories, so no further adaptation needed.
- Created `.gitignore` adapted from SahurHub's: kept JS/Bun, env/secrets, OS/editor, and graphify sections; dropped SahurHub-specific sections (Python, `cert/` mkcert, `*.sqlite`, `_research/`, `tmp/`, `output/`, `characters/` — none of the latter three actually appeared in SahurHub's file, only Python/cert/sqlite/_research/tmp/output were present to drop).
- Created a minimal `.env.example` — comment header only, no invented provider variable names (the provider adapter layer is an open Gate 1 decision).
- **Deliberately skipped:** `.prettierrc` / `.prettierignore` (Biome already covers formatting/linting — decided with the human, would duplicate config). `.husky/` (its hooks call `bunx commitlint` / `bunx lint-staged`, which need a `package.json` and install that don't exist yet — deferred until the stack lands). Follow-up: restore two hooks once `package.json` exists —
  - `commit-msg`: `bunx commitlint --edit "$1"`
  - `post-commit`: `[ -f graphify-out/graph.json ] && command -v graphify >/dev/null 2>&1 && graphify update . >/dev/null 2>&1 || true`
  - (SahurHub also has a `pre-commit` hook — `bunx --no lint-staged` — not requested in the acceptance criteria but noted here for completeness when `.husky/` is restored.)
- No `package.json`/`tsconfig.json`/framework scaffolding created — stack remains an open Gate 1 decision. No commits, no pushes, no branches made.
- Files touched: `.agents/skills/pm-workflow/**` (new), `.agents/skills/hackathon-shared-resources/**` (new), `.claude/skills/pm-workflow` (new symlink), `.claude/skills/hackathon-shared-resources` (new symlink), `.graphifyignore` (new), `commitlint.config.js` (new), `biome.json` (new), `.gitignore` (new), `.env.example` (new), `docs/progress.md` (this entry).
- Test/build status: N/A — no build tooling exists yet (no `package.json`). Verified via `test -L`/`test -f` on both symlinks, `find | wc -l` on hackathon-shared-resources, and the QBH grep (0 hits).
- **Known state:** the copied playbooks under `.agents/skills/hackathon-shared-resources/playbooks/` contain ~55 relative links to `../../hackathon-*/SKILL.md` for the six skills deliberately not imported. The files are kept verbatim by design; the links are expected to dangle. Do not edit them.
- **Known state:** the deferred `.husky/` follow-up (see above) should also note SahurHub's third hook, `pre-commit`: `bunx --no lint-staged`.

## [29/07/26] — Add documentation hygiene and README-vs-TRD directives (fast lane)

- Added two new bullets to `AGENTS.md`'s `## Working Conventions` section, placed after `Log progress.` and before `No secrets in repo.` (grouped with the other documentation-related bullets, matching existing bullet style — bold lead-in term, period, then the rule):
  - **Documentation hygiene.** Always format text in TitleCase for headings, subheadings, labels, bullet points and tables.
  - **README vs TRD.** `README` documents only the WHATs, HOWs and WHYs — plus diagrams for notable components/pipelines — from a high-level system-architecture standpoint; `docs/trd.md` documents only development-related technical information that serves as a programming and implementation reference. Consistent with the existing rule: architecture lives in `docs/trd.md` (canonical), and `docs/architecture.md` is never created.
- Scope is forward-looking only per acceptance criteria — did not retroactively reformat any existing headings, bullets, or tables in `AGENTS.md` or elsewhere.
- No other line of `AGENTS.md` touched; no commits, no pushes, no branches.
- Files touched: `AGENTS.md`, `docs/progress.md` (this entry).
- Test/build status: N/A — documentation-only change. Verified via `git diff --stat` that only these two files changed.

## [29/07/26] — Fast-lane fix round: QA findings + human decisions

- Rewrote the `Documentation hygiene` bullet in `AGENTS.md` per human decision: Title Case now scoped to headings, subheadings, labels, bullet-point lead-ins and table headers; full sentences and commit subjects are explicitly exempted (closes the `subject-case: never start-case` commitlint tension QA flagged).
- Rewrote the `README vs TRD` bullet in `AGENTS.md` per human decision: dropped the over-interpreting trailing sentence QA flagged; replaced with an explicit "split by altitude" statement (depth/audience, not subject) so it can't be misread as contradicting the `## Architecture` section. `## Architecture` and Critical Do-Nots left untouched.
- Fixed `biome.json`'s `files.ignore`: added `.claude/**` and `.codex/**` alongside the existing `.agents/**` and `graphify-out/**` — `.claude/skills/impeccable/` is a real vendored tree here (unlike SahurHub, where the equivalent path is a symlink), and Biome would otherwise lint/reformat ~123 vendored files.
- Broadened `.gitignore`'s env coverage: replaced `.env` / `.env.local` / `.env.*.local` with `.env*` plus `!.env.example`, so `.env.production` / `.env.development` and any other env variant are covered. Verified with `git check-ignore -v`: `.env.production` is ignored, `.env.example` is not.
- Fixed the self-contradicting file count in the `[29/07/26] — Import workspace tooling from SahurHub` entry above: the `hackathon-shared-resources` breakdown undercounted `templates/` (3 → 5 files); corrected the sum to 22, matching the `find | wc -l` = 22 already cited.
- Appended two known-state notes to that same entry (playbooks' ~55 dangling relative links to un-imported hackathon-* skills, by design; the deferred `.husky/` follow-up should also restore SahurHub's `pre-commit` hook — `bunx --no lint-staged`). Documentation only — did not edit the playbook files themselves.
- **Did not** perform the Impeccable dedup (task 5 of the fix round): `diff -r .claude/skills/impeccable .agents/skills/impeccable` shows the trees are **not** identical — they are provider-specific variants, not accidental duplicates. The `.claude/` tree targets Claude Code (`IMPECCABLE_PROVIDER_ID = "claude-code"`, `/` command prefix, `allowed-tools: Bash(node .claude/skills/impeccable/scripts/*)`, frontmatter/prose referencing `.claude/skills/impeccable` paths); the `.agents/` tree targets the generic/Codex-style harness (`IMPECCABLE_PROVIDER_ID = "agents"`, `$` command prefix, references to `.agents/skills/impeccable` paths, plus an `agents/` subdirectory of three `.toml` role files and an `openai.yaml` that `.claude/`'s tree doesn't have at all). Per the fix-round instructions, stopped without deleting or symlinking anything; both trees left in place. This needs a human/PM decision, not a PG judgment call.
- Files touched: `AGENTS.md`, `biome.json`, `.gitignore`, `docs/progress.md` (this entry). No `.claude/skills/impeccable` or `.agents/skills/impeccable` changes.
- Test/build status: N/A — documentation/config-only. Verified via `git status --short`, `git check-ignore -v .env.production .env.example`, `test -f .claude/skills/impeccable/scripts/hook.mjs && node --check .claude/skills/impeccable/scripts/hook.mjs` (hook resolves and passes syntax check unchanged), and `diff -rq` between the two impeccable trees (29 files differ + one extra directory, not counted as identical). No commits, no pushes, no branches.

## [29/07/26] — Wave 1: Toolchain Foundation And Canonical Docs

**Task 1 — Toolchain And Workspace Foundation** (Codex worker, gpt-5.6-terra).
Root manifest with Bun workspaces, `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, bundler resolution, `verbatimModuleSyntax`), ten workspace stubs under `@build-my-deck/*` (`packages/{deck-schema,render,templates,providers,pipeline,validate,export,editor}` + `apps/{web,api}`), pre-created shared barrels and API route mounts so later waves never collide on root files, full iteration-1 dependency set installed, `.husky/` hooks restored (`commit-msg`, `pre-commit`, guarded graphify `post-commit`), `.env.example` expanded with blank names only, `biome.json` ignore extended with `**/dist/**`.
Verified: `bun pm ls` lists all ten workspaces and no `apps/cli`; `bun install --frozen-lockfile` exit 0; `bunx tsc --noEmit -p tsconfig.base.json` exit 0; `bunx biome check .` exit 0 over 41 files; commitlint accepts a valid subject and rejects an invalid one; `git check-ignore` confirms `.env`, `.env.development`, `.env.production` ignored.
Note: the first attempt was blocked because Codex's `workspace-write` sandbox refuses registry network access. Resumed with `-c sandbox_workspace_write.network_access=true`. **Any future Codex worker needing network (tasks 6A, 6B, 16 hit live Qwen and Gemini) must set that flag** or it fails in a way that looks like a code fault rather than a sandbox one.
Open for QA: Chromium was installed to `/tmp/build-my-deck-playwright-browsers` via `PLAYWRIGHT_BROWSERS_PATH`, not the default cache. That location is ephemeral and unreferenced by repo config.

**Task 2 — Canonical Product, Architecture, And Design Records** (Claude programmer).
Wrote `docs/prd.md`, `docs/trd.md` (Q1-Q16 recorded as settled outcomes, the five Verified Findings, and both first-class architectural properties), `docs/PRODUCT.md` and `docs/DESIGN.md` (editor chrome only — the generated decks' design systems are code and belong to task 7).
Surgically updated `AGENTS.md`: the stale "users supply their own API key" premise replaced with the hosted shared-pool posture; a third hard product constraint added for GitHub identity, private-by-default decks and physical deletion.
Follow-up approved by the PM after the programmer flagged rather than improvised: `## Architecture` ("Not yet designed") and `## Tech Stack` ("Undecided") replaced with settled orientation pointing at `docs/trd.md` as canonical, and the Critical Do-Not "do not invent a stack decision" — which had become a direct contradiction of the TRD — replaced with "do not silently deviate from the architecture recorded in `docs/trd.md`".

Gate 1 closed this session across three planning rounds (initial plan, blind Codex peer consult + synthesis, hosted-posture reversal). Decisions recorded in `docs/plan.md` under `## Settled At Gate 1`.

### Wave 1 — QA Fix Rounds

Two QA rejects, then Approve with notes. All findings resolved; the loop cap was reached and the human authorized continuing (new findings each pass, not repeats).

**Round 1 fixes.** `bun run build` argument order (`bun run --filter '*' build`); `jsx: react-jsx` plus a widened root `include` — the prior config silently skipped every `.tsx`, so the root typecheck would have gone *falsely green* from task 8 onward; `zod` bumped `^3` → `^4` (4.4.3) because the recorded Gate-1 rationale for choosing Zod over TypeBox rests on `z.toJSONSchema`, absent in v3; eight cross-workspace `workspace:*` edges pre-declared under PM authorization so no later wave writes `bun.lock`; `test-results/` and `playwright-report/` gitignored; `PORT` and `DATA_DIR` added to `.env.example` with `DATA_DIR` recorded in `docs/trd.md` as the canonical name; PRD constraint count reconciled with `AGENTS.md`; `--bmd-editor-danger` raised to `#F0788A` (4.39:1 → 5.74:1, WCAG AA).

Chromium was installed to the default cache by the PM, not the worker: Codex's `workspace-write` sandbox cannot write outside the workspace, which is why the first attempt diverted to `/tmp`. Verified by a real `chromium.launch()` and a `%PDF-` from `page.pdf()`.

**Round 2 fixes.** Biome regression from the multi-line `include` collapsed; six further workspace edges added for waves 4-6; `playwright.config.ts` created.

**Test-runner convention (PM decision).** Playwright tests are `*.pw.ts`, unit tests `*.test.ts`. `.spec.ts` was rejected after QA printed Bun's own collection glob — `**{.test,.spec,_test_,_spec_}.{js,ts,jsx,tsx}` — proving `bun test` claims `.spec` too, so the conventional choice would not have separated the runners. Task 16's declared `slice-1.spec.ts` carried the same latent collision.

**Plan amendments made by the PM** (recording decisions, not implementing): `playwright.config.ts` added to task 1's scope; `.pw.ts` files declared for tasks 5, 10, 12 and 16; and a new rule assigning own-package barrel ownership — every workspace's bare-string `exports` admits no subpaths, so barrels must grow with their package, and "never edited later" applies to root files only. Verified collision-free against the wave plan.

**Wave 2 cleared to dispatch** by QA: tasks 4, 5 and 6A have disjoint scopes and none is forced onto `bun.lock` or a root config.
