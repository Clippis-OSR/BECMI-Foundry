import { rollMonsterAttack, rollMonsterDamage, rollMorale } from "../rolls/becmi-rolls.mjs";

export class BECMICreatureSheet extends ActorSheet {
  constructor(...args) {
    super(...args);
    console.warn("BECMICreatureSheet CONSTRUCTOR FIRED");
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "actor", "creature"],
      template: "systems/becmi-foundry/templates/actor/creature-sheet.hbs",
      width: 720,
      height: 700
    });
  }

  getData(options = {}) {
    console.warn("BECMICreatureSheet getData FIRED");
    const data = super.getData(options);
    const system = data.actor?.system ?? {};
    const attacks = Array.isArray(system.attacks)
      ? foundry.utils.deepClone(system.attacks)
      : [];
    const saveAs = {
      class: system.saveAs?.class ?? "fighter",
      level: Number.isFinite(Number(system.saveAs?.level)) ? Number(system.saveAs.level) : 1
    };
    const creatureRole = ["monster", "retainer", "npc"].includes(system.creatureRole)
      ? system.creatureRole
      : "monster";
    const creatureRoleLabel = {
      monster: "Monster",
      retainer: "Retainer",
      npc: "NPC"
    }[creatureRole];

    system.hd = system.hd ?? "1";
    system.thac0 = Number.isFinite(Number(system.thac0)) ? Number(system.thac0) : 19;
    system.specialNotes = system.specialNotes ?? "";
    system.saveAs = saveAs;
    system.attacks = attacks;
    system.creatureRole = creatureRole;
    system.combat = system.combat ?? {};
    system.combat.ac = Number.isFinite(Number(system.combat.ac)) ? Number(system.combat.ac) : 9;
    system.combat.morale = Number.isFinite(Number(system.combat.morale)) ? Number(system.combat.morale) : 8;
    system.hp = system.hp ?? { value: 1, max: 1 };

    return {
      ...data,
      system,
      attacks,
      saveAs,
      saveAsClass: saveAs.class,
      saveAsLevel: saveAs.level,
      creatureRole,
      creatureRoleLabel
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-morale").click(this._onRollMorale.bind(this));
    html.find(".add-attack").click(this._onAddAttack.bind(this));
    html.find(".remove-attack").click(this._onRemoveAttack.bind(this));
    html.find('[data-action="monster-attack-roll"]').click(this._onMonsterAttackRoll.bind(this));
    html.find('[data-action="monster-damage-roll"]').click(this._onMonsterDamageRoll.bind(this));
  }

  async _onAddAttack(event) {
    event.preventDefault();
    const attacks = foundry.utils.deepClone(this.actor.system.attacks ?? []);
    attacks.push({ name: "", attackBonus: 0, damage: "" });
    await this.actor.update({ "system.attacks": attacks });
  }

  async _onRemoveAttack(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.attackIndex);
    const attacks = foundry.utils.deepClone(this.actor.system.attacks ?? []);
    if (!Number.isInteger(index) || index < 0 || index >= attacks.length) return;
    attacks.splice(index, 1);
    await this.actor.update({ "system.attacks": attacks });
  }


  async _onMonsterAttackRoll(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.attackIndex);
    const attacks = this.actor.system.attacks ?? [];

    if (!Number.isInteger(index) || index < 0 || index >= attacks.length) {
      ui.notifications.warn("Attack row not found.");
      return;
    }

    await rollMonsterAttack(this.actor, attacks[index]);
  }

  async _onMonsterDamageRoll(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.attackIndex);
    const attacks = this.actor.system.attacks ?? [];

    if (!Number.isInteger(index) || index < 0 || index >= attacks.length) {
      ui.notifications.warn("Attack row not found.");
      return;
    }

    await rollMonsterDamage(this.actor, attacks[index]);
  }

  async _onRollMorale(event) {
    event.preventDefault();
    await rollMorale(this.actor);
  }
}
