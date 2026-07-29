# PRODUCT.md — Editor Chrome

> Scope note, read this first: this file (and `docs/DESIGN.md`) governs **build-my-deck's own repo UI — the editor's chrome** (top bar, filmstrip, panels, property strip, layers list, auth surface). It does **not** govern the generated deck's look. The generated deck's design systems are data-driven code in `packages/templates` (task 7 in `docs/plan.md`), authored per curated theme, and are the product's *output* — not the product's *interface*. Confusing the two would put slide typography rules in a repo-UI doc, which is exactly backwards.

## Register

A workbench, not a toy. The person using this editor already has a working project and a deadline; they are steering a generator, not exploring a creative tool for its own sake. Chrome should read as **fast, precise and quiet** — closer to a code editor or Figma's inspector panel than to a consumer app's onboarding-heavy first-run experience. No celebratory animation, no tips-of-the-day, no marketing copy inside the tool itself.

## Platform

- **One hosted web app.** Delivered as static assets from the same single container that serves the API (`docs/trd.md` → Deployment). There is no separate marketing site, no native app, no browser extension in iteration 1.
- **Desktop-first, not mobile-responsive.** Direct manipulation (drag/resize/rotate handles, marquee selection, a layers list) is inherently a sit-down, pointer-and-keyboard activity; mobile editing is out of scope for iteration 1 and is not a target breakpoint.
- **Keyboard-capable throughout.** Every editor action reachable by mouse (select, undo/redo, layer toggle, delete) must also be reachable by keyboard, because `react-moveable`/`Selecto` already expose keyboard-driven interaction and the layers list is explicitly required to be keyboard-navigable (`docs/plan.md` task 15).

## Brand Personality

Three words: **precise, calm, unglamorous-on-purpose.**

The generated deck is where visual personality and flourish belong — halftone overlays, editorial rules, comic direction, whatever the chosen design system supplies. The editor chrome surrounding it must stay deliberately quiet so it never competes for attention with the live deck preview it is editing. Chrome earns visual interest only through clarity (obvious selection state, obvious hierarchy between panels) — never through decoration for its own sake.

## What This Enables (Cross-Reference)

`docs/DESIGN.md` turns the above into concrete tokens — surface/panel/accent colors, type scale, spacing scale, focus and selection-handle treatment, and the dark-first/light-first call — so that task 15 (`docs/plan.md`) can build the shell, filmstrip, panels and property strip by citing token names directly rather than re-deriving visual decisions in an implementation diff.
