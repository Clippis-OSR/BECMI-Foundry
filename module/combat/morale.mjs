/**
 * @file Morale check helpers for monsters/NPC groups.
 */

/**
 * Resolve a morale roll against a morale score.
 *
 * Typical BECMI morale checks roll 2d6; result <= morale succeeds.
 *
 * @param {number} moraleScore Morale target value.
 * @param {number} moraleRoll Rolled morale total.
 * @returns {{holds: boolean, margin: number}}
 */
export function resolveMorale(moraleScore, moraleRoll) {
  const margin = moraleScore - moraleRoll;
  return {
    holds: margin >= 0,
    margin
  };
}

/**
 * Roll and resolve a BECMI monster morale check.
 *
 * Success/hold occurs when finalTotal <= moraleScore.
 *
 * @param {object} params
 * @param {object} params.actor Monster/NPC actor-like object.
 * @param {number|null} [params.moraleScore=null] Explicit morale score override.
 * @param {number} [params.modifier=0] Modifier applied to the roll total.
 * @param {string|null} [params.reason=null] Optional reason/context label.
 * @returns {Promise<{
 *   actor: object,
 *   moraleScore: number,
 *   reason: string|null,
 *   rollTotal: number,
 *   modifier: number,
 *   finalTotal: number,
 *   success: boolean
 * }>}
 */
export async function rollMorale({ actor, moraleScore = null, modifier = 0, reason = null } = {}) {
  if (!actor) throw new Error("[BECMI Combat] rollMorale requires actor.");

  const resolvedMoraleScore = Number(
    moraleScore
    ?? actor?.system?.morale?.value
    ?? actor?.system?.morale
    ?? 7
  );

  if (moraleScore == null && actor?.system?.morale == null) {
    console.warn("[BECMI Combat] Missing actor morale score; using fallback moraleScore=7.", { actor });
  }

  const flatModifier = Number(modifier);
  const roll = await (new Roll("2d6")).evaluate();
  const rollTotal = Number(roll.total);
  const finalTotal = rollTotal + flatModifier;
  const success = finalTotal <= resolvedMoraleScore;

  return {
    actor,
    moraleScore: resolvedMoraleScore,
    reason,
    rollTotal,
    modifier: flatModifier,
    finalTotal,
    success
  };
}

/**
 * Determine whether a morale check should be triggered.
 *
 * @param {object} context Encounter context flags.
 * @param {boolean} [context.firstCasualty=false] Trigger on first casualty.
 * @param {boolean} [context.leaderDefeated=false] Trigger when leader falls.
 * @param {boolean} [context.outnumbered=false] Trigger when significantly outnumbered.
 * @returns {boolean}
 */
export function shouldCheckMorale(context = {}) {
  return Boolean(context.firstCasualty || context.leaderDefeated || context.outnumbered);
}
