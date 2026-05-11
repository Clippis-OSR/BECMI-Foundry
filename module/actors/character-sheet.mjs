import {
  rollAbilityCheck,
  rollInitiative,
  rollSavingThrow,
  rollThiefSkill,
  rollWeaponAttack
} from "../rolls/becmi-rolls.mjs";

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
    if (this.actor?.type !== "character") {
      console.error("BECMI sheet routing mismatch", {
        actorName: this.actor?.name,
        actorType: this.actor?.type,
        sheetClass: this.constructor.name,
        template: this.template,
        system: this.actor?.system
      });

      return {
        actor: this.actor,
        cssClass: this.options.classes?.join(" ") ?? "",
        editable: this.isEditable,
        owner: this.actor?.isOwner,
        limited: this.actor?.limited,
        title: this.title,
        system: this.actor?.system ?? {}
      };
    }

    const context = super.getData();
    context.system = this.actor.system;
    console.warn("BECMICharacterSheet getData");
    console.warn("BECMI sheet debug", {
      actorName: this.actor?.name,
      actorType: this.actor?.type,
      sheetClass: this.constructor.name,
      template: this.template,
      system: this.actor?.system
    });
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".roll-save").click(this._onRollSave.bind(this));
    html.find(".roll-ability").click(this._onRollAbility.bind(this));
    html.find(".roll-thief-skill").click(this._onRollThiefSkill.bind(this));
    html.find(".roll-weapon-attack").click(this._onRollWeaponAttack.bind(this));
    html.find(".roll-initiative").click(this._onRollInitiative.bind(this));
  }

  async _onRollSave(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const saveKey = button.dataset.save;
    const label = button.dataset.label;

    await rollSavingThrow(this.actor, saveKey, label);
  }

  async _onRollAbility(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const abilityKey = button.dataset.ability;
    const label = button.dataset.label;

    await rollAbilityCheck(this.actor, abilityKey, label);
  }

  async _onRollThiefSkill(event) {
    event.preventDefault();

    const button = event.currentTarget;
    const skillKey = button.dataset.skill;
    const label = button.dataset.label;

    await rollThiefSkill(this.actor, skillKey, label);
  }

  async _onRollWeaponAttack(event) {
    event.preventDefault();

    const index = Number(event.currentTarget.dataset.index);

    await rollWeaponAttack(this.actor, index);
  }

  async _onRollInitiative(event) {
    event.preventDefault();

    await rollInitiative(this.actor);
  }
}
