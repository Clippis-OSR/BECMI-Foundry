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
  }

  async _onRollMorale(event) {
    event.preventDefault();
    await rollMorale(this.actor);
  }
}
