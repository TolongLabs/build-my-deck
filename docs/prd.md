# PRD — build-my-deck

> Product requirements for iteration 1 (the hosted architecture-defining slice). Canonical inputs: `docs/plan.md` (Gate 1, closed) and `docs/decisions.md`. Architecture and contracts live in `docs/trd.md`, not here.

## Target User

Hackathon participants: people with a working project, a Devpost draft or README, a handful of screenshots, and not enough hours left before the pitch. They are not designers and do not have a design system to bring — they need a judge-ready deck to exist, fast, from what they already have.

## The Three Must-Win Jobs

1. **Produce a judge-ready first draft.** From a prompt plus reference material, generate a deck that looks hand-designed — narrative, layout, typography and imagery — not a themed bullet dump. This is the riskiest assumption in the product and the one iteration 1 exists to test.
2. **Let the author steer the draft, not rebuild it.** The editor is a workbench: direct manipulation (select, move, resize, rotate, retype) plus generator-backed steering ("regenerate this slide", "try another design system") that reuses the same pipeline rather than reimplementing a general-purpose design tool.
3. **Hand judges something they can actually open.** Export a vector, searchable, offline-viewable PDF at 16:9 with no dependency on the live editor.

## Non-Goals

- PPTX export (deferred, not cancelled).
- Real-time or multi-user collaboration.
- Identity providers other than GitHub OAuth.
- Sharing and any public gallery (explicit, opt-in, later — after iteration 2's persistence work).
- Durable/resumable job queues (runs are request-scoped and cancel on client disconnect).
- Server-side deck or asset storage in slice 1 (deliberately sequenced to iteration 2, after the document schema stabilizes).
- Full intake/fact-extraction/narrative generation, image generation, the diagram compiler, model-driven Tier-2 repair, Anthropic support, per-slide PNG, and video elements — all carried into iteration 2 or later.

## Three Hard Product Constraints

1. **LLM-provider heterogeneous.** Qwen, Gemini, OpenAI, Anthropic and others are pluggable behind one provider-adapter interface. No provider-specific behavior may leak into the generation stages. Image generation is a per-model capability flag, not an assumption.
2. **Editable output.** Generated slides are never a terminal artifact — every element stays individually selectable, movable, re-stylable and re-exportable in the editor.
3. **Private by default, owned by the user.** Every user signs in with GitHub OAuth against a stable local owner identity. Decks are visible only to their owner; sharing and public galleries are explicit, opt-in later additions. Account and deck deletion is physical, never soft-delete.

## Hosted, Shared-Pool Posture

build-my-deck is a **hosted service**, not a local-first tool. Users call a TolongLabs-operated API; generation runs against TolongLabs' shared Qwen and Gemini pool. Provider credentials live only on the server and never reach the browser. A future bring-your-own-key path is reserved but deliberately not chosen in slice 1 — the shipped contract only exposes a typed `shared_pool_exhausted` state, no key input field.

## GitHub Sign-In And Per-User Allowances

Every user signs in with GitHub OAuth. Sign-in creates a stable local owner identity — the same identity iteration 2 will attach deck rows to — with a server-side session, per-user token/run allowances, a coarse IP backstop and a global concurrency cap. There is no anonymous path and no invite/referral-code path.

## Privacy Posture

Private by default, real deletion. A user's hackathon project is competitively sensitive, unreleased material, so:

- A deck (once server-persisted, from iteration 2) is visible only to its owner. Sharing and any gallery are explicit, opt-in, and land later on top of that ownership model.
- Account deletion is physical: sessions, allowance rows and any user-linked data are actually removed, not flagged. No `deleted_at` or soft-delete column is permitted anywhere in the system.

## Success Metric

**Would you present this deck to judges with five minutes of editing or less, without having built it yourself?** Measured against a fixed five-project hackathon corpus by someone who did not author the deck. Proposed target: **≥ 3 of 5 decks judged presentable with ≤ 5 minutes of editing.** This is a human-evaluation gate, not a mechanical one — the four-rung quality ladder in `docs/trd.md` explains why mechanical checks (no overflow, no unwanted overlap) are necessary but not sufficient. It is scored starting iteration 2, once full-deck generation exists to evaluate honestly; slice 1 lands the data contracts (`sourceRefs`, semantic roles, template provenance) the metric depends on.
