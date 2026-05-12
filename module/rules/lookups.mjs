function normalizeClassId(classId) {
  if (typeof classId !== "string") return classId;
  if (classId === "magic-user") return "magicUser";
  return classId;
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
  const levelData = classTable?.[levelKey];

  if (!levelData) {
    console.warn(
      `[BECMI] Missing class level data for classId "${classId}" at level "${levelKey}".`
    );
    return null;
  }

  return levelData;
}

export function getMonsterHDData(hd) {
  const monsterProgression = CONFIG?.BECMI?.monsterProgression;
  const hdKey = String(hd);
  const hdData = monsterProgression?.[hdKey];

  if (!hdData) {
    console.warn(
      `[BECMI] Missing monster progression data for HD "${hdKey}" in CONFIG.BECMI.monsterProgression.`
    );
    return null;
  }

  return hdData;
}
