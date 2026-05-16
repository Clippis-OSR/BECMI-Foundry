import { assertCanonicalActorType } from "../actors/actor-types.mjs";
import { compareHitDiceToBracket, normalizeHitDice } from "./hit-dice.mjs";
import { getActorClassId, getActorLevel, getClassTable } from "./lookups.mjs";

function parseLevelBand(label, index = 0) {
  if (typeof label !== "string") return null;
  const band = label.split("/").map((part) => part.trim()).filter(Boolean)[index];
  if (!band) return null;
  const match = band.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) return null;
  return { min: Number(match[1]), max: Number(match[2]) };
}

function getCanonicalCharacterThac0ByProfile(level, profile = "default") {
  const entries = CONFIG?.BECMI?.characterTHAC0?.entries;
  const levelNumber = Number(level);
  if (!entries || !Number.isFinite(levelNumber)) return null;
  const bandIndex = profile === "fighter" ? 0 : 1;

  for (const entry of Object.values(entries)) {
    const band = parseLevelBand(entry?.label, bandIndex) ?? parseLevelBand(entry?.label, 0);
    if (!band) continue;
    if (levelNumber >= band.min && levelNumber <= band.max) {
      const thac0 = Number(entry?.thac0);
      return Number.isFinite(thac0) ? thac0 : null;
    }
  }

  return null;
}

export function getCharacterTHAC0(classId, level) {
  const classTable = getClassTable(classId);
  if (!classTable) return null;

  const levelKey = String(level);
  const directThac0 = classTable?.levels?.[levelKey]?.thac0;
  if (typeof directThac0 === "number" && Number.isFinite(directThac0)) return directThac0;

  return getCanonicalCharacterThac0ByProfile(level, classTable?.thac0Profile ?? "default");
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

  if (actorType === "character") {
    const classId = getActorClassId(actor);
    const level = getActorLevel(actor);
    if (classId === null || level === null) return null;
    return getCharacterTHAC0(classId, level);
  }

  if (actorType === "creature") return getMonsterTHAC0(actor.system?.hd ?? actor.system?.hitDice);

  throw new Error(`[BECMI] Unsupported actor type "${actorType}" for THAC0 resolution.`);
}
