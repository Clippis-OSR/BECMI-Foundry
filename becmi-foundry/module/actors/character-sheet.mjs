export class BECMICharacterSheet extends ActorSheet {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "actor"],
      template: "systems/becmi-foundry/templates/actor/character-sheet.hbs",
      width: 760,
      height: 780,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "main"
        }
      ]
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.actor.system;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".roll-save").click(this._onRollSave.bind(this));
    html.find(".roll-ability").click(this._onRollAbility.bind(this));
    html.find(".roll-thief-skill").click(this._onRollThiefSkill.bind(this));
    html.find(".roll-weapon-attack").click(this._onRollWeaponAttack.bind(this));
  }

  async _onRollSave(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const saveKey = button.dataset.save;
    const label = button.dataset.label;
    const target = Number(this.actor.system.saves?.[saveKey] ?? 20);

    const roll = await new Roll("1d20").evaluate();

    const total = roll.total;
    const success = total >= target;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `
        <h2>${label}</h2>
        <p><strong>Target:</strong> ${target}+</p>
        <p><strong>Result:</strong> ${success ? "SUCCESS" : "FAILURE"}</p>
      `
    });
  }

  async _onRollAbility(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const abilityKey = button.dataset.ability;
    const label = button.dataset.label;
    const target = Number(this.actor.system.abilities?.[abilityKey]?.value ?? 0);

    const roll = await new Roll("1d20").evaluate();

    const total = roll.total;
    const success = total <= target;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `
        <h2>${label} Check</h2>
        <p><strong>Target:</strong> ${target} or less</p>
        <p><strong>Result:</strong> ${success ? "SUCCESS" : "FAILURE"}</p>
      `
    });
  }

async _onRollThiefSkill(event) {
  event.preventDefault();

  const button = event.currentTarget;
  const skillKey = button.dataset.skill;
  const label = button.dataset.label;
  const target = Number(this.actor.system.thiefSkills?.[skillKey] ?? 0);

  const roll = await new Roll("1d100").evaluate();

  const total = roll.total;
  const success = total <= target;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
    flavor: `
      <h2>${label}</h2>
      <p><strong>Chance:</strong> ${target}%</p>
      <p><strong>Result:</strong> ${success ? "SUCCESS" : "FAILURE"}</p>
    `
  });
}
async _onRollWeaponAttack(event) {
  event.preventDefault();

  const index = Number(event.currentTarget.dataset.index);
  const attack = this.actor.system.attacks?.[index];

  if (!attack) return;

  const thac0 = Number(this.actor.system.combat?.thac0 ?? 20);
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
    speaker: ChatMessage.getSpeaker({ actor: this.actor }),
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
}