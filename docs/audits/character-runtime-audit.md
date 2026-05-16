# Character Runtime Audit — Basic/Expert Save + Attack Progression

## 1) Executive summary
- Canonical save and THAC0 progression is primarily table-driven through `module/rules/saves.mjs`, `module/rules/thac0.mjs`, and `module/rules/lookups.mjs` using class + level.
- Prior drift risk existed in attack/chat runtime helpers (`module/combat/attack.mjs`, `module/rolls/becmi-rolls.mjs`) that could use permissive/local THAC0 fields instead of canonical progression lookups.
- Runtime has been hardened so attack helper THAC0 now delegates to canonical rule lookup, preserving descending AC behavior and dual initiative support unchanged.

## 2) Save progression findings
- Character save lookup path is canonical: `getActorSaves -> getCharacterSaves -> CONFIG.BECMI.classTables[class].levels[level].saves`.
- Canonical save categories are consistently enforced in derived actor data and sheet display:
  - Death Ray / Poison
  - Magic Wands
  - Paralysis / Turn to Stone
  - Dragon Breath
  - Rod / Staff / Spell
- Creature save runtime uses `savesAs` class+level mapping, with explicit validation and warnings for missing class/level.

## 3) Attack progression findings
- Canonical THAC0 progression is class+level table lookup for characters and HD table lookup for creatures through `module/rules/thac0.mjs`.
- Prior duplicate/permissive path in combat helpers used `actor.system.combat.thac0` directly.
- Hardened path now delegates combat helper THAC0 resolution to canonical rule lookup while preserving fallback defaults only when canonical resolution is unavailable.

## 4) Runtime strictness findings
- Strictness improved by removing direct runtime dependence on mutable/non-canonical THAC0 fields in attack helpers.
- `getTargetAC` continues descending AC assumptions and now prefers canonical `system.ac.value` while retaining compatibility fallback to `system.combat.ac`.
- Initiative runtime intentionally untouched (dual initiative remains intact).

## 5) Remaining drift risks
- `getActorClassId`/`getActorLevel` still allow legacy alternate schema aliases for compatibility; this is pragmatic but can mask schema drift.
- Roll messaging helpers still include legacy weapon-attack flow (`rollWeaponAttack`) tied to `actor.system.attacks` data shape.

## 6) Remaining legacy paths
- Legacy attack roll entry points in `module/rolls/becmi-rolls.mjs` remain available for compatibility, though now backed by canonical THAC0 lookup.
- Creature sheet/editor compatibility fields (`savesAs.class` alias behavior) remain by design.

## 7) Test coverage summary
- Added regression coverage for:
  - save lookup correctness
  - THAC0 progression correctness
  - class progression differences
  - invalid progression edge cases
  - combat helper canonical THAC0 + descending AC behavior

## 8) Recommended cleanup targets
1. Consolidate/retire legacy `actor.system.attacks` roll pathways once item-driven attack actions are the only supported UX.
2. Tighten actor schema ingestion by reducing class/level alias acceptance behind explicit migration gates.
3. Add focused tests for creature `savesAs` invalid-class/invalid-level diagnostics.
