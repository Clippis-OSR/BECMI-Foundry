# Import/Export Audit — 2026-05-12

Scope audited:
- `**/*.js`
- `**/*.mjs`

Checks performed:
- missing files
- incorrect relative paths
- circular imports
- exported functions never imported
- imported functions that do not exist
- duplicate function names
- `module/rules/index.mjs` re-export coverage
- `module/utils/rules-data.mjs` loading helper export coverage

## Findings

### 1) Missing files / incorrect relative paths
- **No missing local module files found.**
- **No incorrect relative import paths found.**

### 2) Circular imports
- **No circular local import cycles detected.**

### 3) Imported functions that do not exist
- **No confirmed missing imported functions.**
- Spot checks confirm imports in `module/actors/character-sheet.mjs`, `module/actors/creature-sheet.mjs`, and `becmi.mjs` are present in their source modules.

### 4) Exported functions never imported
Potentially unreferenced named exports (repo-local named imports only):
- `module/rules/saves.mjs`: `getCharacterSaves`, `getMonsterSaves`, `getActorSaves`
- `module/rules/thac0.mjs`: `getCharacterTHAC0`, `getMonsterTHAC0`, `getActorTHAC0`
- `module/rules/spells.mjs`: `getSpellcasting`, `getSpellSlots`, `getSpellsKnown`, `actorHasSpellcasting`
- `module/rules/thief-skills.mjs`: `getThiefSkills`, `actorHasThiefSkills`
- `module/rules/turn-undead.mjs`: `getTurnUndead`, `actorHasTurnUndead`
- `module/rules/lookups.mjs`: `getMonsterHDData`
- `module/actors/creature-sheet-v2.mjs`: `BECMICreatureSheetV2`

Note: This check only catches static local named imports. Re-exported APIs and runtime access patterns (e.g., namespace exposure on `game.becmi.rules`) can make exports appear unused even when intended.

### 5) Duplicate function names
- **No duplicate exported function names detected within modules.**

### 6) `module/rules/index.mjs` re-exports all rule helpers
- `module/rules/index.mjs` uses `export *` for:
  - `lookups.mjs`
  - `thac0.mjs`
  - `saves.mjs`
  - `spells.mjs`
  - `thief-skills.mjs`
  - `turn-undead.mjs`
  - `hit-dice.mjs`
- **Result:** rule helper modules are comprehensively re-exported by index.

### 7) `rules-data.mjs` exports all expected loading helpers
In `module/utils/rules-data.mjs`, the following are exported:
- `loadJSON`
- `loadClassData`
- `loadMonsterProgression`
- `loadCharacterTHAC0`
- `loadMonsterTHAC0`
- `loadMonsterSaves`
- plus `BECMI_RULES_DATA_PATHS`

- **Result:** expected loading helpers are present and exported.

## Overall status
- Critical import/export integrity issues: **none found**.
- Main follow-up opportunity: review the potentially unreferenced exports list and confirm which are intentional public API surface.
