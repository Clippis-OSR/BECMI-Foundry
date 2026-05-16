# Data Layer

## Facts (current behavior)

### Canonical actor/item model constraints

- Actor types are restricted to canonical types:
  - `character`
  - `creature`
- Item types are defined in `system.json` and include equipment/combat/economy/spell categories.
- Schema validation is enforced for actors/items in pre-create and pre-update hooks.

### Rules and table data source

- Rules tables are JSON files under `data/` loaded through `module/utils/rules-data.mjs`.
- Loaded data is cached in `CONFIG.BECMI` (`classTables`, `monsterProgression`, `characterThac0`, `monsterThac0`, `monsterSaves`).
- Runtime validation warns for malformed class tables and monster progression entries.

### Inventory and equipment canonicalization

- Canonical item inventory data is stored under `system.inventory` with fields such as:
  - `location`, `containerId`, `quantity`, `encumbrance`, `countsTowardEncumbrance`, `isContainer`, `containerCapacity`, `notes`.
- Legacy slot naming (`ringLeft`, `ringRight`) is migrated to canonical `ring`.
- Item slot values are validated against canonical slot definitions during migration/runtime validation.

### Creature and saves canonicalization

- Creature actors maintain canonical monster payload under `system.monster`.
- Legacy flat monster-like fields are folded into canonical monster data during migration.
- Saves are canonicalized into explicit keys:
  - `deathRayPoison`, `magicWands`, `paralysisTurnStone`, `dragonBreath`, `rodStaffSpell`
- Legacy save keys are deleted after migration update pass.

### Migration execution model

- Migrations are executed during `ready` and are GM-gated.
- Versioned migration settings are used for at least actor-type and inventory-model migration passes.
- Some canonicalization passes run without explicit setting versions (e.g., creature monster schema/save-key passes) but are designed to be safe/idempotent in current form.

## Approved architecture patterns

1. Canonical storage shape per entity with migration adapters for legacy fields.
2. Schema validation on write boundaries, not only in test-time utilities.
3. JSON-backed deterministic rules data loaded into `CONFIG.BECMI` once at startup.

## Recommendations (approved direction, non-fact)

- Prefer introducing explicit version keys for every migration-like transform to simplify operational observability.
- Keep canonical field names stable; use adapters rather than retrofitting call sites to legacy aliases.
