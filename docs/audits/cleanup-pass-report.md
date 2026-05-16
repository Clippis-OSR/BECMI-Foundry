# Cleanup Pass Report

Date: 2026-05-16
Scope: documentation structure, deprecated wrapper usage audit, duplicate spell test audit, and legacy helper retention review.

## Removed files

- `tests/spells/actor-spellcasting.test.js`
- `tests/spells/spell-compendium-pipeline.test.js`
- `tests/spells/spell-reference-resolution.test.js`
- `tests/spells/spell-schema.test.js`
- `tests/spells/spell-sheet-ux.test.js`

Reason: exact duplicate suites of the `.mjs` tests in the same directory; coverage is preserved by the retained `.mjs` suites.

## Moved files

- `docs/full-system-audit-2026-05-14-consolidated.md` → `docs/audits/archive/full-system-audit-2026-05-14-consolidated.md`

Reason: historical audit content should live under the canonical audit archive path, not at docs root.

## Deprecated-but-retained files

- `module/exploration/exploration-state.mjs`
- `tests/exploration/exploration-state-deprecated.test.mjs`
- `module/items/legacy-slot-migration.mjs`
- `module/monsters/monster-runtime.mjs` legacy helper export `buildNaturalAttackItemsFromLegacyActor`

Reasons retained:

- `exploration-state.mjs` is still imported by explicit compatibility coverage tests and remains documented as deprecated.
- `legacy-slot-migration.mjs` is still used by migration regression tests and supports old-world normalization behavior.
- `buildNaturalAttackItemsFromLegacyActor` is still exercised by monster runtime tests and intentionally warns/delegates legacy-path behavior.

## Canonical documentation authority updates

- `docs/documentation-map.md` now explicitly declares itself the single canonical documentation map.
- `docs/documentation-policy.md` now explicitly enforces:
  - one canonical documentation map (`docs/documentation-map.md`)
  - one active current audit path (`docs/audits/current-system-audit.md`)
- `docs/audits/current-system-audit.md` historical reference updated to new archive location for consolidated audit.

## Remaining cleanup TODOs

1. Add CI/static guardrails to block new imports from deprecated exploration wrappers.
2. Plan deprecation removal criteria window for exploration wrappers and compatibility tests.
3. Isolate and retire monster legacy attack conversion helper once migration confidence gates are satisfied.
4. Retain and periodically revalidate old-world migration helper coverage before future deletion.

## Behavior change statement

No runtime behavior changes were intended in this cleanup pass. Changes are documentation-routing cleanup plus removal of exact-duplicate spell test files while preserving canonical `.mjs` coverage.
