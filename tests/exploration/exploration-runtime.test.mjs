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



  it('uses slowest active party member for wilderness movement', () => {
    const runtime = {
      movementContext: 'wildernessExploration',
      party: [
        { id: 'a', name: 'Fast', movementValue: 120, active: true },
        { id: 'b', name: 'Slow', movementValue: 60, active: true },
        { id: 'c', name: 'Inactive', movementValue: 30, active: false }
      ],
      encumbrance: { totalCarriedWeight: 0 }
    };
    const state = normalizeExplorationState({ movementContext: 'wildernessExploration' }, runtime);
    expect(state.movementValue).toBe(60);
  });

  it('advances deterministic wilderness travel stages in one canonical path', () => {
    const runtime = { encumbrance: { totalCarriedWeight: 401 }, movementContext: 'wildernessExploration' };
    const state = normalizeExplorationState({
      movementContext: 'wildernessExploration',
      wilderness: { terrainKey: 'rough', encounterCadenceTurns: 2, encounterCadenceCounter: 1 }
    }, runtime);

    const result = advanceExplorationTurn(state, runtime);
    expect(result.state.wilderness.travelProgressMiles).toBeCloseTo((18 * 0.75) / 24, 6);
    expect(result.state.wilderness.encounterCadenceCounter).toBe(0);
    expect(result.events.some((evt) => evt.type === 'explorationEncounterCadence')).toBe(true);
    expect(result.state.diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining('determine movement'),
      expect.stringContaining('apply terrain modifiers'),
      expect.stringContaining('advance travel'),
      expect.stringContaining('consume exploration time'),
      expect.stringContaining('process encounter cadence hooks'),
      expect.stringContaining('tick light/duration systems')
    ]));
  });

  it('applies terrain and forced march to wilderness daily travel summaries only', () => {
    const runtime = { encumbrance: { totalCarriedWeight: 401 }, movementContext: 'wildernessExploration' };
    const state = normalizeExplorationState({
      movementContext: 'wildernessExploration',
      wilderness: { terrainKey: 'rough', forcedMarchUsed: true }
    }, runtime);

    const summary = getExplorationSummary(state, runtime);
    expect(summary.milesPerDay).toBe(18);
    expect(summary.terrainAdjustedMilesPerDay).toBe(13.5);
    expect(summary.forcedMarchMilesPerDay).toBe(20.25);
  });

  it('does not apply terrain or forced march to dungeon/combat movement values', () => {
    const runtime = { encumbrance: { totalCarriedWeight: 401 }, movementContext: 'dungeonCombat' };
    const state = normalizeExplorationState({
      movementContext: 'dungeonCombat',
      wilderness: { terrainKey: 'mountains', forcedMarchUsed: true }
    }, runtime);

    const summary = getExplorationSummary(state, runtime);
    expect(summary.movementValue).toBe(90);
    expect(summary.milesPerDay).toBe(18);
  });

  it('emits wilderness procedure support events and hook outputs in wilderness context', () => {
    const runtime = {
      movementContext: 'wildernessExploration',
      wildernessProcedureInput: {
        encounterDieRoll: 1,
        encounterTarget: 1,
        lostDieRoll: 1,
        lostTarget: 1,
        evasionDieRoll: 6,
        evasionTarget: 7,
        pursuitDieRoll: 8,
        pursuitTarget: 7
      },
      hooks: {
        onWildernessEncounterCheck: (evt) => ({ type: 'hookWildernessEncounter', success: evt.result.check.output.success })
      }
    };

    const state = normalizeExplorationState({ movementContext: 'wildernessExploration' }, runtime);
    const result = advanceExplorationTurn(state, runtime);

    expect(result.events.some((evt) => evt.type === 'wildernessEncounterCheck')).toBe(true);
    expect(result.events.some((evt) => evt.type === 'wildernessLostCheck')).toBe(true);
    expect(result.events.some((evt) => evt.type === 'wildernessEvasionCheck')).toBe(true);
    expect(result.events.some((evt) => evt.type === 'wildernessPursuitCheck')).toBe(true);
    expect(result.events.some((evt) => evt.type === 'hookWildernessEncounter')).toBe(true);
  });


  it('respects light automation toggle when disabled', () => {
    const state = normalizeExplorationState({ currentTurn: 1, elapsedTurns: 1, activeLightSources: [{ lightKey: 'torch', remainingTurns: 4 }] });
    const result = advanceExplorationTurn(state, { automation: { autoTickLightSources: false } });

    expect(result.state.activeLightSources[0].remainingTurns).toBe(4);
    expect(result.events.some((evt) => evt.type === 'explorationLightExpired')).toBe(false);
  });

  it('emits optional ration, morale, and rest helper reminder events deterministically', () => {
    const state = normalizeExplorationState({ currentTurn: 143, elapsedTurns: 143, movementContext: 'wildernessExploration', wilderness: { encounterCadenceTurns: 1, encounterCadenceCounter: 0 } });
    const runtime = { automation: { rationReminderCadenceTurns: 2, moraleReminderPrompts: true, restHelperPrompts: true } };
    const result = advanceExplorationTurn(state, runtime);

    expect(result.events.some((evt) => evt.type === 'explorationRationReminder')).toBe(true);
    expect(result.events.some((evt) => evt.type === 'explorationMoraleReminder')).toBe(true);
    expect(result.events.some((evt) => evt.type === 'explorationRestPrompt')).toBe(true);
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
