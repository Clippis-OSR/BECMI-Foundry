const { ActorSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class BECMICreatureSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["becmi", "sheet", "actor", "creature"],
    position: {
      width: 720,
      height: 700
    },
    tag: "form",
    form: {
      handler: BECMICreatureSheetV2.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    form: {
      template: "systems/becmi-foundry/templates/actor/creature-sheet-v2.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const system = actor.system ?? {};

    context.actor = actor;
    context.system = system;
    context.attacks = Array.isArray(system.attacks) ? system.attacks : [];
    context.saveAs = system.saveAs ?? { class: "fighter", level: 1 };

    return context;
  }

  static async #onSubmit(_event, _form, formData) {
    return this.document.update(foundry.utils.expandObject(formData.object));
  }
}
