export class BECMICreatureSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["becmi", "sheet", "actor", "creature"],
      template: "systems/becmi-foundry/templates/actor/creature-sheet.hbs",
      width: 720,
      height: 700,
    });
  }

  getData(options = {}) {
    console.warn("BECMICreatureSheet getData");
    const data = super.getData(options);
    const system = data.actor?.system ?? {};
    data.system = system;
    data.attacks = Array.isArray(system.attacks) ? system.attacks : [];
    data.saveAs = system.saveAs ?? { class: "fighter", level: 1 };
    return data;
  }
}
