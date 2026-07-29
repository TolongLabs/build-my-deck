# DESIGN.md — Editor Chrome Tokens

> Same scope note as `docs/PRODUCT.md`: these tokens style **the editor's own chrome only** — the shell, filmstrip, panels, layers list, property strip and auth surface in `apps/web`. They must never be reached for by anything inside `<SlideView>` or `renderDeckToHtml` — the generated deck is styled exclusively by `ThemeSpec`/`themeToCss` in `packages/templates` and `packages/render`. To keep that boundary unambiguous in the CSS itself, every chrome token is namespaced `--bmd-editor-*`, distinct from the deck theme's own custom properties.
>
> Token **names and roles** below are canonical — task 15's acceptance criteria may cite them directly. Hex/px **values** are a provisional starting palette; refining them visually during task 15 (including with Impeccable's live feedback) does not require renaming a token or revisiting this document's structure.

## Posture: Dark-First

The chrome is **dark-first**. Two reasons, not one: the editor sits directly beside a live deck preview whose art direction is bright, high-contrast and varies per theme (halftone, comic, editorial) — a bright chrome frame would visually compete with and desaturate the very thing the user is judging; and dark chrome around a canvas is the established convention of the professional tools this product's register borrows from (Figma, Linear). A light mode is not precluded architecturally but is not built in iteration 1.

## Surface, Panel, Accent

| Token | Role | Value |
|---|---|---|
| `--bmd-editor-surface-0` | App background, behind the canvas | `#111318` |
| `--bmd-editor-surface-1` | Filmstrip, top bar | `#181B22` |
| `--bmd-editor-panel` | Property strip, layers list, side panels | `#20242D` |
| `--bmd-editor-panel-border` | 1px hairline between panel and canvas | `#2E3341` |
| `--bmd-editor-text-primary` | Primary chrome text/icons | `#E8EAF0` |
| `--bmd-editor-text-secondary` | Labels, counters, disabled state | `#8B90A0` |
| `--bmd-editor-accent` | Primary interactive accent (buttons, active tab, active layer) | `#5B8CFF` |
| `--bmd-editor-accent-muted` | Hover/pressed state of accent surfaces | `#3E63C2` |
| `--bmd-editor-danger` | Destructive actions (delete element, delete account) | `#F0788A` |
| `--bmd-editor-warning` | Advisory violation badges (browser-host, non-authoritative) | `#E5A94A` |

## Type Scale

One scale, used only for chrome UI text — never for slide content, which is sized by the deck's own `ThemeSpec` typography roles.

| Token | Use | Value |
|---|---|---|
| `--bmd-editor-font-size-xs` | Counters, badges, layer sublabels | `11px` |
| `--bmd-editor-font-size-sm` | Property strip labels, filmstrip captions | `13px` |
| `--bmd-editor-font-size-base` | Default body/UI text | `14px` |
| `--bmd-editor-font-size-md` | Panel section headers | `16px` |
| `--bmd-editor-font-size-lg` | Top-bar deck title | `18px` |
| `--bmd-editor-font-family` | System UI stack | `-apple-system, "Segoe UI", "Inter", sans-serif` |

## Spacing Scale

A single 4px-based scale, used for all chrome padding, gaps and margins.

| Token | Value |
|---|---|
| `--bmd-editor-space-1` | `4px` |
| `--bmd-editor-space-2` | `8px` |
| `--bmd-editor-space-3` | `12px` |
| `--bmd-editor-space-4` | `16px` |
| `--bmd-editor-space-6` | `24px` |
| `--bmd-editor-space-8` | `32px` |
| `--bmd-editor-space-12` | `48px` |

## Focus And Selection-Handle Treatment

- **Keyboard focus ring** — `--bmd-editor-focus-ring: 2px solid var(--bmd-editor-accent)`, offset `2px`, visible on every focusable chrome control (buttons, layer rows, property strip inputs) to satisfy the platform's keyboard-capable requirement in `docs/PRODUCT.md`.
- **Selection handles** (`react-moveable` on the canvas) use `--bmd-editor-accent` for the bounding box and drag/resize handles, and `--bmd-editor-accent-muted` for the hover state on a handle — kept visually distinct from any deck-theme color so the user never confuses "this is selected" with "this is styled."
- **Marquee selection** (`Selecto`) renders a semi-transparent `--bmd-editor-accent` fill at 12% opacity over the marquee rectangle.
- **Layer lock/hidden states** in the layers list use `--bmd-editor-text-secondary` for the icon and label, never a color that could be mistaken for a deck-theme muted role.
