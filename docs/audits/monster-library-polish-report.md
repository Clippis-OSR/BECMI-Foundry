# Monster Library Polish Report

## Current monster architecture
- Canonical monster schema is validated in `module/monsters/monster-validation.mjs` and normalized in `module/monsters/monster-data.mjs`.
- Import/runtime boundaries are handled by `module/monsters/monster-importer.mjs` and `module/monsters/monster-runtime.mjs`.
- CSV/XLSX normalization is handled by `module/utils/monster-parser.mjs`.
- Compendium integrity and deterministic ordering are handled by `module/monsters/monster-compendium.mjs`.

## Canonical BECMI statblock mapping
- Canonical fields required at validation boundary: `name, ac, hitDice, movement, attacks, damage, numberAppearing, saveAs, morale, treasureType, alignment, xp` plus `monsterKey/schemaVersion/source`.
- Runtime rejects legacy aliases and keeps `monsterKey` immutable across updates.
- Raw BECMI text is preserved for movement, treasure, and damage/source text payloads.

## Natural attack item model
- Every canonical attack entry becomes a weapon item (`weaponType: natural`, `slot: natural`, `equipped: true`).
- Encumbrance is not impacted (`inventory.countsTowardEncumbrance: false`).
- Attack count, label, sequence, damage, and rider text are preserved.
- Deterministic replacement metadata is included in imported flags (`replaceKey = monsterKey::index`).

## Special attack / rider policy
- No combat automation was added in this pass.
- Parser now tags obvious rider categories as data only: poison, paralysis, energy drain, petrification, charm, swallow, swoop, trample, continuous damage, breath weapon, spellcasting.
- Tags and rider text are preserved for GM readability and future explicit automation passes.

## Compendium/import behavior
- Compendium sort order is deterministic by `monsterKey` with `name` tiebreaker.
- Duplicate `monsterKey` remains hard error at integrity/import boundaries.
- Update imports continue to use replacement flow for imported natural attacks; tests verify deterministic replacement key presence.

## Legacy conversion decision
- `buildNaturalAttackItemsFromLegacyActor` is kept as deprecated migration-only API and now explicitly returns no runtime attacks.
- Canonical runtime path is `system.monster.attacks` only.

## Known limitations
- Special tags are heuristic pattern matches and do not represent full rules automation.
- Treasure validation currently validates normalized code tokens only where present and preserves raw text.

## Remaining TODOs
- Add richer diagnostics surface in compendium UI for malformed source rows.
- Expand saveAs parsing for unusual historical notations if needed by future datasets.
- Introduce per-tag future automation behind explicit feature tests and UX review.
