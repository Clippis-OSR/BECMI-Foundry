import { getClassLevelData } from "./lookups.mjs";

export function getThiefSkills(classId, level) {
  const levelData = getClassLevelData(classId, level);
  if (!levelData) return null;

  return levelData.thiefSkills ?? null;
}

export function actorHasThiefSkills(actor) {
  if (!actor || actor.type !== "character") return false;

  return getThiefSkills(actor.system?.class, actor.system?.level) != null;
}
