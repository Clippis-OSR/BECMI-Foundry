import { describe, expect, it } from 'vitest';

import {
  resolveWildernessEncounterCheck,
  resolveWildernessLostCheck,
  resolveWildernessEvasionCheck,
  resolveWildernessPursuitCheck
} from '../../module/exploration/wilderness-procedures.mjs';

describe('wilderness procedures', () => {
  it('resolves deterministic encounter cadence hooks without auto-generation', () => {
    const result = resolveWildernessEncounterCheck({ cadenceTurns: 3, cadenceCounter: 2, dieRoll: 1, target: 1, modifier: 0 });
    expect(result.cadence.cadenceDue).toBe(true);
    expect(result.check.output.success).toBe(true);
    expect(result.nextCadenceCounter).toBe(0);
  });

  it('calculates lost checks with modifier support and assumptions', () => {
    const result = resolveWildernessLostCheck({ dieRoll: 2, target: 1, modifier: 1 });
    expect(result.output.success).toBe(true);
    expect(result.input.adjustedTarget).toBe(2);
    expect(result.input.assumptions).toContain('d6 check');
  });

  it('returns evasion helper outputs as deterministic 2d6 procedure checks', () => {
    const result = resolveWildernessEvasionCheck({ dieRoll: 8, target: 7, modifier: 2 });
    expect(result.output.success).toBe(true);
    expect(result.input.adjustedTarget).toBe(9);
  });

  it('returns pursuit helper outputs as deterministic 2d6 procedure checks', () => {
    const result = resolveWildernessPursuitCheck({ dieRoll: 10, target: 7, modifier: 1 });
    expect(result.output.success).toBe(false);
    expect(result.output.margin).toBe(-2);
  });

  it('is deterministic for identical input payloads', () => {
    const input = Object.freeze({ dieRoll: 3, target: 2, modifier: 0 });
    const a = resolveWildernessLostCheck(input);
    const b = resolveWildernessLostCheck(input);
    expect(a).toEqual(b);
  });
});
