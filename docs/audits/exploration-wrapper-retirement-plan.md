# Exploration Wrapper Retirement Audit (Legacy Wrapper APIs)

Date: 2026-05-16

## Scope Reviewed
- `module/exploration/**`
- `tests/exploration/**`
- `docs/architecture/deprecated-systems.md`
- `docs/audits/current-system-audit.md`

## Findings: Deprecated Wrapper Usage Inventory

### A) Runtime dependencies (currently exercised by runtime code)

1. **`module/exploration/movement.mjs` deprecated movement wrapper functions are used by canonical summary output path**.
   - `getMovementSummary(...)` currently composes its return object by calling deprecated wrappers:
     - `getDungeonExplorationMovement`
     - `getDungeonCombatMovement`
     - `getWildernessExplorationMovement`
     - `getWildernessCombatMovement`
     - `getMilesPerDay`
     - `getForcedMarchMilesPerDay`
   - Impact: deprecation warnings and compatibility logic are still on the runtime path.

2. **`module/exploration/runtime.mjs` depends on `movement.mjs` (`getMovementSummary`, `getMovementContext`)**, so wrapper behavior indirectly affects runtime APIs.

3. **Deprecated distance conversion wrapper still exported in runtime module set**.
   - `convertRangeDistanceByContext(...)` remains in `movement.mjs` and is deprecated, but still present/importable.
   - No additional runtime callsites beyond internal module/export surfaces were found in the scoped scan.

### B) Test-only compatibility coverage

1. **Deprecated exploration-state wrapper module usage in tests**.
   - `tests/exploration/exploration-state-deprecated.test.mjs` imports and validates compatibility behavior from:
     - `module/exploration/exploration-state.mjs`

2. **Deprecated movement wrapper usage in tests**.
   - `tests/exploration/movement-runtime.test.mjs` exercises deprecated movement wrapper functions and validates warning-compatible outputs.

3. **Deprecated `getMovementForTurn` wrapper usage in tests**.
   - `tests/exploration/exploration-time.test.mjs` imports `getMovementForTurn` from `movement.mjs`.

### C) Documentation references

1. `docs/architecture/deprecated-systems.md` explicitly lists `module/exploration/exploration-state.mjs` and deprecated exploration wrapper modules.
2. `docs/audits/current-system-audit.md` documents that deprecated wrapper surfaces remain importable and identifies exploration-state/movement wrapper risks.

### D) Dead/unused within scoped targets

1. **No clearly dead wrapper exports were confirmed as removable from scoped evidence alone**.
   - `convertRangeDistanceByContext` appears to be low/limited use in-scope but remains publicly exportable and thus not safely classified as dead without broader external import verification.

## Classification Table

| Surface | Classification | Notes |
|---|---|---|
| `module/exploration/exploration-state.mjs` | Test-only compatibility coverage + documentation reference | In-scope imports found in tests; documented as deprecated. |
| Deprecated movement wrapper functions (`getDungeonExplorationMovement`, `getDungeonCombatMovement`, `getWildernessExplorationMovement`, `getWildernessCombatMovement`, `getMilesPerDay`, `getForcedMarchMilesPerDay`, `getMovementForTurn`) | Runtime dependency + test-only compatibility coverage + documentation reference | Called from `getMovementSummary` and tested directly; deprecation documented. |
| Deprecated distance conversion wrapper (`convertRangeDistanceByContext`) | Runtime surface (export/importable), documentation adjacency | Deprecated export remains; no additional scoped runtime callsites found. |

## Safe Phased Removal Plan

### Phase 0 — Guardrails and visibility (no behavior change)
1. Add CI checks that block *new* imports from deprecated modules/functions.
2. Add focused telemetry/log counters for deprecated wrapper usage paths (if logging infra exists).
3. Keep existing compatibility tests green to prevent accidental drift during migration.

### Phase 1 — Internal runtime decoupling (no externally visible behavior change)
1. Refactor `getMovementSummary` to compute canonical fields directly from non-deprecated internals (`getBaseMovement`, `explorationToCombatMovement`, `movementToMilesPerDay`, `getForcedMarchState`) rather than calling deprecated wrappers.
2. Ensure deprecated wrappers delegate to canonical internal calculators (one-way shim), not vice versa.
3. Preserve output schema and values exactly; keep warning semantics only on deprecated entrypoints.

### Phase 2 — Deprecation hardening
1. Restrict deprecated wrappers to explicit compatibility namespace or isolated legacy module.
2. Freeze docs to require canonical runtime APIs for all new code.
3. Update tests:
   - Keep a minimal compatibility suite for explicitly supported legacy shims.
   - Move most assertions to canonical runtime API tests.

### Phase 3 — Retirement window
1. Announce removal version and migration notes.
2. Remove `module/exploration/exploration-state.mjs` after confirming no non-test imports.
3. Remove deprecated movement/distance wrapper exports once compatibility SLA window ends.
4. Delete or archive compatibility-only tests tied to removed wrappers.

### Phase 4 — Post-removal enforcement
1. Add lint rule / static check to reject deprecated wrapper identifiers.
2. Keep architecture docs aligned with single canonical exploration runtime path.

## Explicit Non-Action Confirmation
- No deprecated wrapper code was removed in this audit.
- No runtime behavior changes were introduced.
