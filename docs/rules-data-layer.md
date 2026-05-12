# BECMI Rules Data Layer

BECMI rules in this system are **table-driven**. Core progression values should come from JSON data tables rather than hardcoded numbers in sheets or actor logic.

## Data locations

- **Class progression tables:** `data/classes/*.json`
  - `fighter.json`, `cleric.json`, `magic-user.json`, `thief.json`, `dwarf.json`, `elf.json`, `halfling.json`
- **Monster progression table:** `data/monsters/monster-progression.json`

## Runtime architecture (source -> rules helpers -> actor derived data)

1. **Source data:** class and monster JSON tables are the canonical rules source.
   - Classes: `data/classes/*.json`
   - Monsters: `data/monsters/monster-progression.json`
2. **Rules helper layer:** modules in `module/rules/` read those tables through lookup utilities and expose rule-focused helper functions (THAC0, saves, spellcasting, thief skills, turn undead, etc.).
3. **Actor derived-data layer:** `BECMIActor.prepareDerivedData()` in `module/actors/becmi-actor.mjs` calls rules helpers and writes computed values into `system.derived`.
4. **Sheet display layer:** actor sheets should display `system.derived` values and avoid calculating rule outcomes directly in templates or sheet UI code.

This separation keeps tables authoritative, calculations centralized, and presentation simple.

## Editable vs. derived actor data

The following should remain manually editable actor data (not overwritten as derived calculations):

- current HP
- wounds
- used/current spell resources
- inventory/equipment
- treasure/currency
- freeform notes/special notes

## Current placeholder status

Many values are intentionally `null` placeholders right now, including progression details such as THAC0, saves, spell slots/known, thief skills, turn undead entries, and monster progression numeric fields.

## Current implementation direction

Use `module/rules` helpers as the canonical rules interface and keep all computed results under `system.derived`, with sheets acting as consumers of those derived fields.

## TODO: class XP progression tables

- TODO: Populate exact BECMI XP thresholds for levels 2+ in:
  - `data/classes/fighter.json`
  - `data/classes/cleric.json`
  - `data/classes/magic-user.json`
  - `data/classes/thief.json`
  - `data/classes/dwarf.json`
  - `data/classes/elf.json`
  - `data/classes/halfling.json`
- Current state: levels 2-36 are present with `"xp": null` placeholders because exact per-level source tables were not found in this repository.
