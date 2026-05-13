/**
 * @file Initiative helpers for BECMI combat.
 */

const MODULE_ID = "becmi-foundry";
const FLAG_INITIATIVE_MODE = "initiativeMode";

export const INITIATIVE_MODE = Object.freeze({
  GROUP: "group",
  INDIVIDUAL: "individual"
});

function assertValidCombat(combat) {
  if (!combat) throw new Error("[BECMI Combat] No active combat.");
}

function assertGM() {
  if (!game.user?.isGM) throw new Error("[BECMI Combat] Only a GM can choose initiative mode.");
}

function normalizeMode(mode) {
  const normalized = String(mode ?? "").toLowerCase().trim();
  if (normalized === INITIATIVE_MODE.GROUP || normalized === INITIATIVE_MODE.INDIVIDUAL) return normalized;
  throw new Error(`[BECMI Combat] Invalid initiative mode: ${mode}`);
}

function getActorInitiativeModifier(actor) {
  const primary = actor?.system?.initiative?.modifier;
  const fallback = actor?.system?.attributes?.initiative?.modifier;
  const value = Number(primary ?? fallback ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export async function setInitiativeMode(combat, mode) {
  assertValidCombat(combat);
  assertGM();
  const initiativeMode = normalizeMode(mode);
  await combat.setFlag(MODULE_ID, FLAG_INITIATIVE_MODE, initiativeMode);
  return initiativeMode;
}

export function getInitiativeMode(combat) {
  assertValidCombat(combat);
  const stored = combat.getFlag(MODULE_ID, FLAG_INITIATIVE_MODE);
  if (!stored) return INITIATIVE_MODE.GROUP;
  return normalizeMode(stored);
}

export async function chooseInitiativeMode(combat) {
  assertValidCombat(combat);
  assertGM();

  return Dialog.wait({
    title: "Choose BECMI Initiative Mode",
    content: "<p>Select how initiative should be handled for this encounter.</p>",
    buttons: {
      group: {
        label: "Group Initiative",
        callback: async () => setInitiativeMode(combat, INITIATIVE_MODE.GROUP)
      },
      individual: {
        label: "Individual Initiative",
        callback: async () => setInitiativeMode(combat, INITIATIVE_MODE.INDIVIDUAL)
      }
    },
    default: "group",
    close: async () => setInitiativeMode(combat, INITIATIVE_MODE.GROUP)
  });
}

export async function rollGroupInitiative({ combat, partyModifier = 0, monsterModifier = 0, postToChat = true } = {}) {
  assertValidCombat(combat);
  if (!(combat.combatants?.size > 0)) throw new Error("[BECMI Combat] Cannot roll initiative: no combatants.");

  const partyMod = Number(partyModifier) || 0;
  const monsterMod = Number(monsterModifier) || 0;

  const partyRoll = await (new Roll("1d6")).evaluate();
  const monsterRoll = await (new Roll("1d6")).evaluate();

  const partyTotal = Number(partyRoll.total) + partyMod;
  const monsterTotal = Number(monsterRoll.total) + monsterMod;

  const winner = partyTotal === monsterTotal
    ? "tie"
    : partyTotal > monsterTotal ? "party" : "monster";

  const winnerLabel = winner === "party" ? "Party" : winner === "monster" ? "Monsters" : "Tie";

  const result = {
    mode: INITIATIVE_MODE.GROUP,
    party: { roll: Number(partyRoll.total), modifier: partyMod, modifierLabel: `${partyMod >= 0 ? "+" : ""}${partyMod}`, total: partyTotal },
    monsters: { roll: Number(monsterRoll.total), modifier: monsterMod, modifierLabel: `${monsterMod >= 0 ? "+" : ""}${monsterMod}`, total: monsterTotal },
    winner,
    winnerLabel
  };

  if (postToChat) {
    const templatePath = "systems/becmi-foundry/templates/chat/initiative-group-card.hbs";
    const content = await renderTemplate(templatePath, result);
    await ChatMessage.create({ content });
  }

  return result;
}

export async function rollIndividualInitiative({ combat, postToChat = true } = {}) {
  assertValidCombat(combat);
  const combatants = Array.from(combat.combatants ?? []);
  if (combatants.length === 0) throw new Error("[BECMI Combat] Cannot roll initiative: no combatants.");

  const results = [];
  for (const combatant of combatants) {
    const modifier = getActorInitiativeModifier(combatant.actor);
    const roll = await (new Roll("1d12")).evaluate();
    const total = Number(roll.total) + modifier;

    await combat.setInitiative(combatant.id, total);

    results.push({
      combatantId: combatant.id,
      name: combatant.name ?? combatant.actor?.name ?? "Unknown Combatant",
      roll: Number(roll.total),
      modifier,
      modifierLabel: `${modifier >= 0 ? "+" : ""}${modifier}`,
      total
    });
  }

  const result = {
    mode: INITIATIVE_MODE.INDIVIDUAL,
    results: results.sort((a, b) => b.total - a.total)
  };

  if (postToChat) {
    const templatePath = "systems/becmi-foundry/templates/chat/initiative-individual-card.hbs";
    const content = await renderTemplate(templatePath, result);
    await ChatMessage.create({ content });
  }

  return result;
}
