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
    const attacks = Array.isArray(system.attacks) ? system.attacks : [];
    data.attacks = attacks;
    const saveAs = system.saveAs ?? { class: "fighter", level: 1 };
    const saveAsClass = saveAs.class || "fighter";
    data.saveAs = saveAs;
    data.saveAsClassSelected = {
      fighter: saveAsClass === "fighter" ? "selected" : "",
      cleric: saveAsClass === "cleric" ? "selected" : "",
      magicUser: saveAsClass === "magic-user" ? "selected" : "",
      thief: saveAsClass === "thief" ? "selected" : "",
      dwarf: saveAsClass === "dwarf" ? "selected" : "",
      elf: saveAsClass === "elf" ? "selected" : "",
      halfling: saveAsClass === "halfling" ? "selected" : "",
      normalMan: saveAsClass === "normal-man" ? "selected" : ""
    };
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

    html.find('[data-action="change-creature-field"]').on("change", async (event) => {
      event.preventDefault();
      const input = event.currentTarget;
      await this.actor.update({ [input.name]: input.value });
    });

    html.find('[data-action="add-attack"]').on("click", async (event) => {
      event.preventDefault();

      const attacks = foundry.utils.deepClone(this.actor.system.attacks || []);

      attacks.push({
        name: "Attack",
        attackBonus: 0,
        damage: "1d6"
      });

      await this.actor.update({
        "system.attacks": attacks
      });
    });

    html.find('[data-action="remove-attack"]').on("click", async (event) => {
      event.preventDefault();

      const index = Number(event.currentTarget.dataset.index);

      const attacks = foundry.utils.deepClone(this.actor.system.attacks || []);

      attacks.splice(index, 1);

      await this.actor.update({
        "system.attacks": attacks
      });
    });
  }

}
