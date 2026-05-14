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
