# DECISIONS

> Persistent decision log. **One line per shipped task**, appended by the **PM** at Gate 2 (Approve path); read by **PL** before planning. This is not an ADR system — keep each entry to a single line, newest at the bottom.

Format (one line, no wrapping):

```
- YYYY-MM-DD — <task>: <decision> — <one-clause rationale>
```

Example:

```
- 2026-07-07 — auth session store: use signed cookies over JWT — simpler revocation, no token store to run
```

---

- 2026-07-29 — workspace tooling: import SahurHub's pm-workflow skill, hackathon-shared-resources knowledge, biome, commitlint, gitignore — reuse proven conventions instead of re-deriving them
- 2026-07-29 — hackathon skills: import only hackathon-shared-resources; exclude the six event-specific skills — they hardcode one hackathon's rubric, dates and rules into a product meant to serve all hackathons
- 2026-07-29 — formatting toolchain: Biome only, no Prettier — Biome already formats and lints, carrying both duplicates config
- 2026-07-29 — README vs TRD: split by altitude, not subject — README is the high-level narrative view for readers, docs/trd.md the canonical implementation reference for developers
- 2026-07-29 — TitleCase rule: scoped to headings, subheadings, labels, bullet lead-ins and table headers; full sentences and commit subjects exempt — avoids collision with commitlint subject-case
- 2026-07-29 — Impeccable vendoring: commit both provider trees (.claude/ + .agents/) — they are distinct provider variants, not duplicates; symlinking would break one
- 2026-07-29 — implementation routing: Codex workers (gpt-5.6-terra) are the default implementer, Claude programmer reserved for delicate or ambiguous tasks — conserves Claude usage at equal review rigor, since QA reviews Codex output identically
- 2026-07-29 — deployment posture: hosted service funded by TolongLabs' shared Qwen pool, not local-first BYOK — the $300 credits fund user generation, which requires a server-side key
- 2026-07-29 — editor/renderer: absolutely-positioned DOM in a fixed 1920x1080 stage, rejecting Konva/Fabric/PixiJS/tldraw — canvas forfeits vector PDF, rich text, accessibility and the existing deck-stage runtime for pan/zoom performance this product never uses
- 2026-07-29 — canonical document: versioned JSON scene graph with a keyed element map, never HTML — an array breaks Immer patch paths under reorder, and HTML as source of truth blocks migration and admits arbitrary markup
- 2026-07-29 — identity: GitHub OAuth with per-user allowances, rejecting invite codes — a shared finite pool behind an anonymous endpoint is drainable, and OAuth removes code issuance/sharing/revocation entirely
- 2026-07-29 — deck persistence: browser-owned (OPFS + .bmd) in slice 1, server-side storage sequenced as iteration 2's first task — storing decks against a schema that is still moving is the expensive way to get there
- 2026-07-29 — privacy: decks private by default with physical deletion, owner model ships in slice 1 — the product stores users' unreleased hackathon projects, which are competitively sensitive before judging
- 2026-07-29 — generated art: a model may reference art via catalogRef/assetId but never emit markup — arbitrary LLM-authored SVG is both an injection vector and an uneditable blob
- 2026-07-29 — repair safety: origin.userOverrides records dotted property paths that repair may not rewrite — a workbench that silently undoes human edits is worse than no workbench
- 2026-07-29 — validation host: server-primary Playwright in the API container, browser measurement advisory — repair must complete without depending on an open tab
- 2026-07-29 — test runners: *.pw.ts for Playwright, *.test.ts for bun test — bun test's glob claims .spec as well as .test, so the conventional .spec.ts separates nothing
- 2026-07-29 — schema library: zod pinned ^4 — v4 emits JSON Schema natively via z.toJSONSchema, which is the whole reason Zod was chosen over TypeBox
- 2026-07-29 — Codex workers: network is off by default under workspace-write; tasks hitting a registry or a live provider need sandbox_workspace_write.network_access=true — otherwise the failure looks like a code fault
- 2026-07-29 — reference fields: catalogRef/assetId constrained by grammar, not convention — typed as bare strings they accepted data: URIs, path traversal and external URLs, so D4's "structural refusal" was nominal
- 2026-07-29 — 429 classification: quota_exhausted distinct from rate_limit in both adapters, defaulting to quota_exhausted when ambiguous — misreading a drained pool as transient costs unbounded spend, the reverse costs one false message
- 2026-07-29 — resource gates: prefer promise-based self-completion-aware APIs (decode()) over event listeners — a listener cannot resolve for a resource that completed before the component upgraded
- 2026-07-29 — Playwright origin: centralized as a webServer + baseURL in playwright.config.ts — page.setContent() alone leaves an opaque origin where every Storage API throws, and per-file fixtures would have become five drifting copies
- 2026-07-29 — template capacity assertion lives in task 10, not 7 or 8 — templates cannot import render without a cycle, and 7/8 run concurrently so task 8 would assert over an empty catalog
- 2026-07-29 — test discipline: a test must be shown to fail against the unfixed code before it counts as passing — three wave-2 tests validated their own workarounds and all looked green
- 2026-07-30 — CSRF posture: the origin check compares against a configured PUBLIC_ORIGIN, required in production and derived from the port in development — deriving it from c.req.url trusts the attacker-influenced request, and a bare localhost default 403s every real dev origin
- 2026-07-30 — open-redirect sanitizing: validate the serialized pathname+search+hash after resolution, not only the raw candidate — URL path normalization manufactures //host out of an accepted /..//host, which is how B-1 survived its first fix
- 2026-07-30 — ThemeSpec v2: extend the schema with componentStyles and effects rather than resolve a catalog lookup at render time — a lookup keeps the schema frozen but makes a deck un-renderable without the exact catalog version, breaking .bmd portability
- 2026-07-30 — DOM vs paint order: readingOrder drives DOM sequence for semantics, rootOrder drives z-order — iterating readingOrder alone silently dropped decorative elements in 8 of 10 templates
- 2026-07-30 — templates are immutable versioned directories with a sha256 tripwire — a mutated template silently invalidates every deck that cites it, and the version is the only thing a persisted deck can pin
- 2026-07-30 — fonts are self-hosted OFL with content-addressed filenames, no CDN reference at render time — a webfont CDN is a third-party dependency in the export path and a privacy leak in a shared deck
- 2026-07-30 — SQLite PRAGMA foreign_keys is set per connection, and cascade deletes assert post-delete counts — SQLite does not persist the pragma in the file, so a cascade silently orphans rows instead of failing
- 2026-07-30 — test entry point: for anything running in the pipeline, at least one test must enter through the real construction path, not a hand-built fixture — 8B's tests were correct yet green against a broken toThemeSpec because they entered downstream of it
