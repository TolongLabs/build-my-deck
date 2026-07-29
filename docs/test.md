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
