import { assertCanonicalActorType } from "../actors/actor-types.mjs";
import { compareHitDiceToBracket, normalizeHitDice } from "./hit-dice.mjs";
import { getActorClassId, getActorLevel, getClassTable } from "./lookups.mjs";

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

export function getCharacterTHAC0(classId, level, profile = "default") {
  const classTable = getClassTable(classId);
  if (!classTable) return null;

  const levelKey = String(level);
  const directThac0 = classTable?.levels?.[levelKey]?.thac0;
  if (typeof directThac0 === "number" && Number.isFinite(directThac0)) return directThac0;

  const profileEntries = getProfileEntries(classTable?.characterThac0 ?? classTable?.thac0, profile);
  const levelNumber = Number(level);
  if (!profileEntries || !Number.isFinite(levelNumber)) return null;

  for (const [label, value] of Object.entries(profileEntries.entries)) {
    const band = parseLevelBand(label, profileEntries.profileBandIndex);
    if (!band) continue;
    if (levelNumber >= band.min && levelNumber <= band.max) return Number(value);
  }

  return null;
}

export function getMonsterTHAC0(hd) {
  const normalizedHd = normalizeHitDice(hd);
  if (!normalizedHd) return null;

  const hitDiceTable = CONFIG?.BECMI?.monsterProgression?.hitDice;
  if (!hitDiceTable || typeof hitDiceTable !== "object") return null;

  for (const entry of Object.values(hitDiceTable)) {
    if (!entry || typeof entry !== "object") continue;
    if (!compareHitDiceToBracket(normalizedHd.numeric, entry.hd ?? entry.label)) continue;

    const thac0 = Number(entry.thac0);
    return Number.isFinite(thac0) ? thac0 : null;
  }

  return null;
}

export function getActorTHAC0(actor) {
  if (!actor) return null;

  const actorType = assertCanonicalActorType(actor.type, `getActorTHAC0 for actor "${actor?.name ?? actor?.id ?? "Unknown"}"`);
  const actorSystem = actor.system;

  if (actorType === "character") {
    const classId = getActorClassId(actor);
    const level = getActorLevel(actor);
    if (classId === null || level === null) return null;
    return getCharacterTHAC0(classId, level);
  }

  if (actorType === "creature") {
    return getMonsterTHAC0(actorSystem?.hd ?? actorSystem?.hitDice);
  }

  throw new Error(`[BECMI] Unsupported actor type "${actorType}" for THAC0 resolution.`);
}
