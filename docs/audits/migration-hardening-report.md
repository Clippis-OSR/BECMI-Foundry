# Migration Hardening Report

## Legacy shapes covered

- Legacy actor type alias: `monster` → canonical `creature`.
- Missing actor `system` object (`null`/`undefined`/non-object) now tolerated by migration helpers.
- Malformed creature combat fields:
  - blank or missing `monster.hitDice`
  - non-numeric `monster.ac`
  - missing/invalid `monster.movement.land`
  - legacy string monster attacks (`"2 claws;1 bite"`) normalized into structured entries.
- Legacy item slot aliases (`bothHands`, `mainhand`, `offhand`) normalized via canonical slot migration.
- Legacy inventory location aliases (`equipped`, `stored`, etc.) normalized via canonical inventory migration.
- Old spell item shape support:
  - `spellKey` preserved and mapped to `spellRef`
  - missing/invalid `schemaVersion` defaulted to `1` for tolerant migration input.

## Idempotency guarantees

- Actor migration helper (`migrateLegacyActorForTests`) is idempotent for covered legacy inputs:
  - migrating once and migrating the migrated result again produce equivalent output.
- Item migration helper (`migrateLegacyItemForTests`) is idempotent for covered legacy inputs:
  - slot/location/quantity/spell normalization converges after one pass.
- Regression tests now explicitly assert one-pass vs two-pass equality for representative actor + spell/item cases.

## Fields preserved (non-destructive behavior)

- Actor/user-facing fields: `name`, `system.notes`, and unknown custom objects (e.g., `system.customField`) are preserved.
- Inventory/user-entered metadata: `inventory.notes`, carried-state custom keys, and quantity survive migration.
- Spell references and custom spell fields are preserved where present (`spellKey` retained through `spellRef` mapping).
- Legacy monster attack text is converted, not discarded, into structured attack entries.
- Unknown fields are left intact unless a canonical replacement is required for safety.

## Known unsupported legacy shapes

- Extremely bespoke legacy documents that store actor/item semantics entirely outside `system` are only minimally tolerated.
- Semantically ambiguous custom attack strings beyond delimiter parsing (`;`/`,`) are preserved as best-effort labels but not deeply interpreted.
- Future spell schema versions (`>1`) remain intentionally rejected by canonical spell migration.

## Remaining migration risks

- Runtime-side migration orchestration still depends on call-site usage; helper coverage is comprehensive in tests but not yet wired to every external import path.
- Monster attack parsing is intentionally conservative; unusually formatted homebrew attack notation may need manual cleanup after migration.
- Diagnostics are currently returned as warning strings, not a structured telemetry envelope.

## Deprecated wrapper/public API decisions

- Migration hardening keeps deprecated wrappers behaviorally stable while canonical modules remain the source of truth.
- Canonical validation stays strict (`validateActorSchema` / `validateItemSchema`), while migration inputs are made tolerant through pre-validation normalization.
