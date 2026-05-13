/**
 * @file Saving throw helpers.
 */

/**
 * BECMI saving throw categories.
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
 * @param {object} params
 * @param {number} params.rollTotal
 * @param {number} params.target
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
  return Number(saveProfile?.[category]?.value ?? saveProfile?.[category] ?? NaN);
}

/**
 * Render and optionally post a save result card to chat.
 *
 * @param {object} params
 * @param {object} params.saveResult
 * @returns {Promise<{content: string, message: object|null}>}
 */
export async function renderSaveCard({ saveResult } = {}) {
  if (!saveResult) throw new Error("[BECMI Combat] renderSaveCard requires saveResult.");

  const templatePath = "systems/becmi-foundry/templates/chat/save-card.hbs";
  const context = {
    actorName: saveResult?.actor?.name ?? "Unknown Actor",
    saveType: saveResult?.saveType ?? "save",
    label: saveResult?.label ?? saveResult?.saveType ?? "Saving Throw",
    target: saveResult?.target ?? "-",
    d20: saveResult?.d20 ?? "-",
    modifier: saveResult?.modifier ?? 0,
    total: saveResult?.total ?? "-",
    success: Boolean(saveResult?.success)
  };

  const content = await renderTemplate(templatePath, context);
  const message = await ChatMessage.create({ content });

  return { content, message };
}

/**
 * Roll and resolve a BECMI saving throw.
 *
 * @param {object} params
 * @param {object} params.actor
 * @param {string} params.saveType
 * @param {number} [params.modifier=0]
 * @param {string|null} [params.label=null]
 * @param {boolean} [params.postToChat=true]
 */
export async function rollSave({ actor, saveType, modifier = 0, label = null, postToChat = true } = {}) {
  if (!actor) throw new Error("[BECMI Combat] rollSave requires an actor.");
  if (!SAVE_TYPES.includes(saveType)) {
    throw new Error(`[BECMI Combat] Unknown save type '${saveType}'. Expected one of: ${SAVE_TYPES.join(", ")}.`);
  }

  console.log("BECMI saves data", actor?.system?.saves);
  const rawTarget = actor?.system?.saves?.[saveType]?.value;
  const target = Number(rawTarget);

  if (!Number.isFinite(target)) {
    throw new Error(`[BECMI Combat] Missing or invalid save target for '${saveType}' on actor '${actor?.name ?? "Unknown Actor"}'.`);
  }

  const roll = await (new Roll("1d20")).evaluate();
  const d20 = Number(roll.total);
  const flatModifier = Number(modifier);
  const safeModifier = Number.isFinite(flatModifier) ? flatModifier : 0;
  const total = d20 + safeModifier;
  const success = total >= target;

  const result = {
    actor,
    saveType,
    label: label ?? saveType,
    target,
    d20,
    modifier: safeModifier,
    total,
    success
  };

  if (postToChat) {
    await renderSaveCard({ saveResult: result });
  }

  return result;
}
