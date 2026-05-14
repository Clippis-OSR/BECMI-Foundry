# BECMI Foundry Full System Audit

Date: 2026-05-14

## Executive Summary
- **Architecture direction is mostly coherent**: combat is item-driven, armor/weapon baselines are rule-table driven, and actor sheets are split cleanly by `character` and `creature`.
- **Main gaps are consistency and cleanup**: legacy actor-type branches still exist (`monster`/`npc`), several fallback data paths preserve pre-canonical shapes, and some canonical slot naming still differs from proposed target (`bothHands` vs `weaponMain`/`weaponOffhand` only).
- **Combat and tracker integrations are functional** with support for group/individual initiative, tie-breakers, and morale from tracker controls.
- **Recommended next step before major features**: run a stabilization pass that removes legacy aliases, finalizes canonical item/slot schemas, and enforces strict validation at sheet save time.

---

## 1) Core Architecture Audit

### Actor-driven vs Item-driven vs Rules-driven
- **Actor-driven**: level/xp-derived character progression, saves/thac0 derivation and final `system.derived` caching.
- **Item-driven**: attack sources, equipped state, slots, weapon metadata, ammo linkage checks.
- **Rules-driven**: weapon baselines (`BECMI_WEAPONS`), armor baselines (`BECMI_ARMOR_TYPES`), class/THAC0/save tables in `data/`.
- **Derived data**: actor AC, saves, THAC0, spellcasting flags, thief skills, turn undead summaries.
- **Editable data**: item equipped/slot/notes/identified and actor base fields (xp, class, morale, etc.).

### Actor Types
- Valid document types in `system.json`: `character`, `creature`.
- **Legacy compatibility still present** in actor prepare path (`monster`/`npc` branch), indicating partial migration state.

**Status:** Partially aligned; needs legacy type removal and stricter schema enforcement.

---

## 2) Combat Engine Audit

### Attack Engine
- THAC0 and descending AC flow implemented as `requiredRoll = THAC0 - targetAC` and `hit when total >= requiredRoll`.
- Attack sources are item-driven with actor-type-specific filtering.
- Weapon-to-attack mapping includes weaponType/range/ammo/ammoType/damageTypes.

### Damage Engine
- Damage roll is isolated from HP mutation (`rollDamage`), with optional chat-card-triggered application handled separately.
- Duplicate damage application prevention implemented via chat-message flag checks in damage-application helper.

### Initiative
- Group and individual initiative both supported.
- Tie-breakers implemented for group and individual modes with bounded rerolls.
- Tracker controls inject buttons and route to engine actions.
- Initiative mode picker uses GM dialog workflow.

### Morale
- Creature-only validation enforced.
- Selected-token multi-creature roll support present.
- Tracker button integration present.

### Saving Throws
- Canonical save keys standardized (`deathRayPoison`, `magicWands`, `paralysisTurnStone`, `dragonBreath`, `rodStaffSpell`).
- Save rolls consume actor canonical saves and post chat cards.

**Status:** Strong baseline; keep, then tighten fallback paths and remove non-canonical bonuses from attackData/damageData contracts.

---

## 3) Equipment System Audit

### Ownership split
- **Rules tables** currently own weapon/armor baselines (damage, cost, encumbrance, hands, range, armor AC/bonus).
- **Items** own equipped state, slot, notes, identified, and optional overrides/custom entries.
- **Derived**: actor AC and weapon usability via equip slot and hand restrictions.

**Status:** Good direction. Continue migration of any manual editable rule fields to read-only derived values where possible.

---

## 4) Weapon System Audit

### Current direction check
- Item-driven weapons confirmed.
- Canonical field usage present: `weaponKey`, `weaponType`, `hands`, `damage`, `range`, `ammoType`, `damageTypes`, `equipped`, `slot`.
- Natural attacks supported via `weaponType: natural` and creature source filter.
- Ammo linkage validated at roll time via `hasAvailableAmmo`.

### Cleanup findings
- `attackData.attackBonus` and `attackData.damageBonus` are still accepted by engine helpers as optional modifiers.
- `weaponMasteryClass`/`masteryOverride` path exists, so complete mastery removal has not happened.

**Status:** Close to target; requires explicit policy decision whether bonus/mastery placeholders stay as extension points or are removed now.

---

## 5) Armor System Audit

- Armor type definitions are rule-owned and include descending AC semantics.
- Item sheet shows derived base AC and shield bonus as read-only.
- AC derivation is actor-level via `calculateActorAC` and includes equipped logic.

**Status:** Good alignment with descending AC model.

---

## 6) Equipment Slot Audit

### Implemented slots include
- `armor`, `shield`, `helmet`, `cloak`, `boots`, `gloves`, `ring`, `amulet`, `belt`, `weaponMain`, `weaponOffhand`, `bothHands`, `natural`, `missile`, `weapon`.

### Restriction behavior
- Two-handed weapons block shield/offhand.
- Shields map through offhand occupancy.
- Natural weapons bypass hand occupancy.

**Status:** Functional, but canonical target list and implementation differ (`bothHands`/`weapon` aliases). Standardize now.

---

## 7) Item Sheet Audit

- Weapon sheet is mostly BECMI-focused with dropdown-driven rules and missile-only range/ammo controls.
- Armor sheet is rule-driven and uses derived read-only AC/encumbrance.
- Ammo sheet includes `ammoType`, `quantity`, and stackable/shared quantity support.

**Status:** Good, with remaining generic/non-BECMI shared fields still visible for broad item types.

---

## 8) Rules Tables Audit

- Weapons and armor are centralized in JS rules tables.
- THAC0/saves/classes/monster progression are centralized in `data/` JSON and loaded at init.
- Future categories (mastery/spells/monsters/classes expansion) can use same pattern.

**Status:** Strong foundation.

---

## 9) Derived Data Audit

- Stored: actor/item base authorable fields.
- Calculated: saves/thac0/ac/derived features on actor prep; item autofill from rules in sheet update.
- Cached/rendered: actor `system.derived` and chat-card payloads.

**Risk:** fallback reads from multiple legacy paths in combat helpers can mask schema drift.

---

## 10) Foundry Compatibility Audit

- No immediate v13-blocking patterns found in audited paths.
- Tracker controls use robust multi-hook strategy for current render patterns.

**Open work for v14 readiness:** run a dedicated API deprecation pass across all modules, especially UI/application patterns and roll construction assumptions.

---

## 11) UI/UX Audit

- Character/creature separation exists and combat workflows are discoverable.
- Creature morale workflow is streamlined through tracker button and token-selection logic.
- Combat tracker control injection is resilient and idempotent.

**Status:** Good functional UX; can improve visual density and schema clarity after canonical cleanup.

---

## 12) Final Architecture Decisions (Recommended Lock)

1. **Combat:** fully item-driven attack sources.
2. **Equipment:** slot-driven equip constraints.
3. **Armor:** rule-table driven baseline + derived actor AC only.
4. **Weapons:** rule-table baseline with explicit `custom` override mode.
5. **Monster attacks:** represented as weapon items (`weaponType: natural` for natural attacks).
6. **AC:** fully derived from armor/shield/dex and actor context.
7. **Ammo:** separate item type with `ammoType` linkage.

---

## Priority Cleanup Backlog (Before New Major Systems)

1. Remove legacy actor type branches (`monster`/`npc`) and enforce `character|creature` only.
2. Standardize equipment slot vocabulary and remove alias slots if not canonical.
3. Decide and lock policy for `attackBonus`/`damageBonus`/mastery placeholders.
4. Add schema validators for item/actor canonical fields at create/update boundaries.
5. Add regression tests for descending AC, tie-breakers, morale token filtering, and duplicate damage prevention.
6. Run a Foundry API deprecation sweep for v14 prep.

With these complete, system is safe to proceed with: Weapon Mastery, Spell Engine, Monster Library, Encumbrance hardening, Class restrictions, Treasure generation, XP automation.
