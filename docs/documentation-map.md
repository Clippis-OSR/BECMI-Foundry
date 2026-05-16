# Documentation Map and Classification

Date: 2026-05-16

## Canonical docs (active sources of truth)

- `README.md` — top-level project orientation and currently points to the consolidated architecture audit as canonical.
- `docs/full-system-audit-2026-05-14-consolidated.md` — canonical architecture baseline and explicitly supersedes fragmented prior audits.
- `docs/rules/basic-expert-reference.md` — rules reference used by multiple audits as canonical rules baseline.
- `tests/README.md` — canonical description of current automated regression scope and test intent.

## Historical/archive candidates

- `docs/audits/archive/full-system-audit-2026-05-14.md` — superseded by consolidated audit.
- `docs/audits/archive/spell-reference-architecture-audit-2026-05-14.md` — point-in-time architecture audit snapshot.
- `docs/archive/sheet-schema-audit.md` — point-in-time schema gap analysis.
- `docs/archive/spell-action-closeout.md` — closeout-style completion snapshot.
- `docs/inventory-qa-checklist.md` — manual QA checklist (still useful operationally, but not architecture source-of-truth).

## Deprecated docs

- `docs/audits/archive/exploration-runtime-audit-root-duplicate.md` (repository root duplicate) — appears redundant with `docs/audits/archive/exploration-runtime-audit.md`; should be retired after confirming no unique required section.
- `docs/audits/archive/audit-current-state.md` — status snapshot likely superseded by consolidated and newer subsystem audits.

## Closeout/status-only docs

- `docs/archive/spell-action-closeout.md`
- `docs/audits/archive/final-basic-expert-audit.md`
- `docs/audits/archive/campaign-readiness-audit.md`
- `docs/audits/archive/basic-expert-system-audit.md`
- `docs/audits/archive/monster-runtime-audit.md`
- `docs/audits/archive/character-runtime-audit.md`

These are valuable historical records, but should not be treated as live architecture authority.

## Duplicate / overlapping docs

- `docs/audits/archive/exploration-runtime-audit-root-duplicate.md` and `docs/audits/archive/exploration-runtime-audit.md` overlap heavily in scope/title and should be merged or one archived.
- `docs/audits/archive/full-system-audit-2026-05-14.md` overlaps with and is superseded by `docs/full-system-audit-2026-05-14-consolidated.md`.
- Multiple subsystem audits under `docs/audits/` overlap recommendations already captured in the consolidated audit.

## Contradictory docs (or likely contradiction risk)

- Older pre-consolidation audits may contradict current canonical decisions on actor/item canonical schemas and legacy-path removal status.
- Any document that still presents legacy/parallel exploration state as active architecture conflicts with current consolidation notes indicating wrapper/deprecation behavior.

## Documents describing outdated architecture or superseded implementation details

- `docs/audits/archive/full-system-audit-2026-05-14.md` (explicitly superseded by consolidated).
- `docs/audits/archive/exploration-runtime-audit-root-duplicate.md` and/or `docs/audits/archive/exploration-runtime-audit.md` sections that discuss now-removed parallel runtime behavior should be treated as historical context.
- `docs/archive/sheet-schema-audit.md` where findings reflect pre-remediation sheet paths (validate against current code before relying).
- `docs/archive/spell-action-closeout.md` sections that describe “placeholder” limitations may be outdated depending on subsequent implementation.

## Subsystem documentation inventory

- `docs/action-effect-library-design.md`
- `docs/rules-data-layer.md`
- `docs/rules/basic-expert-reference.md`
- `docs/audits/archive/basic-expert-system-audit.md`
- `docs/audits/archive/character-runtime-audit.md`
- `docs/audits/archive/monster-runtime-audit.md`
- `docs/audits/archive/exploration-runtime-audit.md`
- `docs/audits/archive/spell-reference-architecture-audit-2026-05-14.md`
- `docs/archive/spell-action-closeout.md`
- `docs/archive/sheet-schema-audit.md`

## Audit file inventory

- `docs/audits/archive/audit-current-state.md`
- `docs/audits/archive/full-system-audit-2026-05-14.md`
- `docs/full-system-audit-2026-05-14-consolidated.md`
- `docs/audits/archive/spell-reference-architecture-audit-2026-05-14.md`
- `docs/archive/sheet-schema-audit.md`
- `docs/audits/archive/exploration-runtime-audit-root-duplicate.md`
- `docs/audits/archive/basic-expert-system-audit.md`
- `docs/audits/archive/campaign-readiness-audit.md`
- `docs/audits/archive/character-runtime-audit.md`
- `docs/audits/archive/exploration-runtime-audit.md`
- `docs/audits/archive/final-basic-expert-audit.md`
- `docs/audits/archive/monster-runtime-audit.md`

## README references

- `README.md` currently references `docs/full-system-audit-2026-05-14-consolidated.md` as canonical architecture audit.
- `tests/README.md` is scoped to regression suite behavior and should remain canonical for test intent.

## Missing documentation

- Single index for all subsystem docs and audit lifecycle state (this file begins that role).
- Explicit “documentation lifecycle policy” (canonical vs historical labels, naming/version conventions, archive location).
- Per-subsystem “current architecture” pages that replace recurring point-in-time audits.
- Changelog-style doc for architecture decisions after 2026-05-14 consolidation.

## Recommended next cleanup actions (no deletion/moves yet)

1. Add front-matter status labels to every doc (`canonical`, `historical`, `deprecated`, `closeout`).
2. Pick one location for exploration audit (`docs/audits/` preferred) and mark the duplicate as archived.
3. Add short deprecation banners to superseded docs, with links to canonical replacements.
4. Create a stable `docs/architecture/` tree for active subsystem source-of-truth docs.
5. Keep closeout reports, but move them under an explicit archive convention in a later cleanup pass.
6. Update `README.md` docs section to link this map and canonical subsystem docs.
