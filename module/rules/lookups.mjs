import { compareHitDiceToBracket, normalizeHitDice } from "./hit-dice.mjs";

function normalizeActorClassIdValue(classId) {
  if (typeof classId !== "string") return classId;
  if (classId === "magicUser") return "magic-user";
  return classId;
}

function normalizeClassId(classId) {
  classId = normalizeActorClassIdValue(classId);
  if (typeof classId !== "string") return classId;
  if (classId === "magic-user") return "magicUser";
  return classId;
}

export function getActorClassId(actor) {
  const actorSystem = actor?.system ?? {};
  const classId =
    actorSystem.class ??
    actorSystem.classId ??
    actorSystem.details?.class ??
    actorSystem.class?.value;

  if (classId === undefined || classId === null || classId === "") return null;
  return normalizeActorClassIdValue(classId);
}

export function getActorLevel(actor) {
  const actorSystem = actor?.system ?? {};
  const rawLevel = actorSystem.level ?? actorSystem.level?.value ?? actorSystem.details?.level;
  if (rawLevel === undefined || rawLevel === null || rawLevel === "") return null;

  const numericLevel = Number(rawLevel);
  if (Number.isFinite(numericLevel)) return numericLevel;

  return String(rawLevel);
}

export function getClassTable(classId) {
  const normalizedClassId = normalizeClassId(classId);
  const classTables = CONFIG?.BECMI?.classTables;
  const classTable = classTables?.[normalizedClassId];

  if (!classTable) {
    console.warn(
      `[BECMI] Missing class table for classId "${classId}" (normalized: "${normalizedClassId}") in CONFIG.BECMI.classTables.`
    );
    return null;
  }

  return classTable;
}

export function getClassLevelData(classId, level) {
  const classTable = getClassTable(classId);

  if (!classTable) {
    console.warn(
      `[BECMI] Cannot get class level data for classId "${classId}" because class table is missing.`
    );
    return null;
  }

  const levelKey = String(level);
  const levels = classTable?.levels;
  const levelData = levels?.[levelKey];

  if (!levelData) {
    console.warn(
      `[BECMI] Missing class level data for classId "${classId}" at level "${levelKey}".`
    );
    return null;
  }

  return levelData;
}

export function getMonsterHDData(hd) {
  const monsterProgression = CONFIG?.BECMI?.monsterProgression?.hitDice;
  if (!monsterProgression || typeof monsterProgression !== "object") {
    console.warn("[BECMI] Missing CONFIG.BECMI.monsterProgression.hitDice.");
    return null;
  }

  const normalizedHd = normalizeHitDice(hd);
  if (!normalizedHd) {
    console.warn(`[BECMI] Invalid monster HD value "${hd}".`);
    return null;
  }

  for (const entry of Object.values(monsterProgression)) {
    const bracket = entry?.hd ?? entry?.label;
    if (!compareHitDiceToBracket(normalizedHd.numeric, bracket)) continue;
    return entry;
  }

  console.warn(
    `[BECMI] Missing monster progression data for HD "${hd}" (normalized: ${normalizedHd.numeric}) in CONFIG.BECMI.monsterProgression.`
  );
  return null;
}
