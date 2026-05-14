function isCreatureActor(actor) {
  return actor?.type === 'creature';
}

function resolveActor(input) {
  if (!input) return null;
  if (input.actor) return input.actor;
  return input;
}

function toCreatureActors(actorsOrTokens = []) {
  const list = Array.isArray(actorsOrTokens) ? actorsOrTokens : [actorsOrTokens];
  return list
    .map(resolveActor)
    .filter((actor, index, arr) => isCreatureActor(actor) && arr.indexOf(actor) === index);
}

function toNumberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function getCreatureXP(actor) {
  if (!isCreatureActor(actor)) return 0;
  return toNumberOrZero(actor?.system?.monster?.xp);
}

export function calculateEncounterXP(actorsOrTokens = []) {
  return toCreatureActors(actorsOrTokens)
    .reduce((total, actor) => total + getCreatureXP(actor), 0);
}

export function getCreatureMorale(actor) {
  if (!isCreatureActor(actor)) return null;
  const morale = actor?.system?.monster?.morale
    ?? actor?.system?.morale?.value
    ?? actor?.system?.morale
    ?? actor?.system?.attributes?.morale?.value;
  const numeric = Number(morale);
  return Number.isFinite(numeric) ? numeric : null;
}

export function canRollMorale(actor) {
  return isCreatureActor(actor) && Number.isFinite(getCreatureMorale(actor));
}

export function normalizeTreasureType(treasureType) {
  if (treasureType === null || treasureType === undefined) return [];
  const parts = Array.isArray(treasureType)
    ? treasureType
    : String(treasureType).split(/[,;/]+/);

  return parts
    .map((part) => String(part).trim().toUpperCase())
    .filter(Boolean);
}

export function parseTreasureType(treasureType) {
  return normalizeTreasureType(treasureType);
}

export function getCreatureTreasureType(actor) {
  if (!isCreatureActor(actor)) return [];
  return normalizeTreasureType(actor?.system?.monster?.treasureType);
}

export function buildTreasureGenerationRequest(actorOrMonster) {
  const actor = resolveActor(actorOrMonster);
  const monster = actor?.system?.monster ?? actorOrMonster ?? {};
  const sourceMonsterId = actor?.flags?.becmi?.sourceMonsterId ?? monster?.id ?? null;

  return {
    monsterId: monster?.id ?? sourceMonsterId,
    sourceMonsterId,
    name: actor?.name ?? monster?.name ?? null,
    treasureType: normalizeTreasureType(monster?.treasureType),
    actorType: actor?.type ?? null,
    actorId: actor?.id ?? null
  };
}

export function buildEncounterSummary(actorsOrTokens = []) {
  const creatures = toCreatureActors(actorsOrTokens);
  const treasureTypeCounts = {};

  const entries = creatures.map((actor) => {
    const treasureTypes = getCreatureTreasureType(actor);
    for (const code of treasureTypes) {
      treasureTypeCounts[code] = (treasureTypeCounts[code] ?? 0) + 1;
    }

    return {
      id: actor.id ?? null,
      name: actor.name ?? 'Unknown Creature',
      xp: getCreatureXP(actor),
      morale: getCreatureMorale(actor),
      treasureType: treasureTypes,
      sourceMonsterId: actor?.flags?.becmi?.sourceMonsterId ?? actor?.system?.monster?.id ?? null
    };
  });

  return {
    creatureCount: creatures.length,
    names: entries.map((entry) => entry.name),
    totalXP: entries.reduce((total, entry) => total + entry.xp, 0),
    moraleValues: entries.map((entry) => entry.morale).filter((morale) => Number.isFinite(morale)),
    treasureTypes: treasureTypeCounts,
    sourceMonsterIds: entries.map((entry) => entry.sourceMonsterId).filter(Boolean),
    entries
  };
}
