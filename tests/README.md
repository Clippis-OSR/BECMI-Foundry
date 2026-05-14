# BECMI Regression Test Suite

This suite focuses on deterministic, logic-level regression checks for critical combat and equipment behavior.

## Structure

- `tests/combat/combat-regressions.test.mjs`
  - Descending AC hit calculation.
  - Group initiative tie-breakers.
  - Individual initiative tie-breakers.
  - Morale rolls only valid for creatures.
  - Duplicate damage prevention.
- `tests/equipment/equipment-regressions.test.mjs`
  - Two-handed weapon blocks shield/offhand.
  - Shield occupies offhand.
  - Natural attacks bypass hand restrictions.
  - Ammo linkage validation.
- `tests/schema/schema-regressions.test.mjs`
  - Canonical slot enforcement.
  - Canonical actor type enforcement.
- `tests/helpers/foundry-test-helpers.mjs`
  - Foundry utility stubs and deterministic roll queue.

## Rules assumptions and why these tests matter

### BECMI descending AC assumptions

- Hit math follows THAC0 minus descending AC (`required = THAC0 - AC`).
- Lower AC is better defense; negative AC is valid and should increase required hit roll.

Regression risk: changes to combat formulas can silently invert AC handling.

### Initiative tie-breakers

- Group initiative ties must re-roll until resolved (with fallback after max rounds).
- Individual ties must only re-roll tied combatants.

Regression risk: tie handling often drifts during refactors, causing unfair turn ordering.

### Morale creature-only gate

- Morale checks should only apply to creature actors, not character actors.

Regression risk: accidental broadened scope can produce invalid morale prompts/results for PCs.

### Duplicate damage prevention

- Damage from a single attack card should not be applied twice.

Regression risk: repeated button clicks or macro retries can over-apply damage.

### Equipment hand and slot constraints

- Two-handed main weapon must block shield/offhand.
- Shield occupies both `shield` and `weaponOffhand` representation.
- Natural attacks are exempt from hand occupancy constraints.

Regression risk: equip logic is stateful and can desync slots, causing illegal loadouts.

### Schema enforcement

- Item slots must be canonical values.
- Actor type must be canonical (`character`, `creature`).

Regression risk: schema drift introduces alias values that break combat/equipment pipelines.

## Run

```bash
npm test
```

## Suggested CI integration

- Add a fast unit-test step in CI:
  - install dependencies (if any)
  - run `npm test`
- Keep this suite required for merges touching `module/combat`, `module/items`, or `module/utils/schema-validation.mjs`.
- Optionally split by path filters for focused jobs:
  - combat path changes -> combat tests
  - item/schema path changes -> equipment + schema tests

## Manual QA areas (not fully unit-testable here)

- Chat-card rendering templates and localization text.
- Combat Tracker UI sorting behavior after initiative writes.
- Permission edge-cases involving real Foundry ownership/GM roles across connected clients.
