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
 * Roll and resolve a BECMI morale check.
 *
 * Success/hold occurs when finalTotal <= moraleScore.
 *
 * @param {object} params
 * @param {object} params.actor Monster/NPC actor-like object.
 * @param {number|null} [params.moraleScore=null] Explicit morale score override.
 * @param {number} [params.modifier=0] Modifier applied to the roll total.
 * @param {string|null} [params.reason=null] Optional reason/context label.
 * @param {boolean} [params.postToChat=true] Whether to post a morale result card.
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
export async function rollMorale({ actor, moraleScore = null, modifier = 0, reason = null, postToChat = true } = {}) {
  if (!actor) {
    console.warn("[BECMI Combat] rollMorale called without actor.");
    return null;
  }

  const resolvedMoraleScore = Number(
    moraleScore
    ?? actor?.system?.morale?.value
    ?? actor?.system?.morale
    ?? actor?.system?.attributes?.morale?.value
  );

  if (!Number.isFinite(resolvedMoraleScore)) {
    console.warn("[BECMI Combat] Missing actor morale score; could not resolve morale check.", { actor, moraleScore });
    return null;
  }

  const flatModifier = Number(modifier) || 0;
  const roll = await (new Roll("2d6")).evaluate();
  const rollTotal = Number(roll.total);
  const finalTotal = rollTotal + flatModifier;
  const success = finalTotal <= resolvedMoraleScore;

  const moraleResult = {
    actor,
    moraleScore: resolvedMoraleScore,
    reason,
    rollTotal,
    modifier: flatModifier,
    finalTotal,
    success
  };

  if (postToChat) {
    try {
      await renderMoraleCard({ moraleResult });
    } catch (error) {
      console.warn("[BECMI Combat] Failed to post morale check to chat.", { error, moraleResult });
    }
  }

  return moraleResult;
}

export async function renderMoraleCard({ moraleResult } = {}) {
  if (!moraleResult) throw new Error("[BECMI Combat] renderMoraleCard requires moraleResult.");

  const templatePath = "systems/becmi-foundry/templates/chat/morale-card.hbs";
  const context = {
    actorName: moraleResult?.actor?.name ?? "Unknown Creature",
    moraleScore: moraleResult?.moraleScore ?? "-",
    reason: moraleResult?.reason,
    rollTotal: moraleResult?.rollTotal ?? "-",
    modifier: moraleResult?.modifier ?? 0,
    finalTotal: moraleResult?.finalTotal ?? "-",
    success: Boolean(moraleResult?.success)
  };

  let content;
  try {
    content = await renderTemplate(templatePath, context);
  } catch (error) {
    console.warn("[BECMI Combat] Failed to render morale card template; using fallback content.", { error, templatePath, context });
    content = `<div class=\"becmi-chat-card becmi-morale-card\">${context.actorName} morale check: 2d6 ${context.modifier >= 0 ? "+" : ""}${context.modifier} = ${context.finalTotal}; morale ${context.moraleScore}; ${context.success ? "Holds" : "Fails"}</div>`;
  }

  let message = null;
  try {
    message = await ChatMessage.create({ content });
  } catch (error) {
    console.warn("[BECMI Combat] Failed to create chat message for morale card.", { error, content });
  }

  return { content, message };
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
