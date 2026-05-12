import { getClassLevelData, getMonsterHDData } from "./lookups.mjs";

export function getCharacterTHAC0(classId, level) {
  const levelData = getClassLevelData(classId, level);
  if (!levelData) return null;

  return levelData.thac0 ?? null;
}

export function getMonsterTHAC0(hd) {
  const hdData = getMonsterHDData(hd);
  if (!hdData) return null;

  return hdData.thac0 ?? null;
}

export function getActorTHAC0(actor) {
  if (!actor) return null;

  const actorType = actor.type;
  const actorSystem = actor.system;

  if (actorType === "character") {
    return getCharacterTHAC0(actorSystem?.class, actorSystem?.level);
  }

  if (actorType === "monster" || actorType === "npc") {
    return getMonsterTHAC0(actorSystem?.hd ?? actorSystem?.hitDice);
  }

  return null;
}
