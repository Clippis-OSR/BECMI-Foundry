import { describe, expect, it } from 'vitest';

import * as exploration from '../../module/exploration/index.mjs';
import { advanceExplorationTurn, getExplorationSummary, normalizeExplorationState } from '../../module/exploration/runtime.mjs';

describe('exploration runtime integration', () => {
  it('advanceExplorationTurn updates elapsed exploration time', () => {
    const start = normalizeExplorationState({ currentTurn: 0, elapsedTurns: 0 });
    const result = advanceExplorationTurn(start);

    expect(result.state.currentTurn).toBe(1);
    expect(result.state.elapsedMinutes).toBe(10);
    expect(result.state.elapsedHours).toBeCloseTo(1 / 6, 5);
    expect(result.state.elapsedDays).toBeCloseTo(10 / 1440, 5);
  });

  it('ticks light sources during turn advancement', () => {
    const state = normalizeExplorationState({
      currentTurn: 3,
      elapsedTurns: 3,
      activeLightSources: [{ lightKey: 'torch', remainingTurns: 3 }]
    });

    const result = advanceExplorationTurn(state);
    expect(result.state.activeLightSources[0].remainingTurns).toBe(2);
    expect(result.state.activeLightSources[0].active).toBe(true);
  });

  it('updates movement summaries and preserves deterministic movement context', () => {
    const runtime = { encumbrance: { totalCarriedWeight: 100 }, movementContext: 'wildernessExploration' };
    const state = normalizeExplorationState({ currentTurn: 5, elapsedTurns: 5, movementContext: 'wildernessExploration' }, runtime);
    const result = advanceExplorationTurn(state, runtime);
    const summary = getExplorationSummary(result.state, runtime);

    expect(summary.movementContext).toBe('wildernessExploration');
    expect(summary.movementValue).toBeGreaterThan(0);
    expect(summary.milesPerDay).toBe(summary.movementValue / 5);
  });

  it('emits deterministic diagnostics and events for expired lights', () => {
    const hookEvents = [];
    const runtime = {
      hooks: {
        onExplorationLightExpired: (evt) => {
          hookEvents.push(evt.type);
          return { type: 'hookLightExpired', lightKey: evt.lightKey };
        }
      }
    };

    const state = normalizeExplorationState({
      currentTurn: 1,
      elapsedTurns: 1,
      activeLightSources: [{ lightKey: 'torch', remainingTurns: 1 }]
    });

    const result = advanceExplorationTurn(state, runtime);

    expect(result.state.activeLightSources[0].remainingTurns).toBe(0);
    expect(result.state.diagnostics.some((entry) => entry.includes('expired light'))).toBe(true);
    expect(result.events.some((evt) => evt.type === 'explorationLightExpired')).toBe(true);
    expect(result.events.some((evt) => evt.type === 'hookLightExpired')).toBe(true);
    expect(hookEvents).toEqual(['explorationLightExpired']);
  });

  it('exports runtime API for attachment to game.becmi', () => {
    expect(exploration).toHaveProperty('movement');
    expect(exploration).toHaveProperty('time');
    expect(exploration).toHaveProperty('light');
    expect(exploration).toHaveProperty('advanceExplorationTurn');
    expect(exploration).toHaveProperty('getMovementSummary');
    expect(exploration).toHaveProperty('getExplorationSummary');
  });

  it('normalizes deterministic canonical exploration state shape', () => {
    const state = normalizeExplorationState({
      currentTurn: 2,
      elapsedTurns: 2,
      movementContext: 'dungeonExploration',
      activeLightSources: [{ lightKey: 'lantern', remainingTurns: 5 }],
      diagnostics: ['seeded']
    });

    expect(state).toMatchObject({
      currentTurn: 2,
      elapsedMinutes: 20,
      movementContext: 'dungeonExploration',
      diagnostics: ['seeded']
    });
    expect(Array.isArray(state.activeLightSources)).toBe(true);
    expect(state).toHaveProperty('movementValue');
    expect(state).toHaveProperty('elapsedHours');
    expect(state).toHaveProperty('elapsedDays');
  });
});
