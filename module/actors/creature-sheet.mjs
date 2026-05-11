import { rollMorale } from "../rolls/becmi-rolls.mjs";

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
    context.system = this.actor.system;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-morale").click(this._onRollMorale.bind(this));
    html.find(".add-attack").click(this._onAddAttack.bind(this));
    html.find(".remove-attack").click(this._onRemoveAttack.bind(this));
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

  async _onRollMorale(event) {
    event.preventDefault();
    await rollMorale(this.actor);
  }
}
