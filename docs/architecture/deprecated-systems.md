# Deprecated Systems and Legacy Surfaces

## Policy status

This file lists legacy/deprecated surfaces that must **not** be used for new development.

- These entries are based on **current implementation behavior** and migration enforcement.
- Prior audits are historical context and are not canonical requirements unless explicitly marked current by architecture docs in this directory.

## Deprecated / forbidden for new development

### 1) Legacy actor types

- `monster`
- `npc`

Status:
- Creation is blocked and migration checks enforce replacement with canonical `creature`.

### 2) Legacy save keys on actors

Deprecated keys:
- `system.saves.death`
- `system.saves.wands`
- `system.saves.paralysis`
- `system.saves.breath`
- `system.saves.spells`

Use instead:
- `deathRayPoison`, `magicWands`, `paralysisTurnStone`, `dragonBreath`, `rodStaffSpell`

### 3) Legacy equipment slot fields

Deprecated fields:
- `system.equipmentSlots.ringLeft`
- `system.equipmentSlots.ringRight`

Use instead:
- `system.equipmentSlots.ring`

### 4) Non-canonical inventory field usage

Do not introduce new logic that relies on legacy ad-hoc fields (`system.containerId`, `system.quantity`, `system.weight`, etc.) as primary storage.

Use canonical structure:
- `system.inventory.*`

### 5) Manual derived actor writes

Do not write protected derived actor values directly in updates.

Reason:
- Runtime sanitization strips protected derived updates before persistence.

### 6) Legacy actor attack payload as active combat input

Deprecated field usage:
- `actor.system.attacks` as authoritative attack-action source.

Use instead:
- Item-driven attack actions and canonical combat validation paths.

### 7) Deprecated exploration wrapper modules

Deprecated import/use:
- `module/exploration/exploration-state.mjs`
- Deprecated exploration helper wrappers where runtime/summary APIs already exist.

Use instead:
- `module/exploration/runtime.mjs` and canonical domain exports.

### 8) Legacy monster builder/import compatibility path

Deprecated import/use for new development:
- `module/utils/monster-builder.mjs`

Use instead:
- Canonical monster runtime/import path under `module/monsters/*`.

## Legacy files/documents treatment

- Existing audit files in `docs/` and `docs/audits/` are retained for historical traceability.
- They must not be treated as canonical architectural truth for new implementation decisions unless explicitly referenced by updated architecture documents in this folder.

## Recommendations (approved direction, non-fact)

- When replacing legacy usage, include migration-safe adapters instead of hard breaks where possible.
- Add/extend regression tests for each removed legacy path.
