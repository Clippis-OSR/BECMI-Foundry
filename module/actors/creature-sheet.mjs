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
    const creatureRole = system.creatureRole || "monster";
    data.system = system;
    data.attacks = Array.isArray(system.attacks) ? system.attacks : [];
    data.saveAs = system.saveAs ?? { class: "fighter", level: 1 };
    data.creatureRole = creatureRole;
    data.creatureRoleSelected = {
      monster: creatureRole === "monster" ? "selected" : "",
      retainer: creatureRole === "retainer" ? "selected" : "",
      npc: creatureRole === "npc" ? "selected" : ""
    };
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[data-action="change-creature-role"]').on("change", async (event) => {
      event.preventDefault();
      const value = event.currentTarget.value || "monster";
      await this.actor.update({ "system.creatureRole": value });
    });

    html.find("[name^='system.']").on("change", async (event) => {
      const input = event.currentTarget;
      await this.actor.update({ [input.name]: input.value });
    });
  }

}
