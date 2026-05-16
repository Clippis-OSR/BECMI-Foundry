# Runtime Systems

## Facts (current behavior)

### System lifecycle

- `init` phase:
  - Registers runtime domains on `game.becmi` (`combat`, `exploration`, `encounters`).
  - Registers actor/item sheets.
  - Loads rules/class/progression/table data into `CONFIG.BECMI`.
  - Registers settings including migration version gates and automation settings.
- `ready` phase:
  - Registers combat-tracker render hooks across multiple app render events.
  - Registers additional runtime namespaces (`rules`, `inventory`, `encumbrance`).
  - Runs migration pipeline and save-key canonicalization pass.

### Combat runtime

- Combat services are exposed through `game.becmi.combat` from `module/combat/combat-engine.mjs`.
- Initiative supports explicit mode selection via combat flag `becmi-foundry.initiativeMode`.
- Tracker UI injects GM-only controls for group initiative, individual initiative, and morale.
- Chat damage cards support one-click damage application guarded by a `damageApplied` message flag.

### Exploration runtime

- Exploration runtime is exposed via `game.becmi.exploration` from `module/exploration/index.mjs`.
- The module exports movement/time/light contracts plus runtime state advancement helpers:
  - `normalizeExplorationState`
  - `advanceExplorationTurn`
  - summary/read-model helpers
- Wilderness runtime display helpers are exported for UI/readout synchronization.

### Encounter runtime

- Encounter helper runtime is exposed through `game.becmi.encounters` from `module/encounters/index.mjs`.

### Actor runtime protections

- Actor updates are sanitized to prevent manual override of protected derived paths.
- Character spellcasting is normalized and validated during create/update hook paths.
- Creature creation ensures canonical defaults and canonical `system.monster` structure.

## Recommendations (approved direction, non-fact)

- Continue to expose only stable orchestrator APIs on `game.becmi`; keep lower-level helpers module-local unless needed externally.
- Prefer read-model helpers (summary/render functions) for UI integration rather than duplicating runtime calculations in sheets.
