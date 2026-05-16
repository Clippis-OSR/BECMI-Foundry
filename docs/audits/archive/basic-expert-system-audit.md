# ARCHIVED DOCUMENT

This document reflects repository state at the time it was written.
It is no longer a canonical source of truth.
See:
- /docs/architecture/canonical-architecture.md
- /docs/audits/current-system-audit.md

# Basic/Expert System Audit

**Date:** 2026-05-15  
**Scope:** Full Basic/Expert project audit (no runtime fixes applied)  
**Canonical source of truth:** `docs/rules/basic-expert-reference.md`

---

## 1) Executive Summary

The system has a strong canonical foundation (descending AC runtime, race-as-class datasets, table-driven THAC0/saves, spell schema + spellcasting architecture, exploration runtime modules, and compendium/import scaffolding), but it is **not yet fully Basic/Expert-complete** as a rules engine.

Most significant blockers are:
- initiative runtime still supports/uses **individual initiative mode** in addition to canonical side initiative,
- several canonical exploration/wilderness procedures are only partially expressed,
- some gameplay domains are present architecturally but not fully enforced in runtime/UI (ammo constraints, natural weapon canonicalization, thief/turn undead UX coupling, class weapon restrictions).

Status assessment: **partial compliance with clear path to full Basic/Expert compliance**.

---

## 2) Current Project Status

- **Core architecture:** Modular and test-backed (`module/rules`, `module/combat`, `module/exploration`, `module/items`, `module/spells`, `module/monsters`).
- **Canonical data model direction:** Strong templates + validators + migrations; spell and actor spellcasting pipelines are notably mature.
- **Rules correctness:** Mixed; major canonical pillars are in place, but some runtime behaviors remain permissive or dual-mode.
- **Regression posture:** Good baseline coverage in multiple domains; still uneven against the canonical minimum matrix in the reference.

---

## 3) Rules Compliance Matrix

| Domain | Status | Notes |
|---|---|---|
| Actor schemas | Partial | Canonical actor types and migration/validation present; some derived fields still runtime-fragmented. |
| Item schemas | Partial | Canonical item types largely present; some cross-domain enforcement remains soft. |
| Character classes | Partial | Basic/Expert class data exists; runtime class-feature enforcement inconsistent. |
| XP/level progression | Partial | Tables/data present; full deterministic end-to-end leveling flow not fully evidenced. |
| Saving throws | Partial | Canonical save categories/tables exist; runtime/UI integration appears incomplete in breadth. |
| Attack progression | Partial | THAC0 tables exist; integration across all actor/item attack contexts requires tightening. |
| Armor class handling | Mostly complete | Descending AC runtime is explicit and correct directionally. |
| Combat runtime | Partial | Canonical pieces present, but individual initiative mode conflicts with strict side-initiative canon. |
| Weapons & ammunition | Partial | Ammo module exists; strict launcher/ammo compatibility + depletion enforcement appears incomplete. |
| Inventory & encumbrance | Partial | Strong architecture; needs stricter canonical carried-vs-stored enforcement everywhere. |
| Movement | Partial | Conversion contracts exist; canonical single-source movement usage needs stronger global enforcement. |
| Exploration runtime | Partial | Runtime exists and unified module direction is good; turn procedure completeness still partial. |
| Wilderness procedures | Missing/Partial | Core formulas exist but full wilderness procedure loop appears incomplete. |
| Light/time tracking | Partial | Turn-based light ticking exists; broader temporal hooks/procedures still partial. |
| Spell data architecture | Mostly complete | Schema + importer/compendium/reference stack is robust. |
| Spell slots/known/prepared | Mostly complete | Canonical actor spellcasting architecture implemented with validation/migration. |
| Cleric Turn Undead | Partial | Rules module present; full actor workflow + UI/runtime coupling appears incomplete. |
| Thief skills | Partial | Rules module and progression data present; complete runtime UX/testing coverage appears limited. |
| Monster architecture | Partial | Import/data/runtime modules exist; natural-weapon canonicalization is not fully enforced. |
| Compendium/import pipelines | Partial | Monsters/spells have infrastructure; completeness/consistency across all canonical categories pending. |
| Migrations | Mostly complete | Significant migration scaffolding present and active. |
| Tests | Partial | Good baseline suites; canonical minimum matrix still not fully met (wilderness, thief breadth, etc.). |
| Dead/legacy/duplicate systems | High risk | Dual pathways and legacy compatibility layers remain substantial. |
| UI sheet vs canonical data | Partial | Several UI flows still lag behind canonical strictness/visibility requirements. |

---

## 4) System-by-System Findings

### A. Critical correctness blockers

1. **Initiative rules drift**: combat supports **group and individual initiative**, while canonical Basic/Expert requires side initiative as the default/authoritative mode.
2. **Canonical procedures not fully deterministic end-to-end** in exploration+wilderness flow (encounter cadence/forced march/terrain workflow integration is not fully consolidated).
3. **Natural weapon normalization gap**: monsters should use canonical natural weapon items, but mixed representations remain possible.

### B. High-priority architecture risks

1. **Dual-path runtime behavior** (legacy fallbacks + canonical paths) risks silent rules drift.
2. **Schema/runtime/UI mismatch risk** where canonical data exists but runtime checks are optional or bypassable.
3. **Compendium pipeline parity risk** across content categories (spells stronger than several non-spell categories).
4. **Potential drift from table-driven rules** if direct actor/item overrides are not consistently bounded.

### C. Missing Basic/Expert rules (or incomplete implementations)

1. Full wilderness procedure loop integration (travel pacing, terrain modifiers, forced march handling, encounter cadence).
2. Strict class weapon-restriction enforcement in all attack entry points.
3. Strong launcher+ammo compatibility validation and per-attack consumption guarantees across all relevant flows.
4. Complete thief ability runtime UX/tests tied to canonical percentile progression behavior.
5. Fully surfaced cleric Turn Undead runtime/UI flow (beyond table helpers).
6. Complete XP allocation workflow alignment (monster + treasure + optional adventure awards) with test evidence.

### D. UI/data mismatch findings

1. Some sheet/workflow paths can present or allow values not fully constrained by canonical derivation expectations.
2. Derived fields editability/override semantics are not always clearly separated in UX.
3. Combat/exploration controls expose non-canonical alternative operation modes (notably initiative).

### E. Cleanup / dead code / legacy-risk

1. Legacy migrations and fallback adapters are still numerous; justified short-term, but increase maintenance burden.
2. Parallel/overlapping subsystem entry points create drift risk (especially where both old and canonical APIs exist).
3. Duplicate or near-duplicate test/runtime patterns in spell-era transition code increase long-term entropy.

### F. Deferred Companion/Master scope (explicitly excluded)

- Weapon mastery
- Dominion/war machine systems
- Companion/Master spell-list expansion
- High-level optional combat variants

No recommendation in this audit requires implementing those systems now.

---

## 5) Basic/Expert Completeness Checklist

- [x] Descending AC canonical model in runtime core
- [x] Race-as-class data model present
- [x] Core class table assets present (levels/saves/attack structures)
- [~] Side initiative canonical enforcement (partially implemented; not strict)
- [~] Attack/saves integration across all runtime paths
- [~] Ammo + launcher compatibility strictness
- [~] Encumbrance/movement single-source strictness across all contexts
- [~] Exploration turn sequence completeness
- [~] Wilderness procedures completeness
- [~] Light/time turn integration completeness
- [~] Thief abilities complete runtime+UI+tests
- [~] Turn Undead complete runtime+UI+tests
- [~] Monster natural weapon canonicalization strictness
- [~] Full canonical compendium parity across required categories
- [~] Canonical minimum test matrix coverage

Legend: `[x]` complete, `[~]` partial, `[ ]` missing.

---

## 6) Known Deviations from Canonical Rules Reference

1. Individual initiative mode availability (non-canonical as default engine behavior).
2. Incomplete wilderness procedure formalization relative to canonical reference expectations.
3. Partial enforcement of strict ammo/launcher constraints.
4. Partial enforcement of natural-weapon-as-item canonical representation.
5. Incomplete runtime guarantees around derived-only edit constraints (depends on path/UI).

---

## 7) Dead/Legacy Cleanup List

1. Consolidate initiative logic toward strict side-initiative authority (retain migration only where necessary).
2. Remove or quarantine legacy runtime fallbacks once migration confidence is sufficient.
3. Collapse duplicate/overlapping subsystem entry points to canonical module facades.
4. Standardize rule lookup access through canonical rule helpers only.
5. Rationalize old compatibility shims in spell/item/actor update hooks after deprecation window.

---

## 8) Recommended Build Order From Here

1. **Initiative canonicalization pass** (side initiative only at rules-engine layer).
2. **Wilderness/exploration procedure completion** (single deterministic loop and tests).
3. **Ammo + class weapon restrictions hardening** in combat runtime.
4. **Turn Undead + thief skills UX/runtime completion** with explicit regression coverage.
5. **Monster natural-weapon canonical item enforcement** in importer/runtime.
6. **XP/leveling end-to-end correctness pass** with scenario tests.
7. **Legacy-path reduction phase** gated by migration telemetry/tests.

---

## 9) Suggested Codex Task Breakdown

1. **Task A — Initiative Canonical Compliance**
   - Remove/disable individual initiative as rules-default runtime path.
   - Keep optional UI translation only if explicitly non-canonical and GM-toggled.

2. **Task B — Exploration/Wilderness Deterministic Loop**
   - Implement canonical turn sequence integration with wilderness travel rules and forced march.

3. **Task C — Ammo/Weapon Constraint Enforcement**
   - Enforce equipped launcher + compatible ammo + per-attack consumption in all attack flows.

4. **Task D — Thief/Turn Undead Runtime Completion**
   - Hook canonical tables into actor actions, chat cards, and tests.

5. **Task E — Monster Canonical Attack Normalization**
   - Force natural attacks into canonical itemized format in import/migration.

6. **Task F — XP/Leveling Validation Suite**
   - Add scenario tests proving canonical progression and award sources.

7. **Task G — Legacy Decommission Plan**
   - Inventory fallback paths, define removal phases, and gate by tests.

---

## 10) Test Command Results

Commands requested by scope were executed after audit document update:

- `npm test -- --run`
- `npm run lint`

(Results captured below reflect current repository state during this audit run.)

> If failures occur, classify each as pre-existing vs audit-induced. For this audit run, no runtime code changes were made outside documentation.


### Command Outcome Snapshot

#### `npm test -- --run`
- **Result:** Failed
- **Failing file:** `tests/combat/creature-attacks-regressions.test.mjs`
- **Failure:** `natural attacks do not count toward encumbrance by default` expected `total.total === 0` but received `undefined`.
- **Classification:** **Pre-existing** (audit work only added/updated documentation).

#### `npm run lint`
- **Result:** Failed
- **Failing areas:**
  - Foundry globals/env lint errors in spell modules (`foundry`, `ItemSheet`, `Hooks`, `ui`, `console`, `structuredClone`).
  - String escape style errors (`no-useless-escape`) in spell compendium/import modules.
  - One unused variable warning in `module/actors/becmi-actor.mjs`.
- **Classification:** **Pre-existing** (audit work only added/updated documentation).
