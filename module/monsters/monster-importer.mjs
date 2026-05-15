import { buildCreatureActorDataFromCanonicalMonster, buildNaturalAttackItemsFromMonster } from './monster-runtime.mjs';

function ensureCreature(actorData) {
  if (actorData?.type !== 'creature') throw new Error('[BECMI Monster Import] Only creature actors are supported.');
}

export async function createCreatureFromCanonicalMonster(monsterData, { actorApi, importVersion = 1 } = {}) {
  const actorData = buildCreatureActorDataFromCanonicalMonster(monsterData, { importVersion });
  ensureCreature(actorData);
  const itemData = buildNaturalAttackItemsFromMonster(monsterData);
  if (!actorApi?.createActor) throw new Error('[BECMI Monster Import] actorApi.createActor is required.');
  const created = await actorApi.createActor(actorData, itemData);
  return { actorData, itemData, actorId: created?.id ?? null };
}

export async function updateCreatureFromCanonicalMonster(actor, monsterData, { actorApi, importVersion = 1 } = {}) {
  const actorData = buildCreatureActorDataFromCanonicalMonster(monsterData, { importVersion });
  ensureCreature(actorData);
  const itemData = buildNaturalAttackItemsFromMonster(monsterData);
  if (!actorApi?.updateActor || !actorApi?.replaceImportedNaturalAttacks) {
    throw new Error('[BECMI Monster Import] actorApi.updateActor and replaceImportedNaturalAttacks are required.');
  }
  const updatePayload = {
    ...actorData,
    flags: {
      ...(actor?.flags ?? {}),
      ...(actorData.flags ?? {}),
      becmi: {
        ...(actor?.flags?.becmi ?? {}),
        ...(actorData.flags?.becmi ?? {})
      }
    }
  };
  const updated = await actorApi.updateActor(actor, updatePayload);
  await actorApi.replaceImportedNaturalAttacks(updated, itemData);
  return { actorData: updatePayload, itemData, actorId: updated?.id ?? actor?.id ?? null };
}
