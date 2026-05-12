import { getClassTable } from "./lookups.mjs";

function parseLevelBand(label, index = 0) {
  if (typeof label !== "string") return null;

  const band = label
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)[index];

  if (!band) return null;

  const match = band.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return null;

  return {
    min: Number(match[1]),
    max: Number(match[2])
  };
}

function getProfileEntries(characterThac0, profile) {
  if (!characterThac0 || typeof characterThac0 !== "object") return null;

  if (characterThac0.profiles?.[profile]?.entries) {
    return {
      entries: characterThac0.profiles[profile].entries,
      profileBandIndex: 0
    };
  }

  if (characterThac0[profile]?.entries) {
    return {
      entries: characterThac0[profile].entries,
      profileBandIndex: 0
    };
  }

  if (characterThac0.entries) {
    const profileBandIndex = Number(characterThac0.profileBandIndex?.[profile] ?? 0);
    return {
      entries: characterThac0.entries,
      profileBandIndex
    };
  }

  return null;
}

export function getCharacterTHAC0(classId, level) {
  const classTable = getClassTable(classId);
  if (!classTable) {
    console.warn(`[BECMI] Cannot resolve character THAC0: missing class table for classId "${classId}".`);
    return null;
  }

  const thac0Profile = classTable.thac0Profile;
  if (!thac0Profile) {
    console.warn(
      `[BECMI] Cannot resolve character THAC0: missing thac0Profile in CONFIG.BECMI.classTables["${classId}"].`
    );
    return null;
  }

  const levelNumber = Number(level);
  if (!Number.isFinite(levelNumber) || levelNumber < 1) {
    console.warn(`[BECMI] Cannot resolve character THAC0: invalid level "${level}" for classId "${classId}".`);
    return null;
  }

  const characterThac0 = CONFIG?.BECMI?.characterThac0;
  if (!characterThac0) {
    console.warn("[BECMI] Cannot resolve character THAC0: CONFIG.BECMI.characterThac0 is missing.");
    return null;
  }

  const profileData = getProfileEntries(characterThac0, thac0Profile);
  if (!profileData?.entries) {
    console.warn(
      `[BECMI] Cannot resolve character THAC0: no entries found for thac0Profile "${thac0Profile}" in CONFIG.BECMI.characterThac0.`
    );
    return null;
  }

  for (const entry of Object.values(profileData.entries)) {
    const range = parseLevelBand(entry?.label, profileData.profileBandIndex);
    if (!range) continue;

    if (levelNumber >= range.min && levelNumber <= range.max) {
      return typeof entry?.thac0 === "number" ? entry.thac0 : null;
    }
  }

  console.warn(
    `[BECMI] Cannot resolve character THAC0: no matching level band for profile "${thac0Profile}" at level ${levelNumber}.`
  );
  return null;
}

export function getMonsterTHAC0(hd) {
  const monsterThac0 = CONFIG?.BECMI?.monsterThac0;
  if (!monsterThac0?.hitDice) {
    console.warn("[BECMI] Cannot resolve monster THAC0: CONFIG.BECMI.monsterThac0.hitDice is missing.");
    return null;
  }

  const normalizedHd = normalizeMonsterHD(hd);
  if (normalizedHd === null) {
    console.warn(`[BECMI] Cannot resolve monster THAC0: invalid HD value "${hd}".`);
    return null;
  }

  for (const entry of Object.values(monsterThac0.hitDice)) {
    const range = parseMonsterHdBand(entry?.label);
    if (!range) continue;

    if (normalizedHd >= range.min && normalizedHd <= range.max) {
      return typeof entry?.thac0 === "number" ? entry.thac0 : null;
    }
  }

  console.warn(
    `[BECMI] Cannot resolve monster THAC0: no matching HD bracket for HD "${hd}" (normalized: ${normalizedHd}).`
  );
  return null;
}

function normalizeMonsterHD(hd) {
  if (typeof hd === "number") return Number.isFinite(hd) ? hd : null;
  if (typeof hd !== "string") return null;

  const value = hd.trim().toLowerCase();
  if (!value) return null;

  if (value.includes("/")) {
    const [num, den] = value.split("/").map((part) => Number(part.trim()));
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) return num / den;
    return null;
  }

  if (/^\d+\s*-\s*\d+$/.test(value)) {
    const [whole, sub] = value.split("-").map((part) => Number(part.trim()));
    if (Number.isFinite(whole) && Number.isFinite(sub)) return Math.max(whole - 1 + sub / 8, 0);
    return null;
  }

  if (/^\d+\s*\+\s*\d+$/.test(value)) {
    const [whole, bonus] = value.split("+").map((part) => Number(part.trim()));
    if (Number.isFinite(whole) && Number.isFinite(bonus)) return whole + bonus / 8;
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseMonsterHdBand(label) {
  if (typeof label !== "string") return null;
  const text = label.trim().toLowerCase();
  if (!text) return null;

  const upToMatch = text.match(/^up to\s+(\d+(?:\.\d+)?)$/);
  if (upToMatch) return { min: Number.NEGATIVE_INFINITY, max: Number(upToMatch[1]) };

  const andUpMatch = text.match(/^(\d+(?:\.\d+)?)\+\s+and up$/);
  if (andUpMatch) return { min: Number(andUpMatch[1]), max: Number.POSITIVE_INFINITY };

  const rangeMatch = text.match(/^(\d+(?:\.\d+)?)\+\s+to\s+(\d+(?:\.\d+)?)$/);
  if (rangeMatch) return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };

  return null;
}

export function getActorTHAC0(actor) {
  if (!actor) return null;

  const actorType = actor.type;
  const actorSystem = actor.system;

  if (actorType === "character") {
    return getCharacterTHAC0(actorSystem?.class, actorSystem?.level);
  }

  if (actorType === "monster" || actorType === "npc") {
    return getMonsterTHAC0(actorSystem?.hd ?? actorSystem?.hitDice);
  }

  return null;
}
