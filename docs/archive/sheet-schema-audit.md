# ARCHIVED DOCUMENT

This document reflects repository state at the time it was written.
It is no longer a canonical source of truth.
See:
- /docs/architecture/canonical-architecture.md
- /docs/audits/current-system-audit.md

# Sheet Schema Audit

Date: 2026-05-12

Scope audited:
1. `templates/actor/character-sheet.hbs`
2. `templates/actor/creature-sheet.hbs`
3. `module/actors/character-sheet.mjs`
4. `module/actors/creature-sheet.mjs`
5. `template.json` actor schemas

## Method

- Collected every `name="system..."` binding in both sheet templates (render/edit surface).
- Reviewed sheet classes for manual `actor.update()` paths and non-form mutation behavior (e.g., attacks arrays, fallback path handling).
- Compared sheet-bound paths against current intended schema paths supplied in request.
- Cross-checked presence/shape in `template.json`.

---

## Character sheet findings

### A) Intended manual/source fields vs current sheet

| Intended field | Present on sheet? | Current bound path(s) | Status |
|---|---|---|---|
| `system.class` | ❌ | Uses `system.details.class` | **Old path mismatch** |
| `system.level` | ❌ | Uses `system.details.level` | **Old path mismatch** |
| `system.experience` | ❌ | Uses `system.details.xp` | **Old path mismatch** |
| `system.abilities.*` | ✅ | `system.abilities.[str/int/wis/dex/con/cha].value` + `.mod` | Present (includes editable mods) |
| `system.hitPoints.*` | ❌ | Uses `system.hp.value/max/wounds` | **Old path mismatch** |
| `system.armorClass` | ❌ | Uses `system.combat.ac` | **Old path mismatch** |
| `system.attacks` | ✅ | `system.attacks` via JS-managed array editors | Present |
| `system.weapons` / `system.weaponMastery` | ✅ (weaponMastery) | `system.weaponMastery.*` | Present |
| `system.inventory / treasure / coins` | Partial | `system.treasure`, `system.coinage.*`; no `system.inventory` | **Coins path differs (`coinage` vs `coins`), no inventory field** |
| `system.notes` | ❌ | Uses `system.specialAbilities` (and other text blocks) | **No canonical notes field** |

### B) Intended derived/read-only fields vs current sheet

| Intended derived field | Displayed? | Editable? | Notes |
|---|---|---|---|
| `system.derived.thac0` | ✅ | ❌ | Also has editable `system.combat.thac0` (duplicate/conflict) |
| `system.derived.saves.*` | ✅ | ❌ | Displayed twice (Saving Throws + Debug block) |
| `system.derived.spellSlots` | ✅ (conditional) | ❌ | Display only |
| `system.derived.spellsKnown` | ❌ | n/a | Missing display |
| `system.derived.thiefSkills` | ✅ (conditional) | ❌ | But base thief skills are editable at non-derived path |
| `system.derived.turnUndead` | ✅ (conditional) | ❌ | But full `system.turnUndead.*` table is editable |

### C) Obsolete/legacy fields still displayed or edited (character)

- `system.details.class`, `system.details.level`, `system.details.xp`.
- `system.combat.ac`, `system.combat.thac0`, `system.combat.initiative`, `system.combat.wrestlingRating`.
- `system.hp.*` instead of `system.hitPoints.*`.
- Editable non-derived saves/thac0-era structures still in schema (`system.saves`, `system.combat.thac0`) while sheet rolls/displays from derived saves.

### D) Editable fields that likely should be derived/read-only (character)

- `system.combat.thac0` is editable while derived THAC0 is shown.
- `system.thiefSkills.*` editable while `system.derived.thiefSkills` exists.
- `system.turnUndead.*` editable while `system.derived.turnUndead` exists.

### E) Duplicate displays (character)

- Saving throws are shown in:
  1) “Saving Throws” section, and
  2) “Temporary / Debug Derived Data” section.
- THAC0 shown in:
  1) editable `system.combat.thac0`, and
  2) derived display `system.derived.thac0`.

### F) Sheet↔template.json mismatches (character)

- **Path mismatches to intended schema:** class/level/xp/ac/hp all use old namespaces.
- **Spells slots shape mismatch:** template iterates `system.spells.*.slots` as objects with `.max/.used`, but `template.json` initializes slots as numbers (`"1": 0`, etc.).
- **General skills shape mismatch:** template expects array of skill objects (`{{#each system.generalSkills ...}}`), but `template.json` initializes `generalSkills` as a string.

### G) Missing fields needed by intended rules engine (character)

- Missing canonical editable paths: `system.class`, `system.level`, `system.experience`, `system.armorClass`, `system.hitPoints.*`, and likely `system.notes`.
- `system.derived.spellsKnown` is not surfaced.
- No explicit `system.inventory` field/binding (only container/coinage/treasure custom structures).

---

## Creature sheet findings

### A) Intended manual/source fields vs current sheet

| Intended field | Present on sheet? | Current bound path(s) | Status |
|---|---|---|---|
| `system.hd` or `system.hitDice` | ✅ (`hd`) | `system.hd` | Present |
| `system.savesAs.class` | ✅ | `system.savesAs.class` | Present |
| `system.savesAs.level` | ✅ | `system.savesAs.level` | Present (value sourced from `savesAs.level` context) |
| `system.armorClass` | ❌ | Uses `system.ac` | **Old path mismatch** |
| `system.hitPoints.*` | ❌ | Uses `system.hp.value/max` | **Old path mismatch** |
| `system.attacks` | ✅ | JS-managed `system.attacks` array | Present |
| `system.morale` | ✅ | `system.morale` | Present |
| `system.movement` | ✅ | `system.movement` | Present |
| `system.notes` | ❌ | Uses `system.specialNotes` | **Non-canonical notes path** |

### B) Intended derived/read-only fields vs current sheet

| Intended derived field | Displayed? | Editable? | Notes |
|---|---|---|---|
| `system.derived.thac0` | ✅ | ❌ | Also has editable `system.thac0` (duplicate/conflict) |
| `system.derived.saves.*` | ✅ | ❌ | Display-only |
| `system.derived.hitDice` | ✅ | ❌ | Display-only |
| `system.derived.savesAs` | ✅ | ❌ | Display-only summary |

### C) Obsolete/legacy fields still displayed or edited (creature)

- `system.ac` instead of intended `system.armorClass`.
- `system.hp.*` instead of intended `system.hitPoints.*`.
- Editable `system.thac0` despite derived THAC0 model.
- `getData` includes compatibility fallback: `system.savesAs ?? system.saveAs` (old singular path support).

### D) Editable fields that likely should be derived/read-only (creature)

- `system.thac0` is editable while derived THAC0 is displayed.

### E) Duplicate save/THAC0 displays (creature)

- THAC0 duplicated as editable source (`system.thac0`) plus derived display (`system.derived.thac0`).
- Saves only shown once (derived debug block), no second duplicate block detected.

### F) Sheet↔template.json mismatches (creature)

- Intended path mismatches: armor class and hit points namespaces differ from intended schema.
- Notes path mismatch: `specialNotes` vs intended `notes`.

### G) Missing fields needed by intended rules engine (creature)

- Missing canonical editable paths: `system.armorClass`, `system.hitPoints.*`, `system.notes`.

---

## Consolidated flagged issues

### Obsolete fields still displayed/edited

- Character: `system.details.*`, `system.combat.*`, `system.hp.*`.
- Creature: `system.ac`, `system.hp.*`, `system.thac0`.

### Editable fields that should now be derived/read-only

- Character: `system.combat.thac0`.
- Creature: `system.thac0`.
- (Potentially) Character `system.thiefSkills.*` and `system.turnUndead.*` if derivation is authoritative in current rules model.

### Fields bound to old paths

- Character: class/level/xp/ac/hp all old namespaces.
- Creature: ac/hp old namespaces.
- Notes fields use legacy/custom names (`specialAbilities`, `specialNotes`) rather than canonical `notes`.

### Duplicate save/THAC0 displays

- Character: duplicated saves and THAC0 presentation.
- Creature: duplicated THAC0 source+derived.

### Sheet vs `template.json` mismatches

- Character spells slot object-vs-number mismatch.
- Character generalSkills array-vs-string mismatch.
- Multiple intended canonical path mismatches on both actor types.

### Missing fields for intended rules engine

- Character canonical fields absent: `system.class`, `system.level`, `system.experience`, `system.armorClass`, `system.hitPoints.*`, `system.notes`, plus display gap for `system.derived.spellsKnown`.
- Creature canonical fields absent: `system.armorClass`, `system.hitPoints.*`, `system.notes`.

---

## Raw sheet-bound editable paths inventory (for migration planning)

### Character sheet editable bindings

- `system.details.class`
- `system.details.level`
- `system.details.xp`
- `system.details.alignment`
- `system.abilities.{str,int,wis,dex,con,cha}.{value,mod}`
- `system.languages`
- `system.specialAbilities`
- `system.combat.ac`
- `system.combat.thac0`
- `system.combat.initiative`
- `system.combat.wrestlingRating`
- `system.hp.value`
- `system.hp.max`
- `system.hp.wounds`
- `system.weaponMastery.*`
- `system.generalSkills.*` (template expects array entries)
- `system.thiefSkills.*`
- `system.coinage.carried.*`
- `system.coinage.hoard.*`
- `system.treasure`
- `system.encumbrance.*`
- `system.containers.{beltPouch,worn,backpack,sack1,sack2}.{items,enc}`
- `system.spells.magicUser.slots.*.{max,used}`
- `system.spells.magicUser.known.*`
- `system.spells.elf.slots.*.{max,used}`
- `system.spells.elf.known.*`
- `system.spells.cleric.slots.*.{max,used}`
- `system.turnUndead.*`
- `system.attacks` via JS controls (`name`, `attackMod`, `damage`, `damageMod`)

### Creature sheet editable bindings

- `system.creatureRole`
- `system.hd`
- `system.hp.value`
- `system.hp.max`
- `system.ac`
- `system.thac0`
- `system.morale`
- `system.movement`
- `system.alignment`
- `system.xp`
- `system.treasureType`
- `system.numberAppearing`
- `system.specialNotes`
- `system.savesAs.class`
- `system.savesAs.level`
- `system.attacks` via JS controls (`name`, `attackBonus`, `damage`)


---

## 2026-05-12 Post-cleanup static verification

Scope verified:
- `templates/actor/character-sheet.hbs`
- `templates/actor/creature-sheet.hbs`

### Verification checklist

1. **Character sheet no longer displays manual save inputs** — **PASS**
   - No `name="system.saves.*"`, `system.savingThrows.*`, or `system.save.*` bindings found in character template.
   - Main save rows are display-only `<span>` values.

2. **Character main saves match `system.derived.saves`** — **PASS**
   - Death/Wands/Paralysis/Breath/Spells are bound to:
     - `system.derived.saves.death`
     - `system.derived.saves.wands`
     - `system.derived.saves.paralysis`
     - `system.derived.saves.breath`
     - `system.derived.saves.spells`

3. **Creature main saves match `system.derived.saves`** — **PASS**
   - Creature “Saving Throws” section uses display-only bindings to the same `system.derived.saves.*` paths.

4. **Character THAC0 display uses `system.derived.thac0`** — **PASS**
   - Main THAC0 row is `<span>{{system.derived.thac0}}</span>`.

5. **Creature THAC0 display uses `system.derived.thac0`** — **PASS**
   - Main THAC0 row is `<span>{{system.derived.thac0}}</span>`.

6. **Class and level are still editable on character sheet** — **PASS**
   - Editable inputs remain for:
     - `name="system.class"`
     - `name="system.level"`

7. **Creature HD and savesAs are still editable** — **PASS**
   - Editable controls remain for:
     - `name="system.hd"`
     - `name="system.savesAs.class"`
     - `name="system.savesAs.level"`

8. **No template references broken paths** — **PASS (static best-effort)**
   - No obviously stale manual save/THAC0 bindings remain in audited templates.
   - Existing non-save legacy paths (e.g., `system.details.xp`, `system.combat.ac`, `system.hp.*`) are still internally consistent with current templates and were intentionally left untouched in this cleanup scope.

9. **No Handlebars errors likely from missing derived objects** — **PASS (low risk)**
   - Paths are simple property lookups; Handlebars will typically render blank for missing nested values rather than throw.
   - Conditional guards are present for major derived sections (`hasSpellcasting`, `hasThiefSkills`, `hasTurnUndead`).

10. **Temporary debug section can remain but does not duplicate stale data** — **PASS**
    - Creature debug section duplicates derived save/THAC0 values only (no stale manual save/thac0 source fields).

### Commands used

- `rg -n "name=\"system\.(saves|savingThrows|save)\.|system\.derived\.saves|system\.derived\.thac0|name=\"system\.class\"|name=\"system\.level\"|name=\"system\.hd\"|name=\"system\.savesAs\.(class|level)\"|system\.details\.class|system\.details\.level|system\.thac0|system\.combat\.thac0" templates/actor/character-sheet.hbs templates/actor/creature-sheet.hbs`
- `sed -n '1,240p' templates/actor/character-sheet.hbs`
- `sed -n '1,180p' templates/actor/creature-sheet.hbs`

