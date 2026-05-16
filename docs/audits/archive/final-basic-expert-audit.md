# ARCHIVED DOCUMENT

This document reflects repository state at the time it was written.
It is no longer a canonical source of truth.
See:
- /docs/architecture/canonical-architecture.md
- /docs/audits/current-system-audit.md

# Final Basic/Expert Compliance & Architecture Audit

**Date:** 2026-05-16  
**Audit scope:** Full-system post-hardening Basic/Expert compliance and architecture review  
**Canonical source-of-truth:** `docs/rules/basic-expert-reference.md`

---

## 1. Executive summary

The system is **production-ready for Basic/Expert (levels 1–14) with moderate residual debt**. Core runtime behavior is deterministic, exploration-first, schema-driven, and strongly covered by automated tests. Dual initiative support is implemented intentionally and should be retained.

**Overall readiness:** **High** for Basic/Expert baseline play; **Medium** for long-term maintainability until remaining legacy/deprecation and duplicate-test cleanup is completed.

Top risk themes:
- Legacy/deprecated compatibility paths still active (acceptable short term, drift risk long term).
- Duplicate `.js` / `.mjs` spell tests can drift.
- Some domains remain intentionally non-automated (by design).

---

## 2. Architecture maturity assessment

### Maturity snapshot
- **Runtime architecture:** Mature modular domains (`actors`, `combat`, `exploration`, `monsters`, `items`, `rules`).
- **Schema and normalization:** Strong; canonical validation and migration layers present.
- **Determinism:** Strong; exploration and movement pipelines are explicit/pure-value oriented.
- **Regression safety:** Strong; broad test suite with focused regression packs.
- **Debt profile:** Manageable but non-trivial; mainly compatibility shims and duplicate test files.

### Classification
- **Critical:** 0
- **High:** 2
- **Medium:** 5
- **Low:** 6
- **Deferred by design:** 6

---

## 3. Rules compliance matrix

| Domain | Canonical expectation | Status | Notes |
|---|---|---|---|
| Scope boundary | Basic + Expert only; Companion/Master excluded | ✅ Compliant | Current implementation and tests target B/E baseline; Companion/Master remains out of scope. |
| Deterministic runtime | Rules from schema + canonical tables only | ✅ Compliant | Runtime modules are deterministic-style with explicit derivations and normalized state transitions. |
| Descending AC/THAC0 | Canonical descending AC and THAC0 support | ✅ Compliant | THAC0/save runtime tests and rules tables present. |
| Race-as-class | Canonical class list incl. demi-human classes | ✅ Compliant | Class data and progression tests align to canonical B/E structure. |
| Exploration-time first | Turn/time/movement runtime authority | ✅ Compliant | Exploration runtime is explicit and highly tested. |
| Inventory/encumbrance | Carried/worn count; stored excluded from movement | ✅ Mostly compliant | Core contracts covered; remaining edge-case verification advisable for nested containers + migration worlds. |
| Saves/turn undead/thief | Canonical derived runtime systems | ✅ Compliant | Dedicated rules modules and targeted tests exist. |
| Monsters | Canonical schema/import/runtime/compendium support | ✅ Mostly compliant | Good coverage; still some parser/import hardening opportunities. |
| Spells | Canonical schema + resolver + compendium pipeline | ✅ Mostly compliant | Strong architecture; duplicate test format risk remains. |
| Initiative | Do not alter behavior; dual-mode intentional | ✅ Compliant | Group + individual modes explicitly supported and persisted per-combat. |

---

## 4. Runtime consistency findings

### Deterministic runtime behavior
**Result: Verified (High confidence).**
- Exploration state is normalized, frozen, and advanced through explicit transforms.
- Movement/time derivations are explicit with canonical units and derived summaries.
- Event emission is deterministic from state/runtime inputs.

### Canonical schema enforcement
**Result: Verified with residual compatibility allowances.**
- Validation and normalization layers are present across actor/item/spell/monster domains.
- Migrations preserve old worlds while steering toward canonical schema.

### Canonical import pipeline
**Result: Verified for monsters and spells; monitor drift at boundaries.**
- Import normalizers + validation tests exist.
- Compendium build/index flows are present and tested.

### Canonical compendium generation
**Result: Verified (pipeline exists and is tested),** with ongoing content-completeness caveat.

---

## 5. Character runtime findings

**Status:** Strong.

- Derived contracts, saves/THAC0 integration, thief, turn undead, spellcasting, XP progression, and migration regressions are covered by dedicated tests.
- Risk remains around long-tail legacy data worlds where migration + manual overrides may intersect.

**Findings:**
- **Medium:** Derived-field override policy could use stricter runtime guardrails in edge migration states.
- **Low:** Additional test scenarios for mixed legacy + canonical actor payloads would improve confidence.

---

## 6. Monster runtime findings

**Status:** Strong, with moderate import-edge risk.

- Monster parser, runtime derivation, schema, importer normalization, and compendium tests exist.
- Runtime consistency appears stable across builder/parser/index/compendium modules.

**Findings:**
- **Medium:** Remaining parser tolerance can mask malformed source rows if not accompanied by strict audit reports.
- **Low:** Add explicit regression vectors for rare HD/save/attack-expression anomalies.

---

## 7. Exploration runtime findings

**Status:** Strong, deterministic, and architecture-led.

- Exploration runtime consolidates time, movement, wilderness cadence, and light ticking with explicit event outputs.
- Party movement summary and context conversion are centralized.

**Findings:**
- **High:** Deprecated movement helper paths still active and exercised (console deprecation emissions in tests) indicate unfinished cleanup.
- **Medium:** Keep deprecation compatibility short-lived to prevent accidental re-adoption by new code.

---

## 8. Import/compendium findings

**Status:** Good.

- Monster and spell import normalization/tests are present.
- Compendium pipelines are tested and deterministic.

**Findings:**
- **Medium:** Duplicate test suites (`.js` + `.mjs`) in spell pipeline area increase maintenance/drift risk.
- **Low:** Add a single canonical test runner/source policy document per domain.

---

## 9. Remaining drift risks

### Critical
- None identified.

### High
1. **Exploration deprecation paths remain runtime-visible** (deprecated helper access still produces warning emissions in active tests).  
2. **Duplicate spell test formats (`.js` and `.mjs`)** create split source-of-truth risk.

### Medium
1. Legacy migration/fallback branches in actors/items/spells may preserve non-canonical payloads longer than intended.  
2. Import parser tolerance can hide malformed source material without mandatory hard-fail thresholds.  
3. Inventory/encumbrance nested-container corner cases need additional migration-era coverage.  
4. Monster compendium/schema hardening should continue around unusual stat expressions.  
5. Resolver fallback complexity (where applicable) can hide data hygiene issues.

### Low
- Documentation consolidation and audit doc sprawl can cause process drift.
- Optional UX-level guardrails for editors/authors are still uneven across domains.

### Deferred by design
- Full spell effect automation.
- Broad action/effect framework completion.
- Companion/Master rules domains (weapon mastery, dominions, war machine, etc.).
- Non-canonical modernized mechanics.

---

## 10. Remaining cleanup targets

1. Remove/retire deprecated exploration helper APIs after one final compatibility window.  
2. Collapse duplicate spell tests into one canonical module format.  
3. Add stricter import audit mode (`warn` vs `fail`) with CI enforcement option.  
4. Expand migration-regression fixtures for hybrid legacy/canonical worlds.  
5. Add “schema contract snapshots” to detect silent template/rules drift.

---

## 11. Companion/Master readiness assessment

**Assessment:** **Architecturally preparatory, intentionally out of scope for implementation now.**

- Current modularity and deterministic runtime patterns are adequate foundations.
- Canonical boundary is respected: Companion/Master systems are explicitly excluded from current compliance targets.
- Recommendation: lock B/E cleanup first before widening rules surface.

---

## 12. Regression coverage assessment

**Result:** Broad and healthy.

Coverage includes:
- Combat regressions (including weapon/ammo/creature hooks).
- Exploration runtime/time/movement/light/wilderness procedures.
- Monster parser/runtime/schema/import/compendium.
- Saves/THAC0 and progression.
- Encumbrance/equipment.
- Spell schema/reference/compendium/sheet and actor spellcasting.
- Migration regressions and schema regressions.

**Gap summary:**
- More adversarial import fixtures.
- More mixed legacy-world migration fixtures.
- Consolidation of duplicate spell test file formats.

---

## 13. Recommended roadmap from here

### Phase 1 (immediate)
1. Retire deprecated exploration helpers and update all callsites/tests.
2. Unify duplicate spell tests into one module format.
3. Add strict import audit gating in CI (can fail build in strict mode).

### Phase 2 (near-term)
1. Expand migration fixtures for legacy/canonical hybrid states.
2. Add contract-snapshot testing for canonical schemas/templates/tables.
3. Tighten inventory/container edge-case tests.

### Phase 3 (after cleanup)
1. Optional automation expansions (spell/action effects) behind explicit scope flags.
2. Companion/Master architecture spike only after B/E debt is retired.

---

## Finding classification rollup

### Critical
- None.

### High
- Deprecated exploration runtime helper paths still active.  
- Duplicate `.js` + `.mjs` spell tests.

### Medium
- Legacy fallback/migration branch longevity risk.
- Import parser tolerance without strict fail policy.
- Encumbrance/container migration edge-case coverage gaps.
- Monster anomaly fixture depth gaps.
- Resolver fallback complexity masking hygiene regressions.

### Low
- Audit/document sprawl.
- Uneven UX authoring guardrails.
- Additional optional contract checks desirable.

### Deferred by design
- Companion/Master domains.
- Full spell automation/action framework breadth.
- Non-canonical optional mechanics beyond B/E baseline.
