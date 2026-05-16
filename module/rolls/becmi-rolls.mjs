import { getActorTHAC0 as getRulesActorTHAC0 } from "../rules/thac0.mjs";
import { resolveTurnUndeadOutcome } from "../rules/turn-undead.mjs";
export async function rollSavingThrow(actor, saveKey, label) {
  const target = Number(
    actor.system.saves?.[saveKey]?.value
      ?? actor.system.derived?.saves?.[saveKey]
      ?? 20
  );

  const roll = await new Roll("1d20").evaluate();

  const total = roll.total;
  const success = total >= target;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>${label}</h2>
      <p><strong>Target:</strong> ${target}+</p>
      <p><strong>Result:</strong> ${success ? "SUCCESS" : "FAILURE"}</p>
    `
  });
}

export async function rollAbilityCheck(actor, abilityKey, label) {
  const target = Number(actor.system.abilities?.[abilityKey]?.value ?? 0);

  const roll = await new Roll("1d20").evaluate();

  const total = roll.total;
  const success = total <= target;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>${label} Check</h2>
      <p><strong>Target:</strong> ${target} or less</p>
      <p><strong>Result:</strong> ${success ? "SUCCESS" : "FAILURE"}</p>
    `
  });
}

export async function rollThiefSkill(actor, skillKey, label) {
  const target = Number(actor.system.derived?.thiefSkills?.[skillKey] ?? 0);

  const roll = await new Roll("1d100").evaluate();

  const total = roll.total;
  const success = total <= target;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>${label}</h2>
      <p><strong>Chance:</strong> ${target}%</p>
      <p><strong>Result:</strong> ${success ? "SUCCESS" : "FAILURE"}</p>
    `
  });
}

export async function rollWeaponAttack(actor, attackIndex) {
  const attack = actor.system.attacks?.[attackIndex];

  if (!attack) return;

  const thac0 = Number(getRulesActorTHAC0(actor) ?? 20);
  const name = attack.name || "Attack";
  const attackModifier = Number(attack.attackModifier ?? 0);
  const damageFormula = attack.damageRoll || "1d6";
  const damageModifier = Number(attack.damageModifier ?? 0);

  const attackRoll = await new Roll(`1d20 + ${attackModifier}`).evaluate();
  const attackTotal = attackRoll.total;
  const naturalRoll = attackRoll.dice?.[0]?.total ?? attackTotal;
  const hitAC = thac0 - attackTotal;

  const damageRoll = await new Roll(`${damageFormula} + ${damageModifier}`).evaluate();

  await attackRoll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>${name}</h2>
      <p><strong>THAC0:</strong> ${thac0}</p>
      <p><strong>Attack Modifier:</strong> ${attackModifier >= 0 ? "+" : ""}${attackModifier}</p>
      <p><strong>Natural Roll:</strong> ${naturalRoll}</p>
      <p><strong>Total Attack:</strong> ${attackTotal}</p>
      <p><strong>Hits AC:</strong> ${hitAC}</p>
      <hr>
      <p><strong>Damage Formula:</strong> ${damageFormula} ${damageModifier >= 0 ? "+" : ""}${damageModifier}</p>
      <p><strong>Damage:</strong> ${damageRoll.total}</p>
    `
  });
}

export async function rollCharacterAttack(actor, attack) {
  if (!actor || !attack) return;

  const attackName = (attack.name || "").trim() || "Attack";
  const thac0 = Number(getRulesActorTHAC0(actor) ?? 20);
  const attackMod = Number(attack.attackMod ?? 0);
  const formula = attackMod === 0
    ? "1d20"
    : attackMod > 0
      ? `1d20 + ${attackMod}`
      : `1d20 - ${Math.abs(attackMod)}`;

  try {
    const roll = await new Roll(formula).evaluate();
    const total = roll.total;
    const acHit = thac0 - total;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `
        <h2>${actor.name} — ${attackName}</h2>
        <p><strong>Formula:</strong> ${formula}</p>
        <p><strong>Total:</strong> ${total}</p>
        <p><strong>THAC0:</strong> ${thac0}</p>
        <p><strong>Attack Modifier:</strong> ${attackMod >= 0 ? "+" : ""}${attackMod}</p>
        <p><strong>AC Hit:</strong> ${acHit}</p>
      `
    });
  } catch (error) {
    console.error(error);
    ui.notifications.error(`Failed to roll attack for ${attackName}.`);
  }
}

export async function rollInitiative(actor) {
  const modifier = Number(actor.system.combat?.initiative ?? 0);

  const roll = await new Roll(`1d12 + ${modifier}`).evaluate();

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>Initiative</h2>
      <p><strong>Roll Type:</strong> 1d12</p>
      <p><strong>Modifier:</strong> ${modifier >= 0 ? "+" : ""}${modifier}</p>
      <p><strong>Total:</strong> ${roll.total}</p>
    `
  });
}


export async function rollMorale(actor) {
  if (!actor) {
    ui.notifications.warn("Select a creature token first.");
    return null;
  }

  if (actor.type !== "creature") {
    ui.notifications.warn("Morale checks are only used for creatures.");
    return null;
  }

  const morale = Number(actor.system.combat?.morale ?? actor.system?.morale ?? 8);
  const roll = await new Roll("2d6").evaluate();
  const total = roll.total;
  const success = total <= morale;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>Morale Check</h2>
      <p><strong>Actor:</strong> ${actor.name}</p>
      <p><strong>Morale Target:</strong> ${morale}</p>
      <p><strong>Roll Result:</strong> ${total}</p>
      <p><strong>Result:</strong> ${success ? "SUCCESS" : "FAILURE"}</p>
    `
  });
}



export async function rollCreatureAttack(actor, attack) {
  if (!actor || !attack) return;

  const attackName = (attack.name || "").trim() || "Attack";
  const thac0 = Number(getRulesActorTHAC0(actor) ?? 20);
  const attackBonus = Number(attack.attackBonus ?? 0);
  const formula = attackBonus === 0 ? "1d20" : `1d20 + ${attackBonus}`;

  try {
    const roll = await new Roll(formula).evaluate();
    const total = roll.total;
    const acHit = thac0 - total;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `
        <h2>${actor.name} — ${attackName}</h2>
        <p><strong>Roll:</strong> ${total}${attackBonus !== 0 ? ` (${attackBonus >= 0 ? "+" : ""}${attackBonus})` : ""}</p>
        <p><strong>THAC0:</strong> ${thac0}</p>
        <p><strong>Attack Bonus:</strong> ${attackBonus >= 0 ? "+" : ""}${attackBonus}</p>
        <p><strong>AC Hit:</strong> ${acHit}</p>
      `
    });
  } catch (error) {
    console.error(error);
    ui.notifications.error(`Failed to roll creature attack for ${attackName}.`);
  }
}

export async function rollMonsterAttack(actor, attack) {
  if (!actor || !attack) return;

  const thac0 = Number(getRulesActorTHAC0(actor) ?? 20);
  const attackName = (attack.name || "").trim() || "Attack";
  const attackBonus = Number(attack.attackBonus ?? 0);
  const formula = attackBonus === 0 ? "1d20" : `1d20 + ${attackBonus}`;

  const roll = await new Roll(formula).evaluate();
  const total = roll.total;
  const acHit = thac0 - total;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>Monster Attack: ${actor.name} — ${attackName}</h2>
      <p><strong>Attack:</strong> ${attackName}</p>
      <p><strong>Formula:</strong> ${formula}</p>
      <p><strong>Roll Total:</strong> ${total}</p>
      <p><strong>THAC0:</strong> ${thac0}</p>
      <p><strong>Attack Bonus:</strong> ${attackBonus >= 0 ? "+" : ""}${attackBonus}</p>
      <p><strong>AC Hit:</strong> ${acHit}</p>
    `
  });
}

export async function rollMonsterDamage(actor, attack) {
  if (!actor || !attack) return;

  const attackName = (attack.name || "").trim() || "Attack";
  const damageFormula = (attack.damage || "").trim();

  if (!damageFormula) {
    ui.notifications.warn(`No damage formula set for ${attackName}.`);
    return;
  }

  let roll;
  try {
    roll = await new Roll(damageFormula).evaluate();
  } catch {
    ui.notifications.warn(`Invalid damage formula for ${attackName}: ${damageFormula}`);
    return;
  }

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>Monster Damage: ${actor.name} — ${attackName}</h2>
      <p><strong>Attack:</strong> ${attackName}</p>
      <p><strong>Damage Formula:</strong> ${damageFormula}</p>
      <p><strong>Damage Total:</strong> ${roll.total}</p>
    `
  });
}


export function evaluateTurnUndead({ actor, undeadType, rollTotal, turnUndeadTable } = {}) {
  if (!actor || actor.type !== "character") return { ok: false, reason: "invalid-actor" };

  const table = turnUndeadTable ?? actor.system?.derived?.turnUndead;
  if (!table || typeof table !== "object") return { ok: false, reason: "not-cleric" };

  const entry = table[undeadType];
  const roll = Number.isFinite(Number(rollTotal)) ? Number(rollTotal) : null;
  const resolved = resolveTurnUndeadOutcome(entry, roll);

  return { ok: true, undeadType, entry: entry ?? null, rollTotal: roll, ...resolved };
}

export async function rollTurnUndead(actor, undeadType) {
  const preview = evaluateTurnUndead({ actor, undeadType });
  if (!preview.ok) {
    ui.notifications?.warn("Only clerics with Turn Undead can use this action.");
    return null;
  }

  const roll = await new Roll("2d6").evaluate();
  const result = evaluateTurnUndead({ actor, undeadType, rollTotal: roll.total });

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `
      <h2>Turn Undead</h2>
      <p><strong>Target:</strong> ${undeadType}</p>
      <p><strong>Table Entry:</strong> ${result.entry ?? "—"}</p>
      <p><strong>Roll (2d6):</strong> ${result.rollTotal ?? "—"}</p>
      <p><strong>Result:</strong> ${result.outcome.toUpperCase()}</p>
    `
  });

  return result;
}
