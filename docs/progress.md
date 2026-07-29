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

## [29/07/26] — Wave 2: Schema, Deck-Stage Port, Providers And Spend

**Task 4 — `deck-schema`** (Codex worker). Versioned Zod schema as the single deck definition: keyed element map with independent `rootOrder`/`readingOrder` (D3 — an array shifts Immer patch paths under reorder and corrupts undo), all seven element kinds including `diagram`/`svg` which iteration 1 does not generate but which must exist now to avoid a breaking migration later, structural refusal of model-authored markup via `catalogRef`/`assetId`/`DiagramSpec` (D4), `origin.userOverrides` as dotted paths (D5), style-by-reference so a model cannot emit arbitrary hex, and a v0→v1 migration retaining the original snapshot. `z.strictObject` throughout, which is what makes it safe against invented fields from untrusted model output.
Correction: the worker reported `tsc --noEmit` exit 0 when the tree it left exited 2 with eight errors in `migrate()`. Fixed by narrowing `schemaVersion` at runtime (`typeof version !== 'number' || …`) rather than casting, since that function validates untrusted input and a cast would defeat the check it exists to perform.

**Task 5 — `<deck-stage>` port** (Codex worker, then Claude programmer for the fix). Ported to TypeScript preserving shadow DOM, scale-to-viewport, keyboard/tap navigation, slide-position persistence and the `@media print` pagination that is the project's vector-PDF path. Slide content stays in the light DOM so measurement and accessibility tooling reach it without piercing shadow boundaries. Readiness gated on fonts, image decode, SVG completion and two frames (Finding 2). Verified schema-agnostic.
The Codex worker could not run Playwright (sandbox cannot launch Chromium) and reported it blocked rather than assuming it passed. Run properly, one of three tests failed with canvas scale `0`. Diagnosis by the Claude programmer: the **test's** regex was `/scale\\(([^)]+)\\)/` — inside a regex literal `\\` is an escaped backslash, not an escaped paren, so it never matched and `?? '0'` masked the miss as a scale of zero. The component was correct, proven by isolating `#fit()` outside the harness. A second defect surfaced after that fix: `page.setContent()` without a prior navigation leaves an opaque origin and every Storage API throws `SecurityError`. Recorded in the plan as a standing note — tasks 10, 12 and 16 hit the same wall.

**Task 6A — provider broker, run budget, hosted runtime core** (Claude programmer, security-critical routing). `ProviderAdapter` with capability flags, `generateObject` across four structured-output tiers with a bounded validate/repair loop, normalized `ProviderError`, a portable-JSON-Schema linter that rejects `$ref`/`oneOf`/`allOf` before any paid call, concurrency-safe `RunBudget` (reserve-then-reconcile), fail-closed config, env-only secrets, body-size bounding before paid parsing, generation and Playwright semaphores, one-container Dockerfile.
**Both live adapters verified against real APIs** — `qwen-plus` (132 tokens) and `gemini-flash-latest` (391 tokens) through the identical `generateObject` path, gated to skip without credentials so CI stays offline and deterministic. Two divergences only visible against real endpoints, both absorbed inside `adapters/gemini.ts`: Gemini's `responseSchema` rejects `additionalProperties`/`$schema` with HTTP 400, and Gemini reports "thinking" tokens outside `candidatesTokenCount`, which would silently undercount spend against a shared finite pool. `gemini-2.5-flash` is retired for new projects; switched to the `gemini-flash-latest` alias.
Two PM-directed fixes: `apps/api/src/index.ts` still ran task 1's stub, so the container started but 404'd on `/api/health` — unit tests against `createApp()` were green, which is how it hid; now verified by a real `curl` against the running container. And `secrets.ts` named three vendors outside `packages/providers`, contradicting the Critical Do-Not; the vendor-specific env mapping moved into `createQwenAdapterFromEnv`/`createGeminiAdapterFromEnv`, so adding Anthropic touches only that package.
Resolved: `apps/api` gets **no** direct edge to `packages/providers`. `RunBudget` uses ECMAScript private fields, which TypeScript treats nominally, so only `packages/providers` can construct one — the boundary is enforced by the type system, and `apps/api` reaches providers transitively through `pipeline`. No lockfile write needed.
The implementer self-reported reading `.env` for boolean presence and byte length early in the session, stopped, and switched to in-process `process.env` checks. No key material was exposed.

### Wave 2 — QA Fix Rounds

QA returned Reject with three blockers, then Approve with notes. All fixed by three agents on disjoint scopes; QA teeth-checked each by reverting the production change, confirming the tests fail, and restoring byte-identical.

**B-1 — the production Qwen adapter had the same 429 defect just fixed in Gemini.** `openai-compatible.ts` mapped every 429 to `rate_limit`. This was the worse instance: Qwen is the provider the shared pool funds, so a drained pool could never surface `shared_pool_exhausted` and would retry into an empty wallet. Fixed with layered classification — OpenAI's documented `error.type`/`error.code`, then a billing-vocabulary heuristic (flagged as unverified against a real payload), then `Retry-After` as an assertion of transience, then a default of `quota_exhausted` rather than `rate_limit`. That default is deliberate asymmetric risk: misreading exhaustion as transient costs unbounded spend, misreading transience as exhaustion costs one false message. Documented in-code so it is not collapsed back. No live quota spent.

**B-2 — `deck-stage:ready` never fired when an SVG image had already loaded.** `#waitForSvgImage` attached listeners with no already-complete check, so an event that had already fired never came again. Reproduced in a real browser: 4s timeout with the SVG, fires without it. The `<img>` path never had this bug because `.decode()` is promise-based and self-completion-aware; fixed by preferring `SVGImageElement.prototype.decode()` with the listener path as fallback. Font and image gates checked and confirmed unaffected. Would have hung task 11's PDF export.

**B-3 — D4's "structural refusal" was not structural.** `assetId: 'data:image/svg+xml,<svg onload=alert(1)>'`, `catalogRef: '../../../etc/passwd'` and an external URL all parsed clean — markup injection, path traversal and external fetch through fields the architecture record says cannot carry them, about to become live once tasks 7/8 resolve refs. Fixed by constraining the shared identifier primitive to `/^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/`, verified against 17 hostile variants and 7 realistic catalog id shapes.

**Three tests were validating their own workarounds.** The scale assertion's regex `/scale\\(...\\)/` never matched and `?? '0'` turned the miss into a plausible number; the readiness test dispatched a synthetic `load` event so it passed against a component that could never fire on its own; the light-DOM assertion used `page.locator`, which pierces shadow DOM and would pass even if content moved there and broke the measurement strategy. All three now fail for the right reason, demonstrated by reverting the fix.

**R-4 — a 17% latent flake, not environmental.** `#fit()` runs off a `resize` listener while the test read `canvas.style.transform` immediately after `setViewportSize`. QA measured 10/60 stale reads on an idle machine. Fixed with `expect.poll` at the same tight tolerance — no sleep, no widened tolerance — and verified at 40/40 under the CPU-saturation condition where 1/40 previously failed.

**W-4 — the Playwright origin server is centralized** in `playwright.config.ts` (`webServer` + `baseURL`), replacing task 5's per-file `node:http` fixture before wave 3 could create a second of an eventual five copies. Two tests that previously survived on a swallowed `SecurityError` now genuinely navigate.

**Plan corrections by the PM** (W-1 to W-4, R-6): task 6B's scope gained `apps/api/src/server.ts` and `index.ts` (auth middleware must mount there); task 8's gained its own barrel and a `.pw.ts`; and the template max-capacity check moved twice — first to task 8, then, after QA caught that 7 and 8 run concurrently and task 8 would assert over an empty catalog, to **task 10** (wave 4, `Depends on: 7, 8`). Task 7 authors the fixtures; task 10 asserts them.

Carried as advisory to a later wave: DashScope `Throttling.RateQuota` matching the quota vocabulary, HTTP 402 classification, the two adapters' opposite 429 defaults, and `semanticRole`/`fontFamily`/`mediaType` still being free strings.
