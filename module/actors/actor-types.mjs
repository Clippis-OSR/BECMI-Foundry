/**
 * Canonical BECMI actor document model.
 *
 * Only two Actor document types are supported at runtime:
 * - character
 * - creature
 *
 * Legacy aliases (monster, npc) were intentionally removed to eliminate split
 * logic paths and ensure every subsystem derives behavior from one canonical type model.
 */
export const CANONICAL_ACTOR_TYPES = Object.freeze(["character", "creature"]);

export function assertCanonicalActorType(actorType, context = "runtime") {
  const normalized = String(actorType ?? "").trim().toLowerCase();
  if (CANONICAL_ACTOR_TYPES.includes(normalized)) return normalized;
  throw new Error(`[BECMI] Invalid actor type "${actorType}" in ${context}. Valid types: character, creature.`);
}
