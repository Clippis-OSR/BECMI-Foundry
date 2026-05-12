import { getClassLevelData } from "./lookups.mjs";

export function getSpellcasting(classId, level) {
  const levelData = getClassLevelData(classId, level);
  if (!levelData) return null;

  return levelData.spellcasting ?? null;
}

export function getSpellSlots(classId, level) {
  const spellcasting = getSpellcasting(classId, level);
  if (!spellcasting || spellcasting.enabled === false) return null;

  return spellcasting.slots ?? null;
}

export function getSpellsKnown(classId, level) {
  const spellcasting = getSpellcasting(classId, level);
  if (!spellcasting || spellcasting.enabled === false) return null;

  return spellcasting.known ?? null;
}

export function actorHasSpellcasting(actor) {
  if (!actor || actor.type !== "character") return false;

  const spellcasting = getSpellcasting(actor.system?.class, actor.system?.level);
  return spellcasting?.enabled === true;
}
