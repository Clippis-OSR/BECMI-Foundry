# BECMI Foundry — Full System Audit (Consolidated)

**Date:** 2026-05-14  
**Status:** Historical audit snapshot (superseded by `docs/audits/current-system-audit.md` and canonical architecture docs)  
**Supersedes:** prior fragmented audit/status documents listed below

---

## Executive Summary

BECMI Foundry is currently in a stable **Foundry v14-compatible** baseline with a clear canonical model for actors/items and a materially expanded spell architecture. Core runtime architecture is coherent: actor and item types are explicitly locked in `system.json`, data templates are strongly shaped in `template.json`, initialization/validation/migration wiring is centralized in `becmi.mjs`, and regression suites cover combat, equipment, migrations, schema, and the spell stack.

### Stable now

- Canonical actor types (`character`, `creature`) and item types (`equipment`, `weapon`, `armor`, `container`, `currency`, `treasure`, `consumable`, `spell`, `ammo`) are registered and consistent with templates and boot wiring.
- Core combat/equipment/inventory systems are modularized under `module/combat`, `module/items`, and `module/rules` and exercised by regression tests.
- Spell and actor spellcasting schema v1 are implemented with explicit normalization + validation layers and pre-create/pre-update enforcement hooks.
- Spell reference resolution includes triad identity (`spellKey`, `uuid`, `itemId`) with deterministic fallback order and diagnostics.

### Newly added architecture (compared to prior audits)

- Canonical spell item schema and schema enforcement.
- Canonical actor spellcasting schema and schema enforcement.
- Explicit spell/actor spellcasting migration + normalization utilities.
- Spell reference resolution/cache/validation modules.
- Spell compendium pipeline and integrity checks.
- Dedicated spell sheet + spell UX safety tests.

### Highest remaining risks

- Legacy/fallback pathways remain intentionally present and must be constrained over time.
- Duplicated `.js` and `.mjs` spell tests increase maintenance/drift risk.
- Foundry v14+ lifecycle changes may impact UUID resolution and sheet behaviors over time.
- Compendium content completeness and non-automated spell effect execution remain incomplete by design.

### Recommended next phase

Proceed with **Monster Library Architecture** and **Inventory/Encumbrance hardening** before broad spell automation or full Action/Effect framework rollout.

---

## Current Architecture State

### System bootstrap and registration

- `system.json` defines Foundry compatibility minimum `14` and verified `14.361`, and locks actor/item document type registration.
- `becmi.mjs` performs system bootstrapping, document class registration, sheet registration, migration hooks, validation hooks, and rules/combat attachment onto `game.becmi`.

### Data model root

- `template.json` is the authoritative baseline shape for actor/item system data.
- Character templates include derived and owned sections (combat/saves/containers/equipment/spellcasting/etc.).
- Item templates include spell schema roots with `schemaVersion` and `spellKey`.

### Layering pattern

1. **Templates/schemas**: `template.json`, canonical schema helpers.
2. **Normalization/migration**: `module/items/spell/*-data|migration`, `module/actors/spellcasting/*-normalization|migration`, and migration functions in `becmi.mjs`.
3. **Validation**: global schema validation + spell-specific + spellcasting-specific validators.
4. **Runtime preparation and UX**: actor/item sheets and rule helpers.
5. **Regression protection**: targeted test suites by subsystem.

---

## Canonical Decisions Locked

1. **Actor types are canonical**: `character`, `creature` only.
2. **Item types are canonical**: includes first-class `spell` and `ammo`.
3. **`spellKey` is canonical spell identity** and must be lowercase snake_case.
4. **Actor spell references are canonical triad objects**: `{ spellKey, uuid, itemId }`.
5. **`schemaVersion` policy is explicit v1 gating** for spell items and actor spellcasting.
6. **Normalization-before-validation pattern is enforced** in spell and spellcasting workflows.
7. **JSON source-of-truth policy for spell content** is present via spell JSON content files (`spells/basic/...`) and compendium import/pipeline modules.

---

## Subsystem Audit

## 1) Core System Architecture

- Boot file `becmi.mjs` is the central orchestration point (registration, settings, hooks, migration, validation, and rule attachment).
- Global schema validation helpers in `module/utils/schema-validation.mjs` protect actor/item canonical fields (actor type, slots, saves, inventory fields).
- Rules data loading is isolated in `module/utils/rules-data.mjs` and consumed through `module/rules` helpers.

## 2) Actor Architecture

- Canonical actor doc class: `BECMIActor`.
- Canonical actor types: `character` and `creature`.
- Character and creature sheet classes are split and registered separately.
- Creature data migration path exists for canonical monster payload normalization.

## 3) Item Architecture

- Canonical item sheet exists plus spell-specific sheet class.
- Item data concerns are separated into inventory manager, currency/treasure/container/ammo modules, plus spell-specific modules.
- Legacy slot migration utilities provide backward compatibility while enforcing canonical slots.

## 4) Combat Engine

- Combat domain is modular (`attack`, `damage`, `saves`, `initiative`, `morale`, `damage-application`, `creature-hooks`).
- Combat engine is exposed under `game.becmi.combat` at init.
- Regression tests exist for core combat and creature attack hooks.

## 5) Equipment / Armor / Weapon Systems

- Equipment slot canonicalization/validation is in place.
- Encumbrance and inventory logic are separated from core actor logic.
- Rule tables for armor/weapons exist under `module/rules` and are used by actor/item workflows.

## 6) Spell Architecture

- Spell schema normalization in `module/items/spell/spell-data.js` rejects legacy alias fields and enforces canonical nested structures.
- Spell validation in `module/items/spell/spell-validation.js` enforces schemaVersion=1 and enum/format constraints.
- Spell constants centralize allowed lists/modes/types.
- Dedicated spell sheet class/template supports authoring and validation feedback paths.

## 7) Actor Spellcasting Architecture

- Canonical actor spellcasting schema lives under `system.spellcasting` with per-caster blocks (`magicUser`, `cleric`, `elf`) and levels 1–6.
- Normalization + validation + migration modules exist and are wired into actor creation/update lifecycle.
- Legacy alias keys are explicitly rejected by validation.

## 8) Spell Reference Resolution Layer

- Resolution API exists in `module/spells/spell-reference.js` with cache support.
- Runtime resolution order is:
  1. `uuid`
  2. `spellKey`
  3. `itemId` (actor-local convenience)
- Diagnostics include valid/resolved flags plus warnings/errors and method used.

## 9) Spell Compendium Pipeline

- Compendium pipeline modules include importer, index, validation, and compendium build/sync integrity checks.
- `spell-compendium.js` enforces duplicate `spellKey` rejection and schema validation before accepting entries.
- Build step sorts by `spellKey` for deterministic ordering.

## 10) Spell Sheet UX / Authoring Workflow

- Dedicated template `templates/item/spell-sheet.hbs` surfaces schema fields (`spellKey`, `schemaVersion`, lists, etc.) and validation errors.
- UX safety tests cover immutable key format, schema failures, normalization output shape, schemaVersion persistence, and actor prepared/known handling patterns.

## 11) Validation / Normalization / Migration Layers

- Pattern is consistent: normalize to canonical shape, then validate; migration utilities bridge legacy fields/types into canonical structures.
- System-level migrations in `becmi.mjs` cover actor type legacy detection, inventory model conversion, creature schema normalization, and equipment slot migration.
- Spell and spellcasting domains each have dedicated data/validation/migration modules.

## 12) Data-Driven Content Architecture

- JSON-backed rules data in `data/classes`, `data/tables`, `data/monsters`.
- Spell content source JSONs exist in `spells/basic/...`.
- Runtime loaders and validators consume these sources with guardrails.

## 13) Tests / Regression Coverage

- Broad regression folders exist for combat, encumbrance, equipment, migrations, schema, monsters, and spells.
- Spell coverage specifically includes:
  - spell schema
  - spell sheet UX
  - actor spellcasting
  - spell reference resolution
  - spell compendium pipeline
- Risk noted: duplicated spell tests across `.js` and `.mjs` files.

## 14) Legacy Compatibility / Fallback Risks

- Legacy actor type map remains present and guarded.
- Legacy slot and inventory migrations remain needed for older worlds.
- Spell resolution fallback behavior is intentionally resilient but increases branch complexity.

## 15) Technical Debt / Risk Register

1. **Legacy aliases**: still present in migration/guard code; long-tail cleanup needed.
2. **Fallback paths**: resolver fallbacks can mask data hygiene issues if over-relied on.
3. **Duplicated tests (`.js`/`.mjs`)**: duplication invites drift and unclear source-of-truth.
4. **Foundry v14 readiness drift**: currently compatible, but ongoing API/build drift requires periodic verification.
5. **Direct lookup bypass risk**: new code could bypass canonical resolver and reintroduce identity drift.
6. **Documentation drift**: multiple older audits still exist and can conflict.
7. **Incomplete content packs**: architecture supports content, but full curated spell/content breadth is still developing.
8. **UI gaps**: some quality-of-life and structured authoring/automation UX remains future work.

## 16) Roadmap Recommendation

### Recommended immediate sequence

1. **Monster Library Architecture (next)**
   - Formalize canonical monster content schema/workflow and compendium parity with spell pipeline discipline.
2. **Inventory/Encumbrance hardening**
   - Close edge cases, tighten constraints, and improve migration confidence for item/inventory state.
3. **Action/Effect framework design finalization**
   - Keep architecture-first; finalize contracts before broad implementation.
4. **Spell automation phase**
   - Start only after above stabilization and with resolver-backed canonical identity rules.

### What NOT to do yet

- Do **not** start broad spell effect automation without locked action/effect contracts and stronger content completeness.
- Do **not** introduce new parallel spell identity strategies beyond current canonical triad + resolver order.
- Do **not** remove migration/fallback paths until telemetry/confidence shows negligible legacy-world dependence.

---

## Spell System Audit (Detailed)

### Spell item schema status

- Implemented and enforced.
- Canonical fields are nested and normalized; legacy aliases are blocked.
- `schemaVersion` is mandatory and locked to v1.

### Actor spell schema status

- Implemented and enforced under `system.spellcasting`.
- Canonical caster keys and levels are validated.
- Known/prepared references are canonical reference objects.

### Resolver status

- Implemented with cache + diagnostics.
- Correct fallback order and clear unresolved/error handling.

### Compendium pipeline status

- Implemented with deterministic sorting and integrity checks.
- Duplicate `spellKey` protection and schema enforcement active.

### UX authoring status

- Dedicated spell sheet and template present.
- Validation feedback path present.
- Regression tests cover core authoring safety expectations.

### Test status

- Strong spell-focused test surface exists.
- Remaining cleanup: remove `.js`/`.mjs` duplication once test strategy is unified.

### Remaining non-automation gaps

- No full spell effect execution pipeline as canonical runtime automation yet.
- Limited advanced authoring UX (structured builders, richer compendium browse/filter workflows).

---

## Superseded Documents

This consolidated audit supersedes these as primary architecture reference:

- `docs/full-system-audit-2026-05-14.md`
- `docs/spell-reference-architecture-audit-2026-05-14.md`
- `docs/audit-current-state.md`
- `docs/sheet-schema-audit.md`
- `docs/spell-action-closeout.md`
- `docs/action-effect-library-design.md` (as active-state reference; remains useful as future-target design)

**Recommendation:** add a short banner note at top of each superseded doc:

> Superseded by `docs/full-system-audit-2026-05-14-consolidated.md`.

(Do not delete old docs until maintainers confirm no external references depend on them.)

---

## Evidence Basis (Inspected)

Minimum requested inspection scope completed:

- `system.json`
- `template.json`
- `becmi.mjs`
- `module/actors/`
- `module/items/`
- `module/spells/`
- `templates/actor/`
- `templates/item/`
- `tests/`
- `docs/`

Audit statements are based on direct repository inspection of those areas.
