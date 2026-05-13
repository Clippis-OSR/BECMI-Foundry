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

function getSelectedTokens() {
  return Array.from(canvas?.tokens?.controlled ?? []);
}

function buildCombatantData(token) {
  const actor = token?.actor;
  if (!token?.id || !actor?.id) return null;

  return {
    tokenId: token.id,
    sceneId: token.scene?.id ?? canvas?.scene?.id,
    actorId: actor.id,
    name: token.name ?? actor.name,
    img: token.document?.texture?.src ?? actor.img
  };
}

export async function ensureCombatants(combat) {
  if (!combat) return null;
  if (combat.combatants?.size > 0) return combat;

  const selectedTokens = getSelectedTokens();
  if (selectedTokens.length === 0) return combat;

  const existingTokenIds = new Set(Array.from(combat.combatants ?? []).map((c) => c.tokenId));
  const combatantData = selectedTokens
    .filter((token) => !existingTokenIds.has(token.id))
    .map((token) => buildCombatantData(token))
    .filter(Boolean);

  if (combatantData.length > 0) {
    await combat.createEmbeddedDocuments("Combatant", combatantData);
  }

  return combat;
}

export async function getOrCreateCombatWithSelectedTokens(existingCombat = null) {
  let combat = existingCombat ?? game.combat;

  if (combat) {
    combat = await ensureCombatants(combat);
  } else {
    const selectedTokens = getSelectedTokens();
    if (selectedTokens.length > 0) {
      const scene = canvas?.scene;
      if (scene) {
        combat = await Combat.create({
          scene: scene.id,
          active: true
        });
        combat = await ensureCombatants(combat);
      }
    }
  }

  if (!(combat?.combatants?.size > 0)) {
    ui.notifications.warn("Select tokens and add them to combat, or select tokens before rolling initiative.");
    return null;
  }

  return combat;
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



export function getCombatantSide(combatant) {
  const actor = combatant?.actor;
  const actorType = String(actor?.type ?? "").toLowerCase();
  const creatureRole = String(actor?.system?.creatureRole ?? "").toLowerCase();

  if (actorType === "character") return "party";
  if (actorType === "creature" || creatureRole === "monster") return "monster";

  const disposition = Number(combatant?.token?.disposition ?? combatant?.token?.document?.disposition ?? 0);
  if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return "party";
  if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) return "monster";

  return "monster";
}

export async function applyGroupInitiativeToTracker({ combat, winner, partyTotal, monsterTotal } = {}) {
  if (!combat) return;

  // Group initiative in BECMI is rolled once per side. These tracker initiative values are
  // artificial numbers used only to force side-based sort order in the Combat Tracker UI.
  if (winner === "tie" || partyTotal === monsterTotal) return;

  const combatants = Array.from(combat.combatants ?? []);
  const partyCombatants = combatants.filter((combatant) => getCombatantSide(combatant) === "party");
  const monsterCombatants = combatants.filter((combatant) => getCombatantSide(combatant) !== "party");

  const winningSide = winner === "party" ? partyCombatants : monsterCombatants;
  const losingSide = winner === "party" ? monsterCombatants : partyCombatants;

  const updates = [];
  for (const [index, combatant] of winningSide.entries()) {
    updates.push(combat.setInitiative(combatant.id, 20 - (index * 0.01)));
  }

  for (const [index, combatant] of losingSide.entries()) {
    updates.push(combat.setInitiative(combatant.id, 10 - (index * 0.01)));
  }

  await Promise.all(updates);
}
export async function rollGroupInitiative({ combat, partyModifier = 0, monsterModifier = 0, postToChat = true } = {}) {
  combat = await getOrCreateCombatWithSelectedTokens(combat);
  if (!combat) return null;
  console.log("BECMI | Using combat", combat);
  console.log("BECMI | Combatants", combat.combatants.contents);

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

  await applyGroupInitiativeToTracker({ combat, winner, partyTotal, monsterTotal });

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

    if (winner === "tie") {
      await ChatMessage.create({ content: "<p><strong>BECMI Initiative:</strong> Tie detected. Combat Tracker order is unchanged.</p>" });
    }
  }

  return result;
}

export async function rollIndividualInitiative({ combat, postToChat = true } = {}) {
  combat = await getOrCreateCombatWithSelectedTokens(combat);
  if (!combat) return null;
  console.log("BECMI | Using combat", combat);
  console.log("BECMI | Combatants", combat.combatants.contents);
  const combatants = Array.from(combat.combatants ?? []);

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
