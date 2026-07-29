# PLAN

> Owned by **PL**. The PM presents this at **Gate 1** for the human to approve before any implementation.
>
> **Iteration 1 — Architecture-Defining.** This plan settles the stack, the document model, and the editor/renderer choice.
>
> **Revision 4 — Gate 1 Closed.** The hosted reversal is approved and every remaining Gate 1 fork is resolved: server-primary Playwright; GitHub OAuth with per-user allowances; a reserved BYOK shape; browser-owned decks in slice 1 with server persistence first in iteration 2; and private-by-default ownership with real deletion. The provider/runtime boundary and identity/admission boundary are split into two security-critical tasks. A blind peer consult (Codex, `docs/.codex/peer-consult-v3.md`) was written before either posture was settled; its server reasoning remains relevant after the severe YAGNI cut. See **Peer Consult — Where We Disagreed** for the complete eight-disagreement record.

---

## Iteration Goal And The Riskiest Assumption

**Riskiest Assumption:** _A finite template catalog plus a curated design system plus measured auto-repair can produce a deck that looks hand-designed._

That single assumption is the product's whole thesis. If it is false — if template-instantiated decks look like a PowerPoint theme — the product has no reason to exist, because the differentiator was never the editing, it was **the first draft being good**.

**The Slice, Reversed:** _Deploy one bounded hosted service; reproduce three slides of the Layak deck from a `Deck` document; reskin the deck across three curated design systems; regenerate one slide through the same pipeline against real Qwen and real Gemini adapters; move and retype elements; validate in the Gate-1-selected browser host; export a vector PDF; and report per-stage tokens and wall time without exposing a provider key._

Five consequences follow directly from the human's correction:

1. **The editor is a workbench, not an escape hatch.** It is where the human *steers the generator* — "regenerate this slide", "try another design system" — because reusing the pipeline beats reimplementing Canva. That earns the editor more scope than revision 1 gave it.
2. **The Product Has A Server Boundary.** The browser calls a TolongLabs API; the shared Qwen key exists only in that server process. The API authenticates users, streams runs and exports, enforces admission and budgets, and serves the web bundle. Its SQLite control store holds the minimum user/session/allowance model, but it does **not** earn a worker, durable job queue, deck database, object store, or three-container topology in a pre-launch slice.
3. **The Development And Production Paths Must Both Be Real.** Development primarily uses the available Gemini key; production uses Qwen through DashScope's Intl-Singapore OpenAI-compatible endpoint. Both adapters land in slice 1 and run the same conformance suite and pipeline. Fixture and noisy adapters remain for deterministic, zero-cost CI.
4. **A Shared Pool Requires A Circuit Breaker Before Prompt Tuning.** Every run receives a server-controlled finite token ceiling and wall-clock deadline. Input is bounded before the first paid call. The broker reserves budget before each call and reconciles provider-reported usage after it. Exhaustion aborts pending work and returns the best valid partial or degraded deck with a typed flag.
5. **Measurement Hosting Is Settled.** One `measure(root)` implementation still has two hosts. Pinned Playwright inside the single API container is authoritative for generation validation and PDF export, initially capped at one browser job; browser measurement remains advisory for immediate post-edit badges.

**Explicitly Out Of Scope For Iteration 1:** full intake/fact-extraction/narrative stages; image generation; the diagram compiler; model-driven Tier-2 repair; Anthropic; identity providers beyond GitHub; account-management UI beyond sign-in, sign-out and deletion; sharing and public galleries; durable/resumable jobs; server-side deck or asset storage; collaboration; PPTX; per-slide PNG.

**The Tightening Line Is Applied Now.** The reversal adds a security- and cost-critical service boundary plus a second native provider adapter. Keeping all 16 prior tasks would no longer be credible. **Task 3's template-targeting spike is deferred**, because the two real adapter smoke tests now expose real failure modes. **Task 13's full deterministic content-lint implementation is deferred until iteration 2, after the mandated persistence opening task and before full-deck prompt tuning**, while the four-rung quality contract, required provenance, fixtures and interfaces remain in slice 1. Server-side deck storage is not pulled forward. GitHub OAuth replaces the invite mechanism rather than supplementing it, but the security surface makes the old task 6 too large, so it is split into tasks 6A and 6B. The three curated design systems remain non-negotiable. This leaves **15 active task units across seven waves**. That is the maximum credible size, with no slack; deferring deck persistence is what keeps it at the line. If identity work overruns, cut the property strip first and rotate second.

---

## Peer Consult — Where We Disagreed

Two independent proposals, same brief, neither seeing the other. Recorded so the human sees the disagreement map rather than a laundered consensus.

### Where We Converged Without Contact

These carry unusual weight — two blind analyses reaching the same answer by different routes.

- **DOM Over Canvas.** Both rejected Konva, Fabric, PixiJS and tldraw and chose absolutely-positioned DOM with a transform overlay. Codex weighted accessibility and "no second renderer"; this plan weighted vector PDF, text fidelity and LLM-generability. Same verdict.
- **React + Vite, Not Next.js.** Independently identical, for the same reason: a stateful client app with no SSR need.
- **`react-moveable` + `Selecto` + Zustand + Immer.** Identical library picks.
- **Keep `<deck-stage>`.** Both treat the prior art's runtime as an asset to port, not to rebuild.
- **Templates As Data, Not Code.** Both. The LLM receives intents and budgets, never coordinates.
- **Style By Reference, Not By Value.** Both. Elements cite theme tokens; free hex is confined to overrides.
- **Defer PPTX.** Both, unprompted.
- **"Absolute Positioning Is Not Yet A Scene Graph."** Independent corroboration of this plan's **Finding 1** from a different angle — Codex lists what else must be explicit (text runs, reading order, grouping, crop, transforms, style inheritance, font assets, collision policy). The human can accept that correction with confidence.

### D1. First-Slice Scope — The Biggest Gap

- **PL:** No LLM at all. Reproduce three Layak slides from hand-authored JSON; prove the document model's ceiling with zero API spend, because the Qwen credits have not arrived.
- **Codex:** A full vertical slice through Qwen plus a second real provider — intake, six slides, six templates, two themes, repair, broad editor.
- **Adopted After The Hosted Reversal: the hand-authored ceiling proof plus two real hosted seams.** Keep the golden fixture (PL). Keep Codex's provider-neutral vertical seam. Slice 1 now ships **four adapters** behind one broker: a deterministic fixture adapter, an adversarial noisy adapter, an OpenAI-compatible adapter exercised against **real Qwen on DashScope**, and a **native Gemini adapter** with its different request and structured-output shape.
- **Why:** development credentials already exist for both families: Gemini free quota and leftover Alibaba Model Studio quota on the same Intl-Singapore endpoint production will use. The production route is therefore tested before the $300 user-generation pool arrives, while development can benchmark primarily on Gemini. The **$300 credit award itself remains off the implementation critical path**, but for a different reason than revision 2: existing real hosted quota covers development; it is not because users bring keys or because a local model stands in for production.
- **Heterogeneity Becomes An Executable Property.** Two live adapters that share only `ProviderAdapter` and the conformance suite prove that stages do not depend on an OpenAI-shaped request, tool call, schema mechanism, or usage response. This is materially stronger than one adapter plus a local compatible endpoint.
- **Ollama / LM Studio:** the OpenAI-compatible base URL still supports them with no adapter file, which is useful for optional manual experiments. They are **not** a slice gate and do not justify a local proxy or a required 150 MB model/runtime install. Fixture and noisy adapters already cover zero-cost, network-blocked CI.
- **Still Rejected From Codex:** intake and narrative stages (iteration 2 — the slice only needs `SlideContent → LayoutBindings → Slide`), and the "≥90% of a varied hackathon corpus exits clean" gate, which cannot be measured without generation at volume. That gate remains an iteration-2 exit criterion.
- **Reverses If:** either live adapter requires provider-specific branching outside `packages/providers`. That is a failed abstraction, not a reason to leak the provider into a stage.

### D2. Editor Scope In Slice 1

- **PL:** Text edit plus move/resize. Undo was already in (a separate store task with patch-based undo) — Codex could not see that, so the "add undo" disagreement is partly a blind spot rather than a real fork.
- **Codex:** Add rotate, style override, layers and undo.
- **Adopted: Codex's list, re-cut against the workbench framing, with one substitution.** Slice 1 delivers select · move/resize/**rotate** · in-place text edit · delete/hide · **layers list** · **property strip** · undo/redo · **regenerate slide** · **try another design system** · export.
  - **Rotate** is nearly free: `react-moveable` provides the handle and the schema already carries `rotation`. The real cost is polygon-based overlap measurement — but templates can specify rotation regardless of whether the editor exposes a handle, so that cost is incurred either way. Take the handle.
  - **Layers** earns its place under the workbench framing for exactly Codex's stated reason: it is the only mechanism for reaching a locked background element the generator placed. Cut to a z-ordered per-slide list with select, lock and visibility toggles. **No drag-to-reorder** in slice 1.
  - **Style override** is substituted, not adopted. Codex's open "style override" is where Canva-clone scope creep lives. Slice 1 ships a **role-constrained property strip**: swap the type role (from the design system's roles), swap the colour role (from the theme's semantic colours), nudge font size within the declared band. **No free-form hex picker, no font picker.** This is both smaller than Codex's proposal and better, because the constraint that keeps the editor small is the same constraint that enforces style-by-reference and stops a deck acquiring forty arbitrary colours.
- **Why:** the human reframed the editor as a human-in-the-loop workbench. A workbench you cannot undo in, cannot reach behind, and cannot re-steer is not a workbench.
- **Paid For By:** Gemini can no longer be deferred. The hosted reversal instead consumes the room created by applying the tightening line now: task 3's standalone targeting spike and task 13's full content-lint implementation move to iteration 2, as does the diagram compiler (see **D4**). If the editor still overruns, the property strip remains the first editor cut, then rotate.
- **Reverses if:** the surface work overruns. The first things to drop are the property strip, then rotate.

### D3. Rich Text

- **PL:** A flat span array — `[{ text, marks }]`. ~65% confident.
- **Codex:** Structured text with **paragraphs and styled runs**, and reading order stored **separately from visual stacking order**.
- **Adopted: Codex on both counts.** Text content is `paragraphs: [{ listStyle?, runs: [{ text, marks }] }]`, and `Slide` carries both `rootOrder` (bottom-to-top z) and `readingOrder` (DOM and assistive order) as separate arrays.
- **Why:** the flat array was the weaker call and PL said so at 65%. The prior art has multi-paragraph and bulleted text boxes; a flat array forces `\n` smuggling, which breaks measurement per line and makes lists a second element kind. One extra level of nesting is still trivially LLM-emittable. The reading-order separation is cheap now and expensive to retrofit — adopt it regardless of which text model wins, exactly as the PM directed.
- **Reverses if:** inline links, nested lists or inline colour become requirements — then a real editor model (Lexical) is warranted and the migration chain absorbs it.

### D4. Diagrams — A Correction To The Brief

- **Brief (original):** diagrams are generated as inline SVG.
- **Codex:** _"LLM-generated arbitrary inline SVG conflicts with editability and security."_ Generate a structured `DiagramSpec` (nodes, ports, edges, labels, style refs) and compile it deterministically to an SVG-backed group with stable per-child element IDs.
- **Adopted: Codex, plainly and completely. It is right and the brief was wrong.** An opaque SVG blob is one uneditable element, which directly violates hard product constraint #2; and untrusted model markup carrying `<script>`, `xlink:href` or `foreignObject` is an injection surface in a hosted browser application rendering provider output.
- **Consequence, and it is stronger than it looks:** the schema must forbid model-authored markup structurally, not by sanitizer. `IconElement` carries a `catalogRef`; `SvgElement` carries an `assetId` into a repo-authored, content-addressed catalog. **A model can reference art; it can never emit it.** The prior art's hand-authored icon sets become catalog entries.
- **Slice 1 scope:** the `diagram` element kind and `DiagramSpec` land in the schema so no migration is needed later; **the compiler is deferred to iteration 2**. This is part of what pays for D2.
- **Reverses if:** nothing plausible. This is a security and product-contract issue, not a taste call.

### D5. Repair Versus Human Edits

- **PL:** A four-tier repair ladder with no protection for human edits at all.
- **Codex:** _"Automatic repair after human edits is dangerous; user overrides must be protected and post-edit repair opt-in."_
- **Adopted: Codex, and it is now load-bearing** — under the workbench framing, a tool that silently un-does the user's work is worse than no tool.
- **Mechanism, made concrete** (this is a schema change, not a policy note):
  - `ElementBase.origin.userOverrides: string[]` records **property paths** the human has edited (`"content"`, `"frame.x"`, `"style.overrides.color"`). Every editor command appends the paths it wrote.
  - A repair patch **may not write a path listed in `userOverrides`.** If repair needs a protected path, it degrades to a flag surfaced in the editor with its measured number — "this headline overflows by 66 px" — and the human chooses.
  - After any human edit, validation runs in **warn mode**, never auto-repair mode.
  - "Regenerate this slide" **is** the explicit opt-in. It warns before discarding — "this will discard 3 of your edits" — and lists them.
- **Reverses if:** nothing. This is now a correctness property of the workbench.

### D6. Quality Gates — Mechanical Is Not Enough

- **PL:** Validation is entirely mechanical — overflow, overlap, contrast, bounds, min size.
- **Codex:** _"Passing overflow checks does not make a judge-ready deck."_ Narrative grounding, content hierarchy, visual variety and human evaluation need separate gates.
- **Adopted: Codex's diagnosis. This is the lanslop problem restated and PL had no answer to it.** The four-rung contract is preserved exactly. Applying the tightening line changes the implementation date of rung 1, not the architecture:
  1. **Deterministic Content Lints (iteration 2, before full-deck prompt tuning; contracts preserved in slice 1).** Mechanical in implementation, non-mechanical in intent — they measure slop, not layout. **Grounding:** any element carrying a statistic must have `origin.sourceRefs` into the intake fact set; an ungrounded number is flagged. **Repetition:** shingle similarity between headlines above a threshold flags "slides 4 and 7 make the same point". **Hierarchy:** exactly one `headline` role per slide; body never renders larger than the headline; a slide past a word/bullet ceiling is flagged as a wall. **Variety:** a deck must use ≥ K distinct templates and never the same template three times running. **Opener Slop:** a small deny-list of the phrases that mark generated prose. Slice 1 still lands `sourceRefs`, semantic roles, template provenance, a deliberately-sloppy fixture, and the typed `ContentQualityReport` boundary so this work needs no migration.
  2. **A Rubric-Scored LLM Critic (iteration 2, interface stubbed in slice 1).** Structured output against a fixed rubric, returning per-slide scores plus one concrete fix each. Advisory — it emits flags, never auto-edits, and per Codex's constraint it is never the sole validator and never a provider requirement.
  3. **A Vision Critic On Rendered Screenshots (iteration 2+, gated on `capabilities.vision`).**
  4. **Human Evaluation — The Actual Gate (defined now, run at iteration 2).** A fixed five-project hackathon corpus and one question: _would you present this without editing it?_ Proposed target: **≥ 3 of 5 decks judged presentable with ≤ 5 minutes of editing, by someone who did not build the deck.** Codex's "≥90% exit with no critical mechanical violations" is the mechanical half; this is the half that actually decides whether the product works.
- **Why The Deferral Is Safe:** the slice generates one slide at a time from an existing deck rather than producing a full narrative. Grounding, repetition and variety cannot yet be evaluated honestly across a generated corpus. The data needed by the gates still lands now; their implementation precedes full-deck generation in iteration 2.
- **Reverses If:** full intake/narrative generation is pulled back into slice 1. Then rung 1 must return with it; generator tuning cannot precede its content gate.

### D7. Bun For The Playwright Host

- **PL:** Assumed Bun everywhere without examining it.
- **Codex:** One of its three least-confident calls. Recommends keeping the worker boundary clean enough to run under Node LTS if Playwright proves unstable under Bun.
- **Adopted: the risk and the fallback are recorded; the repo default stays Bun** (per this machine's convention and `AGENTS.md`).
  - **Mitigation:** `packages/export` and `packages/validate` use **no Bun-only APIs** — no `Bun.file`, no `Bun.spawn`, no `bun:sqlite` — so the fallback is a runtime swap, not a rewrite. This is an implementation constraint on tasks 11 and 12, asserted by a grep test.
  - **The Hosted Reversal Raises The Stakes Again.** Q13 puts Chromium on the production path for authoritative validation/export, capped at one browser job initially. It still runs inside the single API deployment at slice-1 scale; that does not justify a worker service or queue by itself.
- **Reverses If:** restart, cancellation or memory-soak tests show instability under Bun. Then only the Playwright host runs as a Node LTS child process in the same container first. A separately deployed worker is earned only by measured concurrency, isolation or resumability needs.

### D8. Pipeline Directionality

- **PL:** A repair ladder whose Tier 1 swaps to a denser template variant — partial coverage, never stated as a property.
- **Codex:** _"The pipeline cannot be strictly one-way — content capacity depends on layout, and repair must revisit content or select a template variant."_ Implement it as an artifact graph with bounded feedback, and have `ContentPlan` carry **capacity-aware variants up front** (headline short/standard; body short/standard/extended; bullets ranked by importance) so layout *selects* rather than re-asking the model.
- **Adopted: Codex, wholesale, as a first-class architectural property in `docs/trd.md`.**
- **Why:** Codex's framing is strictly better than PL's. Carrying length variants converts a model round-trip into a local selection — cheaper, faster, deterministic — and it is precisely what lets Tier 0 and Tier 1 absorb the majority of violations without a single token. PL's Tier 1 was the same instinct arriving one step too late in the pipeline.
- **Bounded How:** repair may return to the content artifact, but under a per-slide attempt cap, a lexicographic improvement requirement, a document-state hash cycle check, and a server-controlled global budget. The global budget now has a non-negotiable implementation: every run carries a finite token ceiling and wall-clock deadline through every broker call; clients may request a lower limit but can never raise the server cap. Budget exhaustion returns the best valid partial/degraded deck rather than continuing or collapsing to an opaque 500.

### Adopted From Codex Without Disagreement

Material where the peer was simply stronger and this plan had nothing or less:

- **Elements As A Map Plus Order Arrays** (`elements: Record<ElementId, Element>` + `rootOrder` + `readingOrder`) instead of PL's `elements: Element[]`. **This fixes a real bug in revision 1**: with an array, Immer patch paths are positional (`/slides/2/elements/4/frame/x`) and shift under reorder, which silently corrupts an undo stack. With a keyed map the paths are stable. Two orderings cannot both be array position, so the map form was forced anyway.
- **Capabilities On Model Descriptors, Not Provider Descriptors.** Revision 1 put them on the provider, which is wrong — one provider hosts models with different context windows, structured-output tiers and image support.
- **A Fourth Structured-Output Tier.** Native JSON Schema → **forced tool call** → JSON mode → prompt-only with extraction and one bounded repair. Revision 1 had three; the forced-tool-call rung is real and widely supported.
- **A Portable JSON Schema Subset Plus A Schema Linter** that rejects unsupported keywords at build time. Zod's JSON Schema emission produces constructs (`$ref`, `oneOf` on discriminated unions, `additionalProperties` interactions) that several providers reject at request time. Catching that in a unit test rather than at 2 a.m. is worth thirty lines.
- **A Refusal Gets At Most One Neutral Retry.** The pipeline never endlessly paraphrases a prompt.
- **`AssetPlan` Fallback Chain** — `provided screenshot → generated diagram → fixed icon composition → generated image`. The concrete mechanism behind "image generation cannot be assumed". Slice 1 exercises rungs 1 and 3.
- **Versioned, Immutable Template Directories** (`catalog/<id>/<version>/template.json` + fixtures + thumbnail) with **fully materialized decks**, so an old deck renders without its original template. Cheap now, unfixable later.
- **Maximum-Capacity Fixtures Per Template**, and _"a template is not publishable if its declared budgets overflow in the pinned renderer."_ **The single best idea in the peer proposal.** It turns a capacity budget from a hopeful number into a tested contract, and one CI test of that shape is worth more than a great deal of repair machinery.
- **Typed Slots** (`accepts: ["text" | "stat" | "quote" | "screenshot" | "image" | "diagram"]`) over PL's untyped `role` string, plus **repeaters** (two-to-four metric cards) as the way to get variety without N templates.
- **Template-Declared Overlap Allowances** rather than PL's per-element `allowOverlap` flag — the template author knows text-over-panel is intended; the LLM and the element do not. The per-element flag survives only as an editor-set escape hatch.
- **`.bmd` Archive** (deck.json + assets + fonts + manifest). It remains the portable ownership boundary because slice 1 deliberately has no server-side deck library: a bare `.deck.json` silently loses the user's screenshots.
- **`speakerNotes` On `Slide`.** The notes field is painful to retrofit because the PDF path needs a notes page. Per-slide PNG was also adopted in revision 2 but is deliberately removed by the hosted tightening line; PDF is the settled sufficient export.
- **Print Dimensions On The Canvas** (`printWidthIn`/`printHeightIn`), so the minimum-font-size check is expressed in **physical points**, not design pixels. Correctness improvement.
- **Content-Addressed Fonts And Assets**, making the single-file export deterministic.
- **A Named Fallback For The DOM-Editing Risk:** if caret or IME behaviour under the scaled stage is poor, move text editing into an **unscaled overlay** before ever reconsidering canvas. Revision 1 had the risk but no fallback.

### Reinstated From Codex, After A Severe Cut

- **One API Boundary And Streamed Progress.** `apps/api` returns newline-delimited JSON from a request-scoped `POST`, centralizes provider calls, enforces authenticated admission/budgets, and hosts pinned Chromium at concurrency one. NDJSON keeps partial artifacts and progress on one fetch without inventing durable job IDs or an EventSource/queue lifecycle.
- **Environment-Managed Provider Credentials.** TolongLabs' Qwen key and the development Gemini key are server-side secrets. This is materially simpler than custody of arbitrary users' keys: there is one operator-controlled credential set, no `provider_credentials` table, no encryption/expiry lifecycle, and no provider key ever crosses into the browser. Credential resolution remains a generic provider-layer injection point so a later local bridge or request-scoped hosted credential can be added without changing stages; Q15 reserves which one. The surviving rule is unchanged and load-bearing: keys never enter deck documents, analytics, logs, errors, response headers, static bundles, OPFS or `localStorage`. Development reads the existing gitignored `.env`; `.env.example` contains names only; production uses the host's secret injection.
- **Minimal Identity And Control Persistence.** A single persistent SQLite file stores the local user record keyed to the minimum GitHub subject, hashed session identifiers, per-user allowance counters and HMACed coarse-IP backstop buckets. It stores no OAuth token, prompt, source material, deck, stage artifact, provider response or API key. Browser OPFS owns slice-1 autosave; `.bmd` owns portability.
- **One Deployable Service.** One Bun/Hono container serves the Vite bundle and API, with a persistent volume for the identity/control ledger and pinned Chromium/fonts in the same image.

### Deliberately Not Reinstated

- **No Worker Or Durable Queue.** Slice-1 runs are request-scoped, streamed, concurrency-capped and cancelled when the client disconnects. Busy capacity fails fast with a typed retry time instead of creating an unbounded backlog. A queue is earned only when runs must survive disconnects/restarts or measured concurrency requires independent workers.
- **No PostgreSQL, Drizzle Or Deck Revisions In Slice 1.** There is no multi-writer or server-owned deck library yet. SQLite is sufficient for one-instance identity/admission/accounting and makes its future scaling limit obvious; iteration 2 chooses the deck/asset persistence implementation only after the document schema has stopped moving.
- **No S3-Compatible Object Store.** Assets, fonts and `.bmd` archives live in the browser/export; generated PDFs stream back and are not retained.
- **No Docker Compose Or Three-Container Topology.** There is one service and no local infrastructure dependency to compose. A single `Dockerfile` is the deployment contract.
- **No Custody Of Other Users' Provider Keys In Slice 1.** Q15 deliberately reserves the future BYOK shape. The shipped shared-pool path neither accepts nor stores a user provider key, while generic credential injection remains confined to `packages/providers`.
- **TypeBox + Ajv Over Zod.** Codex's argument is real and specific — TypeBox authors JSON Schema natively, so there is no conversion layer feeding the provider's structured-output request. **Kept Zod anyway**, on three grounds: Zod v4 emits JSON Schema natively (`z.toJSONSchema`) with no third-party converter; the adopted schema linter mitigates exactly the conversion roughness Codex is worried about; and Zod's `safeParse` issue paths are what the repair round-trip feeds back to the model. **Reverses if** the linter shows that more than one or two pipeline schemas cannot be expressed in the portable subset from Zod. This is the disagreement where PL wins on the narrowest margin.
- **Optimistic Concurrency And The CRDT Discussion.** No multi-writer exists while decks remain browser-owned. The monotonic `revision` counter is kept for OPFS autosave, cross-tab conflict and "the validator ran against revision N".
- **Video Elements.** Both proposals defer them; noted so it stays deferred.

---

## Settled At Gate 1 — Do Not Re-Litigate

Recorded here because these are approved inputs, not questions. Q3 and Q4 reverse an unshipped plan decision; no line in `docs/decisions.md` is being silently reversed. Gate 1 is closed. The PM records the lasting choices at Gate 2.

1. **Q1 — DOM Renderer.** Absolutely-positioned DOM in a fixed 1920×1080 stage with a transform overlay; SVG only for structured diagrams/icons. The human confirmed this after full discussion. It is closed.
2. **Q2 — Curated Design Systems.** Six to ten hand-authored systems; the model selects and lightly parameterizes, never invents. Slice 1 authors **3** and tests them across the catalog.
3. **Q3 — Hosted Only, TolongLabs Pays.** The default product is a hosted service funded from TolongLabs' shared Qwen pool. `bunx build-my-deck` as the primary user posture is removed.
4. **Q4 — A Backend Exists, Minimally.** One bounded API service is required. No worker/queue, cloud deck database, object store or multi-container topology is assumed.
5. **Q5 — PDF Is Sufficient.** PPTX is deferred, not cancelled.
6. **Q6 — Detached Binding.** Templates materialize plain elements with provenance; re-layout is an explicit command. Theme changes do not silently move geometry.
7. **Q7 — React + Vite.** No Next.js and no SSR.
8. **Q8 — Instrument First, Decide Later.** Slice 1 records per-stage input/output/total tokens, wall time, attempts, model and optional cost estimate. No seconds-per-deck or cents-per-deck product target is invented before real Qwen and Gemini benchmarks. This does **not** weaken the mandatory finite per-run token circuit breaker.
9. **Q9/Q12 — Workbench With Steering.** Text edit and move/resize remain; "regenerate this slide" and "try another design system" are first-class actions.
10. **Q11 — Paragraphs And Runs.** `paragraphs: [{ listStyle?, runs: [{ text, marks }] }]`; no HTML string and no full rich-text framework in slice 1.
11. **Regeneration Granularity: Slide-Level First.** Per-element provenance lands now so element-level regeneration needs no migration later. `origin.userOverrides` protects human edits; `sourceRefs` survives for the rung-1 grounding lint even though its implementation is tightened into iteration 2.
12. **Provider Scope: Qwen And Gemini In Slice 1.** The production OpenAI-compatible path and the development native-Gemini path are both real, tested adapters. Fixture/noisy adapters serve deterministic CI.
13. **Run Circuit Breaker: Mandatory.** Every generation run carries a server-controlled finite token ceiling and wall deadline, plus the repair attempt cap and state-cycle check. Exhaustion returns the best valid partial/degraded result with typed flags.
14. **Q13 — Server-Primary Playwright.** Authoritative generation validation and PDF export run in pinned Playwright inside the single API container, initially capped at one browser job. Browser measurement remains the advisory host for immediate post-edit badges; both hosts call the same `measure(root)`.
15. **Q14 — GitHub OAuth And Per-User Allowances.** Slice 1 ships GitHub OAuth, server sessions, a stable local user/owner model, per-user token/run allowances, a coarse IP backstop, the global concurrency cap and the per-run circuit breaker. The invite/referral-code mechanism is dropped completely.
16. **Q15 — BYOK Shape Reserved.** Slice 1 ships only the typed `shared_pool_exhausted` contract and UI state. It does not choose a local bridge or ephemeral hosted BYOK; credential injection stays generic inside the provider layer so either can be added without changing stages.
17. **Q16 — Browser-Owned Decks And No Durable Queue In Slice 1.** OPFS autosave and `.bmd` export remain the persistence/portability boundary for this iteration. Runs remain request-scoped and cancel on disconnect.
18. **Iteration-2 Sequencing — Server Persistence First.** Server-side deck persistence is the first task of iteration 2, deliberately delayed until the document schema has stopped moving. Opt-in sharing and any public gallery follow on top of the owner model; storage is not pulled into slice 1.
19. **Privacy — Private By Default, Real Deletion.** A deck is visible only to its owner. Sharing and gallery publication are explicit later opt-ins. Deletion physically removes rows and stored assets; no soft-delete flag is permitted. Slice 1 ships identity, ownership authorization and hard account-deletion semantics with OAuth so iteration 2 adds deck rows to an existing owner model.

---

## Recorded Gate 1 Outcomes

_There are no remaining Gate 1 forks._

### Q13 — Server-Primary Playwright

**Outcome:** pinned Playwright inside the single API container owns authoritative generation validation and PDF export, with an initial browser-job concurrency cap of one. The in-editor browser host calls the same `measure(root)` for live post-edit badges, but its reports are advisory. `window.print()` remains a fallback.

**Reasoning retained:** the validate/repair loop must complete without depending on an open tab, and pinned Chromium/fonts make the output reproducible. A separate worker would add a queue and lifecycle before demand earns them. The Bun/Playwright fallback boundary in **D7** remains: prove stability under restart/cancellation/soak, then use a Node LTS child process in the same container before considering another service.

### Q14 — GitHub OAuth And Per-User Allowances

**Outcome:** slice 1 implements GitHub OAuth, secure server-side sessions, a stable local user ID that is also the future ownership key, per-user token/run allowances, a coarse HMACed-IP backstop, the global concurrency cap and the per-run circuit breaker. There is no anonymous path and no invite/referral-code path.

**Reasoning retained:** durable identity is the strongest launch protection for a shared paid pool and matches the hackathon audience. It adds OAuth callback, CSRF/session and account-deletion security work, but it simplifies the allowance model: allowances are per user, so code issuance, leakage/sharing, redemption and revocation disappear entirely. The old task 6 mixed two delicate boundaries and is therefore split: 6A owns providers/runtime/spend limits; 6B owns OAuth/identity/admission.

### Q15 — Future BYOK Shape Reserved

**Outcome:** do not choose between an optional local bridge and ephemeral hosted BYOK. Slice 1 ships only the typed `shared_pool_exhausted` response and editor state, preserves the current/partial deck, stops retries, and exposes no key field.

**Reasoning retained:** the local bridge avoids TolongLabs custody but adds setup friction; ephemeral hosted BYOK improves the funnel but creates a new secret-custody review. Neither is needed to prove slice 1. Provider adapters receive credentials through a generic provider-layer injection point so either later shape can be added without changing pipeline stages.

### Q16 — Browser-Owned Slice 1, Server Storage Sequenced

**Outcome:** slice 1 remains browser-owned exactly as proposed: OPFS autosave, `.bmd` export/import, request-scoped runs and cancellation on disconnect. It has no server deck/asset rows and no durable queue. **Server-side deck persistence is the first task of iteration 2**, after the document schema has stopped moving; it is deferred, not rejected.

**Reasoning retained:** this preserves the iteration's credibility without making identity a late retrofit. GitHub OAuth, the local user/owner model, owner-only authorization and hard account deletion land now. Iteration 2 can add private owner-keyed deck rows and assets, real deletion and then opt-in sharing/gallery on that existing foundation. A durable job queue remains separate and is earned only by disconnect/restart survival or measured scaling needs.

### Implementation Assumptions

- No shipped line in `docs/decisions.md` is reversed. Q3/Q4 reverse only the unapproved revision-2 synthesis. Biome-only is respected; the README-vs-TRD altitude split is respected; Title Case is applied to headings and bullet lead-ins.
- `AGENTS.md` still says the user supplies an API key. That sentence is stale and directly conflicts with the hosted-pool decision. Task 2 replaces it while preserving provider heterogeneity, and also adds the GitHub identity, stable ownership, private-by-default and hard-deletion posture alongside `docs/prd.md` and `docs/trd.md`.
- The existing `.env` is treated as opaque. Implementers use `DASHSCOPE_API_KEY`, `QWEN_BASE_URL` and `GEMINI_API_KEY` by name but never print, copy, inspect or fixture their values. `.env*` remains gitignored and `.env.example` contains blank names only.
- Deck canvas is fixed 1920×1080, 16:9 only. Other aspect ratios are out of scope.
- English-only for iteration 1. RTL and CJK are supported by the DOM choice but untested.
- `bun test` is the test runner (built in); no Vitest.
- The prior-art decks are references to reproduce, not files to modify. Nothing outside this repo is written to.
- Real-provider integration tests are env-gated so network-blocked CI remains deterministic, but Gate 2 evidence must include one redacted successful Qwen run and one redacted successful Gemini run using the already-available development credentials. Missing credentials are a blocker, not a silent skip.

---

## Verified Findings That Change The Framing

**Finding 1 — The Prior Art Is _Not_ A Scene Graph.** Read rather than taken on trust:

- `layak-pitch-deck.html` — slide interiors are nested CSS **grid and flexbox** with semantic classes (`.slide-pad`, `.what-grid`, `.flow-row`). `position: absolute` appears only on the stage itself and on decorative overlays. Slide 05 (lines 2724-2771) has **zero** per-element `x/y/w/h`.
- `SahurHub/docs/demo/pitch-deck.html` — 8 `position: absolute` versus 31 `display: flex|grid`. Same shape.

**Why This Matters More Than It Sounds.** Flow layout is **self-healing**: a headline two words longer reflows and still looks fine. Absolute `x/y/w/h` is **brittle**: the same two words overflow the box. The team's decks look good partly *because* they are flow layouts — and converting them to a scene graph would throw away the property that makes generated content survive length variance. But flow layout is not draggable. **These pull in opposite directions and the tension had not been priced.**

**Independently corroborated** by the peer consult, from a different angle: _"Absolute positioning is only the beginning of a scene graph — text runs, reading order, grouping, crop, transforms, style inheritance, font assets and semantic collision policies must also be explicit."_

**Resolution — "Absolute Frame, Flow Interior."** Elements are absolutely-positioned boxes (`x, y, w, h, rotation`) — selectable, draggable, resizable. **Inside** each box, content uses normal flow plus **measured auto-fit**. This is how Figma and Canva text frames actually work, and it buys three properties at once: an LLM targets named slots and never free-form coordinates, the editor gets real handles, and overflow is self-healing within a band and exactly measurable at the box boundary.

**Finding 2 — Measurement Determinism Depends On Fonts.** `document.fonts.ready` must be awaited before any measurement, and fonts must be **pinned, self-hosted and content-addressed** (OFL only). Otherwise the validator measures a fallback font and the user sees something different — a sharp, hard-to-diagnose bug class, plus an offline and licensing problem. Codex independently requires the same, and adds waiting on image decodes, SVG completion and two animation frames after layout. All adopted.

**Finding 3 — `no_overlapping_text` As A Global Rule Is Wrong.** Good design deliberately overlaps; both prior decks do (halftone overlays, z-layered decor, negative-margin panels). Per **D8's** adopted refinement, the allowance is **declared by the template** (collision groups and intentional-overlap rules), not by the element — and text-over-text is critical while decorative collision is informational.

**Finding 4 — Repair Is A Ladder And The LLM Is The _Last_ Rung.** Most overflow is fixable with no tokens: **Tier 0 (Fit)** — step font size down the design system's scale by binary search, floored at the readable minimum; **Tier 1 (Select)** — choose a shorter pre-generated content variant, or a declared higher-capacity template variant (**D8**); **Tier 2 (Rewrite)** — only now call the model, with the **measured numbers** ("renders 148 px in a 96 px box; rewrite to ≤ 42 characters, preserve the named facts"), never a vague "make it shorter"; **Tier 3 (Degrade)** — a tested low-density template, optional material removed by importance, truncation only at word boundaries, original content retained in provenance, slide marked `degraded` and prominently flagged. **Termination is guaranteed by four independent conditions:** ≤ 3 model attempts per slide, a server-controlled finite token ceiling plus wall deadline, no repeated document-state hash, and one deterministic safe fallback after model attempts. The broker conservatively reserves input bytes plus bounded output tokens before a call, clamps provider `maxOutputTokens` to the remaining allowance, reconciles reported usage, and aborts the stream when the ceiling is exhausted. **On failure the deck still returns**, badged with its measured overflow/budget reason. Per **D5**, no rung may write a path the human has overridden.

**Finding 5 — Hosted Generation Requires A Server-Primary Browser Host.** Measurement remains an environment-agnostic `measure(root)` over rendered DOM; Playwright and the in-editor browser are hosts, not separate implementations. Q13 settles the assignment: server-side Playwright completes validation/repair and produces the deterministic PDF without depending on an open tab, while the browser gives instant advisory post-edit warnings. **The invariant survives — one measurement implementation, two hosts — with the server authoritative and browser advisory.** Chromium stays inside the single container at concurrency one. A worker remains unjustified without measured isolation or concurrency pressure.

---

## Wave Plan

Wave cap is 3 on the `max` profile. Every wave below has disjoint `Files:` scopes.

| Wave | Tasks       | Theme                                                        |
| ---- | ----------- | ------------------------------------------------------------ |
| 1    | 1, 2        | Toolchain · canonical hosted architecture                     |
| 2    | 4, 5, 6A    | Schema · `<deck-stage>` port · providers/runtime core         |
| 3    | 6B, 7, 8    | GitHub identity/admission · templates/themes · renderer       |
| 4    | 9, 10, 12   | Document store · golden fixture · measurement/auto-fit        |
| 5    | 11, 14      | Hosted export · compile/steering/budgets/telemetry            |
| 6    | 15          | Editor workbench (integration point, largest task)            |
| 7    | 16          | Hosted end-to-end acceptance + deployment/privacy smoke       |

**Deferred Tasks Do Not Occupy A Wave.** Task 3 and task 13 remain numbered so the disagreement/history record is intelligible, but they are explicitly outside iteration 1 and have no checkboxes for PG to execute.

**Active Size And Credibility.** Counting 6A and 6B separately, iteration 1 has **15 active task units**. Every concurrent group respects the cap of three and has disjoint `Files:` scopes. This is still credible only at the boundary: OAuth replaces the invite system rather than joining it, and server deck persistence remains fully deferred. There is no room to add scope. If OAuth/session work overruns, cut task 15's property strip, then rotate; never cut spend protection, provider conformance or user-edit protection.

**Shared Touchpoints Are Pre-Created By Task 1, Never Edited Later.** Root `package.json`, `bun.lock`, `tsconfig.base.json`, and every barrel/mount file that later waves share are pre-created, including `packages/validate/src/index.ts` and API route mounts for access/account/generation/export. Any task that needs an unplanned dependency must **stop and report** rather than touch the lockfile.

**Own-Package Barrels Are Owned By The Task That Adds The Public API.** Every workspace declares `"exports": "./src/index.ts"` as a bare string, which admits **no subpaths** — so every cross-package import must pass through that barrel, and a barrel therefore *must* grow as its package gains public API. The rule above applies to **root** files, not to a package's own barrel. Each task may edit `packages/<its-own-package>/src/index.ts`; it may never edit another package's. Verified collision-free against the wave plan: no two concurrent tasks own the same barrel (wave 3 = `templates` + `render`; wave 4 = `editor` + `validate`; wave 5 = `export` + `pipeline`; wave 6 = `editor` alone).


---

## TODO Tasks

### 1. Feature: Toolchain And Workspace Foundation

**Purpose/Issue:** The repo is greenfield. Every other task needs a workspace, and the hosted reversal changes the application shells from `apps/cli` to `apps/web` + `apps/api`. This task front-loads dependencies and shared barrel/route mounts so later parallel waves do not serialize on root files.

**Files:** `package.json`, `bun.lock`, `tsconfig.base.json`, `playwright.config.ts`, `.env.example`, `.husky/**`, `packages/*/package.json`, `packages/*/tsconfig.json`, `apps/*/package.json`, `apps/*/tsconfig.json`, stub `src/index.ts` and barrel/route-mount files only
**Depends on:** none

**Implementation:**

- [x] Create root `package.json` with `"workspaces": ["packages/*", "apps/*"]`, `"private": true`, and scripts `dev`, `build`, `test`, `test:e2e`, `lint`, `format`, `check` → verify: `bun install` succeeds and `bun run check` (Biome) exits 0
- [x] Create `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "bundler"`, `verbatimModuleSyntax: true` → verify: `bunx tsc --noEmit -p tsconfig.base.json` exits 0
- [x] Create stub workspaces so no later task edits root: `packages/{deck-schema,render,templates,providers,pipeline,validate,export,editor}` and `apps/{web,api}` — each with `package.json`, `tsconfig.json` extending the base, and a one-line entry point → verify: `bun pm ls` lists all ten workspaces and no `apps/cli` exists
- [x] Pre-create shared stubs that later waves would otherwise collide on: `packages/validate/src/index.ts` with `measure/` and `content-contract/` entry points; `apps/api/src/routes/{access,account,generation,export}.ts`; and the API route mount → verify: `bunx tsc --noEmit` passes and later tasks can stay inside their declared files
- [x] Pre-install the full iteration-1 dependency set in one pass — runtime: `zod`, `hono`, `react`, `react-dom`, `react-moveable`, `selecto`, `zustand`, `immer`, `nanoid`, `fflate`; dev: `typescript`, `@biomejs/biome`, `@types/bun`, `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`, `playwright`, `@playwright/test`, `axe-core`, `husky`, `@commitlint/cli`, `@commitlint/config-conventional`, `lint-staged` → verify: `bun install --frozen-lockfile` succeeds from clean; `bunx playwright install chromium` succeeds
- [x] Restore the `.husky/` hooks deferred in `docs/progress.md` — `commit-msg`, `pre-commit`, and guarded graphify `post-commit` → verify: invoke commitlint directly against one valid and one invalid message fixture; PG does not create a branch or commit
- [x] Expand `.env.example` with **blank names only** for `DASHSCOPE_API_KEY`, `QWEN_BASE_URL`, `GEMINI_API_KEY`, the server-selected model/provider configuration, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `SESSION_SECRET`, `IP_HASH_SECRET`, per-user token/run limits, the global concurrency limit, required finite `MAX_RUN_TOTAL_TOKENS`, `MAX_RUN_WALL_MS` and `MAX_INPUT_BYTES` → verify: `.env.example` contains no secret value or invite-code variable, and `git check-ignore` confirms `.env`, `.env.development` and `.env.production` remain ignored
- [x] Create `playwright.config.ts` at the repo root with `testMatch: '**/*.pw.ts'` so the two runners are disjoint by construction — `bun test` claims `*.test.*` **and** `*.spec.*`, so only a third extension separates them → verify: a Playwright `*.pw.ts` fixture runs under `bunx playwright test` and is **not** collected by `bun test`, and `bun run test` still exits 0
- [x] Confirm `biome.json`'s `files.ignore` still excludes `.agents/**`, `.claude/**`, `.codex/**`, `graphify-out/**`, and add `**/dist/**` → verify: `bunx biome check .` reports 0 files from those trees

**Acceptance criteria:** From a clean clone, `bun install && bun run check && bun test` succeeds with ten empty workspaces. No browser bundle can read a provider-secret variable, and no later task needs to modify the root manifest, lockfile, base TypeScript config or shared mounts.

---

### 2. Docs: Canonical Product, Architecture, And Design Records

**Purpose/Issue:** The Gate-1 decisions and the synthesis outcome must become canonical before they are implemented, or they will be silently re-litigated in diffs. Per `AGENTS.md`, architecture lives in `docs/trd.md` (never `docs/architecture.md`) and the README-vs-TRD split is by altitude. `docs/PRODUCT.md` and `docs/DESIGN.md` are missing and are always kept together.

**Watch the double meaning `AGENTS.md` calls out:** `PRODUCT.md`/`DESIGN.md` govern **the editor's own chrome**. The *generated deck's* design systems are code, and live in `packages/templates` (task 7). Getting this backwards would put slide typography rules in a repo-UI doc.

**Files:** `AGENTS.md`, `docs/prd.md`, `docs/trd.md`, `docs/PRODUCT.md`, `docs/DESIGN.md`
**Depends on:** none

**Implementation:**

- [x] Update only the stale product-constraint/key/account-posture clauses in `AGENTS.md`: users call a hosted TolongLabs service funded by its shared provider pool; heterogeneity remains a provider-adapter constraint; TolongLabs' provider keys are server-only; future BYOK shape is reserved; slice 1 uses GitHub identity and a stable owner model; decks are private by default and deletion is physical → verify: no local-first or "user supplies an API key" statement remains, while provider neutrality, owner-only access, opt-in sharing/gallery and no-soft-delete semantics are explicit
- [x] Write `docs/prd.md` — roughly one page: target user, the three must-win jobs, explicit non-goals, the two hard constraints, hosted/shared-pool posture, GitHub sign-in, privacy posture and one measurable success metric → verify: Non-Goals names PPTX, collaboration, alternate identity providers, sharing/gallery, durable jobs and slice-1 server-side deck storage; it does **not** describe identity itself as deferred or call the TolongLabs key "custody of other users' keys"
- [x] Write `docs/trd.md` recording the settled decisions and synthesis outcome — DOM choice/fallback; keyed document model; paragraphs/runs; override protection; provider interface and four structured-output tiers; **both live adapters**; generic credential injection; minimal API; GitHub OAuth/session/user model; owner-only authorization and hard deletion; per-user/IP/global/run admission layers; browser-owned slice-1 persistence; iteration-2 storage sequencing; one-container deployment; hard run budget; per-stage instrumentation; repair termination; template immutability; and server-primary Playwright → verify: Q1-Q16 are outcomes rather than forks and no BYOK shape is selected
- [x] Record the five **Verified Findings** in `docs/trd.md`, and state **two architectural properties as first-class**: (a) one renderer, two consumers; (b) **the pipeline is an artifact graph with bounded feedback, not a one-way chain** — content capacity depends on layout, and repair may return to the content artifact under the four termination guarantees (**D8**) → verify: `docs/trd.md` states both properties in its own words and explains why each follows
- [x] Record the **D4 correction to the brief** explicitly — diagrams are a structured `DiagramSpec` compiled to SVG, and a model may reference art from a catalog but never emit markup → verify: the section states the editability reason and the injection reason separately
- [x] Record the **four-rung quality ladder** unchanged and state that deterministic content lints land in iteration 2 after the persistence opening task but before full-deck prompt tuning; their data contracts (`sourceRefs`, roles, template provenance, `ContentQualityReport`) land now → verify: no rung is deleted or conflated with mechanical layout measurement
- [x] Record the privacy and sequencing invariants: slice 1 ships the user/owner model but no deck rows; iteration 2 begins with private owner-keyed deck/asset persistence and physical deletion, followed by explicit opt-in sharing/gallery; a public-by-default or `deleted_at` design is forbidden → verify: adding a deck table later requires an owner foreign key and deleting a deck/account requires row and asset removal
- [x] State the explicit escalation triggers the minimal server omits: add a queue/worker only for disconnect/restart survival or measured independent scaling; choose the iteration-2 deck/object persistence technology only after schema stabilization and before implementing its first task → verify: Docker Compose and a three-container default are absent from slice 1
- [x] Write `docs/PRODUCT.md` and `docs/DESIGN.md` for the **editor chrome only** — register, platform, brand personality; then tokens for surface/panel/accent, type scale, spacing scale, focus and selection-handle treatment, dark-first or light-first → verify: task 15's acceptance criteria can cite specific token names from `docs/DESIGN.md`
- [x] Do not create `docs/architecture.md`, and do not write a README this iteration → verify: task scope contains only the five files above

**Acceptance criteria:** `AGENTS.md`, PRD and TRD agree on hosted/shared-pool key handling, GitHub identity, private owner-only decks, hard deletion, reserved BYOK and minimal deployment; `docs/trd.md` is implementable without guessing and contradicts no shipped decision. The stale "the user supplies an API key" line and the formerly absent accounts/identity posture are both covered explicitly.

---

### 3. Deferred: Template-Targeting Spike _(iteration 2)_

**Purpose/Issue:** This was the first tightening cut. Real Qwen and Gemini integration tests in task 6A now exercise the actual structured-output seams, while slice 1 generates only one slide from an existing deck. A separate catalog-targeting study would duplicate evidence before full intake/narrative generation exists.

**Files:** none in iteration 1
**Depends on:** full-deck generation entering scope

**Deferred Acceptance Criteria:** Before iteration-2 prompt tuning, run the same catalog/budget prompt against Qwen and Gemini, quantify invented IDs/budget overruns/prose wrapping, and calibrate the noisy adapter from sanitized failures. Do not store raw source material, prompts containing secrets or unsanitized provider payloads.

---

### 4. Feature: `deck-schema` — The Canonical Document Model

**Purpose/Issue:** One versioned, validated representation serving the generator's output, the editor's mutations, the validator's input and the export's input. Zod is the single definition; TypeScript types derive via `z.infer`, so the schema that validates untrusted model output at the boundary is the same schema the editor is typed against. The keystone package, and materially reshaped by the consult.

**Files:** `packages/deck-schema/**`
**Depends on:** 1

**Implementation:**

- [x] Define `Deck` — `schemaVersion`, `documentId`, `revision`, `canvas { width: 1920, height: 1080, printWidthIn, printHeightIn }`, `metadata`, `theme: ThemeSpec`, `assets: Record<AssetId, Asset>`, `slides: Slide[]` → verify: `Deck.parse` rejects a document missing `schemaVersion`; a test asserts the print dimensions are used by task 12's minimum-size check in **physical points**, not design pixels
- [x] Define persisted generation state without provider leakage — `metadata.generation { state: 'complete'|'partial'|'degraded', flags: DeckFlag[] }`, where flags can identify `run_budget_exceeded`, `shared_pool_exhausted`, validation failures and deterministic fallback without storing prompts, credentials or raw provider responses → verify: a partial deck round-trips and a key/provider response field is impossible by schema
- [x] Define `Slide` — `id`, `templateRef { id, version }?`, `elements: Record<ElementId, Element>`, `rootOrder: ElementId[]` (bottom to top), `readingOrder: ElementId[]`, `speakerNotes?` → verify: a test asserts every id in both order arrays exists in `elements` and that `rootOrder` and `readingOrder` may legally differ. _The keyed map is load-bearing: with an array, Immer patch paths shift under reorder and silently corrupt the undo stack (**D3**, adopted-from-Codex)._
- [x] Define `Element` as a discriminated union on `kind` — `text`, `image`, `shape`, `icon`, `svg`, `diagram`, `group` — each carrying `id`, `parentId?`, `semanticRole`, `frame { x, y, w, h, rotation }`, `opacity`, `visible`, `locked`, `priority`, `style` → verify: an unknown `kind` fails to parse; **`diagram` and `svg` must exist now even though iteration 1 generates neither**, so adding them later is not a breaking migration
- [x] **Forbid model-authored markup structurally, not by sanitizer (D4)** — `IconElement` carries `catalogRef`, `SvgElement` carries `assetId` into a repo-authored content-addressed catalog, and `DiagramElement` carries a `DiagramSpec` of nodes/ports/edges/labels/style refs → verify: a schema test asserts no element kind has any field typed as raw markup or a raw URL
- [x] Define `TextElement.content` as `paragraphs: [{ listStyle?, runs: [{ text, marks: ('em'|'strong'|'code')[] }] }]` and `TextElement.style` as `{ typeRef, overrides?: Partial<TypeStyle> }` → verify: a fixture round-trips multi-paragraph text with inline emphasis, matching `layak-pitch-deck.html:2741`
- [x] Define `ElementBase.origin` — `{ templateSlot?, pipelineStage?, sourceRefs?: string[], userOverrides: string[] }` → verify: a test asserts `userOverrides` holds dotted property paths and defaults to `[]`. _This is the human's settled decision (7) and it is not write-only: `userOverrides` gates repair (**D5**) and `sourceRefs` feeds the grounding lint (**D6**)._
- [x] Enforce **style by reference, not by value** — element styles cite a `typeRef`/colour role into `ThemeSpec`; free-floating hex and font sizes are only legal inside `overrides` → verify: a test asserts an element cannot declare a bare `color` outside `overrides`. _This is the mechanism that stops a model emitting forty arbitrary hex codes, and it is also what keeps the editor's property strip small (**D2**)._
- [x] Geometry is in **design-space pixels**, never viewport units → verify: a doc comment states this and a test rejects `"50%"` in `frame.x`
- [x] Implement `migrate(doc): Deck` as an ordered chain of pure `v(n) → v(n+1)` functions with an identity migration for v1, retaining the original snapshot → verify: a synthetic v0 fixture migrates to current and passes `Deck.parse`
- [x] Export `safeParseDeck` returning `{ ok, deck } | { ok: false, issues }` with Zod issue paths preserved → verify: issue paths survive intact, since task 14's repair round-trip feeds them back to the model

**Acceptance criteria:** `bun test packages/deck-schema` is green, including migration, round-trip and order-array integrity tests. No other package defines a deck type.

---

### 5. Refactor: Port `<deck-stage>` Into `packages/render`

**Purpose/Issue:** The `<deck-stage>` web component (`layak-pitch-deck.html` lines 12-570, ~560 lines) already solves fixed-canvas scaling, keyboard/tap navigation, slide-position persistence and — critically — `@media print` pagination for vector PDF. It is proven across two independent decks. Porting preserves the most valuable prior art instead of rebuilding it. Deliberately mechanical and independent: it takes slotted `<section>` children and knows nothing about the schema.

**Files:** `packages/render/src/deck-stage.ts`, `packages/render/src/deck-stage.css.ts`, `packages/render/test/deck-stage.pw.ts`
**Depends on:** 1

**Implementation:**

- [x] Port the custom element to TypeScript, preserving shadow DOM, `width`/`height`/`noscale` observed attributes, transform-scale-to-viewport, keyboard and tap navigation, and slide-position persistence → verify: rendered in Playwright at three viewport sizes, canvas scale equals `min(vw/1920, vh/1080)` within 0.5%
- [x] Keep slide content in the **light DOM** (slotted), with only runtime chrome and the scaled wrapper in the shadow root → verify: `document.querySelectorAll('[data-element-id]')` from the page finds every element, so measurement and accessibility tooling reach it without piercing shadow boundaries
- [x] Port the `@media print` block verbatim in behaviour — flatten transform, `break-after: page` per slide, hide chrome, map the design space onto a fixed 16:9 physical page → verify: `page.pdf()` on a three-slide document produces exactly 3 pages at 16:9
- [x] Replace the hardcoded `data-om-validate` default with an exported constant the validator imports, so the rule list has one definition → verify: `packages/validate` (task 12) imports it rather than restating the string
- [x] Gate readiness on `document.fonts.ready`, all image decodes, SVG completion and two animation frames after layout, then emit `deck-stage:ready` → verify: a test asserts the event fires only after all four resolve (Finding 2)
- [x] Keep the component schema-agnostic → verify: `deck-stage.ts` has no import from `@build-my-deck/deck-schema`

**Acceptance criteria:** The ported component drives the original Layak HTML body unchanged — same navigation, same scaling, same print output.

---

### 6A. Feature: Provider Broker, Run Budget, And Hosted Runtime Core

**Purpose/Issue:** This is the provider and per-run spend boundary. Stages call a provider-neutral broker; browsers call one TolongLabs API. This task proves Qwen and Gemini share only the adapter contract, keeps credentials server-side, makes every paid run finite, and establishes the single-container runtime without mixing in OAuth/session/accounting logic.

**Files:** `packages/providers/**`, `apps/api/src/{server.ts,config.ts,secrets.ts,http-errors.ts,request-limits.ts}`, `apps/api/src/run-budget/**`, `apps/api/src/concurrency/**`, `apps/api/test/{server,request-limits,run-budget,concurrency,secrets}.test.ts`, `Dockerfile`, `.dockerignore`
**Depends on:** 1
**Implementer:** **Claude programmer required** — provider heterogeneity, secret handling and spend enforcement are delicate security boundaries; this is not a Codex-worker task.

**Implementation:**

- [x] Define `ProviderAdapter` (`descriptor`, `listModels()`, `complete(req, signal)`, optional `generateImage(req, signal)`) with `ModelCapabilities` on **model descriptors** — input modalities, context window, max output, one of four structured-output tiers, image generation and streaming → verify: capabilities vary by model without a provider-name branch
- [x] Implement `generateObject` over native JSON Schema, forced tool call, JSON mode, and prompt-only extraction/repair with at most one correction request; lint all generated schemas to the portable subset at build time → verify: the same broker test succeeds across all four tiers and an unsupported keyword fails before a network call
- [x] Normalize provider errors to `auth`, `rate_limit`, `quota_exhausted`, `transient`, `context_overflow`, `invalid_structured_output`, `refusal`, `unsupported_capability`, `aborted`; centralize retry/backoff/idempotency and allow at most one neutral refusal retry → verify: stages never inspect HTTP status/provider payloads
- [x] Implement the mandatory concurrency-safe `RunBudget` passed to **every** broker call: required finite `maxTotalTokens` and deadline; conservative pre-call input reservation from UTF-8 bytes; output clamped to remaining tokens; provider-reported usage reconciliation; streaming abort on exhaustion; clients may lower but never raise the server cap → verify: parallel calls cannot oversubscribe the same run and the next paid call never starts after exhaustion
- [x] Emit normalized call usage `{ stage, attempt, inputTokens, outputTokens, totalTokens, wallMs, modelId }` and optional `estimatedCostUsd` only when operator-supplied, timestamped pricing metadata exists; never hardcode a cost target in pipeline logic → verify: one Qwen and one Gemini benchmark can be compared per stage without logging prompt/source/response bodies
- [x] Ship two deterministic test adapters — fixture and noisy — plus **two live adapters**: an OpenAI-compatible base exercised against real DashScope/Qwen and a native Gemini adapter exercising its distinct request/structured-output/usage shapes → verify: both live adapters run the identical conformance suite and identical `generateObject` call; no pipeline file imports either adapter
- [x] Keep Ollama/LM Studio as an optional base-URL compatibility check only; do not add a local proxy, required local runtime or slice gate → verify: network-blocked CI uses fixture/noisy/recorded sanitized fixtures and needs no key/model download
- [x] Run env-gated live integration tests using the existing gitignored `DASHSCOPE_API_KEY` + `QWEN_BASE_URL` and `GEMINI_API_KEY` → verify: Gate-2 evidence includes one redacted successful schema-valid Qwen result and one Gemini result with usage/wall metrics; tests never print env values or commit raw provider payloads
- [x] Implement provider-layer `CredentialResolver` injection. Slice 1 resolves only operator environment/deployment secrets; adapters receive a credential handle, while stages and public requests cannot identify or supply its source → verify: sentinel secrets appear in no log, error, response header/body, static Vite bundle, deck, SQLite row, OPFS artifact or analytics event, and a resolver fixture can be swapped without changing a pipeline type
- [x] Implement one Hono service that serves the built web app and `/api/health`; use the task-1 route mounts without editing them. Bound request bodies before parsing paid content and reject oversized input with `input_too_large` → verify: a 200-page-equivalent payload triggers zero provider calls
- [x] Add a configured in-process global generation semaphore with typed `capacity_busy` + retry time rather than an in-memory queue, plus a Playwright semaphore fixed at one initial browser job → verify: excess requests fail fast, a second browser job waits or fails under the declared policy, and disconnect propagates `AbortSignal` to providers/browser work
- [x] Build one production `Dockerfile`: one Bun/Hono process, static Vite assets, pinned fonts, pinned Chromium and a persistent `/data` mount reserved for task 6B's identity/control ledger → verify: one container serves health/web/API and no Compose, Postgres, S3, worker or second service exists

**Acceptance criteria:** Qwen and Gemini run the same broker contract with provider-specific code confined to adapters; credentials remain generic and server-only; every run and browser job is bounded; the one-container service starts with network/env-disabled provider tests green. Actor-level identity and allowance enforcement are explicitly task 6B, not hidden here.

---

### 6B. Security: GitHub OAuth, Sessions, Ownership, And Per-User Admission

**Purpose/Issue:** Q14 makes durable identity the launch gate, and the privacy requirement makes identity more than admission. This task creates the stable owner model that iteration 2 deck rows will reference, enforces per-user/IP allowances before task 6A's global/run limits spend money, and implements real account deletion. It deliberately contains no deck or asset persistence.

**Files:** `apps/api/src/{auth,identity,sessions,admission,control-ledger}/**`, `apps/api/src/routes/{access,account}.ts`, `apps/api/src/server.ts`, `apps/api/src/index.ts` _(W-3 — session/CSRF/admission middleware must mount on the Hono app; granted from task 6A, no wave-3 peer touches `apps/api`)_, `apps/api/test/{auth,identity,sessions,admission,account}.test.ts`
**Depends on:** 6A
**Implementer:** **Claude programmer required** — OAuth, session fixation/CSRF, authorization, deletion and atomic allowance accounting are one security boundary; this is not a Codex-worker task.

**Implementation:**

- [x] Implement the GitHub OAuth authorization-code flow with single-use state, an allowlisted callback/return target and minimum identity scope; exchange the code server-side, fetch the stable GitHub subject, create/link a local user and immediately discard the GitHub access token → verify: forged/replayed state and open redirects fail, and no OAuth access/refresh token is persisted or logged
- [x] Implement random opaque server sessions stored only as hashes, rotated on sign-in, sent in `HttpOnly; Secure; SameSite=Lax` cookies, bounded by idle/absolute expiry and deleted on sign-out → verify: session fixation, expired/revoked cookies and cross-origin state-changing requests fail closed
- [x] Create the minimal SQLite model: `users` with a stable internal `id` and unique GitHub subject, `sessions`, and per-user allowance counters/reservations; use foreign keys with `ON DELETE CASCADE` and no `deleted_at`/soft-delete column → verify: the schema contains no prompt, source, deck, asset, provider payload, provider/OAuth credential or raw session token
- [x] Make the internal user ID the canonical `ownerId` and expose one owner-authorization guard that permits only `session.userId === resource.ownerId`; do not add sharing, public visibility or bypass roles → verify: owner, non-owner and unauthenticated fixtures produce allow/deny/deny, and no endpoint can enumerate another user's resources
- [x] Implement authenticated hard account deletion as one transaction that physically deletes the user plus sessions, allowance rows and other user-linked control rows; invalidate the current cookie after commit → verify: row counts are zero, the old session cannot authenticate, no tombstone remains and a second delete is idempotently absent. Future deck/asset tables must cascade or explicitly delete physical objects under the same contract
- [x] Implement per-user token/run allowances with atomic reserve/reconcile, backed by task 6A's normalized usage; apply a coarse normalized-IP HMAC backstop without storing raw IPs → verify: parallel requests cannot double-spend, counters survive restart, and a user behind a busy shared network receives the typed policy result rather than an opaque error
- [x] Compose admission in this order: authenticated user → coarse IP backstop → atomic per-user allowance → task 6A global semaphore → task 6A per-run circuit breaker/input limit → verify: denial at any earlier layer produces zero downstream provider calls and reservations are released/reconciled on abort
- [x] Implement only `/api/auth/github`, its callback, sign-out, `/api/access/status` and authenticated `DELETE /api/account` through the task-1 access/account mounts; do not implement anonymous admission, codes/redeem/revoke endpoints, deck CRUD, sharing or gallery routes → verify: a route/symbol scan finds no invite/referral mechanism and an unauthenticated browser cannot start a generation/export run
- [x] Keep the identity/control ledger private and minimal: no raw IP, GitHub profile payload, OAuth token, prompt/source/deck content or provider response in tables, logs, metrics or errors → verify: sentinel scans stay clean across successful login, rejected admission, logout and account deletion

**Acceptance criteria:** GitHub sign-in yields a secure revocable session and stable local owner ID; per-user plus IP/global/run controls prevent overspend under races and survive restart; account deletion physically removes every current user-linked row; there is no invite-code, anonymous, sharing, gallery, deck-storage or soft-delete path.

---

### 7. Feature: Template Catalog And The Curated Design-System Library

> **W-1 (PM decision, wave 2 QA; corrected after re-review).** The maximum-capacity **assertion** — *fail CI if a template's declared budget overflows in the pinned renderer* — moves to **task 10**, `packages/render/test/template-capacity.pw.ts` (it renders in a browser, so `.pw.ts` per the test-runner convention). It needs the renderer, but `packages/templates` declares only `deck-schema`, and adding `render` would both write `bun.lock` and create a **circular dependency** (`render` already depends on `templates`). Task 8 was the first re-home, but 7 and 8 are **concurrent** — task 8 would assert over an empty catalog and go vacuously green. Task 10 is in wave 4 with `Depends on: 7, 8`, so both the fixtures and the renderer exist. **Task 7 authors the max-capacity fixtures; task 10 asserts them.**


**Purpose/Issue:** The anti-lanslop mechanism, and the mechanism behind both steering affordances. A model choosing from ~8 templates by `id` cannot free-form position, and a `capacity` budget handed to it **before** generation makes the validate loop a safety net rather than the primary mechanism — generate-in-budget beats repair-after-overflow. Templates are art-direction-neutral (geometry, typed slots, style refs); the design system supplies the tokens those refs resolve to. **That neutrality is exactly what makes "try another design system" a token swap rather than a re-layout.**

**Files:** `packages/templates/**`
**Depends on:** 4
**Implementer:** **Claude programmer required** — template mechanics are bounded, but authoring three coherent design systems is design judgement and must run with the live Impeccable feedback path.

**Implementation:**

- [x] Lay the catalog out as **versioned, immutable directories** — `catalog/<template-id>/<version>/{template.json,fixtures/,thumbnail.webp}` — and state the rule that decks are **fully materialized**, so an old deck renders without its original template → verify: a Zod schema validates every entry at import time; a test asserts ids are unique and that no published version is mutated in place
- [x] Define `Template` as **data, not code** — `id`, `version`, `intents[]`, typed `slots` (`accepts: ('text'|'stat'|'quote'|'screenshot'|'image'|'diagram')[]`, `budget { maxChars, maxLines, maxItems }`, `optional`, `priority`), `frames`, `styleRefs`, `safeAreas`, **collision groups and intentional-overlap rules**, `repeaters` (e.g. two-to-four metric cards), and `compatibleVariants` → verify: a test asserts every slot frame lies inside 1920×1080 with the declared safe margin
- [x] Author **8 templates** — cover, agenda, problem, one-big-claim, two-column text+visual, three-up stat row (a repeater), full-bleed visual with caption, closing — plus a `dense` variant for the two that most need one → verify: each ships intents and budgets, and the LLM-facing manifest exposes intents and budgets only, never coordinates
- [x] **Ship a maximum-capacity fixture per template**, each declaring the slot budget it is meant to saturate → verify: every template has one, and each fixture is schema-valid. _The assertion that a fixture actually fits the pinned renderer belongs to **task 10** (W-1) — `packages/templates` cannot import the renderer without a circular dependency. This is the single most valuable idea taken from the peer consult: it converts a hopeful number into a tested contract._
- [x] Implement `instantiate(template, bindings, theme): { elements, rootOrder, readingOrder }` producing **detached** elements with `origin.templateSlot` and `templateRef` retained as provenance (Q6) → verify: mutating a returned element does not affect the template, asserted by a deep-freeze test; and `readingOrder` is derived from slot semantics, not from z-order
- [x] Define `ThemeSpec` — content-addressed font assets, semantic colour roles, typography roles with minimum sizes, component styles (panel, badge, stat), and a **bounded effects vocabulary** (halftone, hard shadow, editorial rule) — and author **3** systems for slice 1: the Layak editorial scale (`layak-pitch-deck.html:630-707`), the SahurHub comic direction, and one contrasting third → verify: every `styleRef` used by any template resolves in all three systems, asserted by test. _The human's settled library size is 6-10; three proves the multiplier and the reskin button, and the remaining systems are an iteration-2 task._
- [x] Pin and self-host all fonts (OFL only), content-addressed, under `packages/templates/fonts/` with `@font-face`; no CDN at render time → verify: rendering with the network blocked produces identical measurements (Finding 2)
- [x] Emit a machine-readable catalog manifest (`id`, `intents`, `slot budgets` only) for prompt injection → verify: the manifest is under 2 KB for all 8 templates

**Acceptance criteria:** `instantiate()` produces schema-valid slides for all 8 templates in all 3 themes; every template ships a schema-valid max-capacity fixture (task 10 asserts they render without overflow); and the manifest is small enough to sit in every content prompt.

---

### 8. Feature: `render(Deck) → DOM` — The Single Renderer

**Purpose/Issue:** The most important architectural property in the system: **one** render implementation used by the editor's live view, the validator and the PDF export. If there are two renderers they will drift, and validation stops meaning anything. Implement once as React components and use `renderToStaticMarkup` for the export path, so there is literally one implementation rather than two kept in sync by a snapshot test.

**Files:** `packages/render/src/render.tsx`, `packages/render/src/elements/**`, `packages/render/src/theme-to-css.ts`, `packages/render/src/index.ts` _(own barrel — tasks 10/11/15 import through it; bare-string `exports` admits no subpaths)_, `packages/render/test/render.test.tsx`, `packages/render/test/render.pw.ts` _(two checkboxes assert in Playwright)_ _(not `deck-stage.ts`, owned by task 5)_
**Depends on:** 4, 5

**Implementation:**

- [x] Implement `<SlideView slide theme />` emitting one absolutely-positioned box per element at its `frame`, z-ordered by `rootOrder`, and **emitting DOM in `readingOrder`** with CSS `order`/absolute positioning supplying the visual stacking → verify: a fixture whose two orders differ produces correct visual stacking *and* correct tab/screen-reader order, asserted in Playwright
- [x] Stamp `data-element-id` on every rendered node → verify: every element in the document has exactly one matching node, asserted by test. _Task 12 and the editor both address elements through this._
- [x] Implement the **"Absolute Frame, Flow Interior"** rule — the box is absolutely positioned; its interior uses normal flow so content self-heals under length variance → verify: a text element whose content grows 20% stays inside its box by wrapping, not clipping
- [x] Implement element renderers for `text` (paragraphs and runs → `<p>`/`<li>`/`<em>`/`<strong>`/`<code>`), `image` (asset ref, crop, fit, alt), `shape`, `icon` (`catalogRef`), `svg` (`assetId` from the repo catalog), `group` → verify: one fixture per kind renders without error, and a test asserts **no renderer path accepts a markup string or a remote URL** (**D4**)
- [x] Emit native accessibility — slide `<section>`, heading levels from `semanticRole`, image `alt`, `aria-hidden` on decoration → verify: an axe-core pass over the golden fixture reports 0 critical violations
- [x] Implement `themeToCss(theme)` emitting CSS custom properties, resolving `styleRef` + `overrides` → verify: swapping one theme restyles the whole deck with no element edits, asserted by snapshot. _This is the "try another design system" mechanism._
- [x] Implement `renderDeckToHtml(deck): string` via `renderToStaticMarkup` — self-contained single file with inlined CSS, inlined fonts, `<deck-stage>` wrapper → verify: the output opens correctly from `file://` with the network disabled
- [x] Render is **pure** — no fetching, no `Date.now()`, no randomness → verify: rendering the same deck twice yields byte-identical HTML

**Acceptance criteria:** `renderDeckToHtml` output and the React live view produce identical DOM geometry for the same deck, asserted in Playwright. No second renderer exists anywhere in the repo.

---

### 8B. Feature: `ThemeSpec` v2 — Effects And Component Styles Reach Pixels

**Purpose/Issue:** Task 7 authored three design systems whose distinctiveness rests on a bounded effects vocabulary (halftone, hard shadow, editorial rule) and component styles (panel, badge, stat). `ThemeSpec` as shipped carries only `typeStyles` and `colorRoles`, so a `Deck` document **cannot express what makes the comic system comic**. Without this, the three systems differ by typography and palette alone and the anti-lanslop bet — that a curated catalog beats model invention — is only half tested.

**PM decision (human, wave 3):** extend `ThemeSpec` rather than have the renderer resolve a `DesignSystem` from the catalog at render time. A catalog lookup would keep the schema frozen but make a deck un-renderable without the exact catalog version present, breaking `.bmd` portability and the TRD's "document is the single source of truth" property. **The migration is free now and expensive later:** nothing is persisted — server-side deck storage is iteration 2, `.bmd`/OPFS is task 11 — so this is the cheapest moment this change will ever be.

**Files:** `packages/deck-schema/**`, `packages/render/src/theme-to-css.ts`, `packages/render/src/elements/**`, `packages/render/src/render.tsx`, `packages/render/src/index.ts`, `packages/render/test/**`
**Depends on:** 7, 8

**Implementation:**

- [x] Extend `ThemeSpec` with `componentStyles` (panel, badge, stat) and `effects` (the bounded named vocabulary with intensities), mirroring the shapes task 7 already authored and tested in `packages/templates/src/schema.ts` → verify: a theme carrying all three effects round-trips through `Deck.parse`, and an unknown effect name is rejected
- [x] Bump `CURRENT_SCHEMA_VERSION` to 2 and add a pure `v1 → v2` migration that supplies conservative defaults, keeping the ordered-chain shape and the retained original snapshot → verify: a v1 fixture migrates and passes `Deck.parse`; the v0 fixture still migrates through the full chain
- [x] Keep style-by-reference intact — effects and component styles are cited by role, and bare values stay legal only inside `overrides` → verify: an element cannot declare a raw shadow or pattern outside `overrides`
- [x] Resolve effects and component styles to CSS in `packages/render` so the three systems visibly differ → verify: rendering one fixture under `comic` and under `editorial` produces materially different CSS for the same element, asserted on specific declarations rather than a string diff
- [x] Prove the art direction survives the round trip → verify: a Playwright test renders the same deck under all three systems and asserts each system's signature treatment is present and the other two are absent

**Acceptance criteria:** The same `Deck` rendered under `comic`, `editorial` and `brutalist` is visibly a different deck, not a recoloured one. `bun test` green, migration chain intact, and no catalog lookup is required to render a document.

---

### 9. Feature: Document Store, Commands, Undo, And Override Tracking

**Purpose/Issue:** Undo is non-negotiable once the editor is a workbench, and it is nearly free if designed on day one and ruinous to retrofit. Every mutation goes through a command that Immer's `produceWithPatches` turns into forward and inverse patches, so the undo stack is a by-product. This task also owns **D5's** protection mechanism, because the store is the only place that knows what the human touched. Kept separate from task 15 so mutation semantics are testable headlessly.

**Files:** `packages/editor/src/store/**`, `packages/editor/test/store.test.ts`
**Depends on:** 4

**Implementation:**

- [ ] Implement a Zustand store holding a validated `Deck` plus `selection: ElementId[]` → verify: loading an invalid deck fails at the boundary and leaves the previous state untouched
- [ ] Implement `apply(command)` over `produceWithPatches`, pushing `{ forward, inverse, label }` onto an undo stack, and incrementing `revision` → verify: 50 random commands followed by 50 undos restores byte-identical state
- [ ] **Every command records the property paths it wrote into `origin.userOverrides` for each touched element** → verify: retyping a headline then moving it leaves `["content", "frame.x", "frame.y"]`, and undoing removes the paths it added (**D5**)
- [ ] Implement the iteration-1 commands: `SetText`, `MoveElements`, `ResizeElement`, `RotateElement`, `SetStyleRole`, `SetVisibility`, `SetLocked`, `SelectElements`, `DeleteElement`, `ReplaceSlide` → verify: one test per command, plus a test asserting no command mutates a `Deck` in place
- [ ] Coalesce consecutive `SetText` on the same element within 500 ms into one undo entry → verify: typing 10 characters produces 1 undo entry, not 10
- [ ] Expose `overriddenPaths(slideId)` for the regenerate confirmation dialog → verify: it returns a human-readable list ("headline text, subtitle position") for a slide with edits, and empty for an untouched slide
- [ ] Re-validate the resulting deck against the schema in development builds after every command → verify: a command producing an out-of-bounds frame is caught by a test rather than silently persisting

**Acceptance criteria:** `bun test packages/editor/test/store.test.ts` is green, including the 50-command undo round-trip and the override-tracking round-trip. No DOM dependency in this file tree.

---

### 10. Test: Golden Fixture — Three Layak Slides As A `Deck`, In Three Themes

**Purpose/Issue:** **The proof of the riskiest assumption.** If the document model plus template catalog cannot reproduce a deck the team is already proud of, the ceiling is too low and the architecture must change before a single prompt is written. Deliberately hand-authored, not generated. It becomes the regression fixture every later stage is measured against, and — new in this revision — the proof that the reskin affordance actually works.

**Files:** `fixtures/**`, `packages/render/test/golden.test.ts`, `packages/render/test/golden.pw.ts`, `packages/render/test/template-capacity.pw.ts` _(W-1 — asserts task 7's max-capacity fixtures against the pinned renderer)_
**Depends on:** 7, 8

**Implementation:**

- [ ] Hand-author `01 Cover` (`layak-pitch-deck.html:2509-2630`) as a `Deck` slide — multi-element, images, inline emphasis, the densest structural case → verify: parses clean and renders with 0 measurement violations
- [ ] Hand-author `05 What Layak Does` (lines 2724-2771) — the typical content slide with multi-paragraph text and `<em>`/`<strong>` marks → verify: paragraph and run structure survives the round trip visually
- [ ] Hand-author `15 Outcome` (lines 4373-4437) — the stat/outcome case, exercising the repeater → verify: renders inside the safe margin
- [ ] **Render the same three slides in all three design systems** → verify: all three reskins parse, render and validate; any that cannot is recorded rather than patched away. _This is the acceptance evidence for "try another design system"._
- [ ] Author one **deliberately-sloppy** variant — overflowing headline, repeated point across two slides, an ungrounded statistic, three consecutive uses of one template → verify: task 12 uses the mechanical failures now, while the content failures and expected messages are recorded for deferred task 13 without implementing its lints
- [ ] Record in `fixtures/README.md` every element of the originals the model **could not** express → verify: the list is explicit and empty-or-justified. _This list is the actual finding of the task._
- [ ] Add a Playwright side-by-side visual comparison against the originals → verify: a reviewer can view both; do **not** gate on pixel equality — the originals are flow layouts and exact parity is not the goal
- [ ] Do **not** attempt the diagram-heavy slides (`06 System Architecture`, `09 Vertex AI Search`, `14 Firestore ERD`) → verify: they are absent; the diagram compiler is iteration 2 (**D4**)

- [ ] **Assert task 7's max-capacity fixtures against the pinned renderer (W-1)** — render each template's saturating fixture and fail if any slot overflows → verify: a template whose declared budget is deliberately raised by 20% fails this test. _Re-homed from task 7: `packages/templates` cannot import `packages/render` without a circular dependency, and task 8 runs concurrently with 7 so it would assert over an empty catalog._

**Acceptance criteria:** A human looking at the rendered fixture beside the original agrees the reproduction is presentable, **or** `fixtures/README.md` names precisely what the model cannot express — either outcome is a successful task and both must be surfaced at Gate 2.

---

### 11. Feature: Export — Hosted Vector PDF, Single-File HTML, And `.bmd`

**Purpose/Issue:** PDF remains the sufficient user-facing export. Per settled Q13, pinned server-side Playwright is authoritative and streams the PDF without storing it; browser print is a fallback. `.bmd` remains client-owned persistence/portability, not a server archive. Per-slide PNG is tightened out.

**Files:** `packages/export/**`, `apps/api/src/routes/export.ts`, `apps/api/test/export.test.ts`
**Depends on:** 6A, 6B, 8

**Implementation:**

- [ ] Implement `exportPdf(deck, opts)` with Playwright — render via `renderDeckToHtml`, await `deck-stage:ready`, then print at the deck's declared 16:9 physical dimensions → verify: a 3-slide deck yields exactly 3 pages
- [ ] Implement the pre-mounted `/api/export/pdf` route: authenticate, schema/body-size validate, run under the same admission/concurrency controls, stream the PDF response and discard server-side bytes after completion → verify: no deck/export row, object or file remains after the response and disconnect aborts Playwright
- [ ] Keep browser-side `printDeck()` as a fallback only → verify: page count/size match the pinned headless path on the golden fixture
- [ ] Assert the output is **vector**, not raster → verify: extracted PDF text contains a known headline, so it is selectable and searchable
- [ ] Assert size discipline → verify: the 3-slide text-only fixture exports under 1 MB
- [ ] Embed fonts in the PDF from the self-hosted content-addressed files → verify: the PDF renders correctly on a machine without those fonts installed
- [ ] Implement `.bmd` export/import in the browser — a zip of `deck.json`, assets, fonts and a manifest → verify: a deck containing an imported screenshot round-trips on a machine where the original image file is absent; no API key/run admission metadata can enter the archive
- [ ] Implement single-file HTML export → verify: it opens from `file://` offline with working navigation; do not implement per-slide PNG in iteration 1
- [ ] **Use no Bun-only APIs anywhere in this package** — no `Bun.file`, no `Bun.spawn`, no `bun:sqlite` (**D7**) → verify: a grep test finds no `Bun.` reference, so a Node LTS fallback is a runtime swap rather than a rewrite

**Acceptance criteria:** Server-primary Playwright produces a vector, searchable, sub-1 MB, 3-page PDF at 16:9 with no external network. It streams from the single hosted service, persists no deck or export artifact server-side, and matches browser-fallback page geometry.

---

### 12. Feature: Measurement, Tier-0 Auto-Fit, And Repair Protection

**Purpose/Issue:** A model cannot see its own output. `measure()` remains one environment-agnostic implementation over a DOM root with two thin hosts. Per settled Q13, pinned server Playwright is authoritative for generation/export and the in-editor browser host is advisory for immediate post-edit badges. Tier-0 auto-fit is the highest-value zero-token repair.

**Files:** `packages/validate/src/measure/**`, `packages/validate/test/measure.test.ts`, `packages/validate/test/measure.pw.ts`, `apps/api/src/runtime/measurement-host.ts`, `apps/api/test/measurement-host.test.ts`
**Depends on:** 6A, 8

**Implementation:**

- [ ] Implement `measure(root: ParentNode, deck): Violation[]`, gated on `deck-stage:ready`, with a thin pinned-Playwright host and a thin in-editor host over the identical function → verify: both hosts agree on violation type/element/magnitude within declared numeric tolerance; no second measurement implementation exists
- [ ] Mark reports with host/Chromium/font revision so browser-advisory results are never confused with authoritative server results → verify: a stale/mismatched host report cannot be used to accept a server generation
- [ ] Implement checks returning a **numeric magnitude**, not a boolean: `overflow` (`scrollHeight − clientHeight`, plus `Range.getClientRects()` line counting to catch clipped glyph fragments), `overlap`, `min_font_size`, `out_of_bounds`, `safe_margin`, `image_aspect` → verify: one purpose-built failing fixture per check, each asserting the reported magnitude
- [ ] Implement `overlap` by transforming element corners into design coordinates with `DOMMatrix` and using **polygon intersection**, not axis-aligned rectangles — required because elements rotate → verify: two rotated overlapping elements are detected and two rotated non-overlapping ones are not
- [ ] Honour **template-declared** collision groups and intentional-overlap rules; treat text-over-text as critical and decorative collision as informational; keep the per-element `allowOverlap` flag only as an editor-set escape hatch → verify: a text-over-panel fixture passes while a text-over-text fixture fails (Finding 3)
- [ ] Express `min_font_size` in **physical points** using `canvas.printWidthIn`, not design pixels → verify: a fixture legal in px but illegal at print size is flagged
- [ ] Implement `contrast` — direct calculation from resolved colours for solid fills; for images and gradients, render background-only with text hidden and sample pixels beneath the text region → verify: a white-on-photo fixture is flagged where a naive computed-background check would pass it
- [ ] Implement **Tier-0 auto-fit** — binary-search font size down the theme's scale until the element fits, floored at the role's minimum, with line-height and tracking adjustable only within a declared band → verify: an overflowing headline fits in ≤ 6 iterations with no provider call and never drops below the floor
- [ ] Implement provider-agnostic repair state control — ≤ 3 model-attempt slots, injected deadline/budget stop signal, no repeated document-state hash, and one deterministic safe fallback — with lexicographic scoring and rejection of higher-severity regressions → verify: an unfixable fixture terminates and returns a **flagged** best revision; task 14 proves the injected stop signal is task 6A's hard token budget
- [ ] Implement **repair protection (D5)** — a repair patch may not write a path listed in `origin.userOverrides`; it degrades to a flag carrying the measured number; after any human edit the run is **warn mode**, never auto-repair → verify: a fixture whose headline is user-edited and overflowing produces a flag and an unmodified document, asserted by deep-equal
- [ ] Emit `RepairSignal` objects carrying the measured numbers and a derived character budget, ready for iteration 2's Tier-2 prompt → verify: the signal for an overflowing headline contains both the measured px and a target character count
- [ ] **Use no Bun-only APIs anywhere in this package (D7)** → verify: a grep test finds no `Bun.` reference

**Acceptance criteria:** The golden fixture measures 0 violations in all three themes. The sloppy fixture reports each violation with its magnitude. Tier-0 auto-fit resolves the overflow cases with no provider call, and never touches a user-overridden path.

---

### 13. Deferred: Deterministic Content Quality Gates _(iteration 2, before full-deck prompt tuning)_

**Purpose/Issue:** This is the second applied tightening cut, not a rejection of **D6**. Full-deck grounding, repetition and variety are not honestly testable while slice 1 regenerates one slide from an existing deck. The four-rung quality architecture remains canonical.

**Files:** `packages/validate/src/content-contract/**` stubs pre-created by task 1 and specified by tasks 2/14; no lint implementation in iteration 1
**Depends on:** full intake/narrative generation entering scope

**Preserved Contract:**

- `ContentQualityReport` carries grounding, repetition, hierarchy, variety and opener-slop findings.
- `ContentCritic` remains advisory, returns per-slide rubric scores plus one concrete fix, and is never a provider requirement or sole validator.
- `origin.sourceRefs`, semantic roles, template provenance and the sloppy fixture land in slice 1.
- Human evaluation remains a fixed five-project corpus asking _"would you present this without editing it?"_, with the proposed ≥ 3 of 5 / ≤ 5 minutes gate.

**Deferred Acceptance Criteria:** Implement these deterministic lints and fixtures before any full-deck generator prompt is tuned; then add the rubric critic, vision critic and human-evaluation run in that order. No quality rung may be silently dropped.

---

### 14. Feature: Hosted Content Compile, Steering, Budgets, And Telemetry

**Purpose/Issue:** The minimum hosted pipeline that makes steering real: `SlideContent → LayoutBindings → Slide`, using the broker and server-owned run budget. It streams progress/results to the browser, records per-stage measurements before any cost target is chosen, and returns a usable partial/degraded deck when budget/provider capacity ends. Upstream intake, fact extraction and narrative remain iteration 2.

**Files:** `packages/pipeline/**`, `apps/api/src/routes/generation.ts`, `apps/api/test/generation.test.ts`
**Depends on:** 4, 6A, 6B, 7, 12
**Implementer:** **Claude programmer required** — this task joins the spend circuit breaker, bounded repair, partial-result contract and hosted stream; a mistake can drain the shared pool or loop indefinitely.

**Implementation:**

- [ ] Define `SlideContent` with **capacity-aware variants** — `intent`, `headline { short, standard }`, `body { short, standard, extended }`, `bullets` ranked by importance, `assetRefs`, `sourceRefs` → verify: a schema test asserts every variant field is present, so layout never has to re-ask the model for a shorter string (**D8**)
- [ ] Define the preserved slice-1 `ContentQualityReport`/`ContentCritic` interfaces in the pre-created content-contract entry point; ship no-op reports only → verify: task 13 can implement rung 1 without changing `Deck`, pipeline or renderer types
- [ ] Implement `bindSlide(content, catalog, theme): Slide` — deterministically pick a template whose `intents` match and whose capacity fits an available variant, bind typed slots, instantiate elements, populate `origin.pipelineStage` and `origin.sourceRefs` → verify: given content too long for the standard variant, it selects the short variant or a denser template rather than overflowing, asserted by measuring the result
- [ ] Implement `regenerateSlide(deck, slideId, opts, runContext)` — call the broker for fresh content, re-bind, validate and replace via `ReplaceSlide`; every call receives the same task-6 `RunBudget` and abort signal → verify: fixture variants differ, noisy output repairs within bounds, and no provider call exists without a run budget
- [ ] **Refuse to silently discard human work (D5)** — `regenerateSlide` requires an explicit `confirmOverrides: true` when the slide has any `origin.userOverrides` → verify: calling it without the flag on an edited slide returns a typed refusal listing the overridden paths, and does not mutate the deck
- [ ] Implement `reskinDeck(deck, themeId)` — swap `ThemeSpec`, re-run Tier-0 auto-fit, revalidate; on failure, flag rather than block → verify: the golden fixture reskins across all three themes with 0 violations, and a deliberately tight fixture flags rather than throwing
- [ ] Implement per-stage telemetry from the first provider-bearing slice — stage name, input hash, schema/prompt version, attempt, model id, normalized input/output/total tokens, wall time and optional cost estimate — and aggregate it at run end → verify: fixture/noisy/live adapters emit the same shape; serialized telemetry contains no prompt, source, deck body, response body, key, raw IP, GitHub profile payload or session token
- [ ] Enforce bounded feedback with all four independent stops: ≤ 3 model repair attempts per slide, task-6 token ceiling + wall deadline, repeated-state hash rejection and one deterministic safe fallback → verify: an oscillating repair fixture cannot start a fourth call and returns a `degraded` flagged slide
- [ ] Handle `run_budget_exceeded` by aborting pending work, applying deterministic fallback when possible, and returning the best schema-valid `partial`/`degraded` deck plus usage/flags; never retry it → verify: an artificially tiny token ceiling produces a usable flagged deck and a 200-class typed terminal event, not an opaque 500
- [ ] Normalize production quota exhaustion to `shared_pool_exhausted`, stop retries, preserve the current deck and emit the reserved Q15 UI contract; do not accept a BYOK field or promise either fallback shape in slice 1 → verify: simulated quota exhaustion makes zero follow-up calls and no provider-key input exists in the public request schema
- [ ] Implement the pre-mounted `POST /api/generation/slide` route as `application/x-ndjson` with events `accepted`, `stage_started`, `stage_completed`, `partial_deck`, `flagged`, `completed`, `failed`; apply task-6 admission/input/concurrency controls before invoking the pipeline → verify: disconnect cancels provider/Playwright work and the client receives partial state as soon as it is valid
- [ ] Require finite operator values for token ceiling, wall deadline and input bytes in production; fail service startup closed if any is missing/unbounded → verify: production-mode config without each value fails before listening, while tests inject explicit small values

**Acceptance criteria:** Regeneration/reskin work through the hosted stream against fixture/noisy with external network blocked and through the identical pipeline against real Qwen and Gemini. Per-stage numbers exist before Q8 is revisited; budget/quota exhaustion returns a valid flagged result; and not one line of `packages/pipeline` names a provider.

---

### 15. Feature: The Editor Workbench

**Purpose/Issue:** The integration point that proves the whole architecture, and — after the human's Gate 1 reframe — the product's human-in-the-loop surface rather than an escape hatch. The same document the generator emits, rendered by the same renderer, is directly manipulable **and directly re-steerable**. **The largest task in the plan;** the PM should expect it to run long and may checkpoint it.

Still explicitly out: shape creation, slide reordering, a free-form colour picker, a font picker, drag-to-reorder layers, image cropping. The temptation to build a Canva clone here remains the single largest scope risk.

**Files:** `packages/editor/src/{app,surface,overlay,panels,steering,persistence}/**`, `apps/web/**` _(not `packages/editor/src/store/**`, owned by task 9; not API routes, owned by tasks 6/11/14)_
**Depends on:** 6B, 8, 9, 11, 12, 14
**Implementer:** **Claude programmer required** — this is design-sensitive, and Impeccable's live PostToolUse feedback does not reach Codex-executed UI work.

**Implementation:**

- [ ] Build the Vite React shell in `apps/web` — slide filmstrip, canvas surface, minimal top bar — styled **only** from `docs/DESIGN.md` tokens → verify: the single hosted service serves it and loading the golden fixture shows three slides
- [ ] Implement the GitHub access surface before any generation control: sign in, session status, sign out and authenticated account deletion; show remaining per-user allowance without exposing raw counters for other users → verify: an unauthenticated browser cannot start a hosted run but can still open/export an existing local `.bmd`, and no anonymous/code option is rendered
- [ ] Render the live view via `<SlideView>` from `packages/render` → verify: no element-rendering code exists in `packages/editor`, asserted by a grep test
- [ ] Implement selection with `Selecto` — click, shift-click, marquee → verify: a marquee across two elements selects exactly those two
- [ ] Implement move/resize/**rotate** with `react-moveable`, snapping to the template grid and sibling edges, dispatching store commands → verify: dragging then Ctrl+Z restores the original frame exactly; a rotated element's handles track its rotation
- [ ] Keep coordinates in design space — the surface applies one transform and no code multiplies by a scale factor → verify: a test asserts a drag at 50% zoom moves the element by the correct design-space delta
- [ ] Implement in-place text editing — double-click enters editing on the rendered box, `beforeinput` updates the structured paragraphs/runs, blur or Escape commits a `SetText`; **raw `contenteditable` HTML is never stored** → verify: typing then undo restores the original paragraph and run structure including marks. _Known risk (Q1): if caret or IME behaviour under the scaled stage is poor, move editing into an unscaled overlay — do not reconsider canvas._
- [ ] Implement the **layers list** — z-ordered per slide, with select, lock and visibility toggles, keyboard navigable → verify: a locked background element the generator placed is selectable from the list and not by clicking the canvas (**D2**)
- [ ] Implement the **role-constrained property strip** — swap type role, swap colour role, nudge font size within the declared band → verify: a grep test asserts the strip offers **no free-form hex input and no font picker**, and that every value it can set resolves in the active `ThemeSpec`
- [ ] Implement **"Regenerate This Slide"** over task 14's streamed API — apply `partial_deck` events to a preview, commit only schema-valid results, and show per-stage progress without provider names leaking into stage logic; if `userOverrides` exist, require named confirmation → verify: cancel/disconnect preserves the last committed deck and aborts the run
- [ ] Implement **"Try Another Design System"** — theme picker calling `reskinDeck`, re-validating, undoable as one entry → verify: switching themes and pressing Ctrl+Z restores the previous theme in one step
- [ ] Show live violation badges from the in-editor host, label them advisory and replace them with authoritative server flags after generation/export validation → verify: host revision is visible in diagnostics and stale browser measurements cannot mark a run accepted
- [ ] Add "Export PDF" through the settled hosted `/api/export/pdf` primary path with browser `printDeck()` fallback → verify: a server failure offers fallback without losing edits and never retains the request deck
- [ ] Autosave the entire deck/assets to OPFS and offer `.bmd` save/open → verify: reload restores work and imported screenshots survive. Clearing site data loses autosave by design; `.bmd` is the portable backup. No provider key, GitHub profile payload, session token, raw IP or server allowance data enters OPFS
- [ ] Handle `run_budget_exceeded` and `shared_pool_exhausted` as terminal product states: keep the partial/current deck editable/exportable, show the typed reason and do not auto-retry or present a provider-key field/selected fallback → verify: both simulated states leave the editor usable and trigger zero follow-up generation requests
- [ ] Assert the built browser bundle and source maps contain none of `DASHSCOPE_API_KEY`, `GEMINI_API_KEY`, their sentinel values or server-only config names beyond public error codes → verify: production build scan is clean

**Acceptance criteria:** Through the hosted web app, load or restore a browser-owned deck, edit/undo, regenerate through the bounded stream, survive budget/pool exhaustion, reskin, export a vector PDF and save `.bmd` without a provider key ever entering the browser. **Design Gate:** `npx impeccable detect <changed files>` reports 0 unwaived findings and the chrome uses only `docs/DESIGN.md` tokens.

---

### 16. Test: Hosted End-To-End Acceptance For The Slice

**Purpose/Issue:** One test that fails if any part of the architecture is broken, and which is the artifact shown at Gate 2 to answer "did we prove the riskiest assumption?"

**Files:** `test/e2e/slice-1.pw.ts`, `test/integration/live-providers.test.ts`, `test/deployment/container.test.ts` _(`docs/test.md` is QA-owned; PG writes only tests)_
**Depends on:** 6A, 6B, 10, 11, 12, 14, 15

**Implementation:**

- [ ] Load `fixtures/layak-3slide.deck.json` → measure → assert 0 violations, in **all three themes** → verify: the assertion is on the measured report, not a snapshot
- [ ] Open it in the editor, move an element, retype a headline, change a colour role, undo all three, assert byte-identical state → verify: deep-equal against the loaded document
- [ ] Start the single hosted service with explicit tiny test budgets and a stubbed GitHub OAuth identity; sign in and load the web app through HTTP → verify: the session maps to a stable local owner ID and no CLI/local proxy, worker, queue, Postgres or object store process starts
- [ ] Regenerate a slide against the **fixture** adapter and assert it changed twice → verify: the steering seam is live through the API with external network blocked
- [ ] Regenerate a slide against the **noisy** adapter and assert a valid, measured slide still results → verify: the bounded-retry path survives adversarial output
- [ ] Edit a slide, then attempt regeneration without consent → verify: it refuses, names the overridden paths, and leaves the deck deep-equal (**D5**)
- [ ] Reskin the deck to each theme and revalidate → verify: 0 violations each time, or a recorded flag rather than a silent pass
- [ ] Exhaust a deliberately tiny per-run token ceiling during an oscillating repair → verify: no fourth model attempt/call occurs; pending work aborts; the response is a schema-valid partial/degraded deck flagged `run_budget_exceeded`
- [ ] Send a 200-page-equivalent request and race two requests against one user's allowance → verify: the oversized request reaches no provider and the admission ledger permits no double-spend
- [ ] Simulate shared-provider quota exhaustion → verify: the editor preserves/exports the current deck, shows `shared_pool_exhausted`, exposes no key input and makes no retry
- [ ] Export a PDF through authoritative server Playwright; assert 3 pages, vector text, under 1 MB and no retained server artifact → verify: text extraction finds a known headline and server deck/asset storage remains empty
- [ ] Assert the deterministic hosted run works with **external** requests blocked while local web/API traffic remains allowed → verify: fixture/noisy E2E passes with all provider env vars unset
- [ ] Run the env-gated live provider integration once against real DashScope/Qwen and once against native Gemini, calling the identical pipeline schema → verify: both return valid slides and redacted per-stage token/wall metrics; QA records pass/fail in `docs/test.md`, not secret-bearing transcripts in the repo
- [ ] Scan browser bundle, `.bmd`, PDF, server responses, SQLite, logs and errors with sentinel credentials → verify: no provider key or raw admission identifier appears anywhere
- [ ] Sign out, sign back in, then delete the account → verify: every user-linked session/allowance row is physically gone, the old session fails, no soft-delete tombstone exists and the browser-owned `.bmd` remains a local portable file rather than a hidden server copy
- [ ] Build and run the production container with its persistent identity/control volume, restart it, and retry an exhausted allowance → verify: user/session/counters survive the restart until deletion, health/web/API return, and only one service is deployed
- [ ] Print per-stage and aggregate token/wall metrics for Qwen and Gemini without asserting a cost/latency target → verify: the output is the evidence used to decide Q8 later, not a hidden pass threshold

**Acceptance criteria:** Network-blocked E2E is green with fixture/noisy adapters; live Qwen and Gemini smokes are both evidenced; abuse and hard-budget tests prove bounded spend; the one-container deployment retains only its control ledger; and the slice answers both the design-ceiling and hosted-generation seam questions.

---

## Execution Notes

- **Implementer Routing.** `docs/decisions.md` keeps Codex workers as the default. These tasks **must** go to the Claude programmer (or PM for task 2), because each matches the recorded delicate/ambiguous exception:
  - **Task 2 — Canonical Docs:** it resolves a direct stale-contract conflict in `AGENTS.md` and records Gate-1 architecture.
  - **Task 6A — Providers + Runtime Boundary:** generic credential injection, spend enforcement and two genuinely different provider protocols are security-critical.
  - **Task 6B — Identity + Admission Boundary:** OAuth, sessions, ownership authorization, hard deletion and atomic per-user allowances are security-critical.
  - **Task 7 — Templates + Design Systems:** one agent must own the whole task, and three coherent art directions require design judgement/live Impeccable feedback.
  - **Task 14 — Pipeline + Budgets:** it integrates the hard ceiling with repair termination and partial results; an unbounded bug spends shared money.
  - **Task 15 — Editor Workbench:** design-sensitive, largest integration task, and Impeccable's live PostToolUse feedback does not reach Codex-executed UI work.
- **Playwright Origin Server Is Centralized In `playwright.config.ts` (PM decision, wave 2 QA / W-4).** The per-file `node:http` fixture task 5 carries must be replaced by a shared origin before wave 3 creates a second copy — tasks 8, 10, 12 and 16 would otherwise produce five. `playwright.config.ts` is a root file and is PM-authorized as a one-off write alongside the wave-2 fix round.
- **Playwright Pages Need A Real Origin (wave 2 finding).** `page.setContent()` without a prior navigation leaves the page on an **opaque origin**, so every Storage API throws `SecurityError: Access is denied for this document` — reproduced with a trivial `<div>` and no component involved; `data:` URLs are blocked for the same reason. Any Playwright test touching `localStorage` (slide-position persistence), `sessionStorage` or OPFS must `page.goto()` a real `http://` origin first. Task 5 carries a self-contained `node:http` fixture inside its own test file because `playwright.config.ts` was outside its scope. **Tasks 10, 12 and 16 hit the same wall** — the shared fix (a `webServer` in `playwright.config.ts`, or one shared test helper) should be settled before wave 4 rather than copied four times.
- **Playwright-Verified Checkboxes Do Not Go To Codex Workers (PM decision, wave 3).** Codex's sandbox cannot launch Chromium or bind the shared origin server, so a Codex worker can neither run nor teeth-check a `*.pw.ts`. This has now produced broken-but-unverified Playwright tests three times (tasks 5, 8, and the wave-1 install). **Any task whose checkboxes assert in Playwright routes to the Claude programmer** — currently tasks 10, 12 and 16. If a Codex worker must own such a task, the PM runs Playwright before QA and treats a 'blocked' report as unverified, never as passing.
- **React Rendering Must Happen Out-Of-Process In Playwright Tests (wave 3 finding; corrected).** `@playwright/test` sets its Babel `jsxImportSource` to the `playwright` package for **every file compiled in the test worker** (`playwright/lib/common/index.js:1345`), not only `*.pw.ts`. So any JSX-bearing module reached from a Playwright test — including `render.tsx` itself — is rewritten against `playwright/jsx-runtime`, which returns `{ __pw_type, type, props, key }` placeholders that `renderToStaticMarkup` cannot render. **Switching to the string API `renderDeckToHtml` is NOT sufficient**, since that function lives in a JSX-bearing file and throws identically. The working fix is to render in a **separate clean `bun` process** and pass the HTML string across the process boundary. `packages/render/test/render.pw.ts` carries the `renderDeckHtml()` helper that does this — copy it rather than re-deriving. The renderer itself is correct; `render.test.tsx` proves it under `bun test`.
- **Test-Runner Convention (PM decision, wave 1).** Playwright-driven tests are named `*.pw.ts`; `bun test` unit tests are named `*.test.ts`. `bun test` collects `*.test.*` **and** `*.spec.*`, so `.spec.ts` does not separate the runners — a file visible to both fails with `Playwright Test did not expect test() to be called here`. Any task whose verification renders in a browser (5, 10, 12, 16) must name that file `*.pw.ts`.
- **Stop-And-Report Triggers.** Stop if a new dependency would touch `bun.lock`; if provider-specific behavior is needed outside `packages/providers`; if any provider or OAuth token could reach the browser/log/storage; if a client can raise a server budget; if a run can start without authenticated admission and a finite budget; if a non-owner can reach an owned resource; if deletion would leave a row/asset/tombstone; if "Absolute Frame, Flow Interior" cannot express a prior-art slide; or if model-authored markup is proposed.
- **Applied Tightening.** Tasks 3 and 13 are deferred and do not run. Server deck persistence remains deferred despite being approved for iteration 2. Per-slide PNG is removed. Three design systems, both live adapters, GitHub identity/ownership, the workbench steering surface, PDF/`.bmd`, the hard circuit breaker and abuse controls are not cuttable. At 15 active task units the iteration is credible but has no slack; if it overruns, cut the property strip, then rotate. Never cut spend protection, provider conformance or user-edit protection.
- **Carried To Iteration 2, In Order, Not Lost.** **First: private owner-keyed server-side deck/asset persistence with physical deletion, after the document schema stabilizes. Second: explicit opt-in sharing and public gallery on that ownership model.** Then: template-targeting study · deterministic content lints **before full-deck prompt tuning** · intake/fact extraction/narrative · diagram compiler · Tier-2 model repair · Anthropic · remaining 3-7 design systems · rubric and vision critics · five-project human evaluation · ≥90% mechanical corpus gate · BYOK shape decision (local bridge versus ephemeral hosted) · durable queue only if disconnect/restart or measured scaling needs earn it · PPTX · per-slide PNG.

---

## Done

_PG ticks `- [x]` when a step is implemented and its test is green. Tasks move to **Done** only after they pass QA — the PM moves them when relaying the verdict._
