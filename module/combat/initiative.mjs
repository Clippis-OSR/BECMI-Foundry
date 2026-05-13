/**
 * @file Initiative helpers for BECMI combat.
 */

const MODULE_ID = "becmi-foundry";
const FLAG_INITIATIVE_MODE = "initiativeMode";
const MAX_TIEBREAKER_ROUNDS = 20;

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
  assertGM();

  const runModeSelection = async (mode) => {
    try {
      const resolvedCombat = await getOrCreateCombatWithSelectedTokens(combat);
      if (!resolvedCombat) return null;

      if (mode === INITIATIVE_MODE.GROUP) {
        await setInitiativeMode(resolvedCombat, INITIATIVE_MODE.GROUP);
        return rollGroupInitiative({ combat: resolvedCombat, postToChat: true });
      }

      await setInitiativeMode(resolvedCombat, INITIATIVE_MODE.INDIVIDUAL);
      return rollIndividualInitiative({ combat: resolvedCombat, postToChat: true });
    } catch (error) {
      console.error("BECMI Foundry | Failed to choose and roll initiative mode.", { error, combatId: combat?.id, mode });
      ui.notifications.error("BECMI initiative mode selection failed. Check console for details.");
      return null;
    }
  };

  return Dialog.wait({
    title: "Choose BECMI Initiative Mode",
    content: "<p>Select how initiative should be handled for this encounter.</p>",
    buttons: {
      group: {
        label: "Group Initiative",
        callback: async () => runModeSelection(INITIATIVE_MODE.GROUP)
      },
      individual: {
        label: "Individual Initiative",
        callback: async () => runModeSelection(INITIATIVE_MODE.INDIVIDUAL)
      }
    },
    default: "group",
    close: async () => null
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

export function hasGroupTie(partyTotal, monsterTotal) {
  return Number(partyTotal) === Number(monsterTotal);
}

export async function resolveGroupInitiativeTie({ partyModifier = 0, monsterModifier = 0 } = {}) {
  const partyMod = Number(partyModifier) || 0;
  const monsterMod = Number(monsterModifier) || 0;
  const rounds = [];

  for (let round = 1; round <= MAX_TIEBREAKER_ROUNDS; round += 1) {
    const partyRoll = await (new Roll("1d6")).evaluate();
    const monsterRoll = await (new Roll("1d6")).evaluate();
    const partyTotal = Number(partyRoll.total) + partyMod;
    const monsterTotal = Number(monsterRoll.total) + monsterMod;
    const tie = hasGroupTie(partyTotal, monsterTotal);
    const winner = tie ? "tie" : (partyTotal > monsterTotal ? "party" : "monster");

    rounds.push({
      round,
      party: { roll: Number(partyRoll.total), total: partyTotal },
      monsters: { roll: Number(monsterRoll.total), total: monsterTotal },
      winner
    });

    if (!tie) {
      return { rounds, resolved: true, fallbackApplied: false };
    }
  }

  const lastRound = rounds[rounds.length - 1];
  const winner = lastRound.party.total >= lastRound.monsters.total ? "party" : "monster";
  return {
    rounds,
    resolved: false,
    fallbackApplied: true,
    fallbackWarning: `Group initiative remained tied after ${MAX_TIEBREAKER_ROUNDS} tie-break rounds. Using fallback winner: ${winner}.`
  };
}

export function findTiedIndividualInitiatives(results = []) {
  const totalsToIds = new Map();
  for (const result of results) {
    const bucket = totalsToIds.get(result.total) ?? [];
    bucket.push(result.combatantId);
    totalsToIds.set(result.total, bucket);
  }
  return Array.from(totalsToIds.values()).filter((group) => group.length > 1);
}

export async function resolveIndividualInitiativeTies(results = []) {
  const resolvedResults = results.map((result) => ({ ...result }));
  const rounds = [];

  for (let round = 1; round <= MAX_TIEBREAKER_ROUNDS; round += 1) {
    const tiedGroups = findTiedIndividualInitiatives(resolvedResults);
    if (tiedGroups.length === 0) {
      return { results: resolvedResults, rounds, resolved: true, fallbackApplied: false };
    }

    const tiedIds = new Set(tiedGroups.flat());
    const roundRerolls = [];
    for (const entry of resolvedResults) {
      if (!tiedIds.has(entry.combatantId)) continue;
      const roll = await (new Roll("1d12")).evaluate();
      entry.roll = Number(roll.total);
      entry.total = Number(roll.total) + entry.modifier;
      entry.rerollCount = (entry.rerollCount ?? 0) + 1;
      roundRerolls.push({
        combatantId: entry.combatantId,
        name: entry.name,
        roll: entry.roll,
        modifier: entry.modifier,
        modifierLabel: entry.modifierLabel,
        total: entry.total
      });
    }

    rounds.push({
      round,
      tiedGroups: tiedGroups.map((group) => group.map((id) => resolvedResults.find((r) => r.combatantId === id)?.name ?? id)),
      rerolls: roundRerolls
    });
  }

  const warning = `Individual initiative ties remained after ${MAX_TIEBREAKER_ROUNDS} tie-break rounds. Applying decimal fallback offsets.`;
  console.warn(`BECMI Foundry | ${warning}`);
  ui.notifications.warn(warning);

  const tiedGroups = findTiedIndividualInitiatives(resolvedResults);
  for (const group of tiedGroups) {
    const sorted = group
      .map((id) => resolvedResults.find((entry) => entry.combatantId === id))
      .filter(Boolean)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    sorted.forEach((entry, idx) => {
      entry.total = Number(entry.total) - (idx * 0.001);
    });
  }

  return { results: resolvedResults, rounds, resolved: false, fallbackApplied: true, fallbackWarning: warning };
}
export async function rollGroupInitiative({ combat, partyModifier = 0, monsterModifier = 0, postToChat = true } = {}) {
  combat = await getOrCreateCombatWithSelectedTokens(combat);
  if (!combat) return null;
  console.log("BECMI | Using combat", combat);
  console.log("BECMI | Combatants", combat.combatants.contents);

  const partyMod = Number(partyModifier) || 0;
  const monsterMod = Number(monsterModifier) || 0;

  const tieResolution = await resolveGroupInitiativeTie({ partyModifier: partyMod, monsterModifier: monsterMod });
  const initialRound = tieResolution.rounds[0];
  const finalRound = tieResolution.rounds[tieResolution.rounds.length - 1];
  const partyTotal = finalRound.party.total;
  const monsterTotal = finalRound.monsters.total;
  const winner = tieResolution.fallbackApplied
    ? (partyTotal >= monsterTotal ? "party" : "monster")
    : finalRound.winner;

  const winnerLabel = winner === "party" ? "Party" : winner === "monster" ? "Monsters" : "Tie";

  await applyGroupInitiativeToTracker({ combat, winner, partyTotal, monsterTotal });

  const result = {
    mode: INITIATIVE_MODE.GROUP,
    party: { roll: initialRound.party.roll, modifier: partyMod, modifierLabel: `${partyMod >= 0 ? "+" : ""}${partyMod}`, total: initialRound.party.total },
    monsters: { roll: initialRound.monsters.roll, modifier: monsterMod, modifierLabel: `${monsterMod >= 0 ? "+" : ""}${monsterMod}`, total: initialRound.monsters.total },
    tieHistory: tieResolution.rounds.slice(1).map((round) => ({
      round: round.round,
      partyRoll: round.party.roll,
      partyTotal: round.party.total,
      monsterRoll: round.monsters.roll,
      monsterTotal: round.monsters.total,
      winner: round.winner
    })),
    final: {
      partyRoll: finalRound.party.roll,
      partyTotal: finalRound.party.total,
      monsterRoll: finalRound.monsters.roll,
      monsterTotal: finalRound.monsters.total
    },
    fallbackApplied: tieResolution.fallbackApplied,
    fallbackWarning: tieResolution.fallbackWarning,
    winner,
    winnerLabel
  };

  if (postToChat) {
    const templatePath = "systems/becmi-foundry/templates/chat/initiative-group-card.hbs";
    const content = await renderTemplate(templatePath, result);
    await ChatMessage.create({ content });

    if (tieResolution.fallbackApplied) {
      await ChatMessage.create({ content: `<p><strong>BECMI Initiative:</strong> ${tieResolution.fallbackWarning}</p>` });
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

  const initialResults = [];
  for (const combatant of combatants) {
    const modifier = getActorInitiativeModifier(combatant.actor);
    const roll = await (new Roll("1d12")).evaluate();
    const total = Number(roll.total) + modifier;

    initialResults.push({
      combatantId: combatant.id,
      name: combatant.name ?? combatant.actor?.name ?? "Unknown Combatant",
      roll: Number(roll.total),
      modifier,
      modifierLabel: `${modifier >= 0 ? "+" : ""}${modifier}`,
      total
    });
  }

  const tieResolution = await resolveIndividualInitiativeTies(initialResults);
  const finalResults = tieResolution.results;

  for (const result of finalResults) {
    await combat.setInitiative(result.combatantId, result.total);
  }

  const result = {
    mode: INITIATIVE_MODE.INDIVIDUAL,
    initialResults: initialResults.map((entry) => ({ ...entry })),
    tieHistory: tieResolution.rounds,
    fallbackApplied: tieResolution.fallbackApplied,
    fallbackWarning: tieResolution.fallbackWarning,
    results: finalResults.sort((a, b) => b.total - a.total)
  };

  if (postToChat) {
    const templatePath = "systems/becmi-foundry/templates/chat/initiative-individual-card.hbs";
    const content = await renderTemplate(templatePath, result);
    await ChatMessage.create({ content });
  }

  return result;
}
