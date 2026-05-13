/**
 * @file Saving throw helpers.
 */

/**
 * BECMI saving throw categories.
 *
 * - deathRayPoison: Avoid death rays and poison effects.
 * - magicWands: Resist wand and similar charged item effects.
 * - paralysisTurnStone: Resist paralysis and petrification effects.
 * - dragonBreath: Resist dragon breath weapon attacks.
 * - rodStaffSpell: Resist rods, staves, and spell effects.
 */
export const SAVE_TYPES = Object.freeze([
  "deathRayPoison",
  "magicWands",
  "paralysisTurnStone",
  "dragonBreath",
  "rodStaffSpell"
]);

/**
 * Resolve a saving throw against a target save value.
 *
 * In classic D&D style saves, success occurs when roll >= target.
 *
 * @param {object} params
 * @param {number} params.rollTotal Total d20 save roll after modifiers.
 * @param {number} params.target Target value needed to save.
 * @returns {{success: boolean, margin: number, target: number}}
 */
export function resolveSave({ rollTotal, target }) {
  const margin = rollTotal - target;
  return {
    success: margin >= 0,
    margin,
    target
  };
}

/**
 * Lookup a save target by save category.
 *
 * @param {object} saveProfile Save values keyed by category.
 * @param {string} category Save category key.
 * @returns {number}
 */
export function getSaveTarget(saveProfile, category) {
  return Number(saveProfile?.[category]?.value ?? saveProfile?.[category] ?? 20);
}

/**
 * Roll and resolve a BECMI saving throw.
 *
 * Success when d20 + modifier >= target.
 *
 * @param {object} params
 * @param {object} params.actor Foundry actor-like object.
 * @param {string} params.saveType One of SAVE_TYPES.
 * @param {number} [params.modifier=0] Flat bonus/penalty to the save roll.
 * @param {string|null} [params.label=null] Optional display label.
 * @returns {Promise<{
 *   actor: object,
 *   saveType: string,
 *   label: string,
 *   target: number,
 *   d20: number,
 *   modifier: number,
 *   total: number,
 *   success: boolean
 * }>}
 */
export async function rollSave({ actor, saveType, modifier = 0, label = null } = {}) {
  if (!actor) throw new Error("[BECMI Combat] rollSave requires an actor.");
  if (!SAVE_TYPES.includes(saveType)) {
    throw new Error(`[BECMI Combat] Unknown save type '${saveType}'. Expected one of: ${SAVE_TYPES.join(", ")}.`);
  }

  const target = Number(
    actor?.system?.saves?.[saveType]?.value
    ?? actor?.system?.attributes?.saves?.[saveType]?.value
    ?? actor?.system?.saves?.[saveType]
    ?? actor?.saves?.[saveType]?.value
    ?? actor?.saves?.[saveType]
    ?? 20
  );

  const roll = await (new Roll("1d20")).evaluate();
  const d20 = Number(roll.total);
  const flatModifier = Number(modifier);
  const total = d20 + flatModifier;
  const success = total >= target;

  return {
    actor,
    saveType,
    label: label ?? saveType,
    target,
    d20,
    modifier: flatModifier,
    total,
    success
  };
}
