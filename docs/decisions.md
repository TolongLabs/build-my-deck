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
