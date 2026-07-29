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
