# TRD — build-my-deck

> Canonical technical reference. Per `AGENTS.md`, architecture lives here — never in `docs/architecture.md`. `README` (when it exists) carries the narrative view for readers; this file carries the implementation-level contract for developers. Every decision below is a **Gate 1 outcome**, recorded from `docs/plan.md`'s "Settled At Gate 1 — Do Not Re-Litigate" and "Peer Consult — Where We Disagreed" sections. None of these is an open fork — implement to this document without re-litigating it. Amendments go through a new planning pass, not a diff.

---

## System Shape

One workspace, ten packages, two apps:

- `apps/web` — the Vite/React editor and viewer, served as static assets.
- `apps/api` — one Bun/Hono service: authentication, admission, the generation stream, export, and pinned Chromium — all in one process, one container.
- `packages/deck-schema`, `packages/render`, `packages/templates`, `packages/providers`, `packages/pipeline`, `packages/validate`, `packages/export`, `packages/editor` — the shared, framework-agnostic core.

There is no worker, no durable queue, no cloud deck database, no object store and no multi-container topology in iteration 1. The browser is the deck's owner (OPFS autosave, `.bmd` export/import); the server owns only identity, admission and per-run accounting.

---

## Two First-Class Architectural Properties

### (a) One Renderer, Two Consumers

`packages/render` ships exactly one render implementation, built once as React components. The editor's live view renders it as a mounted component tree; the export path renders the identical component tree via `renderToStaticMarkup`. There is no second renderer and no snapshot test keeping two implementations in sync, because a second implementation is exactly how validation stops meaning anything — if the editor's preview and the exported PDF can disagree, "0 measurement violations" stops being a guarantee about what the user actually ships. `measure(root)` follows the same rule: one environment-agnostic function, two thin hosts (server-primary Playwright, browser-advisory), never two measurement implementations.

### (b) The Pipeline Is An Artifact Graph With Bounded Feedback, Not A One-Way Chain

Content capacity depends on layout, and repair must be able to revisit the content artifact — so the pipeline is not `SlideContent → LayoutBindings → Slide` in one direction only. `SlideContent` carries **capacity-aware variants up front** (`headline { short, standard }`, `body { short, standard, extended }`, bullets ranked by importance), so `bindSlide` can *select* a variant or a denser template instead of asking the model to re-answer a shorter prompt. Repair may return to the content artifact under a per-slide attempt cap, a lexicographic improvement requirement, a document-state hash cycle check and a server-controlled global token/wall-time budget — four independent conditions that jointly guarantee termination. This is strictly better than a one-way chain with a repair ladder bolted on afterward: it converts what would be a second model round-trip into a local, deterministic, free selection, which is exactly what lets Tier 0 (font auto-fit) and Tier 1 (variant/template selection) absorb the majority of violations before a single paid token is spent.

---

## Verified Findings

**Finding 1 — The Prior Art Is Not A Scene Graph.** `layak-pitch-deck.html` and the SahurHub deck use nested CSS grid/flexbox inside the fixed stage; `position: absolute` appears only on the stage and on decorative overlays. Flow layout is self-healing under length variance; a scene graph of absolute `x/y/w/h` is brittle under it. **Resolution — "Absolute Frame, Flow Interior."** Elements are absolutely-positioned boxes (`x, y, w, h, rotation`) — selectable, draggable, resizable — but their *interior* uses normal flow plus measured auto-fit. This is how Figma and Canva text frames actually behave, and it buys three things at once: the LLM targets named slots rather than free-form coordinates, the editor gets real drag/resize handles, and overflow is self-healing within a band and exactly measurable at the box boundary. Independently corroborated by the peer consult from a different angle: absolute positioning is only the beginning of a scene graph — text runs, reading order, grouping, crop, transforms, style inheritance, font assets and collision policy must all be made explicit, which is what the document model below does.

**Finding 2 — Measurement Determinism Depends On Fonts.** `document.fonts.ready` must be awaited before any measurement, and fonts must be pinned, self-hosted and content-addressed (OFL only) — otherwise the validator measures a fallback font while the user sees something else: a hard-to-diagnose bug class, plus an offline and licensing problem. `deck-stage:ready` additionally waits on image decodes, SVG completion and two animation frames after layout before either measurement host reads the DOM.

**Finding 3 — `no_overlapping_text` As A Global Rule Is Wrong.** Good design deliberately overlaps (halftone overlays, z-layered decor, negative-margin panels), and both prior decks do it. The overlap allowance is declared **by the template** (collision groups and intentional-overlap rules), not by the element — text-over-text is critical, decorative collision is informational, and a per-element `allowOverlap` flag survives only as an editor-set escape hatch.

**Finding 4 — Repair Is A Ladder And The LLM Is The Last Rung.** See "Repair Ladder And Termination" below.

**Finding 5 — Hosted Generation Requires A Server-Primary Browser Host.** `measure(root)` stays environment-agnostic; Playwright and the in-editor browser are hosts, not separate implementations. Server-side Playwright is authoritative for generation validation and PDF export (no dependency on an open tab); the browser gives instant, explicitly-advisory post-edit badges. Chromium stays inside the single container at concurrency one — a worker is unjustified without measured isolation or concurrency pressure.

---

## Document Model — `packages/deck-schema`

The single Zod-defined, versioned document model serving the generator's output, the editor's mutations, the validator's input and the export's input. TypeScript types derive via `z.infer`, so the schema validating untrusted model output at the boundary is the same schema the editor is typed against.

- **`Deck`** — `schemaVersion`, `documentId`, `revision`, `canvas { width: 1920, height: 1080, printWidthIn, printHeightIn }`, `metadata`, `theme: ThemeSpec`, `assets: Record<AssetId, Asset>`, `slides: Slide[]`. Geometry is design-space pixels only, never viewport units (`"50%"` in `frame.x` is a schema error).
- **`Slide`** — `id`, `templateRef { id, version }?`, `elements: Record<ElementId, Element>`, `rootOrder: ElementId[]` (bottom to top), `readingOrder: ElementId[]`, `speakerNotes?`. **Elements are a keyed map plus two order arrays, not `Element[]`.** With an array, Immer patch paths are positional and shift under reorder, silently corrupting the undo stack; with a keyed map the paths are stable, and the two orderings (visual stacking vs. reading/tab order) cannot both be array position anyway.
- **`Element`** — a discriminated union on `kind`: `text`, `image`, `shape`, `icon`, `svg`, `diagram`, `group`. Every element carries `id`, `parentId?`, `semanticRole`, `frame { x, y, w, h, rotation }`, `opacity`, `visible`, `locked`, `priority`, `style`, and `origin`. `diagram` and `svg` exist in the schema now even though iteration 1 generates neither, so their eventual addition is not a breaking migration.
- **Text content** — `paragraphs: [{ listStyle?, runs: [{ text, marks: ('em'|'strong'|'code')[] }] }]`. One extra nesting level over a flat span array, chosen because the prior art has multi-paragraph and bulleted text boxes; a flat array would force `\n` smuggling and break per-line measurement.
- **`origin`** — `{ templateSlot?, pipelineStage?, sourceRefs?: string[], userOverrides: string[] }`. Not write-only: `userOverrides` gates repair (see below) and `sourceRefs` feeds the deferred grounding lint.
- **Style by reference, not by value.** Element styles cite a `typeRef`/colour role into `ThemeSpec`; free-floating hex or font sizes are legal only inside `overrides`. This is what stops a model emitting forty arbitrary hex codes, and it is also what keeps the editor's property strip small (see Editor below).
- **Markup is forbidden structurally, not by sanitizer.** `IconElement` carries a `catalogRef`; `SvgElement` carries an `assetId` into a repo-authored, content-addressed catalog; `DiagramElement` carries a structured `DiagramSpec` (nodes, ports, edges, labels, style refs). No element kind has a field typed as raw markup or a raw URL — **a model can reference art; it can never emit it.**
- **Persisted generation state, without provider leakage** — `metadata.generation { state: 'complete'|'partial'|'degraded', flags: DeckFlag[] }` identifies `run_budget_exceeded`, `shared_pool_exhausted`, validation failures and deterministic fallback, and structurally cannot carry a prompt, credential or raw provider response.
- **Migration** — `migrate(doc): Deck` is an ordered chain of pure `v(n) → v(n+1)` functions with an identity migration for v1; the original snapshot is retained.
- **`safeParseDeck`** returns `{ ok, deck } | { ok: false, issues }` with Zod issue paths intact, because the repair round-trip feeds those paths back to the model.

### The D4 Correction To The Brief

The original brief asked for LLM-generated inline SVG diagrams. That is wrong on two independent grounds, not one: **editability** — an opaque SVG blob is a single uneditable element, which directly violates the hard "editable output" product constraint — and **injection** — untrusted model markup carrying `<script>`, `xlink:href` or `foreignObject` is a real injection surface in a hosted browser application rendering provider output. The fix is a structured `DiagramSpec` compiled deterministically to an SVG-backed group with stable per-child element IDs; the compiler itself is deferred to iteration 2, but the `diagram` element kind and `DiagramSpec` land in the schema now so no later migration is needed.

---

## Renderer — `packages/render`

- **`<deck-stage>`**, ported to TypeScript from `layak-pitch-deck.html`, keeps its shadow DOM, `width`/`height`/`noscale` attributes, transform-scale-to-viewport, keyboard/tap navigation and slide-position persistence. Slide content stays in the **light DOM** (slotted) — only runtime chrome and the scaled wrapper live in the shadow root — so measurement and accessibility tooling reach every `[data-element-id]` node without piercing a shadow boundary. `deck-stage.ts` has no import from `packages/deck-schema`; it is schema-agnostic and takes any slotted markup.
- The `@media print` block is ported verbatim in behavior: flattened transform, `break-after: page` per slide, hidden chrome, the design space mapped onto a fixed 16:9 physical page.
- Readiness is gated on `document.fonts.ready`, all image decodes, SVG completion and two animation frames after layout, then `deck-stage:ready` fires (Finding 2).
- `<SlideView slide theme />` emits one absolutely-positioned box per element at its `frame`, z-ordered by `rootOrder`, but **emits DOM in `readingOrder`**, using CSS ordering to supply the visual stacking that differs from it — so tab order and screen-reader order can differ from z-order without a second data structure.
- **"Absolute Frame, Flow Interior"** — the box is absolutely positioned; its interior uses normal flow, so a headline growing 20% wraps inside its box instead of clipping.
- `themeToCss(theme)` emits CSS custom properties resolving `styleRef` + `overrides` — swapping one `ThemeSpec` restyles the whole deck with zero element edits, which is the entire mechanism behind "try another design system."
- `renderDeckToHtml(deck): string` uses `renderToStaticMarkup` to produce a self-contained single file (inlined CSS, inlined fonts, `<deck-stage>` wrapper) that opens from `file://` with the network disabled.
- Render is pure: no fetching, no `Date.now()`, no randomness — the same deck renders to byte-identical HTML twice.

---

## Templates And Design Systems — `packages/templates`

Templates are **data, not code**: the LLM chooses among ~8 templates by `id` and receives typed slots and budgets, never coordinates. This is the anti-lanslop mechanism and the mechanism behind both steering affordances, because templates are art-direction-neutral — geometry, typed slots, style refs — while the design system supplies the tokens those refs resolve to. That neutrality is exactly what makes "try another design system" a token swap instead of a re-layout.

- **Versioned, immutable catalog directories** — `catalog/<template-id>/<version>/{template.json,fixtures/,thumbnail.webp}`. Decks are fully materialized, so an old deck renders correctly without its original template version ever being mutated.
- **`Template`** carries `id`, `version`, `intents[]`, typed `slots` (`accepts`, `budget { maxChars, maxLines, maxItems }`, `optional`, `priority`), `frames`, `styleRefs`, `safeAreas`, collision groups/intentional-overlap rules, `repeaters` (e.g. two-to-four metric cards), `compatibleVariants`.
- 8 templates ship in slice 1: cover, agenda, problem, one-big-claim, two-column text+visual, three-up stat row (repeater), full-bleed visual with caption, closing, plus a `dense` variant for the two that most need one.
- **Every template ships a maximum-capacity fixture, and CI fails if its declared budget overflows in the pinned renderer.** This is the single highest-value idea adopted from the peer consult: it turns a capacity budget from a hopeful number into a tested contract.
- `instantiate(template, bindings, theme)` produces **detached** elements — mutating a returned element never affects the template — with `origin.templateSlot` and `templateRef` retained as provenance (this is the settled "detached binding" decision: theme changes never silently move geometry).
- **3 curated design systems** ship in slice 1 (the Layak editorial scale, the SahurHub comic direction, and one contrasting third), against a settled target library of 6-10; the remaining systems are an iteration-2 task. Every `styleRef` used by any template resolves in all three systems.
- All fonts are pinned, self-hosted (OFL only) and content-addressed under `packages/templates/fonts/`; there is no CDN font fetch at render time (Finding 2).

---

## Provider Layer — `packages/providers`

- **`ProviderAdapter`** — `descriptor`, `listModels()`, `complete(req, signal)`, optional `generateImage(req, signal)`. `ModelCapabilities` (input modalities, context window, max output, structured-output tier, image generation, streaming) live on **model descriptors**, not provider descriptors, because one provider hosts models with different capabilities.
- **Four structured-output tiers**: native JSON Schema → forced tool call → JSON mode → prompt-only extraction with one bounded correction request. A portable JSON Schema subset plus a build-time schema linter rejects unsupported keywords (`$ref`, `oneOf` on discriminated unions, certain `additionalProperties` interactions) before any network call, since several providers reject Zod's default JSON Schema emission at request time.
- **Normalized errors**: `auth`, `rate_limit`, `quota_exhausted`, `transient`, `context_overflow`, `invalid_structured_output`, `refusal`, `unsupported_capability`, `aborted`. Stages never inspect HTTP status or provider payloads. A refusal gets at most one neutral retry.
- **`RunBudget`**, passed to every broker call: a required finite `maxTotalTokens` and deadline; conservative pre-call input reservation from UTF-8 byte counts; output clamped to the remaining allowance; provider-reported usage reconciled after the call; streaming aborts on exhaustion. Clients may request a lower limit than the server cap but can never raise it.
- **Both live adapters ship in slice 1**: an OpenAI-compatible adapter exercised against real Qwen on DashScope's Intl-Singapore endpoint (the production path), and a native Gemini adapter exercising its distinct request/structured-output/usage shapes (the primary development path, on existing free quota). Both run the identical conformance suite and the identical `generateObject` call — this is what makes provider heterogeneity an executable property rather than an assumption. Fixture and noisy adapters cover deterministic, zero-cost, network-blocked CI. Ollama/LM Studio work through the same OpenAI-compatible base URL for optional manual experiments only; they are not a slice gate and do not justify a local proxy or a required local runtime.
- **Generic `CredentialResolver` injection.** Slice 1 resolves only operator environment/deployment secrets (`DASHSCOPE_API_KEY`, `QWEN_BASE_URL`, `GEMINI_API_KEY`); adapters receive an opaque credential handle, and neither pipeline stages nor public requests can identify or supply its source. This is the seam that lets a future local bridge or ephemeral hosted BYOK be added later without changing any stage's type. Slice 1 deliberately does not choose between those two future shapes (see "BYOK Shape — Reserved" below).
- **Per-stage telemetry**: stage name, input hash, schema/prompt version, attempt, model id, normalized input/output/total tokens, wall time, and an optional cost estimate only when operator-supplied pricing metadata exists. No prompt, source, deck body, response body, key, raw IP, GitHub profile payload or session token is ever serialized into telemetry.

---

## Hosted API — `apps/api`

One Bun/Hono service serves the built web bundle, `/api/health`, and every route below, inside **one container** with a persistent `/data` volume reserved for the identity/control ledger. The `DATA_DIR` environment variable names this mount, and the SQLite control-ledger path derives from it (for example, `${DATA_DIR}/control.sqlite`). There is no Compose file, no worker, no queue, no Postgres and no object store in iteration 1.

### Identity, Sessions And Ownership (Q14)

- **GitHub OAuth**, authorization-code flow, single-use state, allowlisted callback/return target, minimum identity scope. The code is exchanged server-side, the stable GitHub subject is fetched, a local user is created/linked, and the GitHub access token is discarded immediately — it is never persisted or logged.
- **Server sessions**: random opaque tokens stored only as hashes, rotated on sign-in, sent as `HttpOnly; Secure; SameSite=Lax` cookies, bounded by idle/absolute expiry, deleted on sign-out.
- **Minimal SQLite control store**: `users` (stable internal `id`, unique GitHub subject), `sessions`, and per-user allowance counters/reservations, with `ON DELETE CASCADE` foreign keys and **no `deleted_at` column anywhere**. It stores no OAuth token, prompt, source material, deck, stage artifact, provider response or API key.
- **Owner-only authorization**: the internal user `id` is the canonical `ownerId`; one guard permits only `session.userId === resource.ownerId`. No sharing, public visibility or bypass role exists in iteration 1.
- **Hard account deletion**: one transaction physically deletes the user plus sessions, allowance rows and every other user-linked control row, then invalidates the current cookie. Row counts are zero afterward; a second delete is idempotently absent; no tombstone remains. Any future deck/asset table must cascade or explicitly delete under this same contract.
- There is **no anonymous path and no invite/referral-code path** — Q14 replaces the earlier invite-code design rather than supplementing it.

### Admission Order

Composed in this order, so denial at any earlier layer produces zero downstream provider calls: **authenticated user → coarse HMACed-IP backstop (no raw IP stored) → atomic per-user token/run allowance → global in-process concurrency semaphore → per-run circuit breaker/input-size limit.** Reservations release or reconcile on abort at every layer.

### Run Budget And Circuit Breaker (Mandatory)

Every generation run carries a server-controlled finite token ceiling and wall-clock deadline, on top of the provider-layer `RunBudget` described above. Production startup fails closed if the token ceiling, wall deadline or max-input-bytes configuration is missing or unbounded; tests inject explicit small values. Budget exhaustion aborts pending work and returns the best schema-valid `partial`/`degraded` deck with a typed flag — never an opaque 500, never a silent retry.

### Generation And Export Routes

- `POST /api/generation/slide` streams `application/x-ndjson` events (`accepted`, `stage_started`, `stage_completed`, `partial_deck`, `flagged`, `completed`, `failed`). Client disconnect cancels provider and Playwright work via `AbortSignal` propagation. NDJSON keeps partial artifacts and progress on one fetch without inventing durable job IDs or an EventSource/queue lifecycle.
- `POST /api/export/pdf` authenticates, validates the schema/body size, runs under the same admission/concurrency controls, streams the PDF response, and discards server-side bytes after completion — no deck, export row or file is retained.
- A single global generation semaphore returns typed `capacity_busy` with a retry time rather than queuing; a Playwright semaphore is fixed at one initial browser job.

---

## Repair Ladder And Termination (Finding 4)

Most overflow is fixable with no tokens spent:

1. **Tier 0 — Fit.** Binary-search the theme's type scale down to a floor at the role's readable minimum; line-height/tracking adjustable only within a declared band.
2. **Tier 1 — Select.** Choose a shorter pre-generated `SlideContent` variant, or a declared higher-capacity template variant — a local, free, deterministic choice (see "Pipeline Is An Artifact Graph," above).
3. **Tier 2 — Rewrite** (iteration 2). Call the model only now, with measured numbers ("renders 148px in a 96px box; rewrite to ≤ 42 characters, preserve the named facts"), never a vague "make it shorter."
4. **Tier 3 — Degrade.** A tested low-density template, optional material removed by importance, truncation only at word boundaries, original content retained in provenance, the slide marked `degraded` and prominently flagged.

**Termination is guaranteed by four independent conditions**, not one: ≤ 3 model attempts per slide; the server-controlled finite token ceiling plus wall deadline; rejection of a repeated document-state hash; and one deterministic safe fallback after model attempts are exhausted. On failure the deck still returns, badged with its measured overflow/budget reason.

**Repair protection (D5).** A repair patch may never write a property path listed in an element's `origin.userOverrides`. If repair needs a protected path, it degrades to a flag surfaced in the editor with its measured number (e.g. "this headline overflows by 66px") and the human decides. After any human edit, validation runs in **warn mode**, never auto-repair mode — "Regenerate this slide" is the explicit opt-in, and it warns before discarding edits, naming them. A tool that silently undoes a user's work is worse than no tool; under the workbench framing this is a correctness property, not a policy note.

---

## Measurement — `packages/validate`

`measure(root: ParentNode, deck): Violation[]` is the one implementation, gated on `deck-stage:ready`, called by two thin hosts: pinned server Playwright (authoritative for generation and export) and the in-editor browser (advisory, for immediate post-edit badges). Both hosts agree on violation type/element/magnitude within a declared numeric tolerance; reports are marked with host/Chromium/font revision so a stale or mismatched browser report can never be mistaken for an authoritative server acceptance.

Checks return a **numeric magnitude**, never a boolean: `overflow` (`scrollHeight − clientHeight` plus `Range.getClientRects()` line counting, to catch clipped glyph fragments), `overlap` (polygon intersection via `DOMMatrix`-transformed corners, because elements rotate — axis-aligned rectangles are insufficient), `min_font_size` (expressed in **physical points** via `canvas.printWidthIn`, not design pixels), `out_of_bounds`, `safe_margin`, `image_aspect`, and `contrast` (direct calculation for solid fills; render-behind-text pixel sampling for images/gradients, since a naive computed-background check would miss a white-on-photo failure). Overlap honors template-declared collision groups (Finding 3).

---

## The Four-Rung Quality Ladder

The mechanical checks above (overflow, overlap, contrast, bounds, minimum size) are necessary but not sufficient — passing them does not make a deck judge-ready. The full architecture has four rungs; **none is deleted, none is conflated with mechanical layout measurement**, and only the implementation date of rung 1 moves:

1. **Deterministic content lints** — grounding (a statistic without `origin.sourceRefs` is flagged), repetition (shingle similarity between headlines above a threshold), hierarchy (exactly one `headline` role per slide; a slide past a word/bullet ceiling is a wall), variety (≥ K distinct templates, never the same one three times running), and an opener-slop deny-list. **Implementation is deferred to iteration 2**, after the persistence-opening task and before full-deck prompt tuning is safe — grounding, repetition and variety cannot be honestly evaluated while slice 1 regenerates one slide from an existing deck rather than a full narrative. Slice 1 still lands the data contracts this rung depends on: `origin.sourceRefs`, semantic roles, template provenance, a deliberately-sloppy fixture, and the typed `ContentQualityReport` interface (as a no-op stub), so no migration is needed later.
2. **A rubric-scored LLM critic** (iteration 2, interface stubbed in slice 1) — structured output against a fixed rubric, per-slide scores plus one concrete fix each. Advisory only: it emits flags, never auto-edits, and is never a provider requirement or the sole validator.
3. **A vision critic on rendered screenshots** (iteration 2+, gated on a `capabilities.vision` model flag).
4. **Human evaluation — the actual gate** (defined now, run starting iteration 2). A fixed five-project hackathon corpus and one question: would you present this without editing it? Proposed target ≥ 3 of 5 decks judged presentable with ≤ 5 minutes of editing, by someone who did not build the deck. This is the half that actually decides whether the product works; rung 1 is the mechanical half.

---

## Editor Workbench — `packages/editor` / `apps/web`

The editor is a workbench, not an escape hatch: it is where the human steers the generator, because reusing the pipeline beats reimplementing a general design tool. Slice 1 delivers select · move/resize/**rotate** · in-place text edit · delete/hide · a **layers list** (z-ordered, select/lock/visibility, no drag-to-reorder) · a **role-constrained property strip** (swap type role, swap colour role, nudge font size within a declared band — no free-form hex picker, no font picker) · undo/redo · **"Regenerate This Slide"** · **"Try Another Design System"** · export.

- The document store (`packages/editor/src/store`) applies every mutation through `produceWithPatches` (Immer), turning each command into forward/inverse patches on an undo stack as a by-product. Every command additionally records the property paths it wrote into `origin.userOverrides`, and undo removes the paths it added.
- Selection uses `Selecto`; move/resize/rotate use `react-moveable`, snapped to the template grid and sibling edges, operating in design-space coordinates behind one surface transform.
- In-place text editing writes structured paragraphs/runs on blur/Escape via `beforeinput`; raw `contenteditable` HTML is never stored. If caret/IME behavior under the scaled stage proves poor, the named fallback is an unscaled text-editing overlay — not reconsidering canvas.
- "Regenerate This Slide" streams `partial_deck` events from `POST /api/generation/slide` into a preview and commits only schema-valid results; if the slide carries any `origin.userOverrides`, it requires named confirmation listing what will be discarded (D5).
- "Try Another Design System" calls `reskinDeck`, re-validates, and is undoable as one entry.
- Autosave targets browser OPFS; `.bmd` (a zip of `deck.json`, assets, fonts and a manifest) is the portable save/export format. No provider key, GitHub profile payload, session token, raw IP or server allowance data ever enters OPFS, `.bmd`, the built browser bundle or its source maps.
- `run_budget_exceeded` and `shared_pool_exhausted` are terminal product states: the partial/current deck stays editable and exportable, the typed reason is shown, and there is no auto-retry and no provider-key field.

Explicitly out of scope for the editor in iteration 1: shape creation, slide reordering, a free-form color picker, a font picker, drag-to-reorder layers, image cropping.

---

## Export — `packages/export`

Server-primary Playwright (Q13) renders via `renderDeckToHtml`, awaits `deck-stage:ready`, and prints at the deck's declared 16:9 physical dimensions, producing a vector, searchable, font-embedded PDF under 1 MB for the three-slide text-only fixture — with no server-side deck or export artifact retained afterward. Browser `printDeck()` remains a fallback matching the same page geometry. `.bmd` and single-file HTML export are both browser-side. `packages/export` and `packages/validate` use **no Bun-only APIs** (`Bun.file`, `Bun.spawn`, `bun:sqlite`) so a Node LTS fallback, if Playwright proves unstable under Bun, is a runtime swap rather than a rewrite.

---

## Persistence, Sequencing And Privacy

- **Slice 1 is browser-owned.** OPFS autosave and `.bmd` export/import are the persistence and portability boundary. The server holds only the identity/control ledger described above — no deck row, no asset row, no durable queue.
- **Iteration 2 opens with server-side deck persistence**, deliberately sequenced first and delayed until the document schema has stopped moving, adding private owner-keyed deck/asset rows on top of the owner model that already exists from slice 1's GitHub identity work. Opt-in sharing and any public gallery follow only after that, on top of the existing ownership model.
- **Privacy is invariant across both iterations**: a deck is visible only to its owner; sharing/gallery are explicit opt-ins, never a default; deletion is physical everywhere — no `deleted_at` or soft-delete flag is permitted in any schema, present or future.

## BYOK Shape — Reserved

Slice 1 deliberately does not choose between an optional local bridge and ephemeral hosted BYOK for a future non-shared-pool path. It ships only the typed `shared_pool_exhausted` response and editor state: the current/partial deck is preserved, retries stop, and no key field is exposed anywhere in the public request schema. The generic `CredentialResolver` injection point in `packages/providers` is what lets either future shape be added without changing a pipeline stage's type.

## Deployment

One `Dockerfile`: one Bun/Hono process serving the built Vite bundle and the API, pinned fonts, pinned Chromium, and a persistent volume mounted only for the identity/control SQLite file. No Docker Compose, no three-container topology, no Postgres, no object store. A queue/worker is added only if measured need — disconnect/restart survival or measured independent scaling pressure — actually appears; the iteration-2 deck/object persistence technology is chosen only after the document schema has stabilized, immediately before implementing its first task.

---

## Settled Questions — Outcomes, Not Forks

| # | Question | Outcome |
|---|---|---|
| Q1 | Renderer | Absolutely-positioned DOM in a fixed 1920×1080 stage with a transform overlay; SVG only for structured diagrams/icons. Closed. |
| Q2 | Design systems | 6-10 hand-authored systems long-term; slice 1 authors and tests 3. The model selects and lightly parameterizes, never invents. |
| Q3 | Hosted only | The default product is a hosted service funded by TolongLabs' shared Qwen/Gemini pool. A local-first primary posture is removed. |
| Q4 | Minimal backend | One bounded API service is required; no worker/queue, cloud deck database, object store or multi-container topology is assumed. |
| Q5 | Export format | PDF is sufficient for iteration 1; PPTX is deferred, not cancelled. |
| Q6 | Detached binding | Templates materialize plain elements with provenance; re-layout is an explicit command; theme changes never silently move geometry. |
| Q7 | Framework | React + Vite; no Next.js, no SSR. |
| Q8 | Cost/latency targets | Instrument first, decide later — per-stage tokens/wall time/attempts/model/cost recorded; no product target invented before real Qwen/Gemini benchmarks. Does not weaken the mandatory run circuit breaker. |
| Q9/Q12 | Editor scope | Workbench with steering: text edit, move/resize; "regenerate this slide" and "try another design system" are first-class. |
| Q11 | Rich text | `paragraphs: [{ listStyle?, runs: [{ text, marks }] }]`; no HTML string, no full rich-text framework in slice 1. |
| — | Regeneration granularity | Slide-level first; per-element provenance lands now so element-level regeneration needs no later migration. |
| — | Provider scope | Qwen (production, OpenAI-compatible) and Gemini (development, native) both real and tested in slice 1; fixture/noisy adapters serve deterministic CI. |
| — | Run circuit breaker | Mandatory: finite token ceiling, wall deadline, repair attempt cap, state-cycle check on every run. |
| Q13 | Measurement/export hosting | Server-primary Playwright inside the single API container, capped at one browser job; browser measurement is advisory. |
| Q14 | Identity | GitHub OAuth, server sessions, stable local owner model, per-user allowances, coarse IP backstop, global concurrency cap, per-run circuit breaker. Invite/referral codes dropped entirely. |
| Q15 | BYOK shape | Reserved — not chosen. Only the typed `shared_pool_exhausted` contract ships; credential injection stays generic. |
| Q16 | Deck persistence | Browser-owned in slice 1 (OPFS + `.bmd`); no durable queue. Server persistence is iteration 2's first task, sequenced after schema stabilization. |
| — | Privacy | Private by default; deletion is physical everywhere; no soft-delete flag is permitted. |

No line above reverses a previously shipped decision in `docs/decisions.md`; Q3/Q4 reverse only an earlier, unshipped revision-2 synthesis that was never approved.
