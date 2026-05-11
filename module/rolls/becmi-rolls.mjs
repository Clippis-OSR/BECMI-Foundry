export async function rollSavingThrow(actor, saveKey, label) {
  const target = Number(actor.system.saves?.[saveKey] ?? 20);

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
  const target = Number(actor.system.thiefSkills?.[skillKey] ?? 0);

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

  const thac0 = Number(actor.system.combat?.thac0 ?? 20);
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
  const morale = Number(actor.system.combat?.morale ?? 8);
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
