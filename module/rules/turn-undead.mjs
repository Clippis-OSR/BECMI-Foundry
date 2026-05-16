import { getClassLevelData } from "./lookups.mjs";

export const CANONICAL_TURN_UNDEAD_CATEGORIES = Object.freeze([
  "skeleton",
  "zombie",
  "ghoul",
  "wight",
  "wraith",
  "mummy",
  "spectre",
  "vampire"
]);

export function getTurnUndead(classId, level) {
  const levelData = getClassLevelData(classId, level);
  if (!levelData) return null;

  return levelData.turnUndead ?? null;
}

export function actorHasTurnUndead(actor) {
  if (!actor || actor.type !== "character") return false;

  return getTurnUndead(actor.system?.class, actor.system?.level) != null;
}

export function getCanonicalTurnUndeadTable(turnUndead) {
  if (!turnUndead || typeof turnUndead !== "object") return null;
  return Object.fromEntries(CANONICAL_TURN_UNDEAD_CATEGORIES.map((category) => [category, turnUndead[category] ?? null]));
}

export function resolveTurnUndeadOutcome(entry, rollTotal) {
  if (entry === null || entry === undefined || entry === "") return { outcome: "none", threshold: null };
  if (entry === "T") return { outcome: "turn", threshold: null };
  if (entry === "D" || entry === "D+") return { outcome: "destroy", threshold: null };

  const threshold = Number(entry);
  if (!Number.isFinite(threshold)) return { outcome: "none", threshold: null };

  const total = Number(rollTotal);
  if (!Number.isFinite(total)) return { outcome: "none", threshold };
  return { outcome: total >= threshold ? "turn" : "none", threshold };
}
