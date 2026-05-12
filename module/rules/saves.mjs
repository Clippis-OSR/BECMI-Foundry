import { getClassLevelData, getMonsterHDData } from "./lookups.mjs";

function toSaveObject(source) {
  if (!source) return null;

  const { death, wands, paralysis, breath, spells } = source;

  if (
    death === undefined ||
    wands === undefined ||
    paralysis === undefined ||
    breath === undefined ||
    spells === undefined
  ) {
    return null;
  }

  return { death, wands, paralysis, breath, spells };
}

export function getCharacterSaves(classId, level) {
  const levelData = getClassLevelData(classId, level);
  if (!levelData) return null;

  return toSaveObject(levelData);
}

function resolveMonsterSavesAs(savesAs) {
  if (!savesAs || typeof savesAs !== "object") return null;

  const { classId, level } = savesAs;
  if (classId === undefined || level === undefined) return null;

  return getCharacterSaves(classId, level);
}

export function getMonsterSaves(hd) {
  const hdData = getMonsterHDData(hd);
  if (!hdData) return null;

  if (hdData.savesAs) {
    return resolveMonsterSavesAs(hdData.savesAs);
  }

  return toSaveObject(hdData);
}

export function getActorSaves(actor) {
  if (!actor) return null;

  const actorType = actor.type;
  const actorSystem = actor.system;

  if (actorType === "character") {
    return getCharacterSaves(actorSystem?.class, actorSystem?.level);
  }

  if (actorType === "monster" || actorType === "npc") {
    return getMonsterSaves(actorSystem?.hd ?? actorSystem?.hitDice);
  }

  return null;
}
