# Canonical Architecture (Current System)

## Scope and status

This document is the canonical reference for the current BECMI Foundry system architecture as implemented in code.

- **Source of truth priority:** runtime implementation (`becmi.mjs`, `module/**`, `template.json`) over prior audits.
- **Audit handling policy:** audit documents under `docs/` and `docs/audits/` are **historical analysis** unless explicitly marked current by a newer canonical architecture update.
- **Fact vs recommendation policy:** sections are split into **Facts (current behavior)** and **Recommendations (approved direction)**.

## Facts (current behavior)

### 1) System boot and registration model

- Foundry loads the system through `becmi.mjs` via `system.json.esmodules`.
- `Hooks.once("init")` initializes the public runtime namespace and core configuration:
  - `game.becmi.combat`, `game.becmi.exploration`, `game.becmi.encounters` are registered.
  - `CONFIG.BECMI` table caches are loaded from JSON-backed rules data.
  - `CONFIG.Actor.documentClass` is set to `BECMIActor`.
- `Hooks.once("ready")` registers additional combat-tracker render hooks, attaches remaining runtime APIs (`game.becmi.rules`, `game.becmi.inventory`, `game.becmi.encumbrance`), and executes migrations.

### 2) Canonical document types and sheets

- Canonical actor types are **`character`** and **`creature`** only.
- Legacy actor types (`monster`, `npc`) are blocked during actor creation and migration startup checks.
- Default sheets:
  - `character` → `BECMICharacterSheet`
  - `creature` → `BECMICreatureSheet`
  - non-spell items → `BECMIItemSheet`
  - spell items → `BECMISpellItemSheet`

### 3) Runtime domain modules

Current architecture is organized by stable runtime domains under `module/`:

- `actors/`: actor document class, sheets, spellcasting normalization/validation, derived-field protection.
- `combat/`: attack, damage, initiative, morale, saves, combat hooks and utilities.
- `exploration/`: movement, time, light, distance, runtime state progression, UI display helpers.
- `items/`: inventory model, slot migration, encumbrance integration, item sheets, spell item subsystem.
- `rules/`: deterministic rules functions (AC, THAC0, saving throws, weapon restrictions, spells, exploration math).
- `monsters/`: monster dataset runtime, validation, compendium/index pipelines.
- `encounters/`: encounter helper runtime surface.
- `utils/`: schema validation and rules-data loaders/validators.

### 4) Validation and migration posture

- Actor and item schema validation runs on `preCreate*` and `preUpdate*` hooks.
- Character spellcasting data is normalized/validated on create/update before persistence.
- Manual writes to protected derived actor fields are stripped in pre-update sanitization.
- Ready-time world migrations are used for:
  - legacy actor type enforcement
  - equipment slot canonicalization (`ringLeft/right` → `ring`)
  - canonical inventory object population under `system.inventory`
  - creature `system.monster` canonical shape population
  - legacy manual derived-field removal
  - save-key canonicalization (`death/wands/paralysis/breath/spells` to canonical keys)

## Approved architecture patterns (for new work)

1. **Hook-driven boundary with explicit phases**
   - `init` for registration and static setup.
   - `ready` for world migrations and UI hook wiring.

2. **Domain-module composition via explicit namespace exports**
   - Expose stable APIs under `game.becmi.<domain>` from domain index modules.

3. **Schema-first write path**
   - Normalize and validate before write operations (`preCreate`, `preUpdate`).

4. **Canonical model + migration adapters**
   - Keep one canonical storage shape; migrate legacy fields via one-time versioned migrations.

5. **Deterministic rules layer separated from UI concerns**
   - Rules/runtimes remain reusable from sheets, chat cards, and tests.

## Recommendations (approved direction, non-fact)

- Prefer additive domain modules over expanding `becmi.mjs` with new business logic.
- Keep public automation surfaces namespaced under `game.becmi` and documented in `api-surface.md`.
- Any new migration should be idempotent and gated by a dedicated world setting version key.
