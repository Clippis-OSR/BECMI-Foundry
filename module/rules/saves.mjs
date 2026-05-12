function normalizeClassId(classId) {
  if (typeof classId !== "string") return classId;
  if (classId === "magic-user") return "magicUser";
  return classId;
}

function toNumericValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function toSaveObject(source) {
  if (!source || typeof source !== "object") return null;

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
  const normalizedClassId = normalizeClassId(classId);
  const classTable = CONFIG?.BECMI?.classTables?.[normalizedClassId];

  if (!classTable) {
    console.warn(
      `[BECMI] Missing class table for "${classId}" (normalized: "${normalizedClassId}") in CONFIG.BECMI.classTables.`
    );
    return null;
  }

  const levelKey = String(level);
  const levelData = classTable?.levels?.[levelKey];

  if (!levelData) {
    console.warn(
      `[BECMI] Missing class level "${levelKey}" for class "${normalizedClassId}" in CONFIG.BECMI.classTables[\"${normalizedClassId}\"].levels.`
    );
    return null;
  }

  const saves = toSaveObject(levelData?.saves);
  if (!saves) {
    console.warn(
      `[BECMI] Missing or incomplete saves for class "${normalizedClassId}" level "${levelKey}" in CONFIG.BECMI.classTables[\"${normalizedClassId}\"].levels[\"${levelKey}\"].saves.`
    );
    return null;
  }

  return saves;
}

function getMonsterSaveEntry(hd) {
  const monsterSaves = CONFIG?.BECMI?.monsterSaves;
  if (!monsterSaves || typeof monsterSaves !== "object") {
    console.warn("[BECMI] Missing CONFIG.BECMI.monsterSaves.");
    return null;
  }

  const hdValue = toNumericValue(hd);
  if (hdValue === null) {
    console.warn(`[BECMI] Invalid monster HD value \"${hd}\" while resolving monster saves.`);
    return null;
  }

  const brackets = Object.entries(monsterSaves)
    .map(([key, value]) => ({ key, value, num: toNumericValue(key) }))
    .filter((entry) => entry.num !== null)
    .sort((a, b) => a.num - b.num);

  if (!brackets.length) {
    console.warn("[BECMI] CONFIG.BECMI.monsterSaves has no numeric HD brackets.");
    return null;
  }

  let selected = null;
  for (const bracket of brackets) {
    if (hdValue >= bracket.num) selected = bracket;
    else break;
  }

  if (!selected) selected = brackets[0];
  return selected.value;
}

export function getMonsterSaves(hd) {
  const saveEntry = getMonsterSaveEntry(hd);
  if (!saveEntry) return null;

  const directSaves = toSaveObject(saveEntry.saves ?? saveEntry);
  if (directSaves) return directSaves;

  if (saveEntry.savesAs) {
    const classId = saveEntry.savesAs.classId ?? saveEntry.savesAs.class;
    const level = saveEntry.savesAs.level;

    if (classId === undefined || level === undefined || level === null) {
      console.warn(
        `[BECMI] Monster savesAs is missing class/level data for HD \"${hd}\" in CONFIG.BECMI.monsterSaves.`
      );
      return null;
    }

    return getCharacterSaves(classId, level);
  }

  console.warn(
    `[BECMI] Monster save entry for HD \"${hd}\" has neither direct saves nor savesAs in CONFIG.BECMI.monsterSaves.`
  );
  return null;
}

export function getActorSaves(actor) {
  if (!actor) {
    console.warn("[BECMI] Cannot resolve actor saves: actor is missing.");
    return null;
  }

  const actorType = actor.type;
  const actorSystem = actor.system ?? {};

  if (actorType === "character") {
    if (actorSystem.class === undefined || actorSystem.level === undefined) {
      console.warn("[BECMI] Character actor is missing system.class or system.level for save lookup.");
      return null;
    }

    return getCharacterSaves(actorSystem.class, actorSystem.level);
  }

  if (actorType === "monster" || actorType === "npc") {
    const hd = actorSystem.hd ?? actorSystem.hitDice;
    if (hd === undefined) {
      console.warn("[BECMI] Monster/NPC actor is missing system.hd/system.hitDice for save lookup.");
      return null;
    }

    return getMonsterSaves(hd);
  }

  console.warn(`[BECMI] Unsupported actor type \"${actorType}\" for save lookup.`);
  return null;
}
