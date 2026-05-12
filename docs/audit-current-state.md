# BECMI Foundry — Current State Audit

Date: 2026-05-12 (UTC)

## Executive Summary

The repository has the **target high-level directories and core rules modules in place**, and JSON syntax is valid across all files under `data/`. However, there are several **data-model mismatches** between rules consumers and the current JSON schema, plus multiple **incomplete/placeholder tables** and **naming inconsistencies** that will break or degrade runtime behavior.

---

## 1) Current folder structure

Current project layout (relevant parts):

- `data/`
  - `classes/` (7 class files)
  - `monsters/` (1 file)
  - `tables/` (5 files, including 2 placeholders)
- `module/`
  - `rules/` (all expected files present)
  - `utils/` (both expected files present)
  - `actors/`, `rolls/`
- `docs/`
- system root: `becmi.mjs`, `system.json`, `template.json`

Status: **Mostly aligned** with intended architecture, but includes extra table placeholders and non-implemented data wiring.

---

## 2) Existing data files under `data/`

Found 13 JSON files:

- `data/classes/cleric.json`
- `data/classes/dwarf.json`
- `data/classes/elf.json`
- `data/classes/fighter.json`
- `data/classes/halfling.json`
- `data/classes/magic-user.json`
- `data/classes/thief.json`
- `data/monsters/monster-progression.json`
- `data/tables/attack-ranks.json` *(empty object)*
- `data/tables/character-thac0.json`
- `data/tables/monster-saves.json` *(entries empty)*
- `data/tables/monster-thac0.json`
- `data/tables/save-categories.json` *(empty object)*

Status: **All present syntactically valid JSON**, but not all functionally complete.

---

## 3) Existing class JSON files

All 7 expected class files exist:

- `fighter.json`, `cleric.json`, `magic-user.json`, `thief.json`, `dwarf.json`, `elf.json`, `halfling.json`

Common schema includes `id`, `name`, `thac0Profile`, `levels`.

Key finding:

- Class `levels` are nested under `.levels` as expected by most rule modules, but one lookup function (`getClassLevelData`) reads `classTable?.[levelKey]` instead of `classTable?.levels?.[levelKey]`, which will cause features relying on this helper to fail.

---

## 4) Existing monster/table JSON files

### Monster
- `data/monsters/monster-progression.json` exists but contains only metadata/links:
  - `id`, `name`, `type`, `uses`
  - **No `hitDice` object**

### Tables
- `character-thac0.json`: populated `entries`
- `monster-thac0.json`: populated `hitDice` brackets
- `monster-saves.json`: `entries` is empty `{}`
- `attack-ranks.json`: empty `{}`
- `save-categories.json`: empty `{}`

Key finding:

- Monster progression validation expects `hitDice`; current file lacks it.
- Monster saves resolver expects usable entries/brackets; current file has none.

---

## 5) Existing `module/rules` files

All expected files are present:

- `index.mjs`, `lookups.mjs`, `thac0.mjs`, `saves.mjs`, `spells.mjs`, `thief-skills.mjs`, `turn-undead.mjs`, `hit-dice.mjs`

Status: **Complete file presence**.

Consistency concerns:

- `lookups.getClassLevelData` path bug (see above).
- `saves.getMonsterSaveEntry` assumes `CONFIG.BECMI.monsterSaves` is directly keyed by HD; actual JSON wraps data under `.entries`.

---

## 6) Existing `module/utils` files

Both expected files are present:

- `rules-data.mjs`
- `validate-rules-data.mjs`

Status: **Present and wired in init flow**.

Key concern:

- `BECMI_RULES_DATA_PATHS.classes` uses `magicUser` key while JSON id is `magic-user`; normalization exists in some places but not all naming is harmonized.

---

## 7) Current system init/ready loading flow

`becmi.mjs` init flow:

1. Initialize `CONFIG.BECMI` buckets.
2. Register actor document class/sheets.
3. Load JSON data via `rules-data.mjs` loaders.
4. Assign loaded data into:
   - `CONFIG.BECMI.classTables`
   - `CONFIG.BECMI.monsterProgression`
   - `CONFIG.BECMI.characterThac0`
   - `CONFIG.BECMI.monsterThac0`
   - `CONFIG.BECMI.monsterSaves`
5. Run validators and log warnings.

`ready` flow:

- Exposes rule API via `game.becmi.rules = becmiRules`.

Status: **Flow exists and is coherent**, but downstream rule helpers currently do not fully match loaded data shapes.

---

## 8) Is `CONFIG.BECMI` being populated correctly?

**Partially yes**:

- Data is fetched and assigned to expected keys.
- Structural mismatch means some keys are populated with data that consumers don’t parse correctly:
  - `monsterSaves` loaded as `{ id, name, entries }`, but save lookup treats top-level as HD map.
  - `monsterProgression` loaded without required `hitDice` payload.

Conclusion: **Population works, effective consumption is partially broken**.

---

## 9) Are rules helper exports consistent?

`module/rules/index.mjs` re-exports all expected rule modules.

Issue is not export presence, but helper behavior consistency:

- `getClassLevelData` inconsistent with class JSON shape.
- Spell/thief/turn-undead helpers depend on `getClassLevelData`, so they are affected.

---

## 10) Any files reference missing imports?

Static check of relative imports in `.mjs/.js` files found:

- **No missing relative import targets**.

Status: **Pass**.

---

## 11) Any invalid JSON files?

JSON parse check under `data/`:

- **13/13 valid JSON syntax**.

Status: **Pass**.

---

## 12) Any duplicate sources of truth?

Yes, potential duplication/conflict exists:

- Class level entries include `thac0: null` while THAC0 is sourced from `character-thac0.json` + profile logic.
- Monster progression file points to `monster-thac0` and `monster-saves` via `uses`, while runtime also directly loads and consults table files; unclear authoritative path.
- Creature data fields appear in alternate names (`hd`/`hitDice`, `thac0` direct on actor vs derived/system variants).

Recommendation: explicitly define canonical authority for each rule domain.

---

## 13) Naming consistency checks

### `magic-user` vs `magicUser`
- Mixed usage exists:
  - JSON class id: `magic-user`
  - loader map key / some internal normalization: `magicUser`
- Current code partly normalizes this, but inconsistency remains risky.

### `monster` vs `npc`
- Rules accept both `monster` and `npc` actor types.
- Creature defaults/use also include `creatureRole` with `monster|retainer|npc`.
- Mostly workable, but semantics are split between actor type and role.

### `hd` vs `hitDice`
- Both are supported in several places via fallback.
- Indicates transitional schema; not fully normalized.

### `thac0` vs `THAC0`
- Code and JSON consistently use lowercase `thac0`.
- No uppercase `THAC0` schema source observed.

---

## 14) Match against intended architecture

### Intended paths check

Expected and present:

- `data/classes/*` ✅
- `data/monsters/monster-progression.json` ✅
- `data/tables/character-thac0.json` ✅
- `data/tables/monster-thac0.json` ✅
- `data/tables/monster-saves.json` ✅
- `module/rules/*` ✅ all listed files present
- `module/utils/rules-data.mjs` ✅
- `module/utils/validate-rules-data.mjs` ✅

### Functional alignment

- File topology matches intended architecture.
- Runtime behavior does **not fully match** intended data-driven architecture yet due to schema/consumer mismatches and incomplete table content.

---

## What exists and is working

- Expected directory/module scaffolding is present.
- Init and ready hooks are in place and load/register systems.
- Rule modules are exported through a centralized index.
- JSON files under `data/` are syntactically valid.
- Relative import graph is intact.

## What is missing

- Monster progression `hitDice` data payload.
- Monster saves table content (`entries` currently empty).
- Clear use/implementation of placeholder tables (`attack-ranks`, `save-categories`) or removal if not needed.

## What is inconsistent

- Class level lookup path bug (`classTable[level]` vs `classTable.levels[level]`).
- Monster saves data model mismatch (`monsterSaves.entries` vs direct top-level bracket lookup).
- Mixed naming: `magic-user`/`magicUser`, `hd`/`hitDice`, and actor `monster|npc` plus `creatureRole` overlay.

## What should be fixed before continuing

1. Fix class level data lookup to use `.levels[levelKey]`.
2. Align monster saves resolver with JSON schema (`monsterSaves.entries`) or adjust JSON shape.
3. Populate `monster-progression.json` with required `hitDice` entries or revise validators/consumers.
4. Populate `monster-saves.json` with usable HD bracket/save data.
5. Define and enforce canonical naming conventions (`magic-user`, `hd`, actor type strategy).
6. Decide whether `thac0` in class levels is deprecated and remove/null-guard accordingly.

## Recommended next implementation order

1. **Schema contract pass**: write explicit JSON schema/interface docs for classes, monster progression, monster saves, thac0 tables.
2. **Core lookup fixes**: repair `getClassLevelData`; repair monster saves bracket lookup path.
3. **Data completion**: fill `monster-progression.json` and `monster-saves.json` with production values.
4. **Normalization pass**: unify naming (`magic-user` canonical, alias mapping only at boundaries).
5. **Validation hardening**: extend validators for table completeness and shape checks.
6. **Runtime assertions/tests**: add smoke tests for representative actors (fighter, thief, magic-user, monster) and derived fields.
7. **Cleanup**: remove/implement placeholder tables to eliminate ambiguous sources of truth.
