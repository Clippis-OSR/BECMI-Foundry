/**
 * @file Attack resolution helpers for BECMI/Classic D&D style combat.
 *
 * These functions are intentionally UI-agnostic so they can be used by both
 * player and monster workflows.
 */

/**
 * Safely read an actor THAC0 value with defensive fallbacks.
 *
 * Fallback chain checks common locations used by systems and lightweight actor-like objects.
 * Default THAC0 is 20 when data is missing.
 *
 * @param {object} actor Foundry Actor document or plain object.
 * @returns {number}
 */
export function getActorTHAC0(actor) {
  const thac0 = actor?.system?.combat?.thac0
    ?? actor?.system?.attributes?.thac0
    ?? actor?.thac0
    ?? 20;

  return Number(thac0);
}

/**
 * Safely read a target AC value with defensive fallbacks.
 *
 * BECMI uses descending AC. Lower AC means better defense, so AC values can
 * cross zero into negatives for heavily armored or magical targets.
 * Default AC is 9 when data is missing.
 *
 * @param {object} target Foundry Actor/token target or plain object.
 * @returns {number}
 */
export function getTargetAC(target) {
  const ac = target?.system?.combat?.ac
    ?? target?.system?.attributes?.ac
    ?? target?.ac
    ?? 9;

  return Number(ac);
}

/**
 * Calculate required d20 total to hit a target using THAC0 and descending AC.
 *
 * Descending AC rule:
 * requiredRoll = THAC0 - targetAC
 *
 * @param {number} thac0 Attacker THAC0 score.
 * @param {number} targetAC Defender armor class (descending AC).
 * @returns {number}
 */
export function calculateRequiredRoll(thac0, targetAC) {
  return Number(thac0) - Number(targetAC);
}

/**
 * Determine if an attack total hits the required roll.
 *
 * @param {number} attackTotal Total d20 attack result after modifiers.
 * @param {number} requiredRoll Required total to hit.
 * @returns {boolean}
 */
export function isAttackHit(attackTotal, requiredRoll) {
  return Number(attackTotal) >= Number(requiredRoll);
}

/**
 * Resolve an attack roll using BECMI THAC0 + descending AC logic.
 *
 * Notes:
 * - A lower target AC raises defense quality.
 * - THAC0 means "To Hit Armor Class 0".
 * - Required roll is derived as: THAC0 - targetAC.
 *
 * @param {object} params
 * @param {object} params.attacker Attacking actor-like object.
 * @param {object} params.target Defending actor-like object.
 * @param {object} [params.attackData={}] Attack metadata/config.
 * @param {string} [params.attackData.name] Attack display name.
 * @param {number} [params.attackData.attackBonus=0] Flat attack modifier.
 * @returns {Promise<{
 *   attacker: object,
 *   target: object,
 *   attackName: string,
 *   d20: number,
 *   modifiers: number,
 *   total: number,
 *   targetAC: number,
 *   thac0: number,
 *   requiredRoll: number,
 *   hit: boolean
 * }>}
 */
export async function resolveAttack({ attacker, target, attackData = {} }) {
  const thac0 = getActorTHAC0(attacker);
  const targetAC = getTargetAC(target);
  const modifiers = Number(attackData?.attackBonus ?? 0);

  const roll = await (new Roll("1d20")).evaluate();
  const d20 = Number(roll.total);
  const total = d20 + modifiers;
  const requiredRoll = calculateRequiredRoll(thac0, targetAC);
  const hit = isAttackHit(total, requiredRoll);

  return {
    attacker,
    target,
    attackName: attackData?.name ?? attackData?.id ?? "Attack",
    d20,
    modifiers,
    total,
    targetAC,
    thac0,
    requiredRoll,
    hit
  };
}
