import { getClassLevelData } from "./lookups.mjs";

const HEAR_NOISE_RANGE_TO_PERCENT = {
  "1-2": 33,
  "1-3": 50,
  "1-4": 67,
  "1-5": 83
};

function toPercent(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.min(100, Math.trunc(value)));
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed in HEAR_NOISE_RANGE_TO_PERCENT) return HEAR_NOISE_RANGE_TO_PERCENT[trimmed];
    const parsed = Number(trimmed.replace(/%$/, ""));
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.trunc(parsed)));
  }
  return 0;
}

export function normalizeThiefSkills(rawSkills) {
  if (!rawSkills || typeof rawSkills !== "object") return null;

  const findRemoveSource = rawSkills.findRemoveTraps ?? rawSkills.findTraps ?? rawSkills.removeTraps;

  return {
    openLocks: toPercent(rawSkills.openLocks),
    findRemoveTraps: toPercent(findRemoveSource),
    pickPockets: toPercent(rawSkills.pickPockets),
    moveSilently: toPercent(rawSkills.moveSilently),
    climbWalls: toPercent(rawSkills.climbWalls),
    hideInShadows: toPercent(rawSkills.hideInShadows),
    hearNoise: toPercent(rawSkills.hearNoise)
  };
}

export function getThiefSkills(classId, level) {
  const levelData = getClassLevelData(classId, level);
  if (!levelData) return null;

  return normalizeThiefSkills(levelData.thiefSkills);
}

export function actorHasThiefSkills(actor) {
  if (!actor || actor.type !== "character") return false;

  return getThiefSkills(actor.system?.class, actor.system?.level) != null;
}
