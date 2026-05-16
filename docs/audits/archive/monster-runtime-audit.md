# ARCHIVED DOCUMENT

This document reflects repository state at the time it was written.
It is no longer a canonical source of truth.
See:
- /docs/architecture/canonical-architecture.md
- /docs/audits/current-system-audit.md

# Monster Runtime Audit (Post-Itemization Hardening)

Date: 2026-05-16  
Scope: monster schema, monster actor runtime, monster attacks, natural weapon items, import/compendium pipeline, morale, saveAs, XP, treasure normalization, migrations, tests.

## 1. Executive summary

The current implementation is largely aligned with the canonical Basic/Expert direction for monsters: canonical monster schema validation is enforced at runtime boundaries, monster-key duplicate detection is active in import/compendium flows, and natural weapons are itemized as canonical `weapon` items with explicit non-encumbering behavior. Initiative behavior was not reviewed for changes and remains intentionally dual-mode.

Primary audit concern is **parallel/legacy monster pipelines** (`module/utils/monster-builder.mjs`) that duplicate normalization logic and can drift from the canonical `module/monsters/*` path if reactivated or referenced by future work.

## 2. Schema consistency findings

- Canonical schema enforcement is explicit through `validateMonsterSchema`, including required fields, `schemaVersion`, `monsterKey` pattern, numeric AC/morale/XP, and canonical `saveAs` format (`^[A-Z]+\d+$`).
- Legacy alias fields are explicitly rejected at validation-time and warned during normalization (`armorClass`, `move`, `attack`, `XP` etc. through alias handling).
- `monsterKey` stability is protected in two places:
  - canonical format validation (`snake_case`)
  - immutability check when `originalMonsterData` is supplied.

Assessment: strong canonical contract at import/build boundaries.

## 3. Natural weapon findings

- Natural attacks are itemized through `buildNaturalAttackItemsFromMonster` and `buildNaturalAttackItemData` as `type: weapon`, `weaponType: natural`, `slot: natural`, `hands: none`, `ammoType: null`, `equipped: true`.
- Encumbrance exclusion is explicit via `inventory.countsTowardEncumbrance: false` in natural attack item payloads.
- Runtime attack-source selection for creatures is item-driven (`getCreatureAttackItems`/`getActorAttackSources`) with no dependency on inline actor attack fields for actionable attack resolution.

Assessment: natural weapon itemization is correctly canonicalized and non-encumbering.

## 4. Import/compendium findings

- Import path (`importMonsterData`) normalizes first, validates schema second, and enforces duplicate `monsterKey` rejection per import batch.
- Compendium integrity validation enforces schema + duplicate key checks before sync/build.
- Runtime actor creation/update path (`createCreatureFromCanonicalMonster`, `updateCreatureFromCanonicalMonster`) consistently builds actor data + natural weapon items from canonical monster definitions.

Assessment: import/compendium parity is good in canonical path (`module/monsters`).

## 5. Runtime combat findings

- Creature attack runtime is item-driven; natural attacks are discovered from weapon items marked natural slot/type and no ammo.
- Inline attack drift risk is reduced by explicit `getActorAttackSources` behavior (creatures from items only).
- No initiative behavior changes were introduced in this audit.

Assessment: no current inline-attack runtime regression found in audited paths.

## 6. Morale/save/XP findings

- `saveAs` is normalized to canonical uppercase compact format during normalization and validated against canonical class+level pattern.
- Morale is normalized numerically in monster schema normalization and consumed in both combat morale and creature hooks; runtime morale gating remains creature-only.
- XP is normalized numerically and used consistently for encounter XP rollups via creature hooks.

Assessment: morale/saveAs/XP pipeline is mostly consistent.

## 7. Treasure normalization findings

- Treasure normalization to uppercase code arrays is present in creature hooks (`normalizeTreasureType`) for runtime encounter/treasure request usage.
- Monster parser supports extraction of treasure letter codes, and normalized canonical fields carry treasure metadata.

Assessment: runtime treasure normalization works; still split between parser-level and runtime-level normalization helpers.

## 8. Remaining drift risks

1. **Duplicate attack normalization helpers** in:
   - `module/monsters/monster-runtime.mjs`
   - `module/utils/monster-builder.mjs`
   - `module/utils/monster-parser.mjs`
   with similar but not identical semantics.
2. **Legacy builder/import path** (`module/utils/monster-builder.mjs`) coexists with canonical monster module path and may diverge in fields (e.g., `armorClass` vs `ac`, `XP` vs `xp`, older `sourceMonsterId` conventions).
3. Morale read path in `rollMorale` prefers `system.morale` branches while creature canonical storage is under `system.monster.morale`; this is mitigated by hooks but worth unifying to one authoritative read path.

## 9. Remaining cleanup candidates

- Consolidate all monster attack parsing/normalization into one shared helper under `module/monsters`.
- Deprecate or hard-gate `module/utils/monster-builder.mjs` legacy import path.
- Standardize morale reads across combat helpers to canonical creature storage (`system.monster.morale`) with fallback only for legacy migration windows.
- Consider codifying monster schema migration utilities in one dedicated monster migration module (parallel to other migration regression coverage).

## 10. Regression test coverage summary

Current targeted suites provide strong coverage for:
- monster schema validation
- monster runtime conversion/building
- monster parser and compendium integrity
- creature attack/weapon restrictions/ammo interactions
- encumbrance regressions including natural attack non-encumbrance
- migrations and schema regressions

Coverage gap candidates:
- explicit `monsterKey` immutability test with `originalMonsterData` diff scenario.
- explicit parity test that canonical importer and compendium sync generate equivalent normalized outputs for same source set.
- test asserting `rollMorale` canonical creature morale path under `system.monster.morale` when `system.morale` absent.

## 11. Recommended next steps

1. Remove or isolate legacy monster builder path from runtime entry points.
2. Deduplicate monster attack normalization and treasure normalization helpers.
3. Add three regression tests for key immutability, import/compendium parity, and morale canonical field reads.
4. Keep natural attack itemization as the sole creature attack source path and avoid reintroducing inline attack execution.

