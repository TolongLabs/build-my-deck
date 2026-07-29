# TEST / QA VERDICTS

> Owned by **QA**. The PM reads the latest verdict at **Gate 2**. Newest at the bottom.

Format:

```
## [DD/MM/YY] — <Task Name>

**Verdict:** Approve | Approve with comments | Reject with reasons

**Findings:**
- `file:line` — [severity] what's wrong → suggested fix

**Smoke test:** <build/test/lint command and result>
```

---

## [29/07/26] — Import SahurHub workspace tooling + two AGENTS.md directives (fast lane)

**Verdict:** Approve with comments

Two items should be resolved before the commit: F-1 (unrequested editorial claim in the README-vs-TRD bullet) and F-3 (`biome.json` ignore list misses `.claude/**`). Everything else is advisory.

### Acceptance criteria

| # | Criterion | Result |
| - | --------- | ------ |
| 1 | `.agents/skills/pm-workflow/` real dir; `.claude/skills/pm-workflow` relative symlink | PASS — `diff -r` vs source identical (17 files); symlink target `../../.agents/skills/pm-workflow`, resolves inside the repo, not dangling |
| 2 | `hackathon-shared-resources` copied + symlinked; count matches source | PASS — source `find -type f \| wc -l` = **22**, destination = **22**, `diff -r` identical; symlink relative and resolving |
| 3 | Free of Qwen-Brainrot-Hackathon coupling | PASS — PG's grep re-run: **0 hits**. Extended grep (`qwen\|sahur\|alibaba\|dashscope\|tongyi\|organiz(er\|ers)`) also clean; only generic mentions remain (`Devpost` as a submission platform, `MLH/HackMIT/ETHGlobal` as example events, `[Hackathon name and track]` as a template placeholder). No event dates, no rubric weightings. See F-5 for the one residual coupling that *is* present — to sibling skills, not to the event |
| 4 | `.graphifyignore` adapted | PASS — `docs/*` + `!docs/prd.md` + `!docs/trd.md` intact; `.agents/`, `.claude/`, `.codex/` excluded; `GEMINI.md`, `.cursorrules`, `.windsurfrules`, `RTK.md`, `.husky/`, `bun.lock`, `package.json`, `.prettierrc`, `!docs/project-requirements.md` correctly dropped. Every named file it lists exists |
| 5 | `commitlint.config.js` verbatim; `type-enum` matches AGENTS.md | PASS — byte-identical to source; loaded it and asserted the array: `feat, fix, refactor, docs, test, chore, style, perf` — exact match to AGENTS.md's Git Commit Convention |
| 6 | `biome.json` copied, `files.ignore` appropriate | **PARTIAL** — see F-3 |
| 7 | `.gitignore` adapted; env/secrets load-bearing | PASS with note — kept sections are a strict subset of the source (only Python, `cert/`, `*.sqlite*`, `_research/`, `tmp/`, `output/` dropped, exactly as required). `.env` and `.env.*.local` both present, `.env.example` correctly not ignored (shows as untracked). See F-4 for a coverage gap |
| 8 | `.env.example` comment header only | PASS — 2 comment lines, zero variable names |
| 9 | Deliberately-not-copied items absent | PASS — `.prettierrc`, `.prettierignore`, `.husky/`, `package.json`, `tsconfig.json` all absent; `.agents/skills/` contains only `pm-workflow`, `hackathon-shared-resources`, `impeccable` (pre-existing) — none of the six other `hackathon-*` skills |
| 10 | Nothing else created or modified | PASS — `docs/plan.md`, `docs/test.md`, `docs/decisions.md`, `CLAUDE.md` are byte-identical to the pm-workflow templates; `docs/roles.md`, `.claude/agents/*`, `.codex/agents/*`, `.claude/settings.local.json` all carry scaffold/install mtimes (13:29–13:30) predating PG's window (13:45–13:49) |
| 11 | Both bullets under `## Working Conventions`, matching style, near the doc bullets | PASS — `AGENTS.md:70-71`, immediately after `**Log progress.**` and before `**No secrets in repo.**`; bold lead-in + period + rule, same as neighbours |
| 12 | Directives faithful to the request | **PARTIAL** — bullet 1 faithful; bullet 2 adds an unrequested claim. See F-1, F-2 |
| 13 | No retroactive reformatting | PASS — diffed the current file against the session-start snapshot and against the pm-workflow `templates/AGENTS.md`; the only heading-level deltas (`### Repo layout`, `## Commands` removed) are scaffold-time PM customizations that predate Task B. Lines 54–69 and 72 are unchanged verbatim |
| 14 | Only `AGENTS.md` + `docs/progress.md` touched by Task B | PASS — confirmed by mtime (13:48:54 / 13:49:13); no other file falls in that window |
| — | `docs/progress.md` dated entries + deferred `.husky` follow-up | PASS — both tasks logged; `commit-msg` and `post-commit` hook bodies recorded verbatim at `docs/progress.md:28-29`, plus the unrequested `pre-commit` body noted for completeness. Good capture |

### Findings

- `AGENTS.md:71` — **[medium]** The README-vs-TRD bullet ends with an unrequested editorial addition: *"Consistent with the existing rule: architecture lives in `docs/trd.md` (canonical), and `docs/architecture.md` is never created."* The human asked for a directive, not a reconciliation. Worse, the claim of consistency is asserted rather than true: the new bullet places **high-level system architecture and component/pipeline diagrams in the README**, while `AGENTS.md:32` and `AGENTS.md:80` say architecture lives in `docs/trd.md` (canonical). Those overlap and the boundary is now genuinely ambiguous — do the architecture diagrams live in the README or the TRD? → **Fix:** delete the trailing sentence so the bullet says only what was asked, and surface the README/TRD architecture-boundary question to the human as an open item rather than declaring it settled.
- `AGENTS.md:70` — **[medium]** The TitleCase rule is faithful to the human's words but its scope is undefined, and read literally it is self-contradicting: "bullet points" in TitleCase would mean whole bullet sentences, which no bullet in this file obeys — including lines 70 and 71 themselves, and every line from 54 to 72. It also collides with tooling: `@commitlint/config-conventional` (now wired in via `commitlint.config.js`) sets `subject-case: [2, 'never', [..., 'start-case', 'pascal-case', ...]]`, so a TitleCased commit subject is a hard commitlint failure — and commit subjects are plausibly "labels". → **Fix:** scope it, e.g. *"TitleCase for headings, subheadings, table headers and bullet lead-in labels — not for sentence bodies, commit messages, code identifiers or file names."* Purely a wording tightening; the intent survives.
- `biome.json:9` — **[medium]** `"ignore": [".agents/**", "graphify-out/**"]` was carried over unchanged, but it does not fit this repo's actual layout. In SahurHub every entry under `.claude/skills/` is a symlink into `.agents/`, so `.agents/**` covered everything. Here `.claude/skills/impeccable/` is a **real directory of 123 files, ~90 of them `.mjs`/`.js`** (`scripts/detector/**`, `scripts/live/**`, `scripts/lib/**`, plus the minified `modern-screenshot.umd.js`). The moment Biome is installed, `biome check .` will lint and reformat vendored third-party code. `.codex/hooks.json` is likewise in scope. → **Fix:** `"ignore": [".agents/**", ".claude/**", ".codex/**", "graphify-out/**"]`.
- `.gitignore:12-14` — **[low-medium]** Env coverage is exact-match only: `.env`, `.env.local`, `.env.*.local`. Not covered: `.env.development`, `.env.production`, `.env.staging`, `.env.test`, `.env.bak`. AGENTS.md calls this section load-bearing because the product's premise is users pasting their own provider keys, and a `.env.production` is exactly the file someone creates and forgets. → **Fix:** replace the three lines with `.env*` followed by `!.env.example` (which also future-proofs `.env.example` staying tracked).
- `.agents/skills/hackathon-shared-resources/playbooks/hackathon-workflow.md` (and the 24h/36h/48h playbooks) — **[low]** The package carries ~55 references to sibling skills that were deliberately **not** imported, including relative markdown links of the form `../../hackathon-idea-generator/SKILL.md`. Every one of those links dangles in this repo, and the playbook timetables instruct the agent to invoke skills that do not exist here. Verbatim mirroring was the accepted call (criterion 2), so **do not edit the copied files** — but the state should be recorded. → **Fix:** one line in `docs/progress.md` (or a short `.agents/skills/README.md`) noting that the playbooks' sibling-skill references are intentionally unresolved in this repo, and that they are being kept for their knowledge content, not their orchestration.
- `.agents/skills/hackathon-shared-resources/SKILL.md:4` — **[low]** The frontmatter description reads *"Reference library … backing the other hackathon-\* skills … Rarely invoked directly."* In this repo it is the **only** hackathon skill, so a description that actively discourages direct invocation makes the imported knowledge base unlikely to be surfaced by the agent that needs it most (the deck generator's own quality rules). Note only — changing it breaks the verbatim guarantee; flagging so the human can decide whether a follow-up reword is wanted once the generator lands.
- `docs/progress.md:20` — **[low]** The file-count sentence is self-contradictory: *"= 20 files, confirmed via `find | wc -l` = 22 counting SKILL.md and dirs adjustments"*. The verified answer is a clean **22 files, matching the source exactly**. → **Fix:** restate as "22 files, byte-identical to source (`diff -r` clean)".
- Repo-weight observation (**pre-existing, not introduced by PG**) — **[info]** `impeccable` exists as **two independent real 123-file trees** (`.agents/skills/impeccable/` and `.claude/skills/impeccable/`, both created by the installer at 13:30, before PG's window). Neither is gitignored, so ~246 vendored files land in the first commit — and the two copies will drift on the next impeccable update. → Worth a Gate 2 decision by the human: either replace `.claude/skills/impeccable` with a relative symlink (the exact pattern PG used for the other two skills, and the pattern SahurHub uses throughout), or gitignore one copy. Out of scope for this task; raising it because `.gitignore` was authored in this diff.
- `commitlint.config.js:1` — **[info]** The file is ESM (`export default`) and there is no `package.json` declaring `"type": "module"` — SahurHub's does. It loads fine today (Node ≥22 `require(esm)`), so this is not a defect, but it belongs alongside the deferred `.husky` note: the future `package.json` must set `"type": "module"` or the config must be renamed `.mjs`.

**Internal-consistency check (requested):** one real conflict found — F-1's README/TRD architecture overlap against `AGENTS.md:32` and the `docs/architecture.md` Critical Do-Not at `AGENTS.md:80`. The TitleCase bullet creates no *hard* contradiction with an existing convention, but see F-2 for its self-contradiction and its collision with commitlint's `subject-case` rule.

**Symlink check (requested):** both symlinks are relative, resolve to real directories **inside** the repo (`readlink -f` confirmed), and neither dangles. A fresh clone reproduces them correctly. No symlink escapes the repo root.

**Design (impeccable detect):** not applicable — the change set is Markdown, JSON and dotfiles only, with zero UI files (no `.html`, `.css`, `.jsx`, `.tsx`, `.svelte`, `.vue`). `npx impeccable detect` was deliberately not run.

**Smoke test:** no build tooling exists yet (no `package.json`), so no build/test/lint suite to run. Substituted: `diff -r` of both imported skill trees against source (identical), `find -type f | wc -l` parity check (22 = 22), the QBH grep plus four extended grep patterns (0 relevant hits), `JSON.parse` on `biome.json` (valid), dynamic `import()` of `commitlint.config.js` with an assertion on the resolved `type-enum` array (matches AGENTS.md), symlink resolution via `readlink -f` (both inside repo), and mtime-window analysis to confirm no out-of-scope file was touched.

### Re-review — fix round (29/07/26)

**Verdict:** Approve

Scope: the four files in the fix window (14:03:45–14:04:33) only — `AGENTS.md`, `biome.json`, `.gitignore`, `docs/progress.md`. Both blocking findings are genuinely fixed; all four accepted advisories are applied; the Impeccable trees are untouched.

| # | Prior finding / decision | Result |
| - | ------------------------ | ------ |
| 1 | F-1 README-vs-TRD over-interpretation | **RESOLVED** — `AGENTS.md:71` no longer contains the "Consistent with the existing rule…" sentence. The new bullet states the split by altitude explicitly ("they differ in depth and audience, not in subject"; README = high-level narrative view + diagrams for readers, `docs/trd.md` = canonical implementation-level reference for developers). The word *canonical* now sits on the TRD side in both places, so the bullet reinforces `AGENTS.md:32` instead of competing with it. `## Architecture` (lines 28–32) and Critical Do-Nots (lines 76–82) are byte-for-byte as I last reviewed them; `AGENTS.md` is still 425 lines, so no lines were added or removed outside 70–71 |
| 2 | F-3 `biome.json` ignore list | **RESOLVED** — `biome.json:9` is exactly `[".agents/**", ".claude/**", ".codex/**", "graphify-out/**"]`, confirmed by parsing the file, not by eye. The 123 vendored `.claude/skills/impeccable` files and `.codex/hooks.json` are now out of Biome's reach |
| 3 | F-2 TitleCase scope + commitlint collision | **RESOLVED** — `AGENTS.md:70` reads "Title Case applies to headings, subheadings, labels, bullet-point lead-ins and table headers; full sentences and commit subjects stay in normal sentence case." The collision is resolved at the *rule*, not by weakening tooling: `commitlint.config.js` is unchanged (still `extends: ['@commitlint/config-conventional']`, whose `subject-case: [2,'never',[…'start-case'…]]` remains in force; `type-enum` re-asserted = `feat,fix,refactor,docs,test,chore,style,perf`). Commit subjects are now explicitly outside the Title Case rule, so the two can never disagree. See N-1 below for one cosmetic residue |
| 4 | F-4 `.gitignore` env coverage | **RESOLVED** — lines 12–13 are `.env*` + `!.env.example`. `git check-ignore -v` verified: `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.bak` all ignored via `.gitignore:12`; `.env.example` explicitly un-ignored via `.gitignore:13` and still shows as untracked in `git status` |
| 5 | F-7 `docs/progress.md` file count | **RESOLVED** — `docs/progress.md:20` now reads `SKILL.md + knowledge/ 12 + playbooks/ 4 + templates/ 5 = 22 files`, which sums correctly and matches the cited `find \| wc -l` = 22 and my own count |
| 6 | F-5 known-state notes | **RESOLVED** — `docs/progress.md:34` records the ~55 dangling `../../hackathon-*/SKILL.md` links as expected-by-design with an explicit "do not edit them"; `docs/progress.md:35` adds the third deferred hook, `pre-commit: bunx --no lint-staged`, to the `.husky/` follow-up |
| 7 | Impeccable trees — human decision: commit both as-is | **VERIFIED UNCHANGED** — no file under either tree has an mtime later than 13:30:45 (installer time), i.e. nothing was touched in the fix window. `.claude/skills/impeccable` = 123 files, `.agents/skills/impeccable` = 127 files (the 4-file delta being the `agents/` role `.toml`s + `openai.yaml` that only the generic-harness variant carries — consistent with PG's provider-variant finding, and with the trees not being duplicates). `.claude/skills/impeccable/scripts/hook.mjs` exists (2.6K) and passes `node --check` on Node v24.14.0. PG correctly halted rather than symlinking; agreed with the outcome |
| 8 | Fix-round file scope | **CLEAN** — a repo-wide `find -newermt 14:00` (vendored trees included) returns exactly `AGENTS.md`, `biome.json`, `.gitignore`, `docs/progress.md`. `docs/test.md` last changed at 13:54 (my prior verdict); every scaffold and imported file predates 13:50 |
| 9 | No retroactive Title Case | **CLEAN** — all 40 headings in `AGENTS.md` are unchanged from the imported/scaffolded text (`## Working Conventions`, `### Analysis & Debug`, …); no doc under `docs/` falls in the fix window at all, so nothing could have been reformatted |
| 10 | No commits / pushes / branches | **CLEAN** — `git log` is still the single `2d6a196 Initial commit`; `git branch -a` shows only `main`; every changed path is still untracked (`??`) |

**Residual notes (non-blocking, no action required before commit):**

- `AGENTS.md:70-71` — **[low]** The two bullets introducing the Title Case rule use sentence-case lead-in labels themselves ("**Documentation hygiene.**", "**README vs TRD.**"), and bullet-point lead-ins are exactly what the rule now covers. Every neighbouring bullet does the same, and "no retroactive reformatting" was the accepted scope, so this is consistent-by-inheritance rather than wrong — but these two lines were authored under the rule. Cosmetic; capitalising to "**Documentation Hygiene.**" would make the file self-demonstrating. Human's call, not a defect.
- Carried forward, unchanged and still by design: F-6 (`hackathon-shared-resources/SKILL.md:4` "rarely invoked directly" description, kept verbatim) and F-8 (`commitlint.config.js` is ESM with no `package.json` declaring `"type": "module"` — belongs with the deferred `.husky/` work). Neither is a regression from this round.
- Impeccable now ships as two full provider-specific trees (250 files total) in the first commit. That is the human's decision and the right one while `executor` Codex delegation is enabled — worth remembering only that a future `impeccable install` must be re-run for **both** providers or the trees will drift.

**Design (impeccable detect):** not applicable — the delta is Markdown, JSON and dotfiles only; zero UI files (`.html`, `.css`, `.jsx`, `.tsx`, `.svelte`, `.vue`) were touched. `npx impeccable detect` deliberately not run, same as the original review.

**Smoke test:** still no build tooling (no `package.json`), so no suite to run. Substituted, all passing: `JSON.parse` of `biome.json` with an assertion on the resolved `files.ignore` array; dynamic `import()` of `commitlint.config.js` with an assertion on `type-enum`; `git check-ignore -v` across six `.env*` variants; `node --check` on `.claude/skills/impeccable/scripts/hook.mjs`; `find -type f` counts on both impeccable trees; and a repo-wide mtime-window sweep to bound the fix-round file scope.

---

## [29/07/26] — Wave 1: Task 1 (Toolchain And Workspace Foundation) + Task 2 (Canonical Product, Architecture, And Design Records)

**Verdict:** **Reject with reasons** — scoped. **Task 2 approves clean** (two advisory nits only). **Task 1 is rejected** on four findings: two ticked checkboxes are not genuinely satisfied (`bunx playwright install chromium`, the root script set), and two more must be settled before wave 2 dispatches because their only later fix is an edit to the very root files task 1 exists to finalize.

Every verification below was re-run by QA rather than taken from `docs/progress.md`. Working tree was restored to its exact pre-review state afterward (`git status --short` unchanged; one QA-created `test-results/` artifact removed — see A-2).

### Blocking Findings

**B-1. `package.json:8-9` — [high] The root `dev` and `build` scripts do not work.**
`bun run build` exits **1** with `error: No packages matched the filter`. Cause is argument order, confirmed empirically: `bun --filter '*' run build` (the shipped form, space-separated `--filter` before `run`) fails, while `bun run --filter '*' build` and `bun --filter='*' run build` both succeed and run all ten workspaces. Two of the six required root scripts are therefore non-functional, and `build` is the one every later wave will lean on.
*Fix:* `"dev": "bun run --filter '*' dev"`, `"build": "bun run --filter '*' build"`.

**B-2. Playwright Chromium is unreachable from this repo — [high] blocks wave 2.**
The checkbox "`bunx playwright install chromium` succeeds" is ticked, but the pinned build was installed under `PLAYWRIGHT_BROWSERS_PATH=/tmp/build-my-deck-playwright-browsers` and nothing in the repo references that path. Reproduced the failure directly:

```
Error: launch: Executable doesn't exist at
/home/adam/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
```

Playwright 1.62 wants build **1234**; the default cache holds only 1208/1223, and 1234 exists solely in `/tmp` (ephemeral — a reboot deletes it). Assessed severity is higher than `docs/progress.md` implies: this is not only a tasks 11/12/16 problem. **Task 5 is in wave 2** and its acceptance criteria are Playwright-gated ("rendered in Playwright at three viewport sizes"; "`page.pdf()` … produces exactly 3 pages"). Wave 2 cannot pass its own verification as things stand.
*Fix:* re-run `bunx playwright install chromium` with **no** `PLAYWRIGHT_BROWSERS_PATH` override so it lands in `~/.cache/ms-playwright`. Do **not** pin `/tmp` in repo config; the production browser path belongs in the task-6A `Dockerfile`, not in a developer's environment.

**B-3. `tsconfig.base.json:1-14` — [high] No `jsx` option, and `include` never matches `.tsx` or `test/`.**
Probed with the exact base `compilerOptions`: a one-line `.tsx` file fails `TS17004: Cannot use JSX unless the '--jsx' flag is provided`. Two consequences, in opposite directions:
- `include` is `packages/*/src/**/*.ts` + `apps/*/src/**/*.ts`, so the root `bunx tsc --noEmit -p tsconfig.base.json` will **silently skip every `.tsx` file** — a false green from task 8 (wave 3) onward.
- Each package's `tsconfig.json` uses `"include": ["src"]`, which *does* pick up `.tsx`, so `bun run build` in `packages/render` will hard-fail with TS17004 the moment task 8 lands `render.tsx`.
Neither `include` set covers `test/`, so no test file is ever typechecked by anything (`bun test` does not typecheck).
This matters because the only fix is editing `tsconfig.base.json` — the exact file `docs/plan.md:303` promises no later task will need to modify. Cheap now, a mid-wave root-file collision later.
*Fix:* add `"jsx": "react-jsx"`; widen root `include` to `packages/*/{src,test}/**/*.{ts,tsx}` + `apps/*/{src,test}/**/*.{ts,tsx}`; set each package's `"include": ["src", "test"]`.

**B-4. `package.json:19` — [medium-high] `"zod": "^3.24.2"` contradicts the recorded Gate-1 rationale. Settle before wave 2.**
`docs/plan.md:165` keeps Zod over TypeBox on three grounds, the first being that "Zod v4 emits JSON Schema natively (`z.toJSONSchema`) with no third-party converter". Verified against the installed tree (resolves to 3.25.76):

```
import * as z from 'zod'      → z.toJSONSchema is undefined
import * as z from 'zod/v4'   → z.toJSONSchema is function
```

Task 4 authors the entire document model in wave 2, and task 6A's build-time portable-subset schema linter needs `toJSONSchema`. If task 4 writes classic v3 and 6A then needs v4, the schema is rewritten *and* the fix is a root `package.json` + `bun.lock` edit during a parallel wave. This is a PM/PL call, not a PG improvisation.
*Fix (pick one, then record it):* bump the root pin to `"zod": "^4"`, **or** state in `docs/trd.md` that every schema module imports from `zod/v4`.

### Advisory Findings (Do Not Block Gate 2)

- **A-1. Cross-workspace imports do not resolve today, and declaring them writes `bun.lock`.** `node_modules/@build-my-deck/` does not exist and `Bun.resolveSync('@build-my-deck/deck-schema')` fails, because no workspace declares a dependency on another. Reproduced in an isolated two-package probe: adding `"@p/a": "workspace:*"` makes bun link it at `packages/b/node_modules/@p/a` (both bun **and** `tsc --moduleResolution bundler` then resolve it correctly, traced) — but `bun install` prints `Saved lockfile` and the diff adds a `dependencies` block under the workspace entry. `docs/plan.md:279` forbids later tasks touching the lockfile. Wave 2 likely escapes (tasks 4, 5, 6A are self-contained; task 5 is explicitly schema-agnostic), **wave 3 does not** — task 7 (→4) and task 8 (→4, 5) run concurrently and both need the edge. *Fix:* pre-declare the intended `workspace:*` edges now and run one `bun install`, or have the PM explicitly authorize and serialize that single lockfile write.
- **A-2. `test-results/` is unignored.** Running `bun run test:e2e` writes `test-results/.last-run.json`, which is in neither `.gitignore` nor `biome.json`'s ignore list — it makes `bunx biome check .` exit **1** and dirties `git status`. Reproduced during this review and cleaned up. Bites task 5 in wave 2. *Fix:* add `test-results/` and `playwright-report/` to `.gitignore`.
- **A-3. `bun run test` prints `error: 0 test files matching …` while exiting 0.** Cosmetic; reads as a failure in CI logs. Self-resolves once wave 2 lands tests.
- **A-4. `.env.example` has no `PORT` and no control-ledger path name** (`DATA_DIR` / `CONTROL_DB_PATH`). `docs/trd.md:107` requires a persistent `/data` volume for the SQLite ledger, and `.env.example` is in neither task 6A's nor 6B's `Files:` scope — so one of them would have to reach outside its scope. Task 1's checklist did not ask for these, so it is a plan gap rather than a task-1 defect. Flagged for the PM.
- **A-5. `docs/prd.md:25` vs `AGENTS.md:12` — the constraint *count* disagrees.** PRD heads its section "Two Hard Product Constraints"; `AGENTS.md` now says "Three hard product constraints" after task 2 added privacy/ownership as #3. The substance agrees (PRD covers privacy in its own section, exactly as `docs/plan.md:319` specified) — only the count reads as a contradiction to anyone diffing the two. One-word fix or a cross-reference.
- **A-6. `docs/DESIGN.md:23` — `--bmd-editor-danger #E5586B` on `--bmd-editor-panel #20242D` is 4.39:1, below WCAG AA 4.5:1 for normal text.** It is the token specified for destructive *labels* ("delete element, delete account"). Computed every specified pair: text-primary 15.45 / 12.92, text-secondary 5.41 / 4.88, accent 5.88 / 4.91, warning 7.48 — all pass. `accent-muted` at 2.79 is fine because DESIGN.md scopes it to surface and handle hover, not text. The doc says hex values are provisional, so this is advisory, but a contrast defect in a token spec propagates straight into task 15. *Fix:* lighten to ~`#F0788A` (≈5.6:1), or keep `#E5586B` for icons/borders and add a text-safe variant.
- **A-7. `docs/trd.md:206-228` has no Q10 row.** Confirmed `Q10` appears nowhere in `docs/plan.md` either — the Gate-1 list runs Q9/Q12 → Q11 → Q13. The "Q1-Q16" acceptance phrasing is satisfied to the extent the plan defined the questions. No action; recorded so the gap is not mistaken for a doc defect later.
- **A-8. `biome.json` is in task 1's implementation bullets but not its declared `Files:` list.** The `**/dist/**` edit is precisely what the checkbox required. No action.

### Verified Clean — Task 1

| Check | Result |
| --- | --- |
| `bun install --frozen-lockfile` | exit **0**, `Checked 263 installs across 319 packages (no changes)` |
| `bun pm ls` | all ten `@build-my-deck/*` workspaces present; **no `apps/cli`** anywhere in the tree or lockfile |
| `bunx tsc --noEmit -p tsconfig.base.json` | exit **0** (but see B-3 on what it does *not* cover) |
| `bunx biome check .` | exit **0**, 41 files, zero diagnostics |
| Biome ignores | probed directly — `.claude/skills/impeccable` returns "No files were processed"; `.agents/**`, `.codex/**`, `graphify-out/**`, `**/dist/**` all excluded; `**/dist/**` correctly added |
| `bun run test` / `check` / `lint` / `test:e2e` | all exit **0** |
| commitlint | `feat(api): add generation route` → 0 · `Added stuff` → 1 · `wip: something` → 1 · `feat: Add A Thing In Title Case` → 1 (`subject-case`). `type-enum` = `feat,fix,refactor,docs,test,chore,style,perf` — **exact match** with `AGENTS.md` |
| `.husky/` | `commit-msg` (`bunx commitlint --edit "$1"`), `pre-commit` (`bunx lint-staged`), guarded graphify `post-commit` — all present, executable, `husky` runs on `prepare` |
| `git check-ignore` | `.env`, `.env.development`, `.env.production` all ignored via `.gitignore:12`; `.env.example` **not** ignored (exit 1) |
| `tsconfig.base.json` | `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "bundler"`, `verbatimModuleSyntax` all set |
| Shared stubs | `packages/validate/src/index.ts` re-exports both `measure/` and `content-contract/`; all four `apps/api/src/routes/{access,account,generation,export}.ts` exist and are mounted by `routes/index.ts` under `/api/*`, wired from `apps/api/src/index.ts`. Genuinely prevents the root-file collision — subject to A-1 |
| Prior finding F-8 | **resolved** — root `package.json:4` now declares `"type": "module"`, so the ESM `commitlint.config.js` is legal |

**Security — clean.** A repo-wide regex sweep for key shapes (`sk-`, `AIza`, `gh[pousr]_`, `xox[baprs]-`, `AKIA`, PEM private-key headers) and for any `*_KEY|SECRET|TOKEN` assigned a non-empty value found **zero hits** across all tracked and untracked files, excluding `.env` (which was never read and remains gitignored). `.env.example` holds 15 names, every one with an empty value, and contains **no invite-code variable** — the rejected design left no residue. `git ls-files | grep -i env` returns only `.env.example`.

### Verified Clean — Task 2

- **Stale premise is gone.** A grep for `user supplies | users? (paste|supply|bring) | local-first | own api key | bunx build-my-deck` across `AGENTS.md`, `docs/prd.md`, `docs/trd.md`, `docs/PRODUCT.md`, `docs/DESIGN.md` returns only the *corrected* statements (`AGENTS.md:15` explicitly negates it; `docs/prd.md:32` says "not a local-first tool"). No survival anywhere.
- **The three documents agree** on every posture item, checked by content rather than presence: hosted shared-pool (`AGENTS.md:15` / `prd.md:32` / `trd.md:212`), server-only provider credentials (`AGENTS.md:73` / `prd.md:32` / `trd.md:100`), GitHub identity (`AGENTS.md:17` / `prd.md:36` / `trd.md:111-116`), private owner-only decks (`AGENTS.md:17` / `prd.md:42` / `trd.md:114,194`), physical deletion with no `deleted_at` (all three, stated as a prohibition each time), reserved BYOK (`AGENTS.md:15` / `prd.md:32` / `trd.md:196-198`), minimal single-container deployment (`AGENTS.md:32` / `trd.md:200-202`). No contradiction found in either direction.
- **Follow-up edits land correctly.** `## Architecture` and `## Tech Stack` are now settled orientation that defers to `docs/trd.md` as canonical and explicitly warns against becoming "a second, competing copy"; the Critical Do-Not now reads "do not silently deviate from the architecture recorded in `docs/trd.md`". Cross-read both files for residual contradiction: none — every stack name in `AGENTS.md:38` (Bun · TS strict · React+Vite · Hono · Biome · Playwright · Zod) matches the TRD.
- **`docs/architecture.md` does not exist. No README was written** (root holds only `LICENSE`).
- **The trap is avoided.** `docs/PRODUCT.md:3` and `docs/DESIGN.md:3` both open by scoping themselves to the editor's own chrome and explicitly hand the generated deck's design systems to `ThemeSpec`/`packages/templates` (task 7). No slide typography, deck type scale or deck design system leaked in. DESIGN.md goes further and namespaces every token `--bmd-editor-*` specifically so the boundary is enforceable in CSS — a good call.
- **DESIGN.md is citable.** 10 colour, 6 type, 7 spacing tokens plus focus-ring and selection-handle treatment, all named. Task 15 can cite `--bmd-editor-panel`, `--bmd-editor-accent`, `--bmd-editor-space-4` etc. directly. The doc also correctly separates canonical token *names* from provisional *values*.
- **TRD completeness.** Q1-Q16 are recorded in a table as outcomes with no forks (A-7 on Q10); all five Verified Findings present; both architectural properties stated in the TRD's own words with their reasoning (`trd.md:21-27`); the D4 correction states **editability and injection as two independent grounds** (`trd.md:62`), exactly as the acceptance criterion required; all four quality rungs intact and not conflated with mechanical measurement; BYOK explicitly **not** selected (`trd.md:196`).
- **Title Case** holds across all 26 TRD headings, all PRD/PRODUCT/DESIGN headings and every table header (`| Token | Role | Value |`, `| # | Question | Outcome |`); prose stays sentence case.

### Scope And Git Discipline — Clean

- `git log --oneline --all` → `11b182c` + `2d6a196` only. `git branch -a` → `main` only. No commits, branches, pushes or tags.
- Every wave-1 path is still `M` or `??`. Nothing is staged.
- `docs/plan.md` diff = PL's revision-4 rewrite plus exactly **18** `- [ ]` → `- [x]` flips; `docs/progress.md` = **+15 lines**, one entry, PM voice. Consistent with PM bookkeeping; no evidence either implementer wrote to those files.
- Task 1 stayed inside its `Files:` scope (plus `biome.json`, mandated by its own checkbox — A-8). Task 2 touched exactly its five declared files.

**Design (impeccable detect):** **not applicable, deliberately not run.** The wave produced Markdown, JSON, config and empty TypeScript stubs — zero `.tsx`, `.css`, `.html`, `.vue` or `.svelte` files, and no rendered UI exists yet. Running `npx impeccable detect` would have nothing to analyze. Substituted the part that *is* actionable: a manual WCAG contrast computation over every colour pair specified in `docs/DESIGN.md` (see A-6 — one pair fails AA). Impeccable's real first pass belongs at task 15.

**Smoke test:** `bun install --frozen-lockfile` ✅ · `bunx tsc --noEmit -p tsconfig.base.json` ✅ · `bunx biome check .` ✅ · `bun run test` ✅ · `bun run check` ✅ · `bun run lint` ✅ · `bun run test:e2e` ✅ · `bun run build` ❌ (B-1) · Playwright `chromium.launch()` ❌ (B-2) · `.tsx` typecheck probe ❌ (B-3) · `z.toJSONSchema` on the pinned zod ❌ (B-4) · commitlint accept/reject matrix ✅ · `git check-ignore` env matrix ✅ · secret sweep ✅ (0 hits).

### Re-Review — Wave 1 Fix Round (29/07/26)

**Verdict:** **Reject with reasons — narrow.** All four blockers and all six advisories from my prior entry are **genuinely fixed**, each re-verified by execution rather than by reading the diff. Two new items block Gate 2: **B-5**, a one-line formatting regression introduced *by* the B-3 fix that re-breaks task 1's own `bun run check` acceptance criterion, and **A-9**, a wave-2 readiness gap that will force task 5 outside its declared `Files:` scope.

Scope of this pass: only files with an mtime after my prior verdict (18:25:58). Working tree restored to its exact pre-review state afterward (`git status --short` byte-identical; `test-results/`, `playwright-report/` and all probe files removed; `tsconfig.base.json` restored to the implementer's version and confirmed identical by `diff`).

#### Prior Findings — Verification

| # | Prior finding | Result |
| - | ------------- | ------ |
| B-1 | Root `dev`/`build` scripts non-functional | **RESOLVED** — `package.json:7-8` now read `bun run --filter '*' dev|build`. `bun run build` exits **0** and reports all ten workspaces `Exited with code 0` (deck-schema, providers, web, templates, editor, render, api, export, pipeline, validate). `bun run dev` is well-formed: `bun run --filter '*' dev` produces **zero** `No packages matched the filter` output and holds open (long-running, as expected for a dev script) rather than erroring out — killed at the timeout, exit 143 |
| B-2 | Playwright Chromium unreachable | **RESOLVED — independently verified, not taken on report.** `~/.cache/ms-playwright/` now contains **`chromium-1234/` and `chromium_headless_shell-1234/`** alongside the older 1223 builds. `chromium.launch()` from this repo with `PLAYWRIGHT_BROWSERS_PATH` explicitly *unset* (`env -u`) succeeds; `chromium.executablePath()` resolves to `/home/adam/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome` — the default cache, not `/tmp`. **The task-5 acceptance path is reachable**: `page.pdf({width:'1920px',height:'1080px'})` returned a valid **6793-byte `%PDF-`** document with a parseable `/Count` page tree. The `/tmp/build-my-deck-playwright-browsers` directory still exists on disk but is referenced **nowhere in repo config** — a repo-wide grep across `*.json|ts|js|mjs|md|yml|.env*` finds it only in `docs/test.md:110,118` (my own prior finding) and `docs/progress.md:65` (the implementer's disclosure). Both are prose. Nothing pins it |
| B-3 | No `jsx`, `include` misses `.tsx` and `test/` | **RESOLVED — and the false green is genuinely gone.** `tsconfig.base.json:9` now sets `"jsx": "react-jsx"`. **The substitution is equivalent for every case I originally broke**, proven by failing probes, not passing ones: (a) a deliberately-broken `.tsx` under `packages/render/src/` makes the root config exit **2** with `TS2322` + `TS2339` — before the fix it was silently skipped; (b) a *valid* `.tsx` exits **0**, so the `jsx` flag genuinely works and TS17004 is gone; (c) a broken `.ts` under `packages/render/test/` makes the root config exit **2**, so `test/` is now in scope. Each probe also runs against the per-package config with identical results. All ten workspace `tsconfig.json` files now declare `"include": ["src","test"]` — verified by parsing all ten, not by spot check. **On the reported deviation:** the implementer is right that `{src,test}/**/*.{ts,tsx}` is not valid TS glob syntax, and the four extension-less patterns they used are a strict *superset* of what I specified (they match every extension TypeScript recognizes, not just `.ts`/`.tsx`). Correct call; the deviation is an improvement, not a compromise |
| B-4 | `zod` pinned to v3, contradicting the Gate-1 rationale | **RESOLVED** — `node_modules/zod/package.json` reports **4.4.3**. On the **bare** `zod` specifier (not `zod/v4`): `typeof z.toJSONSchema === 'function'`, and calling it on `z.object({a: z.string()})` emits real draft-2020-12 JSON Schema. `z.object` still resolves, so the classic surface is intact. The bump broke nothing: `bunx tsc --noEmit -p tsconfig.base.json` exits **0**, `bun run lint` exits **0**, `bun install --frozen-lockfile` exits **0** |
| A-1 | Workspace edges undeclared | **RESOLVED for wave 3; see A-10 for waves 4-6.** `bun install --frozen-lockfile` exits **0** (`Checked 267 installs across 319 packages (no changes)` — up from 263, the delta being the new workspace links). Cross-package resolution works under **both** toolchains, traced: nested `node_modules/@build-my-deck/` links exist under all eight declaring workspaces (correctly absent from `deck-schema` and `providers`, which declare nothing); `bunx tsc -p packages/render/tsconfig.json` resolves `import * as s from '@build-my-deck/deck-schema'` to exit **0**, and Bun resolves it at runtime. **Graph judged, not merely resolved — see below** |
| A-2 | `test-results/` unignored | **RESOLVED for the stated cause** — `.gitignore:10-11` add `test-results/` and `playwright-report/`; `git check-ignore -v` confirms both. Re-ran `bun run test:e2e` (exit **0**), which created `test-results/`; `git status` stayed **byte-identical**. But `bunx biome check .` now exits **1** for a *different* reason — see **B-5**. Artifacts cleaned up |
| A-4 | No `PORT` / control-ledger path in `.env.example` | **RESOLVED** — `.env.example:4-5` add `PORT=` and `DATA_DIR=`. `docs/trd.md:107` records the decision in the TRD's own voice: *"The `DATA_DIR` environment variable names this mount, and the SQLite control-ledger path derives from it (for example, `${DATA_DIR}/control.sqlite`)."* Both the name and the derivation are recorded. **`.env.example` still contains no values** — a `grep -n "=."` returns zero lines across all 17 entries |
| A-5 | PRD/AGENTS constraint count disagreed | **RESOLVED on both count and substance** — `docs/prd.md:25` is now `## Three Hard Product Constraints` matching `AGENTS.md:13`. Read the three side by side: #1 provider heterogeneity, #2 editable output, #3 private-by-default/owned-by-user with physical deletion. Substantively identical, and #3 is consistent with the PRD's own Privacy Posture section (no `deleted_at`, no soft-delete) rather than a bolted-on third bullet |
| A-6 | `--bmd-editor-danger` fails WCAG AA | **RESOLVED — ratios recomputed independently, not accepted on report.** Computed sRGB relative luminance per WCAG 2.x from the current file values: `#F0788A` on `--bmd-editor-panel #20242D` = **5.74:1 PASS**; on `--bmd-editor-surface-0 #111318` = **6.87:1 PASS**. Both ≥ 4.5:1. Recomputed the old value as a control: `#E5586B` on panel = **4.39:1**, matching my prior figure exactly, so the method is the same one. **No other token changed** — all nine remaining colour values (`#111318`, `#181B22`, `#20242D`, `#2E3341`, `#E8EAF0`, `#8B90A0`, `#5B8CFF`, `#3E63C2`, `#E5A94A`) are byte-identical to what I recorded last round |
| A-3, A-7, A-8 | Cosmetic / recorded-only | Unchanged and still non-blocking, as accepted |

#### A-1 Graph — Judged On Its Merits

The declared graph is `render→deck-schema`; `templates→deck-schema`; `validate→deck-schema,render`; `export→deck-schema,render`; `editor→deck-schema`; `pipeline→deck-schema,providers,templates`; `api→deck-schema`; `web→deck-schema` — confirmed against all ten `package.json` files and against `bun.lock`, which does record workspace edges (so any later addition *is* a lockfile write).

**Nothing is over-declared.** Every edge traces to a task's stated work: `validate→render` to task 5's exported `data-om-validate` constant and task 12's measurement; `export→render` to `renderDeckToHtml`; `pipeline→providers` to the neutral broker; `pipeline→templates` to the catalog manifest and `instantiate()`. `web→deck-schema` is the most speculative but is justified by task 15 and is harmless.

**Wave 3 is safe.** Task 7 needs only `templates→deck-schema` and task 8 needs only `render→deck-schema`, both declared. I checked the one way task 8 could have escaped: `ThemeSpec` is embedded in `Deck` (`docs/trd.md:49`, `docs/plan.md:353`), so its *type* must live in `deck-schema` — `packages/templates` authors the three concrete systems, not the type. If it lived in `templates`, `render→templates` would be required by task 8 *and* `deck-schema→templates` would cycle against `templates→deck-schema`. It does not. **Neither task 7 nor task 8 needs a lockfile write.** The graph is right, not merely resolvable.

**It is under-declared for waves 4-6** — see A-10.

#### New Blocking Finding

**B-5. `tsconfig.base.json:12-17` — [medium-high] The B-3 fix re-breaks `bun run check`.**
`bunx biome check .` now exits **1** (it exited 0 last round, same 41 files). The sole diagnostic is a `format` error on `tsconfig.base.json`: Biome wants the four-element `include` array on one line, and the fix wrote it multi-line. This directly falsifies task 1's own ticked criterion *"`bun install` succeeds and `bun run check` (Biome) exits 0"* and the acceptance line *"From a clean clone, `bun install && bun run check && bun test` succeeds"* — `bun run check` exits **1** right now. `bun run lint` and `bun run test` still exit 0, so this is formatting only, but `check` is the composite gate every later wave and any CI will call.
Second-order: `lint-staged` runs `biome check --write` on `*.json`, so the pre-commit hook would silently rewrite this file mid-commit — the committed content would differ from what was reviewed.
*Fix (verified working, one line):* collapse to `"include": ["packages/*/src/**/*", "packages/*/test/**/*", "apps/*/src/**/*", "apps/*/test/**/*"]` — 106 chars, inside Biome's configured `lineWidth: 120`. I applied it in a scratch copy and confirmed `bunx biome check .` → **0** and `bunx tsc --noEmit -p tsconfig.base.json` → **0**, then restored the implementer's file unchanged (`diff` clean). No other change is needed.

#### Wave 2 Readiness — One Real Blocker

Asked plainly: **yes, there is something that will force a wave-2 task outside its declared `Files:` scope.**

**A-9. [high — wave-2 dispatch blocker] There is no `playwright.config.*`, and task 5's declared test filename collides with `bun test`.**
Task 5's `Files:` is `packages/render/src/deck-stage.ts`, `deck-stage.css.ts`, `packages/render/test/deck-stage.test.ts`, and three of its criteria are Playwright-gated. Reproduced the collision with a real Playwright spec at exactly that path:
- `bunx playwright test` **discovers and passes it** (default `testDir: '.'`, default `testMatch` covers `*.test.ts`) — so far so good.
- `bun test packages/render` **also grabs the same file and exits 1**: `Playwright Test did not expect test() to be called here` … `when one of the dependencies in your package.json depends on @playwright/test`.

So the moment task 5 lands its declared file, `bun run test` goes red repo-wide — a root-level failure caused by a leaf task. The fix is a root `playwright.config.ts` with `testDir`/`testMatch` (or a `*.spec.ts` / `*.test.ts` split), and **that file is in no task's `Files:` list** — not task 1's, not task 5's. Note the plan already implies the convention it never established: task 16 uses `test/e2e/slice-1.spec.ts` (`.spec`) while task 5 uses `deck-stage.test.ts` (`.test`).
This is a plan gap, not a fix-round defect, and it is a PM/PL call rather than a PG improvisation. *Options:* (a) add `playwright.config.ts` to task 1's scope and land it in the same fix pass as B-5 — cheapest, no lockfile involvement; or (b) rename task 5's file to `packages/render/test/deck-stage.spec.ts` and set `bun test`'s scope, which still needs a config or a `bunfig.toml`. Either way, settle it **before** dispatch.

Tasks 4 and 6A are clear. Task 4 needs only `zod`, which resolves from `packages/deck-schema/src` via root hoisting under `tsc` (verified, exit 0) — no workspace edge, no lockfile. Task 6A's `providers` declares no deps and needs none; `apps/api` has `deck-schema`; `Dockerfile` and `.dockerignore` are already inside its declared `Files:`; `bun:sqlite` is built in. Neither touches `bun.lock` or a root config. One micro-note: 6A's `Files:` names `apps/api/src/server.ts` but task 1 created `apps/api/src/index.ts` as the entry — if 6A must rewire `index.ts`, that is a one-line scope stretch worth pre-authorizing.

#### New Advisory

**A-10. The workspace graph is correct but stops at wave 3.** Four edges are missing that waves 4-6 will need, each of which is another `bun.lock` write during a parallel wave — the exact thing `docs/plan.md:279` forbids:
- **`render→templates`** — task 10 (wave 4), `packages/render/test/golden.test.ts`, must render the three Layak slides *"in all three design systems"*, which are authored in `packages/templates`.
- **`api→export`** — task 11 (wave 5), `apps/api/src/routes/export.ts` must call `exportPdf`.
- **`api→pipeline`** — task 14 (wave 5), `apps/api/src/routes/generation.ts` must call the compile pipeline.
- **`pipeline→validate`** — task 14 depends on 12 and re-runs Tier-0 auto-fit after `reskinDeck` (`docs/plan.md:610`).
- **`web→editor`, `web→render`** — task 15 (wave 6), `apps/web/**` mounts the editor surface.

Under-declaring is recoverable and none of it blocks wave 2 or wave 3, so this is advisory. But the PM has already spent one authorized lockfile write; folding these six edges into the **same** write as the B-5 fix costs nothing now and removes a mid-wave root-file collision at waves 4, 5 and 6. Adding an unused `workspace:*` edge is inert — it creates a symlink and a lockfile line, nothing more.

#### Scope, Git Discipline, Secrets

- **Scope — clean.** A repo-wide mtime sweep after 18:26 returns exactly: `package.json`, `bun.lock`, `tsconfig.base.json`, all ten `packages/*|apps/*/tsconfig.json`, the eight `packages/*|apps/*/package.json` that gained edges, `.gitignore`, `.env.example`, `docs/prd.md`, `docs/DESIGN.md`, `docs/trd.md`. Nothing else. Two non-source entries also appear and are both benign: `.husky/_/**` (regenerated by `husky` when *I* ran `bun install`; self-ignored via `.husky/_/.gitignore`) and `docs/.codex/{wave1-fix,a4-fix}.log` (PM-side Codex delegation transcripts, excluded via `.git/info/exclude:13`, matching the pre-existing `task1.log`/`revise.log` pattern — not an implementer write to tracked `docs/`).
- **`docs/plan.md` and `docs/progress.md` untouched by implementers** — both carry mtime 18:16:16, a full ten minutes before the fix window opened. Confirmed by sweep, not by diff inspection.
- **No commits, branches, pushes or tags.** `git log --oneline --all` → `11b182c` + `2d6a196`, unchanged. `git branch -a` → `main` only. `git tag -l` empty. `git diff --cached` empty. Every wave-1 path still `M` or `??`.
- **Secret sweep — clean.** Re-swept all 59 tracked+untracked files (excluding the vendored `.agents/`/`.claude/`/`.codex/` trees and this file) for `sk-…`, `AIza…`, `gh[pousr]_…`, `xox[baprs]-`, `AKIA…`, PEM private-key headers, and any `API_KEY|SECRET|TOKEN|PASSWORD` assigned a non-empty value: **zero hits**. `.env.example` holds 17 names, every one blank, no invite-code variable. `.env` was never read and stays gitignored.

**Design (impeccable detect):** **not applicable, deliberately not run.** The delta is JSON, dotfiles and Markdown — zero `.tsx`, `.css`, `.html`, `.vue` or `.svelte` files, and no rendered UI exists yet. Substituted the actionable part: an independent WCAG 2.x relative-luminance recomputation of the changed `docs/DESIGN.md` token against both of its specified backgrounds (A-6 above — both now pass), plus a confirmation that no other token value moved. Impeccable's first real pass still belongs at task 15.

**Smoke test:** `bun run build` ✅ (was ❌) · `bun run dev` ✅ well-formed · Playwright `chromium.launch()` + `page.pdf()` ✅ (was ❌) · `bun install --frozen-lockfile` ✅ · `bunx tsc --noEmit -p tsconfig.base.json` ✅ · broken-`.tsx` root typecheck probe ✅ now fails as it should (was a false green) · broken-`test/*.ts` root typecheck probe ✅ now fails as it should · cross-package `tsc` + Bun runtime resolution ✅ · `z.toJSONSchema` on bare `zod` ✅ (was ❌) · `bun run test` ✅ · `bun run lint` ✅ · `bun run test:e2e` ✅ with `git status` clean afterward · `git check-ignore` on `test-results/`+`playwright-report/` ✅ · WCAG recomputation ✅ · secret sweep ✅ 0 hits · **`bun run check` ❌ (B-5)** · **`bun test` vs `playwright test` collision probe ❌ (A-9)**.

### Re-Review — Wave 1 Fix Round 2 (29/07/26)

**Verdict:** **Approve with notes.** All three prior findings — **B-5**, **A-9**, **A-10** — are genuinely fixed, each verified by construction rather than by reading the diff. **Wave 2 (tasks 4, 5, 6A) is clear to dispatch.** Five advisories are recorded below; none blocks wave 2, and none is a regression.

Scope of this pass: the delta only. Working tree restored byte-identical afterward — `git status --short` returns the same 18 entries it did before I started; every probe file removed.

#### Prior Findings — Verification

**B-5 — RESOLVED.** `tsconfig.base.json:12` now holds `include` on one line (106 chars, inside `lineWidth: 120`). Both gates checked **together**, which was the point of the finding:

- `bunx biome check .` → exit **0**, 42 files (was 41; the extra file is `playwright.config.ts`, which Biome accepts as-formatted, so `lint-staged`'s `biome check --write` on `*.json,ts` is now a no-op on both files — the second-order commit-time rewrite risk is gone).
- `bunx tsc --noEmit -p tsconfig.base.json` → exit **0**.
- **False-green re-test passes.** A deliberately-broken `.tsx` at `packages/render/src/` makes the root config exit **2** with `TS2322` + `TS2339`. The Biome collapse did not undo the B-3 fix.
- Full script sweep: `check` 0 · `lint` 0 · `test` 0 · `test:e2e` 0 · `build` 0 · `install --frozen-lockfile` 0. Task 1's acceptance line "from a clean clone, `bun install && bun run check && bun test` succeeds" now holds.

**A-9 — RESOLVED, and the PM's reasoning is correct.** I did not take the `.spec.ts` rationale on report; `bun test` stated it itself. Its collection glob, printed verbatim by the runner, is:

```
**{.test,.spec,_test_,_spec_}.{js,ts,jsx,tsx}
```

`.spec` is in that set, so `.spec.ts` would **not** have separated the runners, and task 16's old `test/e2e/slice-1.spec.ts` carried the identical latent collision. `*.pw.ts` is the right third extension.

Verified by construction with my own fixtures at both declared future locations:

| Probe | Result |
| --- | --- |
| `bunx playwright test --list` | collects **both** `packages/render/test/deck-stage.pw.ts` **and** `test/e2e/slice-1.pw.ts` — "Total: 2 tests in 2 files" |
| `bunx playwright test` | both pass against real Chromium (1.3s) |
| `bun test packages/render` | does **not** collect the `.pw.ts` — exit 1, "did not match any test files" |
| `bun test <path>/deck-stage.pw.ts` (worst case, explicit path filter) | still **not** collected. The separation is structural, not incidental |
| `bun run test` | exit **0** (`--pass-with-no-tests`) |
| **Mixed** — a `bun:test` `*.test.ts` beside a `*.pw.ts` in the same directory | `bun run test` → **1 pass**, sees only the `.test.ts`; `playwright --list` → still only the 2 `.pw.ts`. Disjoint in both directions |
| `bun run test:e2e` with zero `.pw.ts` present | exit **0** |
| A `.pw.ts` under root `tsc` and package `tsc` | both exit **0** — `@playwright/test` types and `page.pdf()` resolve from root hoisting |
| `bunx biome check` on a `.pw.ts` | exit **0** |

`PLAYWRIGHT_BROWSERS_PATH` is pinned **nowhere** — a repo-wide grep across `*.json|ts|js|mjs|yml|.env*|Dockerfile*` (excluding `node_modules` and `docs/`) returns zero hits, and `.env.example` contains no `PLAYWRIGHT` entry. The config itself sets only `testDir`, `testMatch`, `headless` and a single chromium project.

`docs/plan.md` is fully consistent with the decision: `deck-stage.test.ts` and `slice-1.spec.ts` appear **nowhere** in the file (grep returns empty), the convention is recorded at `docs/plan.md:696`, and task 1's `Files:` at line 289 now includes `playwright.config.ts`, so the file was written inside an authorized scope.

**A-10 — RESOLVED.** All six edges are declared and linked. Graph judged, not merely resolved:

- **No cycle.** Programmatic DFS over all ten `package.json` files: `NO CYCLE`. Topological order `deck-schema < editor < templates < render < export < providers < validate < pipeline < api < web`. The one edge that could have cycled — `render→templates` against `templates→deck-schema` — does not, because `templates` never reaches back into `render`.
- **Symlinks present for every declared edge**, enumerated per package: render `{deck-schema, templates}` · validate `{deck-schema, render}` · pipeline `{deck-schema, providers, templates, validate}` · export `{deck-schema, render}` · editor `{deck-schema}` · templates `{deck-schema}` · api `{deck-schema, export, pipeline}` · web `{deck-schema, editor, render}`. `deck-schema` and `providers` correctly declare and link nothing.
- **`bun install --frozen-lockfile`** → exit **0**, `Checked 271 installs across 319 packages (no changes)` (was 267). "No changes" is the load-bearing part: the lockfile matches the manifests, so no wave-2 task inherits a dirty `bun.lock`.
- **Cross-package resolution works under both toolchains** for the *new* edges specifically, not just the old ones: `render→templates`, `pipeline→validate`, `api→{pipeline,export}`, `web→{editor,render}` all typecheck at exit 0 under the root config **and** their own package configs, and `bun packages/pipeline/src/…` / `bun apps/api/src/…` resolve them at runtime at exit 0. `bun run build` reports all ten workspaces `Exited with code 0`.
- Root typecheck unchanged at **0**.

**`HUSKY=0` left nothing misconfigured.** `.git/config` is `rw-r--r--` and owned by the user here, `core.hooksPath = .husky/_` is set, and my own (un-prefixed) `bun install` ran `prepare: husky` cleanly. The hooks fire correctly, tested directly rather than inferred: `.husky/commit-msg` on `bad message here` → exit **1** (`type-empty`, `subject-empty`); on `feat(render): add deck stage` → exit **0**. All three hooks are `755`; `.husky/_/.gitignore` is `*`, so the regenerated directory stays out of git. A normal developer running `bun install` gets the same result — `HUSKY=0` only skipped the install step in the sandbox, it wrote nothing.

#### Wave 2 — Clear To Dispatch

Asked plainly: **nothing remains that would force task 4, 5 or 6A outside its declared `Files:` scope, make one touch `bun.lock` or a root config, or leave one unable to meet its own acceptance criteria.**

- **Task 4** (`packages/deck-schema/**`) — `zod` **4.4.3** resolves from `packages/deck-schema/src` via root hoisting under **both** `bunx tsc -p packages/deck-schema/tsconfig.json` (exit 0) and the Bun runtime (exit 0), with `z.toJSONSchema` present on the bare `zod` specifier. `deck-schema` declares no dependencies and needs none. No lockfile write, no root config.
- **Task 5** (three files) — the `.pw.ts` name is now collected by Playwright, invisible to `bun test` even under an explicit path filter, and clean under `tsc` and Biome. `page.pdf()` types resolve. Chromium is reachable (re-confirmed last round). Nothing forces a root file.
- **Task 6A** — `packages/providers` declares nothing and needs nothing; `apps/api` already has `deck-schema`, `export` and `pipeline`; `Dockerfile`/`.dockerignore` are inside its own `Files:`; `bun:sqlite` is built in. Its test files are `apps/api/test/*.test.ts`, which the new convention routes to `bun test` correctly.
- **Scopes are disjoint.** Task 4 = `packages/deck-schema`; task 5 = three files under `packages/render/src|test`; task 6A = `packages/providers` + a named subset of `apps/api/src` + `apps/api/test` + two Docker files. Zero intersection.

#### Advisories — None Blocking Wave 2

- **A-11. [medium — settle before wave 4] The `*.pw.ts` rename stopped at tasks 5 and 16; tasks 10 and 12 still declare `.test.ts` for browser-rendered tests.** `docs/plan.md:696` names tasks **5, 10, 12, 16** as browser-rendering and requires `*.pw.ts`, but `docs/plan.md:511` still declares `packages/render/test/golden.test.ts` (whose checklist includes "Add a Playwright side-by-side visual comparison") and `docs/plan.md:556` still declares `packages/validate/test/measure.test.ts` (whose `measure()` runs against a DOM under a pinned-Playwright host). Under the convention just established, both would be collected by `bun test` and fail with `Playwright Test did not expect test() to be called here` — the exact failure A-9 was raised to prevent, deferred to waves 4/5. Note tasks 10 and 12 plausibly need **both** files: pure-arithmetic assertions belong in `*.test.ts`, browser assertions in `*.pw.ts`. *Fix:* amend those two `Files:` lines to list the `.pw.ts` counterpart alongside the `.test.ts`. Same class as A-9, not a regression from it — the rename was applied where I named it and not swept beyond.
- **A-12. [medium — first bites task 8, wave 3] Two package barrels are owned by no task, while the plan declares barrels "never edited later".** Every workspace sets `"exports": "./src/index.ts"` as a bare string, which admits **no subpaths** — verified with a control probe: `import … from '@build-my-deck/render/src/index'` fails `TS2307` exactly as a nonexistent path does. So every cross-package import must pass through `src/index.ts`. Eight of the ten barrels sit inside an owning task's `Files:` (`packages/templates/**`, `packages/export/**`, `packages/pipeline/**`, `packages/providers/**`, `packages/deck-schema/**`, `apps/web/**`), and `packages/validate/src/index.ts` was pre-wired by task 1. **`packages/render/src/index.ts` and `packages/editor/src/index.ts` are in neither** — task 5's and task 8's `Files:` both name specific render files and exclude `index.ts`; task 9's and task 15's both name editor subdirectories and exclude it. Both are still `export {}`, so nothing in `render` or `editor` is importable by another package. Task 5 is unaffected (its own test imports by relative path inside the package), but task 8 must export `renderDeckToHtml` for tasks 11 and 12, and task 12 must import task 5's `data-om-validate` constant. *Fix:* add `packages/render/src/index.ts` to task 8's `Files:` and `packages/editor/src/index.ts` to task 9's, or state the barrel exception in the Execution Notes. Costs nothing now; a mid-wave-3 collision otherwise.
- **A-13. [low] `docs/plan.md:301` is unticked but done.** The new task-1 checkbox "Create `playwright.config.ts` at the repo root with `testMatch: '**/*.pw.ts'`" still reads `- [ ]`, yet the file exists and every one of its stated verifications passes (proven above). Bookkeeping only — the PM added the checkbox after the implementer's pass.
- **A-14. [low, carried forward] Task 6A's `Files:` names `apps/api/src/server.ts`; the entry task 1 created is `apps/api/src/index.ts`.** `apps/api/src/index.ts` is the file that constructs the Hono app and calls `mountApiRoutes`. If 6A introduces `server.ts` for the runtime boundary it must rewire `index.ts` — a one-line edit outside its declared scope. Worth one line of pre-authorization at dispatch, or a rename of the `Files:` entry to `index.ts`.
- **A-15. [low] Task 5 may want a fixture document, and root `fixtures/**` belongs to task 10.** Task 5's acceptance criterion is that the component "drives the original Layak HTML body unchanged", and its `page.pdf()` check needs a three-slide document. Its `Files:` lists exactly three files and no fixture. The root `fixtures/**` tree is task 10's scope (wave 4 — no concurrent conflict, but an ownership overlap). Either inlining the sections inside `deck-stage.pw.ts` or pre-authorizing `packages/render/test/fixtures/**` resolves it; both stay inside `packages/render`, touch no root config and no lockfile. Not a dispatch blocker.

#### Scope, Git Discipline, Secrets

- **Scope — clean.** An mtime sweep after the prior verdict returns exactly: `tsconfig.base.json`, `playwright.config.ts`, `package.json`, `bun.lock`, the eight `packages/*|apps/*/package.json` that carry edges, all ten `tsconfig.json`, plus `.gitignore`, `.env.example`, `docs/{prd,DESIGN,trd}.md` (last round's files) and `docs/plan.md`. **Nothing outside the authorized list.** `.husky/_/**` also appears — regenerated by `husky` when *I* ran `bun install`, self-ignored via `.husky/_/.gitignore`.
- **`docs/progress.md` was not written this round** — it does not appear in the mtime sweep at all. `docs/plan.md` does, and its diff contains only the `*.pw.ts` convention work: task 1's new checkbox, task 5's and task 16's renamed `Files:` lines, and the Execution Note at line 696. That is the PM's amendment, as declared.
- **No commits, branches, pushes or tags.** `git log --oneline --all` → `11b182c` + `2d6a196`, unchanged. `git branch -a` → `main` only. `git tag -l` empty. `git diff --cached` empty. Every wave-1 path is still `M` or `??`.
- `docs/.codex/{wave1-fix2,plan.pre-pwfix.bak}` appear in the sweep and are PM-side artifacts, excluded via `.git/info/exclude:13` (`git check-ignore -v` confirms) — not implementer writes to tracked `docs/`.
- `test-results/.last-run.json` is present and ignored via `.gitignore:10`; the empty `test/e2e/` directory is untracked and carries no git state.
- **Secret sweep — clean.** Re-swept every tracked and untracked file (excluding the vendored `.agents/`/`.claude/`/`.codex/` trees, `bun.lock` and this file) for `sk-…`, `AIza…`, `gh[pousr]_…`, `xox[baprs]-`, `AKIA…` and PEM private-key headers: **zero hits**. A separate sweep for any `API_KEY|SECRET|TOKEN|PASSWORD` assigned a non-empty value: **zero hits**. `.env.example` has **0** lines matching `=.+` — all 17 names blank. `.env` was never read and remains gitignored.

**Design (impeccable detect):** installed at `.claude/skills/impeccable/` with Node v24.14.0 available, but **deliberately not run — the delta touches zero UI files.** It is one TypeScript config file (`playwright.config.ts`) and nine JSON manifests; no `.tsx`, `.css`, `.html`, `.vue` or `.svelte` changed, and no rendered UI exists yet. `docs/DESIGN.md` did not change this round, so last round's WCAG recomputation still stands unmodified. Impeccable's first real pass belongs at task 15.

**Smoke test:** `bunx biome check .` ✅ **0** (was ❌) · `bunx tsc --noEmit -p tsconfig.base.json` ✅ **0** · broken-`.tsx` false-green probe ✅ still fails as it should · `bunx playwright test` on both declared future `.pw.ts` locations ✅ 2/2 pass · `bun test` non-collection of `.pw.ts` ✅ including explicit-path worst case · mixed `.test.ts`/`.pw.ts` two-way disjointness ✅ · `.pw.ts` under root + package `tsc` and Biome ✅ · `bun run test` ✅ · `bun run test:e2e` ✅ · `bun run check` ✅ · `bun run lint` ✅ · `bun run build` ✅ all ten workspaces · `bun install --frozen-lockfile` ✅ no changes · cycle detection ✅ none · 18/18 workspace symlinks ✅ · cross-package `tsc` + Bun runtime on all six new edges ✅ · commitlint hook accept/reject ✅ · `PLAYWRIGHT_BROWSERS_PATH` pinning grep ✅ zero hits · deep-subpath-import control probe ✅ blocked as expected (A-12) · secret sweep ✅ 0 hits · working tree restored ✅ byte-identical.
