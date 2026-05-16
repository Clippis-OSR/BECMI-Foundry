# API Surface

## Facts (current behavior)

### Primary runtime namespace

The current public runtime namespace is `game.becmi`.

Registered domains:

- `game.becmi.combat` → combat engine surface
- `game.becmi.exploration` → exploration runtime/index exports
- `game.becmi.encounters` → encounter helper exports
- `game.becmi.rules` → rules function library
- `game.becmi.inventory` → inventory manager helpers
- `game.becmi.encumbrance` → encumbrance helpers

### Notable callable integration points

- Combat:
  - initiative mode chooser (invoked on combat creation/start if missing mode flag)
  - group/individual initiative rolling
  - morale roll helper for selected creatures
- Exploration:
  - normalized exploration state
  - exploration turn advancement
  - movement/exploration summary helpers
  - wilderness runtime display helpers
- Chat-card integration:
  - damage application through chat message button with idempotence flagging

### Hook-based integration boundary

Key hooks used as extension boundaries:

- `init`, `ready`
- `preCreateActor`, `preUpdateActor`
- `preCreateItem`, `preUpdateItem`
- `createCombat`, `combatStart`
- `renderChatMessageHTML`
- combat tracker render hooks (`renderCombatTracker`, `renderCombatTrackerConfig`, `renderSidebarTab`, `renderApplication`)

### Configuration surface

- `CONFIG.BECMI.*` for loaded rules data tables.
- Foundry world settings under `becmi-foundry` namespace for debugging, migration versions, and automation settings.

## Approved architecture patterns

1. Public API should be mounted under `game.becmi` only.
2. Hook handlers should delegate to domain modules instead of embedding full business logic inline.
3. Public API additions should be accompanied by tests under `tests/runtime`, `tests/combat`, `tests/exploration`, or relevant domain suites.

## Recommendations (approved direction, non-fact)

- Treat undocumented module-internal exports as private.
- Document new `game.becmi.*` additions in this file during the same change.
