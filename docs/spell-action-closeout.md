# Spell/Action Architecture Closeout Audit

Date: 2026-05-13
Scope: current repository state only (no runtime UI execution)

## Checklist Results

### 1) Spell item type exists
**Status:** Complete.

- `template.json` includes `"spell"` in `Item.types`.
- `template.json` defines an explicit `Item.spell` schema with spell fields (`level`, `tradition`, `targeting`, `save`, `effects`, `description`) and an `actions` array.

### 2) Spell item sheet works
**Status:** Mostly complete, with one placeholder-level limitation.

- `module/items/spell-sheet.mjs` provides a dedicated `BECMISpellItemSheet` and routes to `templates/item/spell-sheet.hbs`.
- The sheet supports editing normal spell fields and safely parses/stores `system.effects` from JSON input.
- Validation exists for malformed/non-array effects JSON.
- **Placeholder/limitation:** effects editing is raw JSON text area, not structured UI controls.

### 3) Character `spellsKnown` stores structured references
**Status:** Complete.

- Character sheet normalizes known spell entries into structured objects (`id`, `name`, `level`, `type`, `source`, `itemUuid`, `prepared`, `notes`).
- Drag/drop and manual add both write only lightweight metadata/reference fields to `system.spellsKnown`.
- Template fields for `system.spellsKnown` persist those reference attributes, not full effect payloads.

### 4) Drag spell item to character works
**Status:** Implemented in code path, currently blocked by tab-key mismatch.

- `BECMICharacterSheet._onDrop` correctly detects dropped spell items and calls `_addKnownSpellFromItem`.
- But it only accepts drop targets inside `.tab[data-tab="spells"]`.
- The character sheet spell section is rendered in `.tab[data-tab="magic"]`.
- Result: intended spell-tab drop behavior appears non-functional until selector mismatch is reconciled.

### 5) Item `system.actions` exists
**Status:** Complete.

- `template.json` defines `actions: []` for weapon/armor/equipment/treasure/spell item schemas.

### 6) Drag spell item to item action works
**Status:** Complete (base behavior present).

- `module/items/item-sheet.mjs` intercepts dropped `Item` data.
- For dropped `spell` items, it appends a lightweight action reference into `system.actions` and updates the item.

### 7) No full spell effect data duplicated into actor `spellsKnown` or item `actions`
**Status:** Complete.

- Actor known spell entries include pointer/metadata fields and do not copy `system.effects`, `save`, `targeting`, etc.
- Item action entries include pointer/metadata (`id`, `name`, `type`, `source`, `itemUuid`, `uses`, `notes`) and do not embed full spell rules/effects.

### 8) `spellSlots` remain derived from class data
**Status:** Complete.

- `BECMIActor._prepareCharacterDerivedData` computes `system.derived.spellSlots` from class `levelData.spellcasting.slots`.
- Character sheet displays spell slots from derived data (`derived.spellSlots`), not actor-owned mutable slot state.

### 9) `spellsKnown` remain actor-owned references
**Status:** Complete.

- Character sheet read/write path uses `system.spellsKnown` for actor-owned references.
- This is separate from derived class spellcasting data.

### 10) Item actions remain item-owned references
**Status:** Complete.

- Item sheet `_onDrop` writes to `this.item.update({ "system.actions": actions })`.
- Action records are stored on the owning item and reference dropped spells by UUID/metadata.

---

## What Is Complete

- Canonical `spell` item type and schema.
- Dedicated spell item sheet with persistence and JSON validation.
- Reference-based actor `spellsKnown` model.
- Reference-based item `system.actions` model.
- Spell-to-item action drag/drop storage path.
- Clear non-duplication of full spell effect payloads in actor/item reference arrays.
- Derived spell slot calculation/display sourced from class level data.

## What Is Still Placeholder

- Character spell-drop UI integration has a selector mismatch (`spells` vs `magic` tab key), so the implementation exists but is effectively blocked in likely use.
- Spell effects editor UX is raw JSON (functional but low-level).
- No evidence of action execution/resolution pipeline consuming `system.actions` references yet (storage is present; execution may be future work).

## What Can Safely Be Postponed

- Structured (non-JSON) spell effect builder UI.
- Rich compendium browsing/linking UX beyond current drag/drop.
- Advanced action execution automation (damage/save/effect orchestration), as long as reference schema stays stable.
- Additional spell list quality-of-life features (sorting/filtering/search in known spells).

## Recommended Next Feature Area

1. **Fix character spell-drop tab targeting immediately** (low-risk, high unblock): align `_onDrop` selector with actual spell tab key.
2. **Implement action resolution layer against references**: consume `item.system.actions[*].itemUuid` (or id fallback), resolve spell item at runtime, then execute effect pipeline from canonical spell definition.
3. **Add guardrails/tests for reference-only integrity**: ensure no future regression embeds full spell payloads into `spellsKnown` or `actions`.
4. **Optional UX follow-up**: replace raw JSON effects editing with structured controls once execution semantics are finalized.
