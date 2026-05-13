/**
 * @file High-level orchestration for combat flow.
 */

import {
  resolveAttack,
  getActorTHAC0,
  getTargetAC,
  calculateRequiredRoll,
  isAttackHit
} from "./attack.mjs";
import { rollDamage, finalizeDamage } from "./damage.mjs";
import {
  chooseInitiativeMode,
  setInitiativeMode,
  getInitiativeMode,
  rollGroupInitiative,
  rollIndividualInitiative,
  getOrCreateCombatWithSelectedTokens
} from "./initiative.mjs";
import { SAVE_TYPES, getSaveTarget, resolveSave, rollSave, renderSaveCard } from "./saves.mjs";
import { resolveMorale, rollMorale, renderMoraleCard, shouldCheckMorale } from "./morale.mjs";

export async function rollMoraleForSelectedCreatures({ reason = "Manual morale check", postToChat = true } = {}) {
  const selectedTokens = Array.from(canvas?.tokens?.controlled ?? []);
  const selectedCreatureTokens = selectedTokens.filter((token) => token?.actor?.type === "creature");
  const ignoredCount = selectedTokens.length - selectedCreatureTokens.length;

  if (selectedCreatureTokens.length === 0) {
    ui.notifications.warn("Select one or more creature tokens to roll morale.");
    return [];
  }

  if (ignoredCount > 0) {
    ui.notifications.warn("Morale only applies to creatures. Ignored non-creature tokens.");
  }

  console.log("BECMI | Rolling morale for selected creatures", selectedCreatureTokens);

  const results = [];
  for (const token of selectedCreatureTokens) {
    const moraleResult = await rollMorale({
      actor: token.actor,
      reason,
      postToChat
    });
    results.push({ token, moraleResult });
  }

  return results;
}

/**
 * Execute attack flow: resolve attack, then optionally roll damage on hit.
 *
 * Hook points:
 * - Weapon Mastery: enrich/transform attackData before resolveAttack.
 * - Monster abilities: inject special hit effects after attackResult.
 * - Equipment modifiers: precompute bonuses and place on attackData.
 */
export async function rollAttack({ attacker, target, attackData, rollDamageOnHit = true, postToChat = true } = {}) {
  if (!attacker) throw new Error("[BECMI Combat] rollAttack requires an attacker.");
  if (!target) throw new Error("[BECMI Combat] rollAttack requires a target.");
  if (!attackData || typeof attackData !== "object") throw new Error("[BECMI Combat] rollAttack requires attackData.");

  const attackResult = await resolveAttack({ attacker, target, attackData });
  let damageResult = null;

  if (attackResult.hit && rollDamageOnHit) {
    damageResult = await rollDamage({ attacker, target, attackData });
  }

  if (postToChat) {
    try {
      await renderAttackCard({ attackResult, damageResult });
    } catch (error) {
      console.warn("[BECMI Combat] Failed to post attack result to chat.", { error, attackResult, damageResult });
    }
  }

  return { attackResult, damageResult };
}

export async function renderAttackCard({ attackResult, damageResult = null } = {}) {
  if (!attackResult) throw new Error("[BECMI Combat] renderAttackCard requires attackResult.");
  const templatePath = "systems/becmi-foundry/templates/chat/attack-card.hbs";
  const context = {
    attackerName: attackResult?.attacker?.name ?? "Unknown Attacker",
    targetName: attackResult?.target?.name ?? "Unknown Target",
    attackName: attackResult?.attackName ?? "Attack",
    d20: attackResult?.d20 ?? "-",
    modifiers: attackResult?.modifiers ?? 0,
    total: attackResult?.total ?? "-",
    targetAC: attackResult?.targetAC ?? "-",
    requiredRoll: attackResult?.requiredRoll ?? "-",
    hit: Boolean(attackResult?.hit),
    damageResult
  };

  let content;
  try {
    content = await renderTemplate(templatePath, context);
  } catch (error) {
    console.warn("[BECMI Combat] Failed to render attack card template; using fallback content.", { error, templatePath, context });
    const resultText = context.hit ? "HIT" : "MISS";
    const damageText = damageResult ? ` | Damage: ${damageResult.total}` : "";
    content = `<div class=\"becmi-chat-card becmi-attack-card\">${context.attackerName} attacks ${context.targetName} with ${context.attackName}: d20 ${context.d20} ${context.modifiers >= 0 ? '+' : ''}${context.modifiers} = ${context.total}; AC ${context.targetAC}; need ${context.requiredRoll}; ${resultText}${damageText}</div>`;
  }

  let message = null;
  try {
    message = await ChatMessage.create({ content });
  } catch (error) {
    console.warn("[BECMI Combat] Failed to create chat message for attack card.", { error, content });
  }

  return { content, message };
}

export function createCombatEngine() {
  return {
    rollAttack,
    resolveAttack,
    rollDamage,
    rollSave,
    renderSaveCard,
    chooseInitiativeMode,
    setInitiativeMode,
    getInitiativeMode,
    rollGroupInitiative,
    rollIndividualInitiative,
    getOrCreateCombatWithSelectedTokens,
    rollMorale,
    rollMoraleForSelectedCreatures,
    renderMoraleCard,
    renderAttackCard,
    getActorTHAC0,
    getTargetAC,
    calculateRequiredRoll,
    isAttackHit,
    finalizeDamage,
    SAVE_TYPES,
    getSaveTarget,
    resolveSave,
    resolveMorale,
    shouldCheckMorale
  };
}

export {
  resolveAttack,
  rollDamage,
  rollSave,
  renderSaveCard,
  chooseInitiativeMode,
  setInitiativeMode,
  getInitiativeMode,
  rollGroupInitiative,
  rollIndividualInitiative,
  getOrCreateCombatWithSelectedTokens,
  rollMorale,
  rollMoraleForSelectedCreatures,
  renderMoraleCard,
  getActorTHAC0,
  getTargetAC,
  calculateRequiredRoll,
  isAttackHit,
  finalizeDamage,
  SAVE_TYPES,
  getSaveTarget,
  resolveSave,
  resolveMorale,
  shouldCheckMorale
};
