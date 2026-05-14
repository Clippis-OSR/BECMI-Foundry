/**
 * @file Optional damage application helpers for attack chat cards.
 */

const MODULE_ID = "becmi-foundry";
const APPLIED_FLAG = "damageApplied";

export function getActorHPPath(actor) {
  const candidates = [
    "system.hp.value",
    "system.attributes.hp.value",
    "system.health.value"
  ];

  for (const path of candidates) {
    const value = foundry.utils.getProperty(actor, path);
    if (value !== undefined && value !== null) return path;
  }

  return null;
}

export async function applyDamageToActor({ actor, amount } = {}) {
  if (!actor) throw new Error("[BECMI Combat] applyDamageToActor requires actor.");
  const hpPath = getActorHPPath(actor);
  if (!hpPath) throw new Error(`[BECMI Combat] Could not resolve HP path for actor ${actor?.name ?? "Unknown"}.`);

  const currentHP = Number(foundry.utils.getProperty(actor, hpPath) ?? 0);
  const normalizedAmount = Math.max(0, Number(amount ?? 0));
  const newHP = Math.max(0, currentHP - normalizedAmount);

  await actor.update({ [hpPath]: newHP });
  return { hpPath, previousHP: currentHP, newHP, amount: normalizedAmount };
}

export function canApplyDamageToActor(actor) {
  if (!actor) return false;
  if (actor.isOwner) return true;
  return game.user?.isGM === true;
}

export async function applyDamageFromMessage(message) {
  if (!message) return;

  const alreadyApplied = message.getFlag(MODULE_ID, APPLIED_FLAG) === true;
  if (alreadyApplied) {
    ui.notifications.warn("Damage from this attack card was already applied.");
    return;
  }

  const targetUuid = message.getFlag(MODULE_ID, "damageTargetUuid");
  const amount = Number(message.getFlag(MODULE_ID, "damageTotal") ?? 0);
  if (!targetUuid || !Number.isFinite(amount)) {
    ui.notifications.error("Missing target or damage data for this chat card.");
    return;
  }

  const actor = await fromUuid(targetUuid);
  if (!(actor instanceof Actor)) {
    ui.notifications.error("Target actor no longer exists.");
    return;
  }

  if (!canApplyDamageToActor(actor)) {
    ui.notifications.warn("Only a GM can apply damage to actors they do not own.");
    return;
  }

  await applyDamageToActor({ actor, amount });
  await message.setFlag(MODULE_ID, APPLIED_FLAG, true);
  ui.notifications.info(`Applied ${amount} damage to ${actor.name}.`);
}

