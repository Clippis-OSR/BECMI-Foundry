# Exploration Runtime Audit (Focused Post-Implementation Wilderness Regression)

Date: 2026-05-15
Canonical reference: `docs/rules/basic-expert-reference.md`

## 1. Executive summary

This audit reviewed exploration runtime behavior in the scoped areas: exploration, movement, wilderness procedures, time, encumbrance integration, distance conversion, terrain handling, forced march, and wilderness hooks.

Overall status:

- **Core canonical formulas are implemented and deterministic** in the active runtime path (`runtime.mjs` + `movement.mjs` + `movement-contracts.mjs`).
- **Single runtime authority is mostly enforced**, but a **legacy parallel exploration-state module** still exists and is a drift risk if reused.
- **Spell area non-conversion is correctly guarded** through category-aware conversion helpers.
- **Terrain and forced march are correctly applied to wilderness daily travel/progress only**, not dungeon/combat movement values.
- **Wilderness procedural hooks exist and are integrated**, but the procedures are currently deterministic hook-support contracts, not full procedural content generation.

## 2. Runtime consistency findings

### 2.1 Single runtime authority

- Canonical runtime functions (`normalizeExplorationState`, `advanceExplorationTurn`, summaries) are implemented in `module/exploration/runtime.mjs` and exported via `module/exploration/index.mjs`, which is the intended authority path.
- `module/exploration/exploration-state.mjs` remains as a parallel state module and is a **remaining legacy path** risk.

Finding: **Partial pass** (authoritative path is clear, but duplicate legacy module still present).

### 2.2 Deterministic movement

- Movement is normalized through numeric sanitization (`normalizeMovementValue`) and table-driven encumbrance tier resolution (`getMovementTierByEncumbrance`).
- Party movement deterministically resolves to the slowest active member with stable tiebreak ordering by id.

Finding: **Pass**.

### 2.3 Canonical movement formulas

- Combat movement derives from exploration movement using floor(`movement/3`).
- Wilderness miles/day derives as `movement/5`.
- Forced march derives as `normal daily travel * 1.5`.

Finding: **Pass**.

## 3. Wilderness procedure findings

- Runtime emits wilderness support events each exploration turn in wilderness context: encounter, lost, evasion, pursuit checks.
- Hook callbacks are available for each wilderness check and are invoked when registered.
- Encounter cadence state is tracked and triggers cadence events deterministically.

Finding: **Hook completeness pass for support contracts**; procedural generation remains intentionally external.

## 4. Terrain/forced march findings

- Terrain multipliers are defined and applied through `applyTerrainToDailyTravel`.
- Runtime applies terrain and forced march to wilderness daily travel/progress math.
- Terrain and forced march do **not** alter dungeon/combat movement values.

Finding: **Pass**.

## 5. Distance conversion findings

- Category-aware conversion path exists via `convertDistanceByContext` and `shouldConvertDistance`.
- `spellArea` is explicitly excluded from conversion (always feet semantics preserved).
- Runtime missile range helper delegates to category-aware conversion.

Finding: **Pass with cleanup caveat**: there is still a duplicate generic conversion helper (`convertRangeDistanceByContext`) that is currently identity/no-op and can become a bypass vector.

## 6. Exploration API findings

- Exploration API exports include `movement`, `time`, `light`, `movementContracts`, `distance`, and runtime state/summaries.
- API shape supports deterministic, frozen return objects in core runtime.
- Legacy/duplicate surface area persists due to older helper/module artifacts.

Finding: **Pass with drift-risk surface**.

## 7. Remaining drift risks

1. **Parallel exploration state path** (`exploration-state.mjs`) could be accidentally reintroduced as runtime authority.
2. **Duplicate distance helper** (`convertRangeDistanceByContext`) can bypass category semantics over time.
3. **Inert travel pace metadata** in movement helper output may invite non-canonical “pace” mechanics drift.
4. Runtime accepts externally provided encumbrance objects directly; malformed caller payloads can bypass full inventory-derived contracts unless validated at integration boundaries.

## 8. Remaining cleanup candidates

1. Deprecate/remove `module/exploration/exploration-state.mjs` after import-path verification.
2. Deprecate/remove `convertRangeDistanceByContext` in favor of a single category-based conversion entrypoint.
3. Document/trim inert `travelPace` placeholder fields from exploration movement helpers where not canonically required.
4. Add explicit module docs marking wilderness procedure functions as deterministic check contracts (not full encounter generator).

## 9. Regression test coverage summary

Executed scoped regression command:

- `npm test -- --run tests/exploration tests/runtime tests/time tests/contracts`

Result:

- 5 test files passed, 41 tests passed.
- Verified coverage in current suite for:
  - deterministic movement formulas
  - slowest-member party movement
  - terrain + forced march wilderness-only effects
  - spell-area non-conversion contract
  - exploration turn progression/time derivation
  - wilderness procedure support event emission

Coverage gaps to add next:

1. Explicit regression that `spellArea` remains non-converted across all wilderness contexts (`wildernessExploration`, `wildernessCombat`, `wildernessForcedMarch`).
2. Regression confirming no runtime consumers import/use `exploration-state.mjs` authority path.
3. Integration test asserting runtime movement uses actor inventory-derived encumbrance payload shape end-to-end.

## 10. Recommended next steps

1. **Authority hardening**: formally deprecate and then remove `exploration-state.mjs`.
2. **Conversion hardening**: remove duplicate generic distance helper and enforce category-based conversion API use.
3. **Drift prevention**: eliminate/label non-canonical travel pace placeholders.
4. **Regression expansion**: add the three gap tests listed above.
5. **Documentation alignment**: keep this audit and the canonical rules reference synchronized when runtime contracts evolve.
