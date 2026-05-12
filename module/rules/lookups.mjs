import { compareHitDiceToBracket, normalizeHitDice } from "./hit-dice.mjs";

function isDebugDerivedDataEnabled() {
  return game?.settings?.get?.("becmi-foundry", "debugDerivedData") ?? false;
}

function debugDerivedDataLog(message, data) {
  if (!isDebugDerivedDataEnabled()) return;
  console.log(message, data);
}

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
  const rawLevel =
    actorSystem.derived?.level ??
    actorSystem.level ??
    actorSystem.level?.value ??
    actorSystem.details?.level;
  if (rawLevel === undefined || rawLevel === null || rawLevel === "") return null;

  const numericLevel = Number(rawLevel);
  if (Number.isFinite(numericLevel)) return numericLevel;

  return String(rawLevel);
}

export function getCharacterLevelFromXP(classId, xp) {
  const normalizedClassId = normalizeClassId(classId);
  const classTable = CONFIG?.BECMI?.classTables?.[normalizedClassId];
  const levels = classTable?.levels;

  if (!classTable || !levels || typeof levels !== "object") {
    debugDerivedDataLog("[BECMI] getCharacterLevelFromXP unresolved (missing class table or levels).", {
      classId,
      xp,
      resolvedLevel: null,
      availableLevelKeys: []
    });
    return null;
  }

  const currentXP = Number(xp);
  if (!Number.isFinite(currentXP) || currentXP < 0) {
    debugDerivedDataLog("[BECMI] getCharacterLevelFromXP resolved (invalid or empty XP).", {
      classId,
      xp,
      resolvedLevel: 1,
      availableLevelKeys: Object.keys(levels)
    });
    return 1;
  }

  const sortedLevelEntries = Object.entries(levels)
    .map(([levelKey, levelData]) => ({
      level: Number(levelKey),
      xp: levelData?.xp
    }))
    .filter((entry) => Number.isFinite(entry.level) && typeof entry.xp === "number" && Number.isFinite(entry.xp))
    .sort((a, b) => a.level - b.level);

  let resolvedLevel = 1;
  for (const entry of sortedLevelEntries) {
    if (currentXP >= entry.xp) resolvedLevel = entry.level;
    else break;
  }

  debugDerivedDataLog("[BECMI] getCharacterLevelFromXP resolved.", {
    classId,
    xp,
    resolvedLevel,
    availableLevelKeys: Object.keys(levels)
  });

  return resolvedLevel;
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
