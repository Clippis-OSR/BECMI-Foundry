import { describe, expect, it, vi } from 'vitest';

import {
  advanceExplorationTurn as advanceDeprecated,
  getExplorationSummary as summaryDeprecated,
  normalizeExplorationState as normalizeDeprecated
} from '../../module/exploration/exploration-state.mjs';
import {
  advanceExplorationTurn as advanceRuntime,
  getExplorationSummary as summaryRuntime,
  normalizeExplorationState as normalizeRuntime
} from '../../module/exploration/runtime.mjs';

describe('deprecated exploration-state wrapper', () => {
  it('warns and delegates to canonical runtime functions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const runtime = { encumbrance: { totalCarriedWeight: 401 }, movementContext: 'wildernessExploration' };

    const deprecatedState = normalizeDeprecated({ currentTurn: 1, elapsedTurns: 1 }, runtime);
    const runtimeState = normalizeRuntime({ currentTurn: 1, elapsedTurns: 1 }, runtime);
    expect(deprecatedState).toEqual(runtimeState);

    const deprecatedAdvanced = advanceDeprecated(deprecatedState, runtime);
    const runtimeAdvanced = advanceRuntime(runtimeState, runtime);
    expect(deprecatedAdvanced).toEqual(runtimeAdvanced);

    const deprecatedSummary = summaryDeprecated(deprecatedAdvanced.state, runtime);
    const runtimeSummary = summaryRuntime(runtimeAdvanced.state, runtime);
    expect(deprecatedSummary).toEqual(runtimeSummary);

    const deprecationWarnings = warnSpy.mock.calls
      .map((call) => String(call[0] ?? ''))
      .filter((msg) => msg.includes('exploration-state.mjs is deprecated'));
    expect(deprecationWarnings.length).toBe(1);
    warnSpy.mockRestore();
  });

  it('preserves deterministic sequencing with single-state mutation per turn', () => {
    const runtime = { encumbrance: { totalCarriedWeight: 401 }, movementContext: 'dungeonExploration' };
    const initial = normalizeRuntime({ currentTurn: 3, elapsedTurns: 3 }, runtime);

    const deprecatedResult = advanceDeprecated(initial, runtime);
    const runtimeResult = advanceRuntime(initial, runtime);

    expect(deprecatedResult.state.currentTurn).toBe(4);
    expect(runtimeResult.state.currentTurn).toBe(4);
    expect(deprecatedResult.state.elapsedTurns).toBe(4);
    expect(runtimeResult.state.elapsedTurns).toBe(4);
    expect(deprecatedResult.state).toEqual(runtimeResult.state);
  });
});
