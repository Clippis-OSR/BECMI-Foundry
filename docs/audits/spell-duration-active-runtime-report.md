# Spell Duration & Active Runtime Report

## Architecture
- Introduced `module/spells/active-spell-runtime.js` as a canonical runtime-state layer for active spell instances.
- Runtime entries are serializable POJOs with explicit lifecycle fields and version marker (`version: 1`).
- Canonical spell definitions remain untouched; runtime instances are derived from normalized spell runtime data.

## Lifecycle Model
- Explicit transitions: `active`, `suppressed`, `expired`, `dismissed`, `dispelled`.
- Lifecycle helper API:
  - `createActiveSpellRuntime`
  - `advanceSpellDurations`
  - `expireActiveSpell`
  - `dismissActiveSpell`
  - `suppressActiveSpell`
  - `restoreSuppressedSpell`
  - `dispelActiveSpell`
  - `removeActiveSpell`

## Duration Philosophy (BECMI-first)
- Turn/round/hour/day progress is phase-based and manually advanced.
- No hidden timers, no real-time countdowns.
- `special` and `permanent` durations are not auto-expired.
- Retroactive and manual correction workflows are supported by direct runtime editing and explicit transition helpers.

## Manual-First Adjudication Policy
- Runtime tracking is informational and stateful, but not auto-resolving.
- No automatic condition application, no direct actor-stat mutation, no automatic combat resolution.
- GM authority is preserved through explicit state transition methods and editable runtime state.

## Dispel / Suppression Handling
- Dispel and suppression are distinct states.
- Suppressed effects may be restored to active.
- Dispelled effects remain visible as historical runtime records unless manually removed.

## Intentional Non-Automations
- No 5e-style Active Effects framework.
- No auto-hit / auto-save / auto-condition workflows.
- No automatic target mutation or action economy enforcement.

## Extension Hooks
- Versioned runtime envelope supports future migrations.
- State model supports world/scene/entity attachment metadata for dominion-scale and planar effects.
- Current summaries support actor-sheet visibility while keeping rule outcomes table-driven.

## Future Compatibility Notes
- Model is ready for:
  - domain/world enchantment tracking,
  - weather-scale effects,
  - planar and gate persistence states,
  - artifact and immortal-power persistence overlays.
