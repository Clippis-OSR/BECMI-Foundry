import { getActorAttackSources, weaponItemToAttackData } from "../combat/attack.mjs";

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
    const data = super.getData(options);
    const system = data.actor?.system ?? {};
    const creatureRole = system.creatureRole || "creature";
    data.system = system;
    // Attacks are item-driven. weaponType is the canonical weapon classification field.
    // Legacy actor.system.attacks is intentionally ignored for UI actions.
    data.attacks = getActorAttackSources(this.actor).map((item) => ({ itemId: item.id, ...weaponItemToAttackData(item) }));
    const monster = system.monster ?? {};
    const savesAs = monster.saveAs ?? { class: "fighter", level: 1 };
    const savesAsClass = savesAs.class || "fighter";
    data.savesAs = savesAs;
    data.monster = monster;
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
      creature: creatureRole === "creature" ? "selected" : "",
      retainer: creatureRole === "retainer" ? "selected" : ""
    };
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[data-action="change-creature-role"]').on("change", async (event) => {
      event.preventDefault();
      const value = event.currentTarget.value || "creature";
      await this.actor.update({ "system.creatureRole": value });
    });

    html.find('[data-action="change-creature-field"]').on("change", async (event) => {
      event.preventDefault();
      const input = event.currentTarget;
      await this.actor.update({ [input.name]: input.value });
    });

    html.find('.becmi-creature-attack').on("click", async (event) => {
      event.preventDefault();

      const itemId = event.currentTarget?.dataset?.itemId;
      if (!itemId) return;

      const item = this.actor.items.get(itemId);
      if (!item || item.type !== "weapon") return;

      const targetToken = game.user?.targets?.first?.();
      const targetActor = targetToken?.actor;
      if (!targetActor) {
        ui.notifications?.warn("Target a token before attacking.");
        return;
      }

      await game.becmi.combat.rollAttack({
        attacker: this.actor,
        target: targetActor,
        attackData: weaponItemToAttackData(item),
        rollDamageOnHit: true,
        postToChat: true
      });
    });
  }
}
