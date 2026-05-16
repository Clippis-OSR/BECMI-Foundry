# ARCHIVED DOCUMENT

This document reflects repository state at the time it was written.
It is no longer a canonical source of truth.
See:
- /docs/architecture/canonical-architecture.md
- /docs/audits/current-system-audit.md

# FAS 6 Closeout Audit — Exploration + Movement Consistency Verification

Date: 2026-05-15

## Scope and Method

This closeout audit reviewed runtime code and test coverage for:

- inventory/encumbrance to movement integration
- movement runtime + movement contracts
- dungeon/wilderness distance conversion
- exploration time + light ticking
- exploration API exposure on `game.becmi.exploration`

Primary files reviewed:

- `module/items/encumbrance.mjs`
- `module/rules/encumbrance.mjs`
- `module/exploration/{movement,movement-contracts,distance,time,light,runtime,index,exploration-state}.mjs`
- `becmi.mjs`
- exploration/encumbrance/migration/schema tests

---

## 1) Movement Runtime Consistency Audit

### Findings

1. **Canonical movement value is centralized via encumbrance tier lookup**:
   - `calculateTotalEncumbrance` computes `totalCarriedWeight` and resolves `movementTier`/`movementRate` from `getMovementTierByEncumbrance`.
   - `getBaseMovement` converts encumbrance to a single canonical `movementValue` (`normalFeetPerTurn`).

2. **Combat movement consistently derives from exploration movement / 3**:
   - `explorationToCombatMovement` applies floor(`movement / 3`), then normalization.
   - `getDungeonCombatMovement` and `getWildernessCombatMovement` both flow through this function.

3. **Wilderness miles/day deterministic and canonical**:
   - `movementToMilesPerDay` = `movement / 5`.
   - forced march = `* 1.5` in `getForcedMarchMilesPerDay`.

4. **Duplicate/legacy path detected**:
   - `module/exploration/exploration-state.mjs` defines a parallel exploration state model (`mode`, `travelPace`, separate `advanceExplorationTurn`) not used by the runtime index.
   - `module/exploration/movement.mjs` still includes `getMovementForTurn(..., { travelPace })` and emits placeholder `paceModifiers` despite canonical contracts not using travel pace.

5. **Outdated helper/dead semantics**:
   - `convertRangeDistanceByContext` exists but currently returns the same value in all contexts and duplicates responsibilities with `movement-contracts`.

### Affected files

- `module/items/encumbrance.mjs`
- `module/rules/encumbrance.mjs`
- `module/exploration/movement.mjs`
- `module/exploration/exploration-state.mjs`

### Recommendations

- Treat `module/exploration/runtime.mjs` as the sole exploration turn state machine.
- Deprecate or remove `module/exploration/exploration-state.mjs` after confirming no external imports.
- Remove or hard-deprecate `travelPace` placeholder fields in movement runtime (`getMovementForTurn`) to avoid modern-pace drift.
- Consolidate distance conversion to a single public entrypoint (`movement-contracts` or a thin wrapper).

### Cleanup candidates

1. `module/exploration/exploration-state.mjs` (candidate dead/legacy runtime).
2. `getMovementForTurn` `travelPace` + extension placeholders in `movement.mjs`.
3. `convertRangeDistanceByContext` in `movement.mjs` (duplicate/no-op behavior).

---

## 2) Travel Pace / Modern D&D Drift Audit

### Findings

- **No active slow/normal/fast pace mechanics** in canonical runtime logic.
- **Legacy drift remnants present**:
  - `DEFAULT_TRAVEL_PACE = "normal"` and `travelPace` output in `getMovementForTurn`.
  - `exploration-state.mjs` tracks `travelPace` in normalized state.

### Active vs dead

- `travelPace` is **active only as inert metadata** (no movement math effect).
- `exploration-state.mjs` appears **legacy/parallel** and not exported through the main runtime surface.

### Cleanup recommendations

- Remove `travelPace` from runtime state and helpers unless a future BECMI-authentic mode uses it.
- If retained for compatibility, mark as deprecated and explicitly documented as non-functional.

---

## 3) Distance Conversion Audit

### Contract verification

- Dungeon context uses feet units (`feetPerTurn`, `feetPerRound`).
- Wilderness context units are named yards (`yardsPerTurn`, `yardsPerRound`, `milesPerDay`).
- Spell area category is explicitly non-converting (`shouldConvertDistance` returns false for `spellArea`; `isSpellAreaAlwaysFeet` true).

### Runtime conversion entrypoints

1. `module/exploration/movement-contracts.mjs`
   - `shouldConvertDistance(category, context)`
   - `convertDistanceByContext(distanceFeet, category, context)`
2. `module/exploration/runtime.mjs`
   - `convertMissileRange(distanceFeet, context)` delegates category `weaponRange`.
3. `module/exploration/distance.mjs`
   - re-exports movement-contract distance helpers.
4. `module/exploration/movement.mjs`
   - `convertRangeDistanceByContext` (duplicate/no-op path).

### Risks

- **Bypass risk**: `convertRangeDistanceByContext` and direct raw distance math can bypass category-aware contract APIs.
- **Spell AoE risk**: low in current runtime due to explicit guard, but medium future risk if consumers use the movement helper instead of `movement-contracts` category helpers.

### Recommendations

- Enforce category-based conversion usage (`convertDistanceByContext`) for all ranges.
- Remove/rename generic conversion helper that does not take category.
- Add a dedicated regression test asserting spell AoE never converts under every wilderness context.

---

## 4) Time Runtime Audit

### Runtime timing map

- Canonical units in `time.mjs`:
  - exploration turn = 10 minutes
  - combat round = 10 seconds
  - watch = 4 hours
  - day = 24 hours
- `deriveElapsedTimeFromTurns` computes elapsed minutes/days from **exploration turns**.
- `runtime.advanceExplorationTurn` increments by one exploration turn and ticks lights with `tickLightSources(..., 1)`.

### Findings

- Light ticking is correctly exploration-turn based.
- No duplicate active timer system found in exported runtime path (`index.mjs` exports `runtime.mjs` functions).
- A parallel legacy `exploration-state.mjs` exists with overlapping concerns (duplicate risk if accidentally re-used).

### Risks

- Future confusion from two exploration state implementations.
- `deriveElapsedTimeFromTurns` includes derived rounds; safe currently, but consumers must not treat this as a combat timer API.

### Recommendations

- Keep time authority in `time.mjs` + `runtime.mjs` only.
- Add module-level docs clarifying elapsed rounds are informational and not combat-clock state.

---

## 5) Exploration Runtime API Audit (`game.becmi.exploration`)

### Current API surface

Registered from `module/exploration/index.mjs` through `becmi.mjs`:

- namespaces: `movement`, `time`, `light`, `movementContracts`, `distance`
- state/runtime fns: `normalizeExplorationState`, `advanceExplorationTurn`, `getMovementSummary`, `getExplorationSummary`

### Findings

- Exports are centralized in `index.mjs` and mounted once at init.
- API is deterministic: major functions return frozen objects and normalized numeric values.
- Naming mostly consistent; strongest inconsistency is duplicate `normalizeExplorationState` implementation in `exploration-state.mjs`.

### Undocumented/cleanup candidates

- `module/exploration/exploration-state.mjs` is not part of canonical export path; document as deprecated or remove.
- `movement` namespace includes inert/legacy-oriented helpers (`getMovementForTurn`, generic conversion helper).

---

## 6) Encumbrance → Movement Integration Audit

### Integration flow map

1. Inventory model and container placement (`inventory-manager`) identify carried/stored location.
2. `calculateTotalEncumbrance`:
   - separates carried vs stored
   - applies container multipliers (including `bagOfHolding` multiplier 0.06)
   - adds carried coin encumbrance
   - outputs `totalCarriedWeight`, `totalStoredWeight`, and movement tier/rate
3. Movement runtime (`getBaseMovement`) consumes `encumbrance.totalCarriedWeight` and resolves canonical movement value from rule tier table.
4. Contextual movement (`getMovementSummary`) derives combat/wilderness/day values from that single movement value.

### Findings

- Carried/stored separation present and explicit.
- Bag of holding multiplier handling present and table-driven.
- Terrain modifiers are isolated in `movement-contracts.applyTerrainToDailyTravel`, affecting only daily travel output path.
- Deterministic recalculation: movement always based on normalized carried weight + static tier table.

### Bypass risks

- Callers can pass arbitrary `encumbrance` objects directly to exploration runtime functions, bypassing `calculateTotalEncumbrance` unless enforced at call sites.

### Recommendations

- Add integration tests around actor-derived encumbrance object feeding exploration runtime.
- Optionally add runtime diagnostics when encumbrance payload lacks expected shape.

---

## 7) Canonical Contracts Summary

Validated against requested BECMI rules:

1. One canonical movement value exists: **Pass**.
2. Dungeon exploration uses feet: **Pass**.
3. Wilderness exploration uses yards unit contract: **Pass (label/contract level)**.
4. Combat movement = exploration/3: **Pass**.
5. Wilderness miles/day = movement/5: **Pass**.
6. Forced march +50% daily travel: **Pass**.
7. Spell AoE remains feet: **Pass (contract guard present)**.
8. Weapon/spell ranges convert by context: **Partial** (contract API exists; conversion currently identity and helper duplication increases bypass risk).
9. Party movement uses slowest member: **Pass** (`getSlowestPartyMember` / `getPartyMovement`).
10. Exploration turns = 10 minutes: **Pass**.
11. Combat rounds = 10 seconds: **Pass**.
12. Light ticking uses exploration turns only: **Pass**.

---

## 8) Prioritized Cleanup Recommendations

### Priority 1 (Correctness / determinism hardening)

1. Deprecate/remove `module/exploration/exploration-state.mjs` parallel runtime.
2. Consolidate distance conversion through `movement-contracts.convertDistanceByContext` only.
3. Remove no-op duplicate converter from `movement.mjs`.

### Priority 2 (Canonical consistency)

4. Remove or explicitly deprecate travel-pace metadata fields (`travelPace`, pace modifiers).
5. Add test that spell-area never converts in all wilderness contexts.

### Priority 3 (Future-risk reduction)

6. Add runtime diagnostics/schema checks on encumbrance payload shape for exploration APIs.
7. Document extension hooks as placeholders and not active gameplay automation.

---

## 9) What is intentionally NOT implemented yet

The runtime intentionally leaves these as extension placeholders (not automation):

- wandering monsters
- fatigue automation
- encounter rolling automation
- weather systems
- spell automation/duration engine beyond exploration turn tick hooks

These appear as extension fields/hook placeholders in runtime state and hook registration patterns.

---

## 10) Regression Test Summary (audit run)

Executed targeted test suites covering exploration, movement contracts, encumbrance, schema/migrations:

- exploration runtime tests
- movement contracts/runtime tests
- light/time exploration tests
- encumbrance regressions
- migration + schema regression suites touching runtime assumptions

Result: all selected suites passed (57/57 tests, 8/8 files).
