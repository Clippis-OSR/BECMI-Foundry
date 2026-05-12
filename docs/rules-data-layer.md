# BECMI Rules Data Layer

BECMI rules in this system are **table-driven**. Core progression values should come from JSON data tables rather than hardcoded numbers in sheets or actor logic.

## Data locations

- **Class progression tables:** `data/classes/*.json`
  - `fighter.json`, `cleric.json`, `magic-user.json`, `thief.json`, `dwarf.json`, `elf.json`, `halfling.json`
- **Monster progression table:** `data/monsters/monster-progression.json`

## Sheet/runtime usage guidance

Sheets should read **derived values** from loaded rules data (via `CONFIG.BECMI`) instead of hardcoding progression math or fixed tables in UI code. This keeps rules centralized and easier to update.

## Current placeholder status

Many values are intentionally `null` placeholders right now, including progression details such as THAC0, saves, spell slots/known, thief skills, turn undead entries, and monster progression numeric fields.

## Next step

Add shared utility functions that read these tables and return derived values, for example:

- `getTHAC0`
- `getSaves`
- `getSpellSlots`
- `getThiefSkills`

These helpers should become the canonical interface for sheet and actor logic.
