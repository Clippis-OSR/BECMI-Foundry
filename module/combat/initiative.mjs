/**
 * @file Initiative helpers for BECMI combat.
 *
 * This module is rules-only and does not mutate Foundry's Combat Tracker.
 */

/**
 * Roll BECMI group initiative.
 *
 * Group initiative is the default-first mode for this system pass.
 * Uses 1d12 + modifier.
 *
 * @param {object} params
 * @param {string} params.groupName Group/side label (e.g. "Party", "Goblins").
 * @param {number} [params.modifier=0] Flat initiative bonus/penalty.
 * @returns {Promise<{groupName: string, d12: number, modifier: number, total: number}>}
 */
export async function rollGroupInitiative({ groupName, modifier = 0 } = {}) {
  if (!groupName) throw new Error("[BECMI Combat] rollGroupInitiative requires groupName.");

  const flatModifier = Number(modifier);
  const roll = await (new Roll("1d12")).evaluate({ async: true });
  const d12 = Number(roll.total);
  const total = d12 + flatModifier;

  return {
    groupName,
    d12,
    modifier: flatModifier,
    total
  };
}

/**
 * Roll basic individual initiative for a single actor.
 *
 * This is intentionally simple for now and does not write to Combat documents.
 *
 * @param {object} params
 * @param {object} params.actor Actor-like object.
 * @param {number} [params.modifier=0] Flat initiative bonus/penalty.
 * @returns {Promise<{actor: object, actorName: string, d12: number, modifier: number, total: number}>}
 */
export async function rollActorInitiative({ actor, modifier = 0 } = {}) {
  if (!actor) throw new Error("[BECMI Combat] rollActorInitiative requires actor.");

  const flatModifier = Number(modifier);
  const roll = await (new Roll("1d12")).evaluate({ async: true });
  const d12 = Number(roll.total);
  const total = d12 + flatModifier;

  return {
    actor,
    actorName: actor?.name ?? "Unknown Actor",
    d12,
    modifier: flatModifier,
    total
  };
}

/**
 * Backward-compatible alias for previous API usage.
 *
 * @deprecated Prefer rollGroupInitiative.
 */
export const rollInitiative = rollGroupInitiative;

/**
 * Compare two initiative totals and return acting order.
 *
 * Lower total acts first in BECMI-style initiative.
 *
 * @param {number} a Initiative value for first side/actor.
 * @param {number} b Initiative value for second side/actor.
 * @returns {"a"|"b"|"tie"}
 */
export function compareInitiative(a, b) {
  if (a === b) return "tie";
  return a < b ? "a" : "b";
}
