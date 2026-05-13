/**
 * @file Damage helpers for combat resolution.
 */

/**
 * Roll attack damage for BECMI-style combat from attack metadata.
 *
 * This helper is intentionally UI-agnostic and does not mutate actor HP.
 *
 * @param {object} params
 * @param {object} params.attacker Attacking actor-like object.
 * @param {object} params.target Defending actor-like object.
 * @param {object} [params.attackData={}] Attack metadata/config.
 * @param {string} [params.attackData.name] Attack display name.
 * @param {string} [params.attackData.damage] Dice formula such as "1d8" or "1d6+1".
 * @param {number} [params.attackData.damageBonus=0] Flat damage modifier.
 * @returns {Promise<{
 *   attacker: object,
 *   target: object,
 *   attackName: string,
 *   formula: string,
 *   bonus: number,
 *   total: number,
 *   roll: Roll
 * }>}
 */
export async function rollDamage({ attacker, target, attackData = {} }) {
  const formula = String(attackData?.damage ?? "1");
  const bonus = Number(attackData?.damageBonus ?? 0);

  if (!attackData?.damage) {
    console.warn("[BECMI Combat] Missing attackData.damage; defaulting to formula '1'.", {
      attackData,
      attacker,
      target
    });
  }

  let roll;
  try {
    roll = await (new Roll(formula)).evaluate({ async: true });
  } catch (error) {
    console.warn("[BECMI Combat] Invalid damage formula; defaulting to 1.", {
      formula,
      error,
      attackData,
      attacker,
      target
    });
    roll = await (new Roll("1")).evaluate({ async: true });
  }

  const total = Number(roll.total) + bonus;

  return {
    attacker,
    target,
    attackName: attackData?.name ?? attackData?.id ?? "Attack",
    formula,
    bonus,
    total,
    roll
  };
}

/**
 * Apply flat damage modifiers and minimum damage floor.
 *
 * @param {number} baseDamage Damage before post-processing.
 * @param {number} [modifier=0] Additional damage modifier.
 * @param {number} [minimum=0] Minimum possible final damage.
 * @returns {number}
 */
export function finalizeDamage(baseDamage, modifier = 0, minimum = 0) {
  return Math.max(minimum, Number(baseDamage) + Number(modifier));
}
