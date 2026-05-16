# Current System Audit

## Status and scope

- **Status:** Active current audit source.
- **Audit date:** May 16, 2026.
- **Scope:** Current repository implementation only.
- **Canonical references:** `docs/architecture/canonical-architecture.md`, `docs/architecture/runtime-systems.md`, `docs/architecture/data-layer.md`, and `docs/architecture/deprecated-systems.md`.

This document replaces scattered active audit guidance. Older audit documents are historical context only.

## Historical audit status

Treat the following as **historical** and non-canonical unless re-adopted by architecture docs:

- `docs/audits/archive/*`
- `docs/archive/*`
- `docs/full-system-audit-2026-05-14-consolidated.md`

---

## 1) Actors / Character Sheets

### Current status

- Canonical actor types are enforced (`character`, `creature`) with validation hooks and migration checks.
- Character sheets intentionally ignore legacy `actor.system.attacks` for active attack actions.
- Character spellcasting is normalized/validated before persistence.

### Known risks (active)

- Compatibility adapters still exist in several domains, so mixed-shape legacy worlds can still hide data drift until strict validation paths are hit.
- Derived-field protections prevent bad writes, but downstream UI/editor flows can still create operator confusion when attempted manual edits are stripped.

### Deprecated patterns to avoid

- Any new usage of legacy actor types (`monster`, `npc`).
- Re-introducing `actor.system.attacks` as an active source for attack workflows.
- Direct writes to protected derived fields.

### Recommended next development phases

1. Expand mixed-world migration regression fixtures for actor payload variants.
2. Add UI-facing diagnostics when derived writes are dropped, reducing silent confusion.
3. Continue removal of remaining compatibility branches once migration confidence threshold is reached.

---

## 2) Inventory / Encumbrance

### Current status

- Canonical inventory storage is `system.inventory.*` with migration normalization utilities.
- Legacy location aliases are normalized in runtime helpers.
- Slot canonicalization is enforced through migration and schema checks.

### Known risks (active)

- Runtime normalization of legacy location labels can mask stale data quality issues in long-lived worlds.
- Some item workflows still rely on fallback inference logic, increasing maintenance complexity.

### Deprecated patterns to avoid

- New logic that treats ad-hoc legacy fields (`system.containerId`, `system.quantity`, `system.weight`) as primary storage.
- New slot aliases or compatibility-only field expansion without migration gates.

### Recommended next development phases

1. Add strict-mode diagnostics to inventory operations (warn once per actor/item for legacy normalization).
2. Add migration fixture coverage for mixed container + slot edge states.
3. Narrow fallback inference scope after fixture-backed confidence improves.

---

## 3) Exploration / Movement / Time / Light

### Current status

- Canonical exploration authority is the runtime path exposed via `module/exploration/runtime.mjs` and domain exports.
- Deprecated wrapper surfaces still exist and emit warnings for compatibility.
- Movement/time/light contracts are covered by dedicated runtime tests.

### Known risks (active)

- Deprecated wrapper APIs remain importable and therefore remain accidental re-use risk.
- Dual naming surfaces (canonical summary APIs vs deprecated helpers) increase onboarding and maintenance burden.

### Deprecated patterns to avoid

- Importing `module/exploration/exploration-state.mjs` for new runtime logic.
- New usage of deprecated movement helper wrappers where summary/runtime APIs already exist.

### Recommended next development phases

1. Plan and execute wrapper retirement window with explicit migration notes.
2. Remove deprecated helper tests only after wrapper removal is complete and replacement tests are in place.
3. Add CI guardrails that block new imports from deprecated exploration modules.

---

## 4) Spells

### Current status

- Spell data normalization/validation rejects legacy aliases and enforces canonical nested structures.
- Actor spellcasting normalization rejects legacy aliases and is covered by tests.
- Spell import validation blocks known legacy field shapes.

### Known risks (active)

- Import pipelines remain strict; malformed external sources create operational friction when not pre-cleaned.
- Duplicate JS/MJS test variants in spell tests can increase divergence risk if one suite is updated without the other.

### Deprecated patterns to avoid

- Introducing alias-based spell schemas or bypassing canonical spell validators.
- Writing import adapters that silently accept legacy fields without explicit normalization contracts.

### Recommended next development phases

1. Consolidate duplicate spell test format variants where possible.
2. Add preflight tooling/docs for import data cleanup to reduce user-facing failures.
3. Keep spell schema evolution gated by explicit migration + validation updates.

---

## 5) Monsters

### Current status

- Canonical monster runtime is centered in `module/monsters/*` with schema and runtime tests.
- Runtime warns when legacy inline attack builder paths are invoked.
- Monster schema tests cover legacy alias rejection and migration normalization expectations.

### Known risks (active)

- Deprecated legacy attack conversion paths still exist and can be accidentally depended on.
- Multiple ingestion/build pathways increase drift risk between dataset assumptions and runtime actor expectations.

### Deprecated patterns to avoid

- New feature work against legacy inline attack text structures.
- Direct reliance on deprecated legacy monster builder behavior.

### Recommended next development phases

1. Isolate and retire legacy monster attack conversion helpers after migration window.
2. Expand compendium/ingestion regression tests for malformed attack payloads.
3. Add explicit runtime telemetry hooks for legacy-path invocations during development.

---

## 6) Combat

### Current status

- Combat runtime is exposed through `game.becmi.combat` and supports initiative mode control and morale workflows.
- Attack resolution is item-driven by design; legacy actor attack shape is intentionally ignored for active actions.
- Damage application workflows use message flags to prevent duplicate application.

### Known risks (active)

- Remaining compatibility reads in adjacent systems can still create cross-domain assumptions about canonical combat inputs.
- Combat automation and UI controls are broad enough that regression risk grows when migration and schema constraints evolve.

### Deprecated patterns to avoid

- Re-introducing actor-level legacy attack payloads as active combat inputs.
- New combat helpers that bypass canonical validation/normalization layers.

### Recommended next development phases

1. Add targeted contract tests for combat inputs consumed from migrated worlds.
2. Consolidate combat-facing data read models to reduce schema branching.
3. Document strict integration contracts for third-party automation hooks.

---

## 7) Data / Compendium Pipelines

### Current status

- Rules and dataset loading are centralized with validation utilities and architecture guidance in canonical data-layer docs.
- Monster and spell pipelines include validation checkpoints and migration-aware normalization boundaries.

### Known risks (active)

- Pipeline strictness can surface as brittle imports when upstream source shape drifts.
- Some datasets still require manual curation steps, raising long-term maintenance overhead.

### Deprecated patterns to avoid

- Bypassing validation utilities for “quick import” paths.
- Embedding schema transforms directly into UI/runtime code instead of pipeline boundaries.

### Recommended next development phases

1. Expand fixture-driven validation for representative bad-source cases.
2. Add lightweight pipeline health checks in CI for core datasets.
3. Continue documenting canonical ingest contracts in architecture docs instead of ad-hoc audits.

---

## 8) Migrations / Schema

### Current status

- Ready-time migrations enforce canonicalization for actor types, inventory shape, creature schema, slot naming, save keys, and derived-field cleanup.
- Schema validation hooks are active on create/update for actor/item paths.

### Known risks (active)

- Long-lived worlds with partial historical migrations remain the highest source of edge-case behavior.
- Broad migration responsibilities increase change-coupling risk when canonical schema evolves.

### Deprecated patterns to avoid

- Introducing new schema aliases without migration/version gating.
- One-off in-feature migrations outside centralized migration pipeline.

### Recommended next development phases

1. Add migration rehearsal fixtures for hybrid legacy/canonical worlds across multiple subsystems.
2. Track migration version boundaries with explicit closeout criteria.
3. Keep migrations idempotent and independently testable.

---

## 9) Tests

### Current status

- Test coverage is broad across actors, exploration, spells, combat, migrations, schema, monsters, and data import domains.
- Deprecated-path behavior is currently tested (especially exploration wrappers), providing visibility during transition windows.

### Known risks (active)

- Duplicate test format files (e.g., JS and MJS twins) can diverge.
- Historical compatibility tests can linger past retirement windows and conceal overdue cleanup.

### Deprecated patterns to avoid

- Adding new duplicate-format tests when one canonical test format is sufficient.
- Keeping deprecated-path tests after the associated runtime path is fully retired.

### Recommended next development phases

1. Normalize test formats and reduce duplicate suites.
2. Add subsystem-level “deprecation exit” checklists that pair code removal with test cleanup.
3. Keep regression coverage focused on active canonical paths plus explicitly time-boxed compatibility windows.

---

## Immediate program-level next phases (cross-subsystem)

1. **Deprecation retirement phase:** remove exploration and monster compatibility wrappers once migration confidence gates are met.
2. **Migration confidence phase:** expand mixed-world fixtures and contract tests across actors/inventory/combat.
3. **Test suite consolidation phase:** reduce duplicate JS/MJS overlap and tighten CI around canonical pathways.
4. **Documentation governance phase:** treat architecture docs as canonical and archive future audits by default unless explicitly marked current.
