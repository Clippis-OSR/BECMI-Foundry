# BECMI Action/Effect Library Design (Future Architecture)

## Purpose

This document defines the **target reusable architecture** for actions and effects in BECMI Foundry.

It is a design document only. No automation behavior, sheet behavior, or runtime rules execution is changed by this file.

## Core design goal

Spells, magic item powers, monster special abilities, and class abilities should all eventually be represented by the **same reusable action/effect model**.

Instead of each domain inventing separate rule shapes, all ability-like mechanics should compose from shared effect building blocks.

---

## Unified action/effect model

### Action layer (what can be used)

Reusable item records should represent things actors can trigger. Planned reusable item types:

- `spell`
- `power`
- `monsterAbility`
- `itemPower`

Each action item can include one or more effects and metadata such as casting time, school, or usage constraints.

### Effect layer (what the action does)

Effects are the reusable mechanical payload. Effects should support:

- damage formulas
- healing formulas
- saving throws
- targeting
- range
- duration
- area of effect
- scaling by caster level
- scaling by hit dice
- conditions/statuses
- chat card output
- future automation hooks

An action can carry multiple effects (e.g., damage + save + condition), and the same effect structure should work for spells, monster abilities, item powers, and class powers.

---

## Actor spell tracking model (future state)

Actor spellcasting data should be normalized into distinct concerns:

1. **Spell slots**
   - Derived from class/level progression tables.
   - Not a copy of spell rules.

2. **Spells known**
   - Actor-owned references to reusable spell/action items.
   - Stores pointer metadata, not full embedded spell mechanics.

3. **Prepared/memorized spells** (future separate state)
   - Separate preparation state that refers to known spell references.
   - Keeps preparation bookkeeping independent from spell definitions.

4. **Cast/used spells** (future resource tracking)
   - Separate usage/resource ledger for expended uses.
   - Keeps temporal usage state independent from known/prepared data.

This separation avoids mixing permanent capability, daily prep, and per-encounter/per-day consumption in one structure.

---

## Why actor data should store references (not full duplicated spell rules)

Known spell entries on actors should store lightweight references:

- `itemUuid`
- `source`
- copied `name`
- `level`

instead of duplicating entire spell/action rule payloads.

### Benefits

1. **Single source of truth**
   - Spell/action rules live in one reusable item record.
   - Fixes or updates happen once and are inherited everywhere that references them.

2. **Smaller actor payloads**
   - Actors store compact pointers instead of full rule blobs.
   - Reduces actor document bloat and migration complexity.

3. **Cleaner migrations/versioning**
   - Rule schema migrations happen primarily on reusable items/effects.
   - Actor known lists remain stable across rule evolution.

4. **Content sharing and deduplication**
   - Multiple actors can know the same spell without duplicating data.
   - Supports pack/world content reuse consistently.

5. **Separation of concerns**
   - Actor state stores ownership/knowledge context.
   - Action/effect items store canonical mechanics.

6. **Future automation compatibility**
   - Automation hooks can resolve from a canonical effect schema.
   - Actor-level references remain implementation-agnostic.

---

## Example JSON shapes (illustrative, non-final)

> These examples are conceptual schemas for planning and discussion. Field names may change during implementation.

### 1) Spell item

```json
{
  "type": "spell",
  "name": "Magic Missile",
  "system": {
    "level": 1,
    "school": "evocation",
    "range": { "type": "distance", "value": "150'" },
    "duration": { "type": "instant" },
    "targeting": { "type": "creature", "count": 1 },
    "effects": [
      {
        "id": "mm-damage",
        "kind": "damage",
        "formula": "1d4+1",
        "damageType": "force",
        "scaling": {
          "byCasterLevel": {
            "step": 5,
            "addTargetCount": 1,
            "maxTargets": 5
          }
        },
        "chat": {
          "template": "default",
          "showFormula": true
        },
        "automation": {
          "hook": null,
          "flags": {}
        }
      }
    ]
  }
}
```

### 2) Known spell reference (actor-owned)

```json
{
  "itemUuid": "Compendium.becmi.spells.Item.ABC123",
  "source": "compendium",
  "name": "Magic Missile",
  "level": 1
}
```

### 3) Reusable damage effect

```json
{
  "id": "effect-fireball-damage",
  "kind": "damage",
  "formula": "1d6",
  "damageType": "fire",
  "targeting": {
    "type": "area",
    "area": { "shape": "sphere", "size": "20' radius" }
  },
  "savingThrow": {
    "type": "save",
    "ability": "dex",
    "onSuccess": "half"
  },
  "scaling": {
    "byCasterLevel": {
      "mode": "addDice",
      "dicePerLevel": "1d6",
      "maxDice": 10
    },
    "byHitDice": null
  },
  "duration": { "type": "instant" },
  "chat": {
    "template": "default",
    "showSavePrompt": true
  },
  "automation": {
    "hook": "effects.damage.apply",
    "flags": {
      "allowResistances": true
    }
  }
}
```

### 4) Monster ability using the same effect model

```json
{
  "type": "monsterAbility",
  "name": "Poison Breath",
  "system": {
    "activation": { "type": "action", "cost": 1 },
    "range": { "type": "distance", "value": "30' cone" },
    "effects": [
      {
        "id": "poison-breath-damage",
        "kind": "damage",
        "formula": "3d6",
        "damageType": "poison",
        "savingThrow": {
          "type": "save",
          "ability": "con",
          "onSuccess": "half"
        },
        "scaling": {
          "byHitDice": {
            "mode": "step",
            "stepHd": 4,
            "addDice": "1d6"
          },
          "byCasterLevel": null
        },
        "conditions": [
          {
            "status": "poisoned",
            "onFailedSave": true,
            "duration": { "type": "rounds", "value": 10 }
          }
        ],
        "chat": {
          "template": "monsterAbility",
          "showSavePrompt": true
        },
        "automation": {
          "hook": null,
          "flags": {}
        }
      }
    ]
  }
}
```

---

## Non-goals (for this phase)

- No implementation of automation resolution.
- No migration of existing item or actor data yet.
- No sheet UI changes.
- No runtime behavior changes.

This document is a planning artifact for future incremental implementation.
