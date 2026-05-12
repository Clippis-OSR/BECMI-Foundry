import { getActorClassId, getActorLevel } from "./lookups.mjs";

function normalizeClassId(classId) {
  if (classId === "magicUser") classId = "magic-user";
  if (typeof classId !== "string") return classId;
  if (classId === "magic-user") return "magicUser";
  return classId;
}

function isDebugDerivedDataEnabled() {
  return game?.settings?.get?.("becmi-foundry", "debugDerivedData") ?? false;
}

function debugDerivedDataLog(message, data) {
  if (!isDebugDerivedDataEnabled()) return;
  console.debug(message, data);
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

  debugDerivedDataLog("[BECMI] getCharacterSaves resolved.", {
    detectedClassId: classId,
    detectedLevel: level,
    resolvedClassTableId: normalizedClassId,
    resolvedLevelData: levelData,
    resolvedSaves: saves
  });

  return saves;
}

function getMonsterSaveEntry(hd) {
  const monsterSaves = CONFIG?.BECMI?.monsterSaves;
  if (!monsterSaves || typeof monsterSaves !== "object") {
    console.warn("[BECMI] Missing CONFIG.BECMI.monsterSaves.");
    return null;
  }

  const monsterSaveEntries = monsterSaves?.entries;
  if (!monsterSaveEntries || typeof monsterSaveEntries !== "object") {
    console.warn("[BECMI] Missing CONFIG.BECMI.monsterSaves.entries.");
    return null;
  }

  const hdValue = toNumericValue(hd);
  if (hdValue === null) {
    console.warn(`[BECMI] Invalid monster HD value \"${hd}\" while resolving monster saves.`);
    return null;
  }

  const brackets = Object.entries(monsterSaveEntries)
    .map(([key, value]) => ({ key, value, num: toNumericValue(key) }))
    .filter((entry) => entry.num !== null)
    .sort((a, b) => a.num - b.num);

  if (!brackets.length) {
    console.warn("[BECMI] CONFIG.BECMI.monsterSaves.entries has no numeric HD brackets.");
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

export function getCreatureSaves(actor) {
  if (!actor) {
    console.warn("[BECMI] Cannot resolve creature saves: actor is missing.");
    return null;
  }

  const savesAs = actor.system?.savesAs;
  if (!savesAs) return null;

  const classId = savesAs.classId ?? savesAs.class;
  const level = savesAs.level;

  if (classId === undefined || classId === null || classId === "") {
    console.warn(
      `[BECMI] Creature actor "${actor.name ?? actor.id ?? "Unknown"}" is missing system.savesAs.class for save lookup.`
    );
    return null;
  }

  if (level === undefined || level === null || level === "") {
    console.warn(
      `[BECMI] Creature actor "${actor.name ?? actor.id ?? "Unknown"}" is missing system.savesAs.level for save lookup.`
    );
    return null;
  }

  const saves = getCharacterSaves(classId, level);
  if (!saves) {
    console.warn(
      `[BECMI] Creature actor "${actor.name ?? actor.id ?? "Unknown"}" could not resolve saves for class "${classId}" level "${level}".`
    );
    return null;
  }

  return saves;
}

export function getActorSaves(actor) {
  if (!actor) {
    console.warn("[BECMI] Cannot resolve actor saves: actor is missing.");
    return null;
  }

  const actorType = actor.type;

  if (actorType === "character") {
    const classId = getActorClassId(actor);
    const level = getActorLevel(actor);

    const resolvedClassTableId = normalizeClassId(classId);
    const levelKey = String(level);
    const resolvedLevelData = CONFIG?.BECMI?.classTables?.[resolvedClassTableId]?.levels?.[levelKey];
    const resolvedSaves = toSaveObject(resolvedLevelData?.saves);

    debugDerivedDataLog("[BECMI] Character save resolution context.", {
      actorName: actor.name ?? actor.id ?? "Unknown",
      actorType,
      detectedClassId: classId,
      detectedLevel: level,
      resolvedClassTableId,
      resolvedLevelData,
      resolvedSaves
    });

    if (classId === null || level === null) {
      console.warn("[BECMI] Character actor is missing class or level data for save lookup.");
      return null;
    }

    return getCharacterSaves(classId, level);
  }

  if (actorType === "creature" || actorType === "monster" || actorType === "npc") {
    return getCreatureSaves(actor);
  }

  console.warn(`[BECMI] Unsupported actor type \"${actorType}\" for save lookup.`);
  return null;
}
