import { getClassLevelData } from "./lookups.mjs";

export function getTurnUndead(classId, level) {
  const levelData = getClassLevelData(classId, level);
  if (!levelData) return null;

  return levelData.turnUndead ?? null;
}

export function actorHasTurnUndead(actor) {
  if (!actor || actor.type !== "character") return false;

  return getTurnUndead(actor.system?.class, actor.system?.level) != null;
}
