import { getMonsterByKey } from '../monsters/monster-index.mjs';
import { getExplorationSummary, normalizeExplorationState } from '../exploration/runtime.mjs';

function asPositiveInt(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.trunc(n));
}

export function buildEncounterMonsterOption(monster) {
  const system = monster?.system ?? monster;
  return Object.freeze({
    monsterKey: String(system?.monsterKey ?? ''),
    name: String(system?.name ?? 'Unknown Monster'),
    morale: Number(system?.morale ?? 0) || 0,
    movement: String(system?.movement ?? ''),
    numberAppearing: String(system?.numberAppearing ?? ''),
    source: String(system?.source?.book ?? system?.source ?? '')
  });
}

export function selectEncounterMonster(monsterKey) {
  if (!monsterKey) throw new Error('[BECMI Encounter Helper] selectEncounterMonster requires monsterKey.');
  const monster = getMonsterByKey(monsterKey);
  if (!monster) throw new Error(`[BECMI Encounter Helper] monster "${monsterKey}" was not found in canonical index.`);
  return buildEncounterMonsterOption(monster.system ?? monster);
}

export function createEncounterGroup({ monsterKey, quantity = 1, context = 'dungeon', notes = '' } = {}) {
  const selected = selectEncounterMonster(monsterKey);
  return Object.freeze({
    type: 'monsterGroup',
    context: context === 'wilderness' ? 'wilderness' : 'dungeon',
    monsterKey: selected.monsterKey,
    name: selected.name,
    quantity: asPositiveInt(quantity, 1),
    morale: selected.morale,
    movement: selected.movement,
    numberAppearing: selected.numberAppearing,
    source: selected.source,
    notes: String(notes ?? '').trim()
  });
}

export function buildEncounterHelperState({ monsterKey, quantity = 1, context = 'dungeon', notes = '' } = {}) {
  const group = createEncounterGroup({ monsterKey, quantity, context, notes });
  return Object.freeze({
    context: group.context,
    groups: Object.freeze([group]),
    summary: Object.freeze({
      monsterCount: group.quantity,
      moraleVisible: group.morale,
      movementVisible: group.movement
    })
  });
}

export function buildWildernessEncounterHelper({ monsterKey, quantity = 1, explorationState = {}, runtime = {} } = {}) {
  const normalized = normalizeExplorationState({ ...explorationState, movementContext: 'wildernessExploration' }, runtime);
  const summary = getExplorationSummary(normalized, runtime);
  const encounter = buildEncounterHelperState({ monsterKey, quantity, context: 'wilderness' });
  return Object.freeze({
    encounter,
    wilderness: Object.freeze({
      terrainKey: normalized.wilderness.terrainKey,
      encounterCadenceTurns: normalized.wilderness.encounterCadenceTurns,
      encounterCadenceCounter: normalized.wilderness.encounterCadenceCounter,
      milesPerDay: summary.terrainAdjustedMilesPerDay
    })
  });
}
