import { rollCreatureAttack } from "../rolls/becmi-rolls.mjs";

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
    const savesAs = system.savesAs ?? system.saveAs ?? { class: "fighter", level: 1 };
    const savesAsClass = savesAs.class || "fighter";
    data.savesAs = savesAs;
    data.saveAsClassSelected = {
      fighter: savesAsClass === "fighter" ? "selected" : "",
      cleric: savesAsClass === "cleric" ? "selected" : "",
      magicUser: savesAsClass === "magic-user" ? "selected" : "",
      thief: savesAsClass === "thief" ? "selected" : "",
      dwarf: savesAsClass === "dwarf" ? "selected" : "",
      elf: savesAsClass === "elf" ? "selected" : "",
      halfling: savesAsClass === "halfling" ? "selected" : ""
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
      if (input.name?.startsWith("system.attacks.")) return;
      await this.actor.update({ [input.name]: input.value });
    });

    html.find('[data-action="change-attack-field"]').on("change", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const input = event.currentTarget;
      const index = Number(input.dataset.index);
      const field = input.dataset.field;

      if (!Number.isInteger(index)) return;
      if (!["name", "attackBonus", "damage"].includes(field)) return;

      const current = this.actor.system.attacks;
      const attacks = Array.isArray(current) ? foundry.utils.deepClone(current) : [];

      if (!attacks[index]) {
        attacks[index] = { name: "Attack", attackBonus: 0, damage: "1d6" };
      }

      let value = input.value;
      if (field === "attackBonus") {
        value = Number(value || 0);
      }

      attacks[index][field] = value;

      await this.actor.update({
        "system.attacks": attacks
      });
    });

    html.find('[data-action="add-attack"]').on("click", async (event) => {
      event.preventDefault();

      const current = this.actor.system.attacks;
      const attacks = Array.isArray(current) ? foundry.utils.deepClone(current) : [];

      attacks.push({
        name: "Attack",
        attackBonus: 0,
        damage: "1d6"
      });

      await this.actor.update({
        "system.attacks": attacks
      });
    });


    html.find('[data-action="roll-creature-attack"]').on("click", async (event) => {
      event.preventDefault();

      const index = Number(event.currentTarget.dataset.index);

      if (!Number.isInteger(index)) return;

      const attacks = Array.isArray(this.actor.system.attacks)
        ? this.actor.system.attacks
        : [];

      const attack = attacks[index];

      if (!attack) return;

      await rollCreatureAttack(this.actor, attack);
    });
    html.find('[data-action="remove-attack"]').on("click", async (event) => {
      event.preventDefault();

      const index = Number(event.currentTarget.dataset.index);

      const current = this.actor.system.attacks;
      const attacks = Array.isArray(current) ? foundry.utils.deepClone(current) : [];

      attacks.splice(index, 1);

      await this.actor.update({
        "system.attacks": attacks
      });
    });
  }

}
