import { rollMonsterAttack, rollMonsterDamage, rollMorale } from "../rolls/becmi-rolls.mjs";

export class BECMICreatureSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "actor", "creature"],
      template: "systems/becmi-foundry/templates/actor/creature-sheet.hbs",
      width: 520,
      height: 420
    });
  }

  getData() {
    const context = super.getData();
    const system = this.actor.system ?? {};
    const attacks = Array.isArray(system.attacks)
      ? foundry.utils.deepClone(system.attacks)
      : [];
    const saveAs = {
      class: system.saveAs?.class ?? "fighter",
      level: Number.isFinite(Number(system.saveAs?.level)) ? Number(system.saveAs.level) : 1
    };

    context.system = system;
    context.attacks = attacks;
    context.saveAs = saveAs;
    context.saveAsClass = saveAs.class;
    context.saveAsLevel = saveAs.level;
    context.system.hd = system.hd ?? "1";
    context.system.thac0 = Number.isFinite(Number(system.thac0)) ? Number(system.thac0) : 19;
    context.system.specialNotes = system.specialNotes ?? "";
    context.system.saveAs = saveAs;
    context.system.attacks = attacks;
    return context;
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
